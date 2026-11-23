/**
 * Probe: does MapLibre initialize on /map in headless Chromium?
 * Run: bun scripts/runtime/probe-map.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}
const SUPA_URL = envFromDotenv("NEXT_PUBLIC_SUPABASE_URL");
const SUPA_PUB = envFromDotenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["geolocation"],
  geolocation: { latitude: -26.2041, longitude: 28.0473, accuracy: 40 },
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

await page.goto("http://localhost:3000/login");
await page.getByRole("tab", { name: "Password" }).click();
await page.locator('input[type="email"]').fill(envFromDotenv("TEST_USER_A_EMAIL"));
await page.locator('input[type="password"]').fill(envFromDotenv("TEST_USER_A_PASSWORD"));
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/home/, { timeout: 15000 });
await page.goto("http://localhost:3000/map");
for (const t of [3, 6, 9, 12]) {
  await page.waitForTimeout(3000);
  const c = await page.locator(".maplibregl-map").count();
  const cv = await page.locator(".maplibregl-canvas").count();
  const kids = await page.evaluate(() => document.querySelector('[role="application"]')?.children.length ?? -1);
  console.log(`t=${t}s maplibre-map:${c} canvas:${cv} children:${kids}`);
}

const canvas = await page.locator(".maplibregl-canvas").count();
const container = await page.locator(".maplibregl-map").count();
const webgl = await page.evaluate(() => {
  const c = document.createElement("canvas");
  return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
});
const appEl = await page.evaluate(() => {
  const el = document.querySelector('[role="application"]');
  return el ? { cls: el.className, children: el.children.length, html: el.innerHTML.slice(0, 200) } : null;
});
console.log("canvas count:", canvas, "| map container:", container, "| webgl available:", webgl);
console.log("application element:", JSON.stringify(appEl, null, 2));
console.log("console/page errors:");
for (const e of errors.slice(0, 12)) console.log(" -", e);
await browser.close();
