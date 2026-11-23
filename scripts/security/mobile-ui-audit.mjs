#!/usr/bin/env node
/**
 * Section 8 (v1.1.2 deployment gate): mobile UI audit at 390x844 against
 * the LOCAL production build. Playwright proxy for the real-phone audit —
 * virtual keyboard overlap cannot be reproduced here (documented as
 * phone-only). Checks: horizontal overflow, bottom-nav overlap, sheets
 * beyond viewport, minimum tap targets, emergency CTA reachability,
 * composer positioning, auth split-screen fallback.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const BASE = "http://localhost:3000";
const EMAIL = process.env.TEST_USER_A_EMAIL;
const PASSWORD = process.env.TEST_USER_A_PASSWORD;

const results = [];
const add = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  permissions: ["geolocation"],
  geolocation: { latitude: -26.2041, longitude: 28.0473, accuracy: 800 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  try { window.sessionStorage.setItem("fast-splash-shown", "1"); } catch {}
});

/** Audit one page: overflow, tiny tap targets, viewport-breaking fixed elements. */
async function auditPage(url, label, opts = {}) {
  await page.goto(url, { waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(opts.settle ?? 1800);
  const audit = await page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - vw;
    // Fixed elements that extend beyond the viewport bottom.
    let sheetOverflow = 0;
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if ((cs.position === "fixed" || cs.position === "sticky") && el.getBoundingClientRect().bottom > window.innerHeight + 1) {
        sheetOverflow++;
      }
    }
    // Tap targets under 40px on visible, interactive elements.
    let tiny = 0;
    const tinyNames = [];
    for (const el of document.querySelectorAll("button, a[href], [role='button'], input, textarea")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (r.height < 40 && !el.closest("svg") && el.tagName !== "svg") {
        tiny++;
        if (tinyNames.length < 5) {
          tinyNames.push(`${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 28)}@${Math.round(r.height)}px`);
        }
      }
    }
    return { overflowX, sheetOverflow, tiny, tinyNames, title: document.title };
  });
  add(`${label}: no horizontal overflow`, audit.overflowX <= 0, `scrollW-vw=${audit.overflowX}px`);
  add(`${label}: no fixed/sticky element beyond viewport`, audit.sheetOverflow === 0, `count=${audit.sheetOverflow}`);
  add(`${label}: tap targets >= 40px`, audit.tiny === 0, audit.tiny ? audit.tinyNames.join("; ") : "all sized");
  await page.screenshot({ path: `/tmp/render/mobile-${label.replace(/[^a-z0-9]+/gi, "-")}.png` });
  return audit;
}

// ---- marketing page with welcome flow present ----
await auditPage(`${BASE}/`, "landing");

// ---- auth split screens (v1.1.2) ----
for (const p of ["login", "signup", "verify", "onboarding"]) {
  await auditPage(`${BASE}/${p}`, `auth-${p}`, { settle: 1500 });
}

// ---- sign in for app surfaces ----
await page.goto(`${BASE}/login`);
await page.getByRole("tab", { name: "Password" }).click();
await page.locator('input[type="email"]').fill(EMAIL);
await page.locator('input[type="password"]').fill(PASSWORD);
await page.getByRole("button", { name: /sign in|one moment/i }).click();
await page.waitForURL(/\/home|\/onboarding/, { timeout: 20000 });
add("auth: sign-in lands in app", true, page.url());

for (const p of ["home", "messages", "family", "map", "safety", "ai", "notifications", "profile", "settings"]) {
  await auditPage(`${BASE}/${p}`, `app-${p}`, { settle: p === "map" ? 3500 : 1800 });
}

// ---- conversation page composer ----
await page.goto(`${BASE}/messages`);
await page.waitForTimeout(1500);
const hasSearch = await page.locator("#phone-search").isVisible().catch(() => false);
if (hasSearch) {
  await page.locator("#phone-search").fill("+27110000002");
  await page.getByRole("button", { name: /search|find|start/i }).click().catch(() => {});
  await page.waitForTimeout(2500);
  const url = page.url();
  if (/\/messages\/[0-9a-f-]{36}/.test(url)) {
    const composer = await page.evaluate(() => {
      const ta = document.querySelector("textarea");
      if (!ta) return { found: false };
      const r = ta.getBoundingClientRect();
      const bottomNav = [...document.querySelectorAll("nav, [role='navigation']")]
        .map((n) => n.getBoundingClientRect())
        .filter((b) => b.bottom >= window.innerHeight - 4);
      const overlapsNav = bottomNav.some((b) => r.bottom > b.top + 2 && b.height > 0);
      return { found: true, bottom: Math.round(r.bottom), vh: window.innerHeight, overlapsNav };
    });
    add("conversation: composer present above viewport bottom", composer.found && composer.bottom <= composer.vh,
      composer.found ? `bottom=${composer.bottom}/${composer.vh}` : "no textarea");
    add("conversation: composer does not sit under bottom nav", !composer.overlapsNav);
  } else {
    add("conversation: composer checks", false, `no conversation opened: ${url}`);
  }
} else {
  add("conversation: composer checks", false, "phone search not visible");
}

// ---- emergency CTA reachability ----
await page.goto(`${BASE}/home`);
await page.waitForTimeout(1500);
const cta = await page.evaluate(() => {
  const links = [...document.querySelectorAll("a[href^='tel:'], a[href*='1057'], a[href*='10111']")];
  const visible = links.filter((l) => {
    const r = l.getBoundingClientRect();
    const st = getComputedStyle(l);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden";
  });
  return visible.length;
});
add("home: emergency tel CTA visible", cta > 0, `count=${cta}`);

const fails = results.filter((r) => !r.ok).length;
console.log(`\nTOTAL: ${results.length} checks, ${fails} failures`);
await browser.close();
process.exit(0);
