/* Screenshot the live section (and the sticky bar) for a visual check. */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("fast-splash-shown", "1");
      window.localStorage.setItem("fast-welcome-skip", "1");
    } catch {}
  });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const el = document.getElementById("live");
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + 560);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/live-section.png" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/top-bar.png" });
  await browser.close();
  console.log("screenshots written");
})();
