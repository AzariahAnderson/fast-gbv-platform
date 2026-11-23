# Fast — Family Assistance & Safety Technology

> **When it hurts most, help answers fast.**

Fast is a South African gender-based violence (GBV) support platform: one
calm, fast, single page that routes survivors, witnesses and those who cause
harm to free, official, around-the-clock help — even on a weak mobile
network, even offline, even when the page itself is broken.

- **In danger now?** The GBV Command Centre answers 24 hours a day, free, in
  all 11 official languages: **0800 428 428**. Police: **10111**. From any
  cellphone without airtime: **112**.
- No sign-up. No accounts. No tracking cookies. Nothing you type is sent to
  a server. The page works offline.

Fast is an independent public-interest project. It is not a government
service and does not replace one; it connects people to the real ones,
faster.

---

## Why Fast exists

South Africa's GBV services are real, free and staffed around the clock —
but finding the right number in the worst moment is hard. Fast compresses
that search into one screen that loads instantly, keeps the crisis line one
tap away at all times, and keeps working when the network does not.

Design principles, treated as hard rules rather than preferences:

1. **Crisis-first.** The emergency number is reachable from the hero, the
   navbar, the sticky bar, the welcome flow, the footer and every error
   boundary. Onboarding can never trap a visitor.
2. **One authoritative directory.** Every number comes from a single
   verified source (`src/lib/numbers.ts`). Numbers are never invented,
   derived or "improved" anywhere else, and no AI model can alter them.
3. **No fabricated content.** Statistics and news are shown only with a
   real publishing organisation and a real source URL. If a live engine
   cannot ground an item, the item is dropped — never invented.
4. **Privacy by architecture.** The personalisation profile (language,
   name, struggles) lives in `localStorage` on the visitor's device only.
   There is no user account, no cookie banner and no backend copy. A
   two-tap "Remove my greeting" flow deletes it.
5. **Calm, restrained design.** A four-colour identity (deep ink `#454040`,
   taupe `#605B51`, gold `#D8D365`, lime `#E6F082`), Inter throughout,
   editorial typography, quiet motion. No neon, no fake dashboards, no
   decoration that competes with the crisis content.

## What is on the page

Fourteen sections, in order: a preloader splash; a welcome flow that offers
the visitor one of South Africa's eleven official languages, a compulsory
appropriateness-checked name and a private, optional multi-select of what
they are going through; service-worker registration; a navbar with a
persistent crisis call button; a hero with the crisis line and an animated
emoji frame; a rotating encouragement strip; the full emergency directory
with featured lines, silent channels (please-call-me and SMS) and a grouped,
collapsible directory; survivor pathways; live data (verified statistics and
news with sources); a behaviour-change section for those who cause harm; a
step-by-step "how Fast works"; an FAQ; a closing call to action; and a
footer that repeats the crisis line.

## Architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, standalone output), React 19, TypeScript strict |
| Styling | Tailwind CSS 4, custom design tokens, Inter variable font |
| Motion | framer-motion, one shared easing curve (`src/lib/motion.ts`) |
| UI primitives | Radix accordion + toast (the only UI kit pieces actually used) |
| Runtime | bun; Vercel hosting with an hourly cron |
| PWA | Hand-written service worker (`public/sw.js`) + web app manifest |
| Live data | Gemini with Google Search grounding -> plain Gemini -> platform web search -> verified baseline |
| State | No database, no auth, no analytics. Everything renders from static data or the hourly cached payload |

### Live-data fallback chain

```
hourly cron (Vercel, 0 * * * *)        manual refresh button
            |                                  |
            v                                  v
        /api/refresh  (Bearer CRON_SECRET / origin-guarded POST)
            |
            v
   1. Gemini + Google Search grounding
   2. Gemini without tools          <- if grounding quota fails
   3. platform web search           <- real results, LLM only composes
   4. verified baseline             <- if every engine fails
            |
            v
   memory cache -> disk cache (/tmp on Vercel) -> baseline
            |
            v
        /api/live  (public read, s-maxage=600, stale-while-revalidate)
```

Every statistic carries an organisation, a year where applicable and a real
https source URL; every news item carries a publisher, a date and a real
article URL. The sanitiser drops anything ungrounded: malformed JSON, invalid
URLs, bad dates, redirect-wrapped links, oversized text, empty lists. The
verified baseline renders instantly on first paint, so the section is never
empty and never shows a spinner instead of help.

### Offline behaviour

The service worker (`fast-v11`) precaches the offline fallback, the manifest,
icons and every local emoji animation on install, using `cache:"reload"` so
version bumps always install true bytes. Visited pages are cached
network-first with a hard timeout; the `/api/live` payload falls back to the
last successful response; static assets are cache-first. When everything
fails, `public/offline.html` renders with the crisis line and the police
number still tappable. No offline path can produce an uncaught exception, and
the emergency section can never disappear because a live API is down.

## Project structure

```
src/
  app/
    layout.tsx          metadata, fonts, lang="en-ZA"
    page.tsx            section composition + JSON-LD structured data
    error.tsx           route error boundary (emergency numbers pinned)
    global-error.tsx    root error boundary (self-contained, numbers pinned)
    api/live/           public read path for the live payload
    api/refresh/        hourly cron + manual refresh (authenticated)
    robots.ts, sitemap.ts, globals.css, icons
  components/
    site/               preloader, welcome, navbar, hero, emergency, live, ...
    ui/                 accordion, toast (only the pieces actually used)
  hooks/                use-live, use-toast
  lib/
    numbers.ts          THE emergency directory (single source of truth)
    live-fetch.ts       engine chain + sanitiser + caching (server-only)
    live-types.ts       shared contract + verified baseline content
    i18n/en.ts          English source catalogue (localisation stage 1)
    profile.ts          device-only welcome profile (localStorage)
    name-guard.ts       appropriateness check for the compulsory name
    languages.ts        the 11 official South African languages
    motion.ts, splash.ts, site.ts, faqs.ts, struggles.ts, utils.ts
tests/
  directory-integrity.test.ts   the safety-critical directory guard
  i18n.test.ts                  catalogue integrity
public/
  sw.js, offline.html, manifest.webmanifest, emojis/, icons/, images/
docs/
  SECURITY.md                           security posture + reporting
  EMERGENCY_DIRECTORY_VERIFICATION.md   human verification workflow
  LOCALISATION.md                       localisation architecture
```

## Getting started

Prerequisites: [bun](https://bun.sh) 1.1+ (Node 20+ works for dev too).

```bash
bun install
bun run dev          # http://localhost:3000
```

The site runs fully without any environment variable: the live section
serves the verified baseline until a Gemini key exists.

## Environment variables

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | server-side only (Vercel / local `.env`) | for live engines | Gemini API key. Consumed only inside `src/lib/live-fetch.ts` (guarded by `server-only`) and the API routes. Never in client code. |
| `NEXT_PUBLIC_SITE_URL` | build environment | **required in production** | Canonical origin for metadata, sitemap and JSON-LD. The code fallback is a placeholder domain and must never ship as the canonical. |
| `CRON_SECRET` | server-side only | recommended in production | If set, the hourly cron must send `Authorization: Bearer <secret>`; the comparison is timing-safe. |
| `GEMINI_MODEL`, `GEMINI_BASE_URL` | server-side only | optional | Model overrides for testing. |

**HUMAN ACTION REQUIRED before production:** revoke the development Gemini
key (it was exposed during development and must be treated as compromised),
create a fresh one, and set `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL` and
`CRON_SECRET` in the production hosting environment. See
[docs/SECURITY.md](docs/SECURITY.md).

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Development server on port 3000 |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit`; type errors always fail the build |
| `bun run test` | All bun tests |
| `bun run test:directory` | The emergency directory integrity test |
| `bun run db:push` | No-op. Fast keeps no database; the script exists only so the sandbox dev harness keeps working |

## Testing and verification

**Directory integrity (the safety-critical guard).**
`tests/directory-integrity.test.ts` treats `src/lib/numbers.ts` as the only
authoritative source and verifies, on every run:

- directory data is structurally sound: no duplicate numbers, call-channel
  entries always carry dialable digits, SMS/USSD channels never do,
  international forms exactly match national digits;
- the crisis line constant matches its directory entry;
- **no component under `src/` hardcodes any emergency number or builds a raw
  `tel:` link** — comment-stripped source is scanned for every directory
  number in display and digits form;
- `public/offline.html` may only present numbers that exist in the
  directory, so even the static offline fallback cannot drift.

A number changed in one place but not another fails the build.

**Localisation catalogue.** `tests/i18n.test.ts` keeps the English source
catalogue honest: prose only, no digits that could drift from the directory.

**Static checks.** `bun run typecheck` and `bun run lint` must pass; no
TypeScript or ESLint errors are ignored anywhere in the configuration.

**Browser smoke tests.** Playwright coverage lives in `tests/e2e/` and
covers desktop, mobile, PWA/offline and accessibility basics (see
`tests/e2e/README.md` when present). Run against a production build:

```bash
bun run build && bun run start &
bunx playwright test
```

## Deployment (Vercel)

1. Import the repository into Vercel; the framework preset detects Next.js.
2. Set `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL` and `CRON_SECRET` in the
   project's environment variables (server-side, not exposed to the
   browser).
3. The hourly cron is declared in `vercel.json` as `0 * * * *` calling
   `/api/refresh`; Vercel sends the cron secret automatically when
   `CRON_SECRET` is configured.
4. Deploy, then verify on the production domain:
   - the security headers (see docs/SECURITY.md) are present;
   - `/robots.txt` and `/sitemap.xml` resolve to the real domain;
   - the emergency section dials correctly from a real phone;
   - airplane mode: reload -> the cached page or the offline fallback keeps
     the crisis numbers tappable.

No deployment URL is hard-coded anywhere in the repository; the production
origin comes from `NEXT_PUBLIC_SITE_URL` only.

## Security

The full posture — CSP and its documented trade-off, Permissions-Policy,
Referrer-Policy, frame protection, HSTS, API authentication, data flows and
secret handling — is in [docs/SECURITY.md](docs/SECURITY.md). Report
vulnerabilities privately through GitHub's vulnerability reporting; never in
a public issue.

## Emergency directory maintenance

Numbers and office hours change. The human verification workflow — what to
check, where the official source is, how often, who approves, and how
changes are recorded — is in
[docs/EMERGENCY_DIRECTORY_VERIFICATION.md](docs/EMERGENCY_DIRECTORY_VERIFICATION.md).

## Localisation

English is the source language. The localisation architecture (typed
catalogue, translation review rules, the things that must never vary between
locales) is in [docs/LOCALISATION.md](docs/LOCALISATION.md). Machine
translation of crisis guidance is forbidden; locales ship only after human
review.

## Accessibility

- Semantic landmarks, one `h1`, ordered headings, `aria-expanded` and
  `aria-controls` on the collapsible directory and FAQ accordion, labelled
  dialogs, a skip link straight to the emergency numbers.
- Visible focus states throughout; keyboard operation for the whole page
  including the welcome flow (Escape always works, the crisis line is pinned
  on every step).
- `prefers-reduced-motion` disables the emoji frame and reveal animations.
- Contrast: gold-on-ink foregrounds and taupe surfaces are checked against
  the palette; body text is warm neutral, never coloured lime (lime is
  reserved for interaction states).
- Tap targets: crisis buttons meet the large-target guidance on mobile
  (`min-h-10` to `min-h-14`).

## Known limitations

- The live section depends on external engines; when every engine fails the
  verified baseline is shown, which is current as of its own verification
  date and labelled as such.
- The page is English-only content today (greeting greetings aside); the
  localisation architecture is in place, reviewed translations are not.
- The Gemini key, production domain and cron secret are environment
  configuration the maintainers must set — the repository deliberately
  contains none of them.

## Disclaimer

Fast links to and displays information about official South African
services. It is an independent awareness project, not an emergency service,
and it is not affiliated with any government department. In an emergency,
call the services directly — the numbers on this page come from the
directory in `src/lib/numbers.ts`, and that file is the only place they are
maintained.

## License

All rights reserved by the project owners unless a license file is added in
a future release.
