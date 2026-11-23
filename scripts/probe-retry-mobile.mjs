/**
 * Mobile reachability probe for the failed-message "Try again" affordance.
 *
 * Answers, with measured geometry instead of guesses:
 *   1. On a 390x844 mobile viewport, after a message fails and reconnects,
 *      where exactly does the Try again button sit relative to the sticky
 *      composer and the fixed bottom navigation?
 *   2. At MAXIMUM page scroll (what a real user can do), is the button
 *      clear of every overlay (i.e. does elementFromPoint at its centre
 *      return the button itself)?
 *
 * Read-only probe: sends two test messages into the shared test
 * conversation (labelled, unique per run), retries one, deletes nothing.
 * Credentials come from the gitignored .env, never printed.
 */

import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const EMAIL_A = process.env.TEST_USER_A_EMAIL ?? "test-user-a@fast.test";
const PASSWORD_A = process.env.TEST_USER_A_PASSWORD ?? "";
const PHONE_B = "+27110000002";
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const page = await context.newPage();

// Trace network failures + console errors so a silently failing retry is
// visible instead of inferred.
page.on("requestfailed", (req) =>
  console.log(`[requestfailed] ${req.method()} ${new URL(req.url()).pathname} :: ${req.failure()?.errorText}`),
);
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") console.log(`[console.${msg.type()}] ${msg.text().slice(0, 160)}`);
});
page.on("pageerror", (err) => console.log(`[pageerror] ${err.message.slice(0, 200)}`));

try {
  await page.addInitScript(() => {
    try { window.sessionStorage.setItem("fast-splash-shown", "1"); } catch {}
  });
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill(EMAIL_A);
  await page.locator('input[type="password"]').fill(PASSWORD_A);
  await page.getByRole("button", { name: /sign in|one moment/i }).click();
  await page.waitForURL(/\/home|\/onboarding/, { timeout: 20_000 });

  await page.goto(`${BASE}/messages`);
  await page.locator("#phone-search").fill(PHONE_B);
  await page.getByRole("button", { name: /search|find|start/i }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 20_000 });
  // The thread renders async; make sure the composer exists while still
  // online before cutting the network.
  await page.locator("textarea").waitFor({ state: "visible", timeout: 15_000 });

  // Fail a send while offline, then reconnect (no click yet).
  await context.setOffline(true);
  const probeText = `Probe offline ${Date.now()}.`;
  await page.locator("textarea").fill(probeText);
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText(/not sent/i).first().waitFor({ timeout: 15_000 });
  await context.setOffline(false);
  await page.waitForTimeout(800);

  const retry = page.getByRole("button", { name: /try again/i }).last();
  await retry.waitFor({ timeout: 10_000 });
  console.log("try-again buttons on page:", await page.getByRole("button", { name: /try again/i }).count());

  const measure = async (label) => {
    const r = await retry.boundingBox();
    const geo = await page.evaluate(() => {
      // The fixed bottom nav: the one that is actually position:fixed.
      const nav = [...document.querySelectorAll("nav")].find((n) => {
        const s = getComputedStyle(n);
        return s.position === "fixed" && s.bottom === "0px";
      });
      const navRect = nav?.getBoundingClientRect();
      const composer = document.querySelector("div.sticky");
      const composerRect = composer?.getBoundingClientRect();
      return {
        scrollY: window.scrollY,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        nav: navRect ? { top: navRect.top, bottom: navRect.bottom } : null,
        composer: composerRect ? { top: composerRect.top, bottom: composerRect.bottom } : null,
        docHeight: document.documentElement.scrollHeight,
        viewportH: window.innerHeight,
      };
    });
    // What actually receives a tap at the button's centre, right now?
    const hit = r
      ? await page.evaluate(({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          return el
            ? `${el.tagName}[${el.textContent?.slice(0, 24) ?? ""}]`
            : "none";
        }, { x: r.x + r.width / 2, y: r.y + r.height / 2 })
      : "no-box";
    console.log(`[${label}] button=${JSON.stringify(r)} hit@center=${hit}`);
    console.log(`[${label}] scrollY=${geo.scrollY}/${geo.maxScroll} nav=${JSON.stringify(geo.nav)} composer=${JSON.stringify(geo.composer)} doc=${geo.docHeight} vh=${geo.viewportH}`);
    return { r, geo, hit };
  };

  const before = await measure("current-scroll");
  // What a real user would do: scroll the page all the way down. Instant,
  // because html has scroll-behavior:smooth and an animated scroll would
  // make the geometry (and any click actionability) chase a moving target.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(800);
  const atEnd = await measure("max-scroll");

  // Atomic in-page geometry: everything in ONE frame so no timing skew.
  const atomic = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter(
      (b) => b.textContent?.trim().endsWith("Try again"),
    );
    const retry = btns[btns.length - 1];
    if (!retry) return { error: "no retry button" };
    const r = retry.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const stack = document
      .elementsFromPoint(cx, cy)
      .slice(0, 4)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 30) ?? "",
          rect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) },
        };
      });
    const bubble = retry.parentElement?.querySelector("button");
    const bRect = bubble?.getBoundingClientRect();
    const rs = getComputedStyle(retry);
    return {
      retryRect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      retryCenter: { cx, cy },
      retryStyle: { position: rs.position, transform: rs.transform, zIndex: rs.zIndex, pointerEvents: rs.pointerEvents },
      bubbleRect: bRect ? { top: bRect.top, bottom: bRect.bottom } : null,
      stack,
    };
  });
  console.log("ATOMIC GEOMETRY:", JSON.stringify(atomic, null, 1));

  // The decisive check: perform the real user action at this scroll
  // position and see whether the retry actually delivers.
  let clickOutcome = "not attempted";
  // Instrument: log every pointer/click event target in capture phase, so a
  // moving layout or an unexpected interceptor is caught red-handed.
  await page.evaluate(() => {
    const report = (name) => (e) =>
      console.log(
        `[evt:${name}] ${e.target.tagName}${e.target.textContent ? `<${e.target.textContent.trim().slice(0, 22)}>` : ""} @${Math.round(e.clientX)},${Math.round(e.clientY)}`,
      );
    for (const n of ["pointerdown", "pointerup", "click"]) {
      document.addEventListener(n, report(n), { capture: true, once: false });
    }
  });
  try {
    await retry.click({ timeout: 6_000 });
    clickOutcome = "locator click succeeded";
  } catch (err) {
    // Playwright's actionability loop stalls (see its call log); a real
    // finger does not run that loop. Tap the exact measured centre through
    // the real input pipeline instead.
    const c = atomic && atomic.retryCenter;
    if (c) {
      try {
        await page.mouse.click(c.cx, c.cy);
        clickOutcome = "raw mouse tap at measured centre succeeded (locator click had stalled)";
      } catch (err2) {
        clickOutcome = `both clicks failed: ${err2.message.split("\n")[0]}`;
      }
    } else {
      clickOutcome = `click FAILED: ${err.message.split("\n").slice(0, 8).join(" | ")}`;
    }
  }
  try {
    const probeBubble = page.locator("button", { hasText: /Probe offline/ }).last();
    await probeBubble.waitFor({ state: "visible", timeout: 5_000 });
    // Poll the bubble's status line so a phase transition (tap fired) is
    // distinguishable from a dead tap (status never changes).
    const seen = new Set();
    for (let i = 0; i < 24; i++) {
      const t = await probeBubble.innerText();
      const status = t.includes("not sent") ? "NOT-SENT" : t.includes("sending") ? "SENDING" : "CLEAN";
      if (!seen.has(status)) {
        seen.add(status);
        console.log(`[phase ${(i * 0.4).toFixed(1)}s] ${status} :: "${t.replace(/\n/g, " / ")}"`);
      }
      if (status === "CLEAN" && i > 2) break;
      await page.waitForTimeout(400);
    }
    clickOutcome += `; final phases observed: ${[...seen].join(" -> ")}`;
  } catch (err) {
    clickOutcome += `; bubble check failed: ${err.message.split("\n")[0]}`;
  }
  console.log("CLICK OUTCOME:", clickOutcome);
  console.log("nav overlaps button at max scroll:",
    atEnd.r && atEnd.geo.nav ? atEnd.r.y + atEnd.r.height > atEnd.geo.nav.top : "n/a");
  console.log("composer overlaps button at max scroll:",
    atEnd.r && atEnd.geo.composer ? atEnd.r.y + atEnd.r.height > atEnd.geo.composer.top : "n/a");
} finally {
  await browser.close();
}
