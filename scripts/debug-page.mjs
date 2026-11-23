import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 400)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`CONSOLE-${m.type()}:`, m.text().slice(0, 300)); });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("h1 count:", await page.locator("h1").count());
await browser.close();
