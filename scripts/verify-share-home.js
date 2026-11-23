// Verify Share Fast CTA (native/clipboard + toast + no analytics) and homepage first viewport.
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3001";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();

  // Track ANY outbound request that is not same-origin (analytics detector)
  const outbound = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.origin !== BASE && !u.hostname.includes("127.0.0.1")) outbound.push(r.url());
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => localStorage.setItem("fast-welcome-skip", "1"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // ---------- PHASE 10: first viewport comprehension ----------
  const vp = await page.evaluate(() => ({
    heroH1: document.querySelector("h1")?.innerText || "",
    hasEmergencyCTA: !!document.querySelector('a[href^="tel:"]'),
    emergencyCTAText: document.querySelector('a[href^="tel:"]')?.innerText || "",
    banner: /IN DANGER NOW/.test(document.body.innerText),
    sections: Array.from(document.querySelectorAll("section[id]")).map((s) => s.id),
  }));
  console.log("=== FIRST VIEWPORT ===");
  console.log("H1:", vp.heroH1.replace(/\n/g, " "));
  console.log("emergency tel CTA above fold:", vp.hasEmergencyCTA, "|", vp.emergencyCTAText.trim().slice(0, 40));
  console.log("crisis banner:", vp.banner);
  console.log("page sections:", vp.sections.join(", "));
  await page.screenshot({ path: "/tmp/render/home-first-viewport.png" });

  // ---------- Share Fast ----------
  const shareBtn = page.getByRole("button", { name: /share fast/i }).first();
  const count = await page.getByRole("button", { name: /share fast/i }).count();
  console.log("=== SHARE FAST === buttons found:", count);
  if (count > 0) {
    await shareBtn.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/tmp/render/share-section.png" });
    await shareBtn.click();
    await page.waitForTimeout(1200);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => "(clipboard unavailable)"));
    console.log("clipboard after click:", JSON.stringify(clip.slice(0, 160)));
    const toast = await page.evaluate(() => document.body.innerText);
    const toastLine = toast.split("\n").filter((l) => /cop|link|share/i.test(l)).slice(0, 3);
    console.log("toast/feedback lines:", toastLine);
    await page.screenshot({ path: "/tmp/render/share-after-click.png" });
  }
  console.log("=== OUTBOUND (non-same-origin) REQUESTS ===");
  console.log(outbound.length ? outbound.join("\n") : "(none — no analytics, no trackers)");

  await browser.close();
})();
