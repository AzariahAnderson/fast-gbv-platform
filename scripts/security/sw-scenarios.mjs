#!/usr/bin/env node
/**
 * Service-worker scenario probe for Fast (section 11 of the production
 * overhaul). Runs against the PRODUCTION standalone server (port 3100).
 *
 * Covers: fresh visit (A), service worker install (B), hard reload (C),
 * navigation (D), stale-chunk MIME guard + update banner (E), offline
 * public navigation (F), offline private navigation (G), offline asset
 * MIME guard (H), online recovery (I), and the CSP worker policy for the
 * map's blob worker (K, header-level — the authenticated page itself
 * needs a real Supabase session, which the sandbox does not have).
 *
 * How "offline" is simulated, and why: Playwright's context.setOffline
 * attaches CDP network emulation to the PAGE network session only. A
 * service worker has its own network session, and its fetch() calls were
 * still reaching the server through the emulation — the server answered
 * an "offline" /home navigation with an honest middleware redirect
 * (/login?next=%2Fhome) and the probe measured a scenario that was never
 * actually offline. So the offline phase here removes the network for
 * real: the standalone server process is killed, which makes the origin
 * unreachable at the TCP layer for BOTH the page session and the service
 * worker session — exactly the failure real users hit (dead zone,
 * airplane mode, captive portal). Recovery restarts the same server.
 */

import { chromium } from "@playwright/test";
import { execSync, spawn } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const PORT = new URL(BASE).port || "3100";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * Kill the standalone server for real (SIGKILL the process listening on
 * PORT) and wait until the port refuses connections. This is genuine
 * origin unreachability, not emulation.
 */
function killServer() {
  let pids = [];
  try {
    const out = execSync(`ss -tlnp 2>/dev/null || true`).toString();
    for (const line of out.split("\n")) {
      if (!line.includes(`:${PORT} `)) continue;
      for (const m of line.matchAll(/pid=(\d+)/g)) pids.push(Number(m[1]));
    }
  } catch {
    /* ss unavailable: fall through to port probe */
  }
  pids = [...new Set(pids)];
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
  return pids;
}

async function portDown() {
  try {
    const res = await fetch(`${BASE}/favicon.ico`, { signal: AbortSignal.timeout(1500) });
    return false; // something still answers
  } catch {
    return true; // connection refused / reset: origin is unreachable
  }
}

async function waitPortDown(ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await portDown()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/** Start the standalone server again and wait until it answers. */
async function startServer() {
  const child = spawn("node", [".next/standalone/server.js"], {
    cwd: process.cwd(),
    // The harness (verify-*.sh) exports the dummy runtime env before this
    // script starts, so inheriting process.env keeps behaviour identical.
    env: { ...process.env, PORT, HOSTNAME: "127.0.0.1" },
    stdio: "ignore",
  });
  child.unref();
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // A. Fresh visit
  const res = await page.goto(`${BASE}/`, { waitUntil: "load" });
  check("A. fresh visit / -> 200", res.status() === 200, `got ${res.status()}`);
  await page.waitForTimeout(1500);

  // B. Service worker installed and controlling
  const swReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active);
  });
  check("B. service worker installs and activates", swReady);
  await page.waitForTimeout(500);

  // C. Hard reload with the worker installed
  const res2 = await page.reload({ waitUntil: "load" });
  check("C. repeat visit (hard reload) -> 200", res2.status() === 200, `got ${res2.status()}`);

  // D. Navigation between pages
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  const loginOk = (await page.title()).length > 0;
  check("D. navigation to /login renders", loginOk);

  // E. Stale-chunk MIME guard: request a chunk that does not exist. The SW
  // must answer with a NON-HTML body (deployment-skew guard) and the page
  // must raise the update banner.
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  const stale = await page.evaluate(async () => {
    const res = await fetch("/_next/static/chunks/does-not-exist-abc123.js");
    const type = res.headers.get("content-type") || "";
    const body = await res.text();
    return { status: res.status, type, looksHtml: type.includes("text/html"), bodyLength: body.length };
  });
  check(
    "E1. missing chunk is never served as HTML",
    !stale.looksHtml && stale.bodyLength === 0,
    `status ${stale.status} type ${stale.type} len ${stale.bodyLength}`,
  );
  await page.waitForTimeout(800);
  const bannerVisible = await page.getByRole("alert").filter({ hasText: "Fast was updated" }).isVisible().catch(() => false);
  check("E2. stale-build update banner appears", bannerVisible);

  // ---- Offline phase: kill the origin for real --------------------------
  // (See the header comment: CDP emulation does not reach the service
  // worker's network session, so the server process itself is stopped.)
  const killed = killServer();
  const down = await waitPortDown();
  check(
    "F0. origin genuinely unreachable (server stopped)",
    down,
    killed.length ? `killed pid(s) ${killed.join(", ")}` : "no listener found",
  );

  // F. Offline public navigation
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 20000 }).catch(() => null);
  const offlinePublic = await page.evaluate(() => document.body.innerText.length > 100);
  check("F. offline public navigation still renders FAST content", offlinePublic);

  // G. Offline private navigation -> offline.html (private HTML is never
  // cached, so the only honest answer offline is /offline.html). With the
  // origin dead no middleware redirect can leak in, so the page URL must
  // stay on /home.
  await page.goto(`${BASE}/home`, { waitUntil: "load", timeout: 20000 }).catch(() => null);
  const gDiag = await page
    .evaluate(() => ({ url: location.href, text: document.body.innerText.slice(0, 160) }))
    .catch(() => ({ url: "n/a", text: "page gone" }));
  const offlinePrivate = gDiag.text.includes("You are offline") && !gDiag.url.includes("login");
  check(
    "G1. offline private navigation -> offline fallback (stays on /home)",
    offlinePrivate,
    `url ${gDiag.url} text "${gDiag.text.slice(0, 60)}"`,
  );

  // G2. In-page (non-navigation) fetch of a private route while offline:
  // the worker passes it to the network untouched BY DESIGN (answering it
  // with HTML would risk feeding markup to an RSC parser). The real
  // guarantees to assert: it fails cleanly, and NO Cache Storage entry
  // anywhere holds private HTML. The control ("/" IS cached) proves the
  // scan actually sees cache contents.
  const g2 = await page
    .evaluate(async () => {
      let fetchOutcome = "rejected";
      try {
        const res = await fetch("/home", { redirect: "manual" });
        const type = res.headers.get("content-type") || "";
        fetchOutcome = `status ${res.status} type ${type}`;
      } catch {
        fetchOutcome = "rejected";
      }
      const PRIVATE = [
        "/home", "/messages", "/family", "/map", "/safety", "/ai",
        "/contacts", "/profile", "/notifications", "/settings", "/onboarding",
      ];
      const hits = [];
      let control = false;
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          let path = "";
          try {
            path = new URL(req.url).pathname;
          } catch {
            continue;
          }
          if (PRIVATE.some((p) => path === p || path.startsWith(p + "/"))) {
            hits.push(`${name}:${path}`);
          }
          if (path === "/") control = true;
        }
      }
      return { fetchOutcome, hits, control };
    })
    .catch(() => null);
  const g2Clean = Boolean(
    g2 && !g2.fetchOutcome.includes("text/html") && g2.hits.length === 0 && g2.control,
  );
  check(
    "G2. offline private fetch fails cleanly; no cache holds private HTML",
    g2Clean,
    g2
      ? `outcome ${g2.fetchOutcome}; private-in-cache: ${g2.hits.join(", ") || "none"}; cached-/ control ${g2.control}`
      : "probe failed",
  );

  // H. Offline asset guard: wrong-type responses stay impossible
  const offlineAsset = await page.evaluate(async () => {
    const res = await fetch("/_next/static/chunks/offline-missing.js");
    const type = res.headers.get("content-type") || "";
    return { status: res.status, looksHtml: type.includes("text/html") };
  });
  check(
    "H. offline missing chunk fails cleanly (never HTML)",
    !offlineAsset.looksHtml,
    `status ${offlineAsset.status} type ${offlineAsset.type ?? ""}`,
  );

  // I. Back online: restart the SAME server binary, wait for readiness,
  // then navigation must recover.
  const restarted = await startServer();
  check("I0. origin reachable again (server restarted)", restarted);
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 20000 });
  check("I. connectivity restored -> pages load again", page.url().includes("/login"));

  await page.close();
  await context.close();

  // K. Map worker CSP: the response must allow blob: workers (MapLibre
  // spawns its render worker from a Blob URL — `worker-src 'self' blob:'
  // is what un-blocks it). Fresh context, since the previous one closed.
  const ctxK = await browser.newContext();
  const pK = await ctxK.newPage();
  const resK = await pK.goto(`${BASE}/login`, { waitUntil: "load" });
  const csp = resK.headers()["content-security-policy"] || "";
  check(
    "K. CSP worker-src allows blob: (MapLibre worker)",
    /worker-src[^;]*blob:/.test(csp),
    csp.match(/worker-src[^;]*/)?.[0] ?? "no worker-src",
  );
  await pK.close();
  await ctxK.close();

  // Fresh-session console error audit (A revisited with strict listening)
  const ctx3 = await browser.newContext();
  const p3 = await ctx3.newPage();
  const errs = [];
  p3.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text());
  });
  p3.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  await p3.goto(`${BASE}/`, { waitUntil: "load" });
  await p3.waitForTimeout(2500);
  const fastErrors = errs.filter((e) => !/net::|Failed to fetch|ERR_/i.test(e));
  check(
    "Extra. fresh session: no FAST-caused console errors on /",
    fastErrors.length === 0,
    fastErrors.slice(0, 3).join(" | "),
  );
  await p3.close();
  await ctx3.close();

  await browser.close();

  console.log(`\n${pass} pass, ${fail} fail`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
