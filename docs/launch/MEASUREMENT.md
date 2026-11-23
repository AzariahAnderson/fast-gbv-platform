# Privacy-First Measurement

What Fast may measure, what it must never measure, and the honest current
state: **the shipped application deliberately has no analytics at all.**
This document is the policy that keeps it that way as the launch grows.

---

## Current state (v1.0.2)

- No tracking cookies, no fingerprinting, no third-party scripts, no ad
  networks, no pixels. The Content-Security-Policy locks every directive to
  `'self'`, so no third-party origin can load anything — measurement
  included.
- No server-side profiles. There is no database; the personalisation
  profile (language, name, struggles) exists only in the visitor's browser
  storage and is removed with two taps.
- The only server logs are standard hosting logs on Vercel (needed to
  operate the service), never joined with any on-site behaviour.

**This is a decision, not an omission.** A survivor must be able to open
Fast in a monitored household and leave no trace worth finding. Any
measurement that reduces that safety is refused, whatever it promises.

## What may be measured (aggregate only)

| Signal | Source | Why it helps the mission |
| --- | --- | --- |
| Total visits | Hosting aggregate (Vercel Analytics in aggregate mode, or server response counts) | Know the site is reachable at campaign scale |
| Referral source **categories** (only where the browser already sends a referer) | Hosting aggregate | Coarse: social vs search vs direct. Never stored per visitor |
| QR campaign referrals | Per-**category** URL parameter on posters (see below) | Learn which placement *categories* work |
| Resource interactions | Aggregate counters (e.g. "emergency section was opened N times this month"), no IDs, no sessions | Prioritise which resources to improve |
| PWA install events | Aggregate only, where the platform exposes it | Confirm install guidance helps |
| Returning visits | Aggregate cohort counts only | Long-term usefulness, not surveillance |

### QR parameter rules

- Use **category codes, never unique codes**: `/` stays the destination and
  at most one stable, non-identifying category marker may ride along (for
  example `?src=clinic`). The marker must never be combined with anything
  that could single out an individual (time-of-day precision, exact
  location, device data).
- A survivor who photographs a poster's QR should not be able to be
  distinguished from anyone else who scanned the same wall. Coarse
  categories satisfy attribution; unique codes create a trail — so they are
  banned.
- Parameters are never written to storage, never sent to third parties,
  and are stripped from any canonical link.

## What must NEVER be measured

- **Sensitive GBV event tracking** — never record who viewed emergency
  information, which numbers were tapped, or whether a safety plan was
  started. This is the single most dangerous dataset imaginable for the
  people Fast serves, and it must never exist.
- Individual-level surveillance of any kind: no sessions, no user IDs, no
  device fingerprints, no heatmaps, no session recording, no IP retention
  beyond operational necessity.
- Personal profiles or account systems (Fast has none by design).
- Behavioural advertising or any data shared with ad platforms.
- Location data. The Permissions-Policy denies geolocation outright.
- A/B tests on crisis content — a person in danger deserves the best-known
  version, not an experiment.
- Any "engagement" metric that would tempt darker design: time-on-site
  optimisation, notification streaks, return-pressure mechanics.

## Practical alternatives that need no surveillance

1. **Self-reported feedback:** a private contact email; NGOs and
   ambassadors report what people tell them.
2. **Partner pulse checks:** a quarterly one-question email to organisations
   using the posters ("still useful? anything wrong?").
3. **Operational signals already available:** hosting uptime, API error
   rates, cron refresh success — engineering health, not visitor surveillance.
4. **Ambassador field notes:** qualitative, anonymous by default.

## Decision gate for any future measurement

Before any metric ships, it must answer all five:

1. Is it aggregate with no persistent identifier?
2. Could it endanger a survivor if leaked, subpoenaed, or bought?
3. Does it work with the CSP locked to `'self'` (no third-party scripts)?
4. Is it explainable in one sentence to the audience it observes?
5. Would Fast publish the exact list of what it collects?

Any "no" means no. **HUMAN ACTION REQUIRED:** the maintainer owns this
gate; no metric is added implicitly.
