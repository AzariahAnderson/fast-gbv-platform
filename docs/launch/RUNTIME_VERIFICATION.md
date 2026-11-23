# Runtime verification — v1.1.3 deployment gate

Status: **verified connected application — deployment pending human actions**.

Every claim below was executed and observed. Results are separated into
exactly three sections and never mixed:

1. **VERIFIED IN SANDBOX** — executed against the real Supabase project
   (ref `cztdyqhatvogiaegniow`, eu-west-1) and the local production build
   (`next build` + `server.js`, port 3000) from this repository.
   Machine-readable evidence: `docs/launch/runtime-verification/*.json`.
2. **VERIFIED IN PRODUCTION** — executed against a deployed URL. Nothing
   is listed here yet: the deployment has not happened (see section 3).
3. **HUMAN ACTION REQUIRED** — things this sandbox cannot do: push to
   GitHub with a credential, create a Vercel project, run a physical
   phone, or reach Google's Gemini API from this region.

Verified commits in this document: `0d169b0` (v1.1.1), `305c65d`
(v1.1.2 — split-screen auth + hero), `09e2f39` (v1.1.3 — mobile blockers
fixed). All dates are 23–24 November 2026.

---

## 1. VERIFIED IN SANDBOX

### 1a. Connected-product runtime verification (v1.1.1, commit `0d169b0`)

| Area | Result | Evidence |
| --- | --- | --- |
| Migrations | 0001+0002 applied to the remote database; 24/24 tables, 67 RLS policies, 42 indexes, 6 triggers, 14 functions, 3 storage buckets present; RLS enabled on every private table | `schema-verification.json` |
| Realtime publication | `supabase_realtime` was EMPTY on the fresh project; `messages`, `typing_presence`, `message_reads`, `locations`, `location_shares`, `checkins` added by script (`scripts/db/enable-realtime.mjs`) | `realtime-publication.json` |
| Auth | Signup, login, server-verified session, logout + refresh-token revocation, unauthenticated data reads return zero rows — 15/15 checks | `auth-test.json` |
| Messaging | Full 16-step E2E: phone search (exact-match), direct conversation RPC, live postgres_changes delivery both directions (356–742 ms), typing, read receipts, edit, soft delete, mute honours trigger, archive, block (incl. RPC + membership bypass attempts), insert-only reports — 25/25 | `messaging-test.json` |
| Family | Create, invite, accept by code, roles, family chat realtime (471–679 ms), pinned messages (admin-only enforced), 4 check-in states, need-help reaches muted members, owner removes, member leaves, expired + revoked invites rejected, non-member isolation — 30/30 | `family-test.json` |
| Location | OFF default, approximate blur row, precise coordinates, explicit audience (grant/revoke), expiry gates (row + share), pause, delete, no history, live map events, RLS-gated realtime (non-viewer gets no event) — 20/20 | `location-test.json` |
| Safety plans | Create/edit/delete, private by default, explicit share, revoke, cross-user reads blocked, share creation by non-owner blocked | `safety-test.json` |
| Safe arrival | Timer with no contacts notifies nobody; trusted contacts notified exactly as configured; arrival closes; expiry stays local; no escalation row or notification exists; cross-user writes blocked — 14/14 | `safety-test.json` |
| Notifications | Trigger-only writes (client insert into anyone's centre blocked, including self), unread counts, ownership-guarded read state, need-help + safety-alert kinds not muteable in the app — 11/11 | `notifications-test.json` |
| Storage | Avatar upload/view/replace/delete, own-folder enforcement, public read by design; chat images member-gated + unauthenticated blocked; family images member-gated, admin-upload, denied after leaving; path traversal and non-UUID folders rejected — 17/17 | `storage-test.json` |
| AI (route) | Live route reaches Gemini; upstream failure handled gracefully ("call 0800 428 428"), no key or provider error leaked; no persistence code in the route; explicit save/delete cascade verified; UI labels the Guide as AI | `ai-privacy-test.json` |
| Performance | App routes: load 288–346 ms, interactive 2.79–2.85 s (includes the 4 s preloader), transfer 81–129 KB, heap 14–23 MB | `performance-test.json` |

### 1b. Deployment gate (v1.1.2 `305c65d` → v1.1.3 `09e2f39`, re-run after every change)

| Gate | Result |
| --- | --- |
| Working tree | Clean; no tracked `.env`, credentials, test passwords, API keys or service-role keys (`git ls-files` audit; `.env*` gitignored) |
| Secret scan | 225 files across `src/ tests/ scripts/ supabase/ docs/ public/` + root configs, 12 high-signal patterns (Supabase secret/publishable, JWT, Postgres-with-password, Gemini/Google keys, GitHub tokens, AWS, OpenAI-style, Bearer literals, CRON_SECRET assignment, supabase.co-with-key): **0 hardcoded secrets**. The only 3 raw hits construct values from env at runtime (`Bearer ${GEMINI_API_KEY}`; two `DATABASE_URL` parsers reading gitignored `.env`). Scanner: `scripts/security/final-secret-scan.mjs` (values never printed) |
| Unit / static | 62/62 unit tests, typecheck clean, lint clean, production build succeeds (every route prerendered or dynamic as designed) |
| Playwright | 48 passed, 14 skipped (by-design project targeting: 7 desktop-only + 7 mobile-only), including two-user realtime messaging, typing + read receipts, optimistic send + honest offline failure + retry, map at three viewports, safe arrival, AI surface, axe accessibility (desktop project: no critical/serious violations) |
| Routes (local prod build) | `/`, `/login`, `/signup`, `/verify` → 200; `/onboarding /home /messages /family /map /safety /ai /notifications /profile /settings` unauthenticated → 307 to `/login?next=…`; `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` → 200; **unknown route → 404, no redirect to `/login`** |
| Email confirmation | `mailer_autoconfirm` verified ON via the live `/auth/v1/settings`; signup returns a session immediately, onboarding follows — no email step anywhere in the code or the tests |
| Security headers | CSP (`default-src 'self'`; script/style `unsafe-inline`; connect-src `*.supabase.co` + wss + tile hosts; `frame-ancestors 'none'`), Permissions-Policy (`geolocation=(self)`, camera/mic blocked), HSTS preload, X-Frame-Options DENY, nosniff, Referrer-Policy no-referrer — present on `/` and `/home` |
| Cron authentication | `GET /api/refresh`: no secret → 401, wrong secret → 401, correct secret → 200 (timing-safe compare). `POST` manual refresh: foreign `Origin` → 403, same-origin → 200; refreshLive rate-limits generations (~1/9 min) |
| Service-role isolation | `SUPABASE_SERVICE_ROLE_KEY` imported only in `src/lib/supabase/server.ts` behind `import "server-only"`; `createAdminClient()` is defined but **never called** anywhere in `src/` — the key has zero live attack surface; every request-scoped client uses the publishable key (RLS applies) |
| Client-bundle leak scan | All 51 client files (`.next/static` + `public`): 0 occurrences of service key, Gemini key, CRON_SECRET, DATABASE_URL or test passwords |
| Client-bundle UI audit (390×844, Playwright proxy for the phone) | No horizontal overflow on any of the 14 audited surfaces; no fixed/sticky element beyond the viewport; emergency sheet reachable via "Get help now" with 10 `tel:` links at 64–84 px; chat composer pinned at 768/844 and never under the bottom nav; AI composer + crisis line pinned; "I arrived" now 44×90 px |

### 1c. Genuine bugs found by runtime testing — all fixed

1. **Block precedence hole (migration 0003).** The messages-send and
   join-direct policies checked `blocks` as the invoking user; a blocked
   user could not see the blocker's row, so the check never fired and they
   could keep sending into an existing conversation. Fixed with a
   security-definer `blocked_between()` helper; re-verified live.
2. **`join_family_by_code` RPC crash (migration 0004).** `column reference
   "code" is ambiguous` — the plpgsql parameter collided with
   `family_invites.code`. Parameter name kept (the app passes `{ code }`);
   reference qualified with the function name.
3. **Family removal kept chat access (migrations 0005 + 0007).** Deleting a
   `family_members` row left the conversation membership behind, so a
   removed member could still read the family chat, and (0007) kept their
   location-share viewer grants. A security-definer trigger now cleans up
   both on removal or leave.
4. **RLS policy recursion (migration 0006).** `location_shares` ↔
   `location_share_viewers` and `safety_plans` ↔ `safety_plan_shares`
   policies queried each other — any viewer read or INSERT RETURNING died
   with `infinite recursion detected in policy`. Fixed with
   security-definer visibility helpers; policy intent unchanged.
5. **CSP blocked the entire product in production.** `connect-src 'self'`
   and `img-src 'self' data:` forbade every browser→Supabase call (auth,
   REST, realtime websocket, storage images). Now limited to exactly
   `*.supabase.co` (+ tile hosts for the map) — nothing wider.
6. **Permissions-Policy denied geolocation everywhere.** `geolocation=()`
   made the consent-based map impossible in production. Changed to
   `geolocation=(self)`.
7. **Middleware hijacked unknown URLs into /login.** Any mistyped path
   redirected to sign-in instead of the 404 page with its emergency CTA.
   The guard now applies only to the explicit app-route list.
8. **Map never initialised on the production build.** The bootstrap effect
   ran while the session check still hid the container, and with `[]`
   dependencies it never re-ran. It now depends on the loading flag; a
   WebGL failure also renders an honest in-map notice instead of silence.
9. **Notifications: "Check-in" was muteable.** A check-in can carry
   "Need help", so the mute control could silence a help request in the
   centre. Check-ins (and safety alerts) are no longer muteable; muting
   now only drops the unread ping and never hides a row.
10. **Chat composer unreachable on long conversations (v1.1.3).** The
    composer was static in document flow at the end of the thread —
    measured 5.8 k px below the viewport on a real-size thread at
    390×844, invisible after the auto-scroll to the newest message. Now
    sticky above the mobile bottom nav (`bottom-[calc(4rem+env(safe-area-inset-bottom))]`,
    full-bleed bar, blur); desktop layout unchanged (verified: composer
    bottom 768/844, not under the nav).
11. **FAST Guide composer + crisis line scrolled away (v1.1.3).** Same
    treatment: composer and the "In danger right now? Call 0800 428 428"
    line are pinned together, so asking for help is one tap away at any
    conversation length.
12. **Safe-arrival "I arrived" was a 16×54 px target (v1.1.3).** A
    safety-critical action rendered as bare text. Now a 44×90 px bordered
    pill consistent with the app's button language.

### 1d. Known platform behaviour (documented, not fixable app-side)

- Supabase's edge may serve a private object fetched moments earlier for a
  few seconds after a policy change (observed once during family-image
  tests; fresh objects are always RLS-checked, signed-URL issuance always
  re-checks). The app signs chat-image URLs at request time, which is the
  recommended mode.
- The first realtime event can be missed if a subscription joins and the
  write lands within the same instant; the app's UI subscribes on page
  entry, long before any send.
- Supabase realtime / offline-simulation from this sandbox flapped during
  the deployment gate: the typing-indicator wait failed once in the first
  full-suite run (passed on immediate re-run), and the mobile
  offline-retry timing failed twice in a row before two consecutive
  clean passes (6/6 describe re-run, then the full 48-passed suite run).
  Counts as environment variance, not an app defect —
  watch for it once in production, not as a pattern.

### 1e. Sandbox Lighthouse (local production build — reference only, not production)

- Performance 51, Accessibility 100, Best Practices 100, SEO 100, CLS 0.
- FCP 1.3 s, LCP 6.5 s, TBT 1,280 ms on sandboxed software-GL with the
  4-second preloader included — numbers are inflated by this environment
  and must be re-taken from the deployed URL (section 3).

---

## 2. VERIFIED IN PRODUCTION

**None.** The application has not been deployed yet: this sandbox holds no
GitHub credential and no Vercel credential, so sections 2–3 and 7–10 of the
deployment task could not start. Nothing may be recorded here until each
check has run against the deployed URL with real results.

---

## 3. HUMAN ACTION REQUIRED

### 3a. GitHub push (Section 2 of the deployment task)

`git push origin main` was attempted and failed with
`fatal: could not read Username for 'https://github.com'` — no credential
exists in this environment. **A push cannot be fabricated.** Remote HEAD is
still `43a501f` (v1.0.0); local main is 8 commits ahead:

```
09e2f39 v1.1.3: mobile blockers fixed
305c65d v1.1.2: split-screen auth + customization screens
0d169b0 v1.1.1: runtime verification
de62621 v1.1.0: real product
47393d8 62b9153 0d4cfea b1529f5  (v1.0.x docs and launch gates)
```

Steps for a human (use a **fresh** fine-grained PAT — never the previously
compromised token; repo scope: Contents read/write on
`AzariahAnderson/fast-gbv-platform` only):

```bash
git push https://<fresh-token>@github.com/AzariahAnderson/fast-gbv-platform.git main
git ls-remote origin main   # must print 09e2f39… (or later if you commit more)
```

Do not store the token in the repo or shell history beyond the single push.

### 3b. Vercel deployment (Section 3)

No Vercel CLI, token or account link exists here. Deploy `main` after the
push (Import Git Repository → framework auto-detected as Next.js; build
`next build`, Next.js default). Then set **exactly** these env vars
(Project → Settings → Environment Variables, all environments):

Required:

```
NEXT_PUBLIC_SUPABASE_URL            (public by design)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (public by design)
SUPABASE_SERVICE_ROLE_KEY           (server-only — never client)
GEMINI_API_KEY                      (server-only — never client)
NEXT_PUBLIC_SITE_URL                (the deployed URL)
CRON_SECRET                         (server-only — never client)
```

Optional (all have safe defaults):

```
NEXT_PUBLIC_MAP_STYLE_URL
NEXT_PUBLIC_PHONE_AUTH_ENABLED
GEMINI_MODEL
```

`vercel.json` registers the hourly cron `0 * * * *` → `/api/refresh`.
When `CRON_SECRET` is set on the Vercel project, Vercel's cron sends
`Authorization: Bearer <CRON_SECRET>` automatically, which is exactly the
header the route's GET guard accepts; the manual POST path stays
origin-guarded as verified in section 1b. After the first deploy, confirm
the three server-only keys are configured as **Server**-scoped (never
exposed to client JavaScript) — and re-run the section 1b leak scan
against the deployed JS bundles.

### 3c. Production verification checklist (Sections 4–6, 9, 10)

Run from the deployed URL and record results under section 2 above:

- Routes: the same battery as section 1b (public 200, protected 307,
  robots/sitemap/manifest 200, unknown → 404 without redirect).
- Supabase flows: signup → onboarding → profile → logout → login; A → B
  message with realtime receipt and reply; typing + read receipts; family
  create/invite/accept/group chat/check-in/need-help; map permission →
  approximate → precise → audience → start → stop → expiry; safety plan
  create/share/revoke + safe arrival; notifications for message,
  invitation, check-in, safe arrival.
- Gemini production test (region-blocked in this sandbox — the deployed
  region may differ). Exactly these three prompts:
  `What is coercive control?`, `How can I help a friend who is being
  abused?`, `I'm in danger right now.` Verify: useful answer / safety-
  focused answer / emergency resources first; no diagnosing, no pretending
  to be emergency services, no claiming to be a therapist, no encouraging
  confrontation or retaliation, no telling someone to stay in danger, no
  unnecessary personal data requests; streaming works. If still
  region-blocked: keep the guardrails and the graceful fallback (already
  verified), expose no API error, and mark
  **HUMAN ACTION REQUIRED — Gemini production region/key configuration**.
- Security headers + cron auth + origin guard: re-run the section 1b
  battery against the deployed domain.
- Lighthouse from the deployed URL (record Performance / Accessibility /
  Best Practices / SEO / FCP / LCP / TBT / CLS; priorities: emergency
  usability → messaging responsiveness → map startup → mobile
  interaction → LCP).

### 3d. Real-phone gate (Sections 7–8) — cannot be proxied

Minimum on one physical Android phone at 390×844: signup/login/logout/
reload; send + receive realtime message with the keyboard open (composer
must stay visible — the v1.1.3 sticky composer is the fix to confirm);
family chat/check-in/need-help; map permission + approximate/precise
share + audience + stop + gestures + attribution; safe-arrival timer with
lock screen and no silent escalation; emergency controls (minimum real
calls, confirm the actual number reached); PWA install, airplane-mode
offline state with emergency experience intact, reconnection. Remaining
minor observations from the proxy audit for the phone pass to confirm:
secondary text links at 16–21 px height (notifications "Open conversation"
/ "Clear", "See families", brand logo links) and map zoom buttons at 29 px
(MapLibre default) — none are safety-critical paths.

### 3e. Sign-off

Only after 3a–3d produce real results: choose **READY FOR CLOSED BETA** or
**NOT READY FOR CLOSED BETA** with the blocker list, in the final report.
