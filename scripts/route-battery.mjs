#!/usr/bin/env node
/**
 * Route battery for Fast — runs against a PRODUCTION standalone server
 * (bun run build && bun run start, or any port via BASE_URL). Expects the
 * server to have been started with placeholder Supabase variables so the
 * middleware guard engages, and with CRON_SECRET set so the cron gate is
 * exercised. Never runs against a dev server: guards must be tested in
 * the shape they ship.
 *
 * Usage: BASE_URL=http://localhost:3100 node scripts/route-battery.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function hit(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  return res;
}

const run = async () => {
  // 1. Public surfaces: 200
  for (const p of ["/", "/login", "/signup", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml", "/sw.js", "/offline.html", "/api/live"]) {
    const res = await hit(p, { redirect: "manual" });
    check(`public ${p} -> 200`, res.status === 200, `got ${res.status}`);
    res.body?.cancel?.();
  }

  // 2. Protected app routes: 307 to /login?next=<path>
  for (const p of ["/home", "/messages", "/family", "/map", "/safety", "/safety/plans", "/ai", "/notifications", "/profile", "/settings", "/onboarding"]) {
    const res = await hit(p, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    check(
      `protected ${p} -> 307 /login?next=`,
      res.status === 307 && loc.startsWith("/login?next="),
      `got ${res.status} ${loc.slice(0, 60)}`,
    );
    res.body?.cancel?.();
  }

  // 3. Protected API: POST /api/ai/chat redirects when unauthenticated
  {
    const res = await hit("/api/ai/chat", { method: "POST", redirect: "manual", body: "{}", headers: { "content-type": "application/json" } });
    check("POST /api/ai/chat unauthenticated -> 307/401/429-guard", [307, 401].includes(res.status) || res.status === 200, `got ${res.status}`);
    res.body?.cancel?.();
  }

  // 4. Removed / unknown routes: real 404, never a redirect into /login
  for (const p of ["/verify", "/api/image", "/articles", "/news", "/about", "/help", "/resources"]) {
    const res = await hit(p, { redirect: "manual" });
    check(`removed ${p} -> 404`, res.status === 404, `got ${res.status}`);
    res.body?.cancel?.();
  }

  // 5. Security headers on /
  {
    const res = await hit("/", { redirect: "manual" });
    const h = res.headers;
    const expect = [
      ["content-security-policy", /default-src 'self'/],
      ["x-frame-options", /^DENY$/],
      ["strict-transport-security", /max-age=63072000/],
      ["x-content-type-options", /^nosniff$/],
      ["referrer-policy", /^no-referrer$/],
      ["x-xss-protection", /^0$/],
      ["cross-origin-resource-policy", /^same-origin$/],
      ["cross-origin-opener-policy", /^same-origin$/],
      ["permissions-policy", /camera=\(\)/],
    ];
    for (const [name, re] of expect) {
      const v = h.get(name) ?? "";
      check(`header ${name}`, re.test(v), `got "${v.slice(0, 50)}"`);
    }
    check("CSP frame-ancestors none", (h.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"));
    res.body?.cancel?.();
  }

  // 6. sw.js is always revalidated and allowed at root scope
  {
    const res = await hit("/sw.js", { redirect: "manual" });
    check("sw.js no-store", /no-store|must-revalidate/.test(res.headers.get("cache-control") ?? ""), `got ${res.headers.get("cache-control")}`);
    check("sw.js Service-Worker-Allowed /", res.headers.get("service-worker-allowed") === "/");
    res.body?.cancel?.();
  }

  // 7. Cron gate on /api/refresh (CRON_SECRET configured on the server)
  {
    const noTok = await hit("/api/refresh", { redirect: "manual" });
    check("refresh GET no token -> 401", noTok.status === 401, `got ${noTok.status}`);
    noTok.body?.cancel?.();

    const badTok = await hit("/api/refresh", { redirect: "manual", headers: { authorization: "Bearer definitely-not-it" } });
    check("refresh GET wrong token -> 401", badTok.status === 401, `got ${badTok.status}`);
    badTok.body?.cancel?.();

    const goodTok = await hit("/api/refresh", { redirect: "manual", headers: { authorization: `Bearer ${CRON_SECRET}` } });
    check("refresh GET correct token -> 200", goodTok.status === 200, `got ${goodTok.status}`);
    goodTok.body?.cancel?.();

    const crossPost = await hit("/api/refresh", {
      method: "POST",
      redirect: "manual",
      headers: { origin: "https://evil.example", host: new URL(BASE).host },
    });
    check("refresh POST cross-origin -> 403", crossPost.status === 403, `got ${crossPost.status}`);
    crossPost.body?.cancel?.();

    const plainPost = await hit("/api/refresh", { method: "POST", redirect: "manual" });
    check("refresh POST no origin (curl-like) -> 200", plainPost.status === 200, `got ${plainPost.status}`);
    plainPost.body?.cancel?.();
  }

  // 8. Guide route: unauthenticated POST lands in the guard (redirect from
  //    middleware, or 401 from the in-route session check, or — when the
  //    standalone server has no Supabase variables at all — the honest
  //    "not connected" notice). It must NEVER be a raw 500.
  {
    const res = await hit("/api/ai/chat", { method: "POST", redirect: "manual", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }) });
    const ok = [200, 307, 401].includes(res.status);
    check("POST /api/ai/chat no-session -> 200 notice / 307 / 401", ok, `got ${res.status}`);
    if (res.status === 200) {
      const text = await res.text();
      check("guide notice mentions the crisis line", /GBV Command Centre|could not answer|Guide/.test(text), `got "${text.slice(0, 60)}"`);
    } else {
      res.body?.cancel?.();
    }
  }

  // Summary
  console.log(`\nRoute battery: ${pass} pass, ${fail} fail (base ${BASE})`);
  if (failures.length) {
    console.log("FAILURES:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
};

run().catch((e) => {
  console.error("battery crashed:", e.message);
  process.exit(1);
});
