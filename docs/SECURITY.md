# Security policy

Fast exists to connect people in danger to help. Its security posture is
part of that promise: the site carries no accounts, no tracking cookies and
no server-side personal data, and it must never become an attack vector
against the people who trust it.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

- Use GitHub's **private vulnerability reporting** on this repository
  (Security tab -> Report a vulnerability). It is private by default.
- Include the affected URL or file, the steps to reproduce, and what data
  could be at risk.

The maintainers respond to credible reports as a priority, and fix
safety-relevant issues before any feature work.

## Supported configuration

Only the latest commit on `main`, deployed on the official hosting, is
supported.

## Current posture

| Layer | Status |
| --- | --- |
| Content-Security-Policy | `default-src 'self'`; every directive locked to `'self'`; `frame-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`. Article preview images are served same-origin through the constrained `/api/image` proxy, so even `img-src` stays `'self'` — no third-party image origins were added when thumbnails shipped. See the rationale below. |
| Permissions-Policy | Camera, microphone, geolocation and ~22 other capabilities denied outright — a support page never needs them, so a survivor is never prompted for one. |
| Referrer-Policy | `no-referrer`: outbound clicks to news sources and services never reveal that the visitor came from a GBV support page. |
| Frame protection | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, CORP `same-origin`, COOP `same-origin`. |
| Transport | HSTS `max-age=63072000; includeSubDomains; preload` and `upgrade-insecure-requests` in production. |
| Misc | `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 0` (auditor deprecated), `X-Permitted-Cross-Domain-Policies: none`, `Origin-Agent-Cluster: ?1`, `poweredByHeader: false`. |
| Post-login redirects | The login `next` parameter is validated against a fixed allow-rule (`src/lib/safe-redirect.ts`): only same-origin relative paths survive; external, protocol-relative and scheme-bearing values fall back to `/home`. Unit-tested in `tests/safe-redirect.test.ts`. |
| AI route (`/api/ai/chat`) | Re-verifies the session inside the route (middleware-independent), then applies a per-user fixed-window rate limit (10 requests/min per warm instance) before spending Gemini quota. Provider failures (429, 400, timeout, network, mid-stream reset) always resolve to a calm plain-text answer with the crisis line — never a raw 500, never provider internals, never the key. |
| Service worker | Public pages and static assets are cached; authenticated app routes (`/home`, `/messages`, `/family`, `/map`, `/safety`, `/ai`, `/profile`, `/notifications`, `/settings`, `/onboarding`) are network-only and never written to Cache Storage, so signed-in HTML leaves no readable trace on shared devices after sign-out. Cache versioning wipes every older generation on activation. |

### Why the CSP keeps `'unsafe-inline'` for scripts and styles

Next.js hydrates from an inline flight payload and framer-motion animates
through inline style attributes. A nonce- or hash-based policy would force
dynamic rendering on every request and cost the crisis page the CDN caching
that keeps it fast and cheap on flaky mobile networks. The policy is the one
Next.js recommends for sites without third-party scripts, and Fast loads
zero third-party origins for scripts, styles, images or connections, so the
inline allowance cannot pull in foreign code. This decision is documented
in `next.config.ts` and was evaluated deliberately rather than inherited.

## Data flows

- **Browser -> `/api/live`**: read-only JSON. The page renders a verified
  baseline first and never blocks on this request.
- **Browser -> `/api/refresh` (POST)**: origin-guarded CSRF protection; the
  server rate-limits real generations to roughly one per nine minutes.
- **Vercel cron -> `/api/refresh` (GET)**: when `CRON_SECRET` is configured,
  the request must carry `Authorization: Bearer <secret>`, compared with a
  timing-safe equality check.
- **Browser -> `/api/ai/chat` (POST)**: session-verified and per-user rate
  limited server route that streams the FAST Guide's plain-text answer. The
  Gemini key and any provider error detail stay on the server.
- **Visitor profile** (language, name, struggles): stored in `localStorage`
  on the visitor's device only. It is never transmitted to any server, and
  the welcome flow includes a two-tap "Remove my greeting" path that deletes
  it from the device.
- **Emergency numbers**: static, verified data in `src/lib/numbers.ts`. No
  AI model or network request can alter them.

## Secret handling

- `GEMINI_API_KEY`, `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are
  server-side environment variables. `GEMINI_API_KEY` is consumed only
  inside `src/lib/live-fetch.ts` and `src/app/api/ai/chat/route.ts` (both
  guarded by `server-only`). It must never appear in client code.
- The full required-variable list is auditable at any time with
  `node scripts/check-env.mjs` (or `bun run check:env`); it prints presence
  only, never values.
- `.env` is git-ignored. Before this repository was published, its full
  history was audited for secret material and the `.env` path was purged
  from history entirely.
- **HUMAN ACTION REQUIRED:** the development Gemini API key was exposed
  during development and must be treated as compromised. Revoke it in the
  Google AI Studio dashboard, create a fresh key, and set it only in the
  production hosting environment. Never commit the replacement. A GitHub
  personal access token was likewise exposed in a conversation and must be
  rotated in GitHub settings.

## Deployment checklist

1. All six required variables set in Vercel (run `node scripts/check-env.mjs
   --strict` locally with the same values to confirm): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GEMINI_API_KEY` (fresh key, old key revoked), `NEXT_PUBLIC_SITE_URL`,
   `CRON_SECRET`.
2. Vercel project imported from `AzariahAnderson/fast-gbv-platform`; framework
   detection Next.js; build and install commands left at package defaults.
3. The Vercel cron (defined in `vercel.json`) delivers the `CRON_SECRET`
   bearer token to `/api/refresh` automatically.
4. After first deploy: verify the headers above on the production domain and
   run the public smoke suite (`bun run test:e2e`, smoke project) against the
   live URL.
