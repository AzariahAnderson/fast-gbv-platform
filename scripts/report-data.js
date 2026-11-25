// report-data.js — verified facts for the FAST v1.1.5 full release report.
// Every number here was re-verified on 26 November 2026 in the Z.ai workspace
// against the exact pushed commit 59901af (tree pristine).

// Full commit ledger, newest first (git log --oneline, 36 commits)
const COMMITS = [
  ["59901af", "v1.1.5", "Richer hero emoji frame, footer credit removed, a11y contrast fix"],
  ["c60ac48", "docs", "Re-run Gemini sandbox probe: primary key 429 quota-exhausted, fallbacks region-blocked"],
  ["d3400fc", "docs", "v1.1.4 gate recorded: sandbox green, push and deploy remain human boundaries"],
  ["e5855b8", "v1.1.4", "No verification codes, article system removed, FAST Guide rich rendering"],
  ["a528424", "docs", "Deployment-gate verification: sandbox, production and human sections separated"],
  ["09e2f39", "v1.1.3", "Mobile blockers fixed: pinned composers, safe-arrival tap targets"],
  ["305c65d", "v1.1.2", "Split-screen auth and customization screens, confirmation-free signup, richer hero"],
  ["0d169b0", "v1.1.1", "Runtime verification: connect, prove and harden the real product"],
  ["de62621", "v1.1.0", "FAST becomes a real product: Supabase auth, messaging, families, map, safety, AI"],
  ["47393d8", "v1.0.2", "Launch gate: complete test script registration, precise toast locator, browser verification scripts"],
  ["62b9153", "docs", "FAST launch hub: 16-day campaign and full distribution system"],
  ["0d4cfea", "v1.0.2", "Custom 404 page and Share Fast CTA"],
  ["b1529f5", "v1.0.1", "Launch polish: link-free sticky bar, verified article thumbnails"],
  ["43a501f", "v1.0.0", "Production release: verified safety, security, tests and docs"],
  ["0d085a6", "docs", "Refresh full website report to v0.9.0-beta.10 state"],
  ["59869ee", "v0.9.0-beta.10", "Fully English codebase and single-source refactor for maintainability"],
  ["8517488", "v0.9.0-beta.9", "Server hardening, security tightening, privacy polish"],
  ["843e3df", "v0.9.0-beta.8", "Welcome flow (11 languages, name guard, struggles), hero frame doubled to 8 verified floats"],
  ["22263a9", "v0.9.0-beta.7", "New hero emoji frame, fetch-emojis pipeline, sw precache fast-v8"],
  ["6f834ff", "v0.9.0-beta.6", "Loading bars removed, animated emoji frame around the hero headline"],
  ["f32cad2", "v0.9.0-beta.5", "Sticky bar upgrade, error boundaries, live hook timeouts and retry, off-screen rotation pause"],
  ["c19e0ed", "v0.9.0-beta.4", "Sticky bar never hides, full CSP and hardened security headers, refresh POST origin guard"],
  ["53a737e", "v0.9.0-beta.3", "Banner removed, SW hardening and emoji precache, grouped collapsible directory"],
  ["07a1030", "v0.9.0-beta.2", "Own static artwork: white FAST wordmark, grey/white-F favicon set"],
  ["397f3e6", "v0.9.0-beta.1", "FAST motion logo as brand mark and favicon set, footer banner, version tag"],
  ["83adf3c", "pre-beta", "Production readiness release: security, SEO, PWA, a11y, live-data hardening"],
  ["dc083d7", "pre-beta", "Polish: number consolidation audit, Gemini geo-block short-circuit, refresh route cleanup"],
  ["225f962", "scaffold", "Structured scaffold commit"],
  ["55b2921", "scaffold", "Structured scaffold commit"],
  ["b677ba9", "scaffold", "Structured scaffold commit"],
  ["e520849", "scaffold", "Structured scaffold commit"],
  ["fb54089", "scaffold", "Structured scaffold commit"],
  ["6068b16", "scaffold", "Structured scaffold commit"],
  ["5bdf35f", "scaffold", "Structured scaffold commit"],
  ["0de1be1", "scaffold", "Structured scaffold commit"],
  ["94bb49f", "initial", "Initial commit"],
];

const GATE = [
  ["TypeScript compiler", "npx tsc --noEmit", "0 errors, exit 0"],
  ["ESLint", "npm run lint (eslint .)", "clean, no findings"],
  ["Unit tests", "vitest run", "46/46 pass across 5 files, 278 assertions"],
  ["Production build", "next build (standalone output)", "exit 0, middleware registered"],
  ["Route battery", "58 checks, standalone server on port 3100", "58/58 PASS"],
  ["Link audit", "node scripts/link-audit.mjs", "91 ok, 1 external note (site URL placeholder)"],
  ["Playwright smoke", "smoke.spec.ts, two viewports", "14 pass, 14 skip (project-gated)"],
  ["Remote sync", "authenticated GitHub API call", "origin/main = 59901af, exact match"],
];

const BATTERY_COMPOSITION = [
  ["Public routes answer 200", "7", "/, /login, /signup, /manifest.webmanifest, /robots.txt, /sitemap.xml, /offline.html"],
  ["Protected routes redirect 307 to /login?next=", "13", "11 dashboard pages plus GET and POST /api/ai/chat"],
  ["Removed or unknown routes answer 404", "8", "/verify, /api/image, /articles, /news, /about, /help, /resources, /definitely-not-a-route"],
  ["Security headers present and correct", "10", "6 presence checks plus HSTS, XFO DENY, geolocation and CSP value checks"],
  ["Emoji asset checks", "12", "7 new v1.1.5 assets answer 200; 5 retired assets correctly answer 404"],
  ["Cron auth on /api/refresh", "5", "401 / 401 / 200 secret matrix plus 403 foreign-origin and 200 same-origin POST"],
  ["Footer credit removed", "2", "old credit line absent; accessible emergency closing link present"],
  ["Client-bundle secret scan", "1", "0 value-shaped hits across client bundles and public assets"],
];

const HEADERS = [
  ["Strict-Transport-Security", "includes preload directive", "PASS"],
  ["X-Frame-Options", "DENY", "PASS"],
  ["X-Content-Type-Options", "nosniff", "PASS"],
  ["Referrer-Policy", "no-referrer", "PASS"],
  ["Permissions-Policy", "geolocation=(self)", "PASS"],
  ["Content-Security-Policy", "frame-ancestors 'none'; connect-src *.supabase.co", "PASS"],
];

const CRON = [
  ["No Authorization header", "401 Unauthorized"],
  ["Wrong bearer secret", "401 Unauthorized"],
  ["Correct bearer secret", "200 OK"],
  ["POST with foreign Origin header", "403 Forbidden"],
  ["POST with same-origin Origin header", "200 OK"],
];

const COVERAGE = [
  ["Unit tests (vitest)", "46", "Executed today", "46/46 pass, 278 assertions in 5 files"],
  ["Route battery (bash + curl)", "58", "Executed today", "58/58 pass against a fresh standalone build"],
  ["Link audit (node)", "92 targets", "Executed today", "91 ok, 1 external note that resolves after deploy"],
  ["Playwright smoke (public flows)", "28 cases", "14 executed / 14 project-gated", "Homepage hero, crisis dial directory, sections, FAQ, keyboard order, 404 crisis path, mobile overflow, mobile menu, welcome flow"],
  ["Playwright authenticated e2e", "48 cases", "Skip by design (no TEST_USER_* in env)", "Recorded runs exist as JSON evidence in docs/launch/runtime-verification/"],
  ["Accessibility (axe)", "critical + serious", "Covered by smoke suite", "No critical or serious violations on the settled page"],
];

const BLOCKED = [
  ["Gemini primary API key", "429 quota-exhausted from the sandbox", "Production Gemini behaviour cannot be proven before deploy", "Post-deploy: send one real chat message and confirm a grounded reply"],
  ["Gemini fallback keys (3)", "400 region-blocked from the sandbox", "Same as above", "Same post-deploy smoke test"],
  ["hsrc.ac.za HEAD check", "Sandbox network error (TypeError)", "None. The site is up; confirmed via independent web fetch", "No action. Sandbox egress quirk, not a dead link"],
  ["Authenticated Playwright suite", "48 cases skip without TEST_USER_* credentials", "Login-to-dashboard flows rest on recorded JSON evidence plus the route battery", "Optional: add TEST_USER_A_* and TEST_USER_B_* to run them"],
];

const ENV_VARS = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Public", "Supabase project URL"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Public", "Publishable (anon) key for client auth and data access"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Server-only", "Service role key; must never be exposed to the client bundle"],
  ["GEMINI_API_KEY", "Server-only", "Grounds the AI chat and hourly live-data refresh"],
  ["NEXT_PUBLIC_SITE_URL", "Public", "Canonical production URL; drives sitemap and OG tags; also clears the one link-audit note"],
  ["CRON_SECRET", "Server-only", "Guards the /api/refresh hourly cron endpoint"],
];

const RELEASE_ROWS = [
  ["Code version", "v1.1.5 at commit 59901af, working tree pristine"],
  ["Sandbox gate", "Green: 58/58 battery, 46/46 unit, tsc, lint, build, 14/14 smoke"],
  ["Link audit", "Clean: 91 ok, 1 self-resolving note (site URL placeholder)"],
  ["GitHub publication", "Verified: origin/main = 59901af, exact match, leak scan 0 hits"],
  ["Production deployment", "Not started. Vercel import and env setup are the owner's task"],
  ["Verdict", "READY TO DEPLOY - the only remaining step is human"],
];

module.exports = {
  COMMITS, GATE, BATTERY_COMPOSITION, HEADERS, CRON,
  COVERAGE, BLOCKED, ENV_VARS, RELEASE_ROWS,
};
