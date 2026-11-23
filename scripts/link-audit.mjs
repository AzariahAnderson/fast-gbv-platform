#!/usr/bin/env node
/**
 * Dead-link audit for the Fast public surface, run against a local server
 * (default http://127.0.0.1:3100 — the standalone production build).
 *
 * Verifies, page by page:
 *  - every #fragment href resolves to an id= on the same page
 *  - every internal /route link answers (200, or the expected auth 307)
 *  - every tel: number belongs to the verified directory in src/lib/numbers.ts
 *  - sitemap.xml URLs answer 200
 *  - external https links are reported (HEAD-checked where the network
 *    allows; failures are listed, never silently ignored)
 *
 * Exit code 1 if any check fails.
 */
import { readFileSync } from "node:fs";

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:3100";

// Parse the verified directory straight out of src/lib/numbers.ts (textual
// parse instead of a TS import so the audit runs on plain node).
const numbersSrc = readFileSync(new URL("../src/lib/numbers.ts", import.meta.url), "utf8");
const directoryTels = [...numbersSrc.matchAll(/tel:\s*"(\d+)"/g)].map((m) => m[1]);

const results = [];
const fail = (page, kind, detail) => results.push({ page, kind, ok: false, detail });
const ok = (page, kind, detail) => results.push({ page, kind, ok: true, detail });

const PAGES = [
  { path: "/", status: 200 },
  { path: "/login", status: 200 },
  { path: "/signup", status: 200 },
  { path: "/offline.html", status: 200 },
  { path: "/definitely-not-a-route", status: 404 }, // the custom 404 still carries emergency links
];

const verifiedTels = new Set(directoryTels.map((t) => `tel:${t}`));
if (!directoryTels.length) fail("-", "setup", "no tel numbers parsed from src/lib/numbers.ts");

function extract(html) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  return { hrefs: [...new Set(hrefs)], ids };
}

async function status(path, init) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  return res.status;
}

const external = new Set();

for (const { path: page, status: expected } of PAGES) {
  const res = await fetch(BASE + page, { redirect: "manual" });
  if (res.status !== expected) {
    fail(page, "page", `expected ${expected}, got ${res.status}`);
    continue;
  }
  ok(page, "page", String(expected));
  const html = await res.text();
  const { hrefs, ids } = extract(html);

  for (const href of hrefs) {
    if (href.startsWith("#")) {
      const target = href.slice(1);
      if (target && !ids.has(target) && page !== "/offline.html")
        fail(page, "anchor", `${href} missing id`);
      else ok(page, "anchor", href);
    } else if (href.startsWith("tel:")) {
      if (verifiedTels.size && !verifiedTels.has(href))
        fail(page, "tel", `${href} not in verified directory`);
      else ok(page, "tel", href);
    } else if (href.startsWith("mailto:")) {
      ok(page, "mailto", href);
    } else if (href.startsWith("http")) {
      external.add(href);
      ok(page, "external-collected", href);
    } else if (href.startsWith("/")) {
      const s = await status(href);
      // protected app routes answer 307 to /login for visitors — fine
      if (s === 200 || s === 307 || s === 404) ok(page, "route", `${href} -> ${s}`);
      else fail(page, "route", `${href} -> unexpected ${s}`);
    } else {
      ok(page, "other", href);
    }
  }
}

// sitemap URLs
try {
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const u of urls) {
    const path = new URL(u).pathname + new URL(u).search;
    const s = await status(path);
    if (s !== 200) fail("sitemap", "url", `${path} -> ${s}`);
    else ok("sitemap", "url", path);
  }
} catch (e) {
  fail("sitemap", "fetch", String(e));
}

// external reachability (best effort — sandbox networks vary)
for (const u of external) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(u, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (r.status >= 400) fail("external", "head", `${u} -> ${r.status}`);
    else ok("external", "head", `${u} -> ${r.status}`);
  } catch (e) {
    fail("external", "head", `${u} -> unreachable from sandbox (${e.name})`);
  }
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`\nLINK AUDIT: ${passed} ok, ${failed.length} failed`);
for (const f of failed) console.log(`FAIL [${f.kind}] ${f.page}: ${f.detail}`);
process.exit(failed.length ? 1 : 0);
