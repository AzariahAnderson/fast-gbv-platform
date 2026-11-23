#!/usr/bin/env node
/** Diagnose the conversation page layout anomaly at 390x844. */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
const BASE = "http://localhost:3000";

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const page = await context.newPage();
await page.addInitScript(() => {
  try { window.sessionStorage.setItem("fast-splash-shown", "1"); } catch {}
});

await page.goto(`${BASE}/login`);
await page.getByRole("tab", { name: "Password" }).click();
await page.locator('input[type="email"]').fill(process.env.TEST_USER_A_EMAIL);
await page.locator('input[type="password"]').fill(process.env.TEST_USER_A_PASSWORD);
await page.getByRole("button", { name: /sign in|one moment/i }).click();
await page.waitForURL(/\/home|\/onboarding/, { timeout: 20000 });

await page.goto(`${BASE}/messages`);
await page.waitForTimeout(1200);
await page.locator("#phone-search").fill("+27110000002");
await page.getByRole("button", { name: /search|find|start/i }).click().catch(() => {});
await page.waitForTimeout(2500);

// Disable the auto "pin to newest" scroll for a clean look at layout.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const describe = (el, depth = 0) => {
    if (!el || depth > 3) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 60),
      rect: { top: Math.round(r.top + window.scrollY), h: Math.round(r.height) },
      pos: cs.position,
      overflow: cs.overflow + "/" + cs.overflowY,
      childCount: el.children.length,
      children: depth < 3 ? [...el.children].slice(0, 8).map((c) => describe(c, depth + 1)) : undefined,
    };
  };
  const shellRoot = document.querySelector("main")?.parentElement;
  return {
    scrollY: Math.round(window.scrollY),
    docH: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    shell: describe(shellRoot),
    header: describe(document.querySelector("header")),
    firstTextarea: (() => {
      const ta = document.querySelector("textarea");
      if (!ta) return null;
      const r = ta.getBoundingClientRect();
      return { top: Math.round(r.top + window.scrollY), h: Math.round(r.height), pos: getComputedStyle(ta).position };
    })(),
  };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: "/tmp/render/probe-conv-top.png" });

// Now check the VISUAL state after the natural auto-scroll (reload fresh).
await page.reload();
await page.waitForTimeout(3000);
const state2 = await page.evaluate(() => ({
  scrollY: Math.round(window.scrollY),
  headerTop: Math.round((document.querySelector("header")?.getBoundingClientRect().top ?? -1)),
  headerPosition: document.querySelector("header") ? getComputedStyle(document.querySelector("header")).position : "?",
  composerTop: Math.round((document.querySelector("textarea")?.getBoundingClientRect().top ?? -1)),
  vh: window.innerHeight,
}));
console.log("AFTER AUTO-SCROLL:", JSON.stringify(state2));
await page.screenshot({ path: "/tmp/render/probe-conv-autoscroll.png" });

await browser.close();
console.log("done");
