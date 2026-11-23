import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { sessionStorage.setItem("fast-splash-shown","1"); localStorage.setItem("fast-welcome-skip","1"); } catch {} });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.locator("#survivors").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const out = [];
  const chip = document.querySelector("#survivors .gap-5.flex-col.flex > div:nth-child(1) .text-\\[11px\\]");
  const sub = document.querySelector("#survivors .gap-5.flex-col.flex > div:nth-child(3) .sm\\:text-lg");
  for (const [label, el] of [["chip", chip], ["sub", sub]]) {
    if (!el) { out.push(label + ": NOT FOUND"); continue; }
    const cs = getComputedStyle(el);
    out.push(`${label}: class="${el.className}" color=${cs.color} opacity=${cs.opacity}`);
  }
  return out;
});
console.log(info.join("\n"));
await browser.close();
