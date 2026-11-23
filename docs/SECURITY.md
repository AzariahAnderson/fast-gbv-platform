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
| Content-Security-Policy | `default-src 'self'`; every directive locked to `'self'`; `frame-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`. See the rationale below. |
| Permissions-Policy | Camera, microphone, geolocation and ~22 other capabilities denied outright — a support page never needs them, so a survivor is never prompted for one. |
| Referrer-Policy | `no-referrer`: outbound clicks to news sources and services never reveal that the visitor came from a GBV support page. |
| Frame protection | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, CORP `same-origin`, COOP `same-origin`. |
| Transport | HSTS `max-age=63072000; includeSubDomains; preload` and `upgrade-insecure-requests` in production. |
| Misc | `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 0` (auditor deprecated), `X-Permitted-Cross-Domain-Policies: none`, `Origin-Agent-Cluster: ?1`, `poweredByHeader: false`. |

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
- **Visitor profile** (language, name, struggles): stored in `localStorage`
  on the visitor's device only. It is never transmitted to any server, and
  the welcome flow includes a two-tap "Remove my greeting" path that deletes
  it from the device.
- **Emergency numbers**: static, verified data in `src/lib/numbers.ts`. No
  AI model or network request can alter them.

## Secret handling

- `GEMINI_API_KEY`, `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` are
  server-side / build environment variables. `GEMINI_API_KEY` is consumed
  only inside `src/lib/live-fetch.ts` (guarded by `server-only`) and the API
  routes. It must never appear in client code.
- `.env` is git-ignored. Before this repository was published, its full
  history was audited for secret material and the `.env` path was purged
  from history entirely.
- **HUMAN ACTION REQUIRED:** the development Gemini API key was exposed
  during development and must be treated as compromised. Revoke it in the
  Google AI Studio dashboard, create a fresh key, and set it only in the
  production hosting environment. Never commit the replacement.

## Deployment checklist

1. `GEMINI_API_KEY` set in Vercel (server-side), fresh key, old key revoked.
2. `NEXT_PUBLIC_SITE_URL` set to the real production origin.
3. `CRON_SECRET` set and the Vercel cron sending it as a Bearer token.
4. After first deploy: verify the headers above on the production domain.
