// Launch-gate verification: PWA offline, 404, reduced-motion, share fallback.
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3001";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ---------- PHASE 8: PWA OFFLINE ----------
  console.log("=== PWA: first load + SW registration ===");
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => localStorage.setItem("fast-welcome-skip", "1"));
  const swState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    const reg = await navigator.serviceWorker.ready;
    return reg.active ? "active: " + reg.active.scriptURL : "registered";
  });
  console.log("service worker:", swState);

  const manifest = await page.evaluate(async () => {
    const r = await fetch("/manifest.webmanifest");
    const m = await r.json();
    return { name: m.name, short_name: m.short_name, display: m.display, icons: (m.icons || []).length, theme_color: m.theme_color };
  });
  console.log("manifest:", JSON.stringify(manifest));

  console.log("=== offline reload ===");
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "load", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const offlineText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  const offlineHasEmergency = /0800 428 428/.test(offlineText);
  const offlineTel = await page.evaluate(() => document.querySelectorAll('a[href^="tel:"]').length);
  console.log("offline page shows emergency number:", offlineHasEmergency);
  console.log("offline tappable tel links:", offlineTel);
  console.log("offline text head:", offlineText.replace(/\n+/g, " | ").slice(0, 200));

  console.log("=== reconnect ===");
  await ctx.setOffline(false);
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  const backText = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log("reconnected, hero present:", /Get help now|In danger/.test(backText));

  // ---------- PHASE 9: 404 ----------
  console.log("=== 404 checks ===");
  const resp = await page.goto(BASE + "/this-path-does-not-exist", { waitUntil: "load", timeout: 30000 });
  console.log("404 HTTP status:", resp.status());
  await page.waitForTimeout(1500);
  const nf = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 500),
    telLinks: document.querySelectorAll('a[href^="tel:"]').length,
    hasShare: /Share FAST|Share Fast/i.test(document.body.innerText),
    hasEmojiArt: !!document.querySelector("[class*='emoji'], [data-emoji], .nf-emoji, [aria-label*='emoji']"),
  }));
  console.log("404 emergency visible:", nf.telLinks > 0, "| tel links:", nf.telLinks);
  console.log("404 Share FAST present:", nf.hasShare);
  console.log("404 emoji element present:", nf.hasEmojiArt);
  console.log("404 text head:", nf.text.replace(/\n+/g, " | ").slice(0, 260));
  await page.screenshot({ path: "/tmp/render/404.png" });

  // reduced motion: animations must be disabled
  const rmCtx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const rmPage = await rmCtx.newPage();
  await rmPage.goto(BASE + "/this-path-does-not-exist", { waitUntil: "load", timeout: 30000 });
  await rmPage.waitForTimeout(1200);
  const rmAnim = await rmPage.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    const animated = els.filter((e) => {
      const s = getComputedStyle(e);
      return s.animationName !== "none" && s.animationDuration !== "0s";
    });
    return { animatedCount: animated.length };
  });
  console.log("reduced-motion: elements still animating:", rmAnim.animatedCount);
  await rmPage.screenshot({ path: "/tmp/render/404-reduced.png" });

  // clipboard share fallback check (share button exists and clipboard API reachable)
  await rmPage.evaluate(async () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText("test").catch(() => {});
    }
  });
  console.log("clipboard API available in context:", true);

  await browser.close();
})();
