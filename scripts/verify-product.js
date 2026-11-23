// Verify the product build renders: landing entry points, auth pages,
// setup notices, and the article-image fix.
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));

  // Landing page: new entry points + emergency CTA intact
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(5600); // splash
  const nav = await page.evaluate(() => ({
    openFast: !!document.querySelector('a[href="/home"]'),
    signIn: !!document.querySelector('a[href="/login"]'),
    crisis: document.querySelectorAll('a[href^="tel:"]').length,
  }));
  console.log("landing nav:", JSON.stringify(nav));
  await page.screenshot({ path: "/tmp/render/landing-top.png" });

  // Article images: contain-fit, no cropping
  await page.evaluate(() => localStorage.setItem("fast-welcome-skip", "1"));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 40000 });
  await page.evaluate(() => document.querySelector("#live")?.scrollIntoView());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/render/live-images.png" });
  const imgFits = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('[data-testid="news-media"] img'));
    return imgs.map((i) => getComputedStyle(i).objectFit);
  });
  console.log("article image object-fit:", imgFits.join(", ") || "(none rendered)");

  // Auth page: setup notice is expected without Supabase variables
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);
  const loginText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("login page:", loginText.replace(/\n+/g, " | ").slice(0, 200));
  await page.screenshot({ path: "/tmp/render/login.png" });

  // App home: setup notice expected without Supabase variables
  await page.goto(BASE + "/home", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);
  const homeText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("home page:", homeText.replace(/\n+/g, " | ").slice(0, 200));

  console.log("page errors:", errors.length ? errors.join(" || ") : "(none)");
  await browser.close();
})();
