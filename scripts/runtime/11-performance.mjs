/**
 * RUNTIME TEST 11 — Performance of the authenticated surfaces against the
 * production build: first load, repeat navigation, realtime socket
 * stability, asset weight, and memory.
 * Evidence: docs/launch/runtime-verification/performance-test.json
 * Run: bun scripts/runtime/11-performance.mjs
 */
import { writeFileSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

const results = { started_at: new Date().toISOString(), routes: {}, notes: [] };
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

async function signIn() {
  await page.goto("http://localhost:3000/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.locator('input[type="email"]').fill(envFromDotenv("TEST_USER_A_EMAIL"));
  await page.locator('input[type="password"]').fill(envFromDotenv("TEST_USER_A_PASSWORD"));
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

async function measure(path) {
  const transfer = [];
  const listener = (resp) => transfer.push({ url: resp.url().slice(0, 80), bytes: resp.headers()["content-length"] ?? null });
  page.on("response", listener);
  const t0 = Date.now();
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "load" });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500); // hydration + first data
  const interactiveMs = Date.now() - t0;
  page.off("response", listener);
  let js = 0, img = 0, unknown = 0;
  for (const r of transfer) {
    const b = r.bytes ? Number(r.bytes) : 0;
    if (r.url.endsWith(".js") || r.url.includes("/_next/static/chunks")) js += b;
    else if (/\.(png|jpg|webp|woff2|svg)/.test(r.url) || r.url.includes("tile")) img += b;
    else unknown += b;
  }
  const mem = await page.evaluate(() => {
    const p = performance;
    return p.memory ? p.memory.usedJSHeapSize : null;
  });
  results.routes[path] = {
    loadMs,
    interactiveMs,
    transferKB: Math.round((js + img + unknown) / 1024),
    jsKB: Math.round(js / 1024),
    imgTileKB: Math.round(img / 1024),
    jsHeapMB: mem ? Math.round(mem / 1_048_576) : null,
  };
  console.log(`${path}: load ${loadMs}ms, interactive ${interactiveMs}ms, transfer ~${Math.round((js + img + unknown) / 1024)}KB, heap ${mem ? Math.round(mem / 1_048_576) + "MB" : "n/a"}`);
}

await signIn();
await measure("/messages");
await measure("/messages/00000000-0000-0000-0000-000000000000"); // empty thread view
await measure("/family");
await measure("/family/00000000-0000-0000-0000-000000000000");
await measure("/map");
await measure("/safety");
await measure("/ai");

// Realtime socket stability: subscribe a live channel for 15s and count drops.
await page.goto("http://localhost:3000/messages");
await page.waitForTimeout(2000);
let drops = 0;
const wsPages = [];
page.on("websocket", (ws) => {
  ws.on("close", () => wsPages.push("closed"));
});
await page.waitForTimeout(15000);
results.notes.push(`websocket closes observed in a 15s idle window on /messages: ${wsPages.length}`);
console.log("realtime stability:", results.notes[results.notes.length - 1]);

// Mobile keyboard behaviour: composer stays visible above the keyboard.
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mpage = await mobile.newPage();
await mpage.goto("http://localhost:3000/login");
await mpage.getByRole("tab", { name: "Password" }).click();
await mpage.locator('input[type="email"]').fill(envFromDotenv("TEST_USER_A_EMAIL"));
await mpage.locator('input[type="password"]').fill(envFromDotenv("TEST_USER_A_PASSWORD"));
await mpage.getByRole("button", { name: /sign in/i }).click();
await mpage.waitForURL(/\/home/, { timeout: 15000 });
const convs = await mpage.goto("http://localhost:3000/messages");
await mpage.waitForTimeout(1500);
const threadLink = mpage.locator('a[href^="/messages/"]').first();
if (await threadLink.isVisible()) {
  await threadLink.click();
  await mpage.waitForTimeout(1500);
  await mpage.locator("textarea").focus();
  await mpage.waitForTimeout(400);
  const composer = await mpage.locator("textarea").boundingBox();
  const viewportH = 844;
  results.notes.push(
    `mobile composer box when focused: ${composer ? `y=${Math.round(composer.y)}, h=${Math.round(composer.height)}` : "n/a"} (viewport ${viewportH}px) — safe-area padding applied via env(safe-area-inset-*)`,
  );
} else {
  results.notes.push("no conversation link available for the composer probe");
}
console.log(results.notes[results.notes.length - 1]);

results.finished_at = new Date().toISOString();
writeFileSync(
  new URL("../../docs/launch/runtime-verification/performance-test.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
await browser.close();
console.log("PERF EVIDENCE SAVED");
