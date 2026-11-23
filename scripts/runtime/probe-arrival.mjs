/**
 * Probe: safe-arrival submit on the mobile emulation profile.
 * Run: bun scripts/runtime/probe-arrival.mjs
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url().slice(0, 90)} ${r.failure()?.errorText}`));

await page.goto("http://localhost:3000/login");
await page.getByRole("tab", { name: "Password" }).click();
await page.locator('input[type="email"]').fill(envFromDotenv("TEST_USER_A_EMAIL"));
await page.locator('input[type="password"]').fill(envFromDotenv("TEST_USER_A_PASSWORD"));
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/home/, { timeout: 15000 });
await page.goto("http://localhost:3000/safety");
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /15 minutes/i }).click();
await page.getByPlaceholder("Home from work").fill("Probe destination");
// Watch for the actual POST to safe_arrivals.
const postPromise = page.waitForRequest(
  (r) => r.url().includes("safe_arrivals") && r.method() === "POST",
  { timeout: 8000 },
).then((r) => `POST FIRED: ${r.url().slice(0, 80)}`)
 .catch(() => "POST NEVER FIRED within 8s");
await page.getByRole("button", { name: /start the timer/i }).click();
console.log(await postPromise);
await page.waitForTimeout(4000);
const note = await page.locator('p[role="status"]').allTextContents();
const destValue = await page.getByPlaceholder("Home from work").inputValue();
console.log("status notes:", JSON.stringify(note));
console.log("destination value after submit:", JSON.stringify(destValue));
console.log("console errors:", errors.slice(0, 6));
await browser.close();
