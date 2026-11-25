#!/usr/bin/env node
/**
 * Internal link audit — crawls the public pages of a running production
 * server, extracts every href/src target, and verifies each internal
 * link resolves to a non-error response (no dead links). tel:/mailto:
 * targets are skipped (the emergency directory has its own integrity
 * unit tests). External https targets are HEAD-checked best-effort but
 * failures only warn: third-party pages are outside Fast's control.
 *
 * Usage: BASE_URL=http://127.0.0.1:3100 node scripts/link-audit.mjs
 */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const origin = new URL(BASE).origin;

const SEEDS = ["/", "/login", "/signup", "/404-page-probe", "/offline.html"];
const seen = new Set();
const toTest = new Set();
const external = new Set();

function collect(html) {
  const re = /(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("tel:") || raw.startsWith("mailto:") || raw.startsWith("data:")) continue;
    if (raw.startsWith("/")) toTest.add(raw.split("#")[0]);
    else if (raw.startsWith("http")) {
      const u = new URL(raw);
      if (u.origin === origin) toTest.add(u.pathname + u.search);
      else external.add(raw);
    }
  }
}

function drain(res) {
  try {
    const p = res.body?.cancel?.();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* already released or locked — nothing to do */
  }
}

const run = async () => {
  for (const seed of SEEDS) {
    try {
      const res = await fetch(`${origin}${seed}`, { redirect: "manual" });
      if (res.status === 200 && (res.headers.get("content-type") ?? "").includes("html")) {
        collect(await res.text());
      }
      drain(res);
    } catch {
      /* seed unreachable — the battery covers status codes; here we audit links */
    }
  }

  let ok = 0;
  const dead = [];
  for (const path of [...toTest].sort()) {
    if (seen.has(path)) continue;
    seen.add(path);
    try {
      const res = await fetch(`${origin}${path}`, { redirect: "manual" });
      const good = res.status < 400 || res.status === 307; // 307 = auth-guarded app route, alive
      if (good) ok += 1;
      else dead.push(`${path} -> ${res.status}`);
      drain(res);
    } catch (e) {
      dead.push(`${path} -> fetch error ${e.message}`);
    }
  }

  let extOk = 0;
  const extDead = [];
  for (const url of [...external].sort()) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
      if (res.status < 400) extOk += 1;
      else extDead.push(`${url} -> ${res.status}`);
    } catch (e) {
      extDead.push(`${url} -> ${e.message.slice(0, 40)}`);
    }
  }

  console.log(`Internal links: ${ok} OK, ${dead.length} dead (of ${seen.size} unique)`);
  for (const d of dead) console.log(`  DEAD ${d}`);
  console.log(`External links (best-effort): ${extOk} reachable, ${extDead.length} failed`);
  for (const d of extDead) console.log(`  WARN ${d}`);
  process.exit(dead.length ? 1 : 0);
};

run();
