import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { sessionStorage.setItem("fast-splash-shown", "1"); localStorage.setItem("fast-welcome-skip", "1"); } catch {} });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.evaluate(async () => { const step = window.innerHeight / 2; for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 1600)); });
await page.addScriptTag({ content: readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
const res = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
for (const v of res.violations) {
  console.log(`\n${v.id} (${v.impact}): ${v.help}`);
  for (const n of v.nodes.slice(0, 3)) console.log("  target:", n.target.join(" "), "|", (n.failureSummary || "").replace(/\n/g, " | "));
}
await browser.close();
