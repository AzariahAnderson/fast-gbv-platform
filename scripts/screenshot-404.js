/* Screenshot the 404 page for a visual check (desktop + mobile). */
const { chromium, devices } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto("http://localhost:3000/definitely-not-a-page", { waitUntil: "networkidle" });
  await desktop.waitForTimeout(2200);
  await desktop.screenshot({ path: "/tmp/404-desktop.png" });
  const mobile = await browser.newPage({ ...devices["Pixel 7"] });
  await mobile.goto("http://localhost:3000/definitely-not-a-page", { waitUntil: "networkidle" });
  await mobile.waitForTimeout(2200);
  await mobile.screenshot({ path: "/tmp/404-mobile.png" });
  await browser.close();
  console.log("404 screenshots written");
})();
