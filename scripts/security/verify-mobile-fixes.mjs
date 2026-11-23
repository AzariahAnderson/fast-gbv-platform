#!/usr/bin/env node
/** Verify AI composer pin + I-arrived tap target after the mobile fixes. */
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

// AI page: with several turns so the page scrolls
await page.goto(`${BASE}/ai`);
await page.waitForTimeout(1500);
await page.locator("textarea").fill("What is coercive control?");
await page.getByRole("button", { name: "Send" }).click();
await page.waitForTimeout(8000); // let the reply/fallback land
const aiState = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const r = ta?.getBoundingClientRect();
  const cs = ta ? getComputedStyle(ta.parentElement.parentElement) : null;
  const nav = document.querySelector("nav[aria-label='Primary']")?.getBoundingClientRect();
  return {
    composerTop: Math.round(r?.top ?? -1),
    composerBottom: Math.round(r?.bottom ?? -1),
    vh: window.innerHeight,
    stickyPos: cs?.position,
    navTop: Math.round(nav?.top ?? -1),
    scrollY: Math.round(window.scrollY),
    docH: document.documentElement.scrollHeight,
  };
});
console.log("AI COMPOSER STATE:", JSON.stringify(aiState));
await page.screenshot({ path: "/tmp/render/probe-ai-fixed.png" });

// Safety page: I arrived tap target
await page.goto(`${BASE}/safety`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1000);
const arrivedBtn = page.getByRole("button", { name: /i arrived/i }).first();
if (await arrivedBtn.isVisible().catch(() => false)) {
  await arrivedBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const box = await arrivedBtn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });
  console.log("I-ARRIVED SIZE:", JSON.stringify(box));
  await page.screenshot({ path: "/tmp/render/probe-safety-fixed.png" });
} else {
  console.log("I-ARRIVED: no active timers visible");
}

await browser.close();
console.log("done");
