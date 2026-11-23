const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 40000 });
  await page.evaluate(() => localStorage.setItem("fast-welcome-skip", "1"));
  await page.reload({ waitUntil: "networkidle" });
  // Scroll to the news cards themselves
  const box = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="news-media"]');
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { y: r.top + window.scrollY };
  });
  console.log("news media found:", box);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "/tmp/render/news-cards.png" });
  await browser.close();
})();
