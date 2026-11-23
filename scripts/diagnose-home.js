// Diagnose what renders after the FAST preloader splash.
// Captures screenshot at t=0.5s (splash) and t=7s (settled), logs console errors.
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => errors.push("PAGEERROR: " + String(err).slice(0, 300)));

  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/render/splash-05s.png" });

  await page.waitForTimeout(7000); // splash is 4s; wait past it
  await page.screenshot({ path: "/tmp/render/settled-7s.png" });

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
  const splashVisible = await page.evaluate(() => {
    const el = document.querySelector("[data-fast-splash], #fast-splash, [aria-label*='splash']");
    return el ? getComputedStyle(el).display !== "none" : false;
  });

  console.log("=== CONSOLE ERRORS ===");
  console.log(errors.length ? errors.join("\n") : "(none)");
  console.log("=== SPLASH STILL VISIBLE ===", splashVisible);
  console.log("=== BODY TEXT (settled) ===");
  console.log(bodyText);
  await browser.close();
})();
