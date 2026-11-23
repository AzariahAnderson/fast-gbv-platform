#!/usr/bin/env node
/**
 * Targeted follow-up: (1) the safe-arrival "I arrived" tap targets,
 * (2) the conversation composer position at 390x844, (3) emergency sheet.
 */
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

// ---- 1. safety page: inspect every "I arrived" element ----
await page.goto(`${BASE}/safety`);
await page.waitForLoadState("networkidle");
const arrived = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("button, a[href], [role='button']")) {
    const txt = (el.textContent || "").trim();
    if (!/i arrived/i.test(txt)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      text: txt.slice(0, 40),
      h: Math.round(r.height),
      w: Math.round(r.width),
      visible: r.width > 0 && cs.visibility !== "hidden" && cs.display !== "none",
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 80),
    });
  }
  return out;
});
console.log("I-ARRIVED ELEMENTS:", JSON.stringify(arrived, null, 1));

// scroll to safe arrival section and screenshot
const timerSection = page.getByText(/where are you heading/i).first();
if (await timerSection.isVisible().catch(() => false)) {
  await timerSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/render/probe-safety-timer.png" });
}

// start a 15-minute timer so the "I arrived" card exists
try {
  await page.getByRole("button", { name: /15 minutes/i }).click();
  await page.getByPlaceholder("Home from work").fill("Probe destination");
  await page.getByRole("button", { name: /start the timer/i }).click();
  await page.waitForTimeout(2000);
  const activeCard = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a[href], [role='button']")) {
      const txt = (el.textContent || "").trim();
      if (!/i arrived|cancel/i.test(txt)) continue;
      const r = el.getBoundingClientRect();
      out.push({ text: txt.slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) });
    }
    return out;
  });
  console.log("ACTIVE TIMER BUTTONS:", JSON.stringify(activeCard));
  const arrivedBtn = page.getByRole("button", { name: /i arrived/i }).first();
  if (await arrivedBtn.isVisible().catch(() => false)) {
    await arrivedBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "/tmp/render/probe-safety-arrived.png" });
  }
} catch (e) {
  console.log("timer probe skipped:", String(e).slice(0, 120));
}

// ---- 2. conversation composer ----
await page.goto(`${BASE}/messages`);
await page.waitForTimeout(1500);
await page.locator("#phone-search").fill("+27110000002");
await page.getByRole("button", { name: /search|find|start/i }).click().catch(() => {});
await page.waitForTimeout(2500);
console.log("conversation url:", page.url());
const composer = await page.evaluate(() => {
  const tas = [...document.querySelectorAll("textarea")];
  return tas.map((ta) => {
    const r = ta.getBoundingClientRect();
    const cs = getComputedStyle(ta);
    return {
      bottom: Math.round(r.bottom), top: Math.round(r.top), h: Math.round(r.height),
      vh: window.innerHeight, display: cs.display, position: cs.position,
      parentTag: ta.parentElement?.tagName, scrollY: Math.round(window.scrollY),
    };
  });
});
console.log("TEXTAREAS ON CONVERSATION:", JSON.stringify(composer, null, 1));
await page.screenshot({ path: "/tmp/render/probe-conversation.png" });

// ---- 3. emergency sheet from home ----
await page.goto(`${BASE}/home`);
await page.waitForTimeout(1200);
const helpBtn = page.getByRole("button", { name: /get help now/i }).first();
if (await helpBtn.isVisible().catch(() => false)) {
  await helpBtn.click();
  await page.waitForTimeout(900);
  const telLinks = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a[href^='tel:']")];
    return links.map((l) => {
      const r = l.getBoundingClientRect();
      return { href: l.getAttribute("href"), h: Math.round(r.height), visible: r.width > 0 };
    });
  });
  console.log("EMERGENCY SHEET TEL LINKS:", JSON.stringify(telLinks));
  await page.screenshot({ path: "/tmp/render/probe-emergency-sheet.png" });
} else {
  console.log("no Get help now button on home");
}

await browser.close();
console.log("done");
