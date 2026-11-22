import type { NextConfig } from "next";

/**
 * Production configuration.
 * - No typescript.ignoreBuildErrors: type errors must fail the build.
 * - Strict mode on: catches unsafe effects during development.
 * - Security headers: the site is self-contained, it loads no third-party
 *   origin for scripts, styles, images or connections, so every CSP
 *   directive locks down to 'self'. Inline scripts and styles are allowed
 *   because Next.js hydrates from an inline flight payload and framer
 *   motion animates through inline style attributes; this is the policy
 *   Next.js itself recommends for sites without third-party scripts. A
 *   stricter nonce-based policy would force dynamic rendering on every
 *   request and cost the crisis page the CDN caching that keeps it fast
 *   and cheap on flaky mobile networks, so it is deliberately not used.
 *   Dev-only allowances: 'unsafe-eval' for React refresh and ws: for the
 *   HMR websocket.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // data: covers the inline SVG film grain in globals.css. No page code
  // creates blob: or media URLs, so nothing else is allowed: any attempt
  // to exfiltrate pixels or open a plug-in container fails the policy.
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  // No frames or plug-in containers are used anywhere on the site; saying
  // so explicitly keeps a future dependency from quietly opening one.
  "frame-src 'none'",
  "child-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Survivors follow outbound links to news sources and services;
  // never leak that they came from a GBV support page.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // The legacy XSS auditor is deprecated and itself exploitable; modern
  // guidance is to switch it off explicitly rather than leave it ambiguous.
  { key: "X-XSS-Protection", value: "0" },
  // No other origin may embed any response from this site as a subresource.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    // Every capability a support page never needs is denied outright,
    // including the ones browsers default to allowing on any page: a
    // survivor must never be asked for camera, microphone or location,
    // and no embed can opt into advertising or federated identity APIs.
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=(), payment=(), usb=(), bluetooth=(), magnetometer=(), accelerometer=(), gyroscope=(), idle-detection=(), screen-wake-lock=(), display-capture=(), midi=(), serial=(), hid=(), web-share=(), window-management=(), local-fonts=(), storage-access=(), publickey-credentials-create=(), publickey-credentials-get=(), xr-spatial-tracking=(), compute-pressure=()",
  },
  // Legacy plug-in policy header; 'none' is the only sane value today and
  // silences scanners that still probe for it.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Puts the document in its own agent cluster so a same-site attacker
  // cannot reach it through synchronous cross-document property access.
  { key: "Origin-Agent-Cluster", value: "?1" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev only: the sandbox preview proxies the dev server through a
  // *.space-z.ai origin, which Next.js otherwise warns about on every
  // static asset request. Production is unaffected.
  allowedDevOrigins: ["*.space-z.ai"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The service worker script itself must always be revalidated:
        // a cached sw.js would delay critical fixes (and cache-version
        // bumps) for returning visitors, which is exactly the audience
        // that keeps this page offline.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Local artwork changes only when a release changes it, and the
        // service worker reinstalls its precache with cache:"reload" on
        // every version bump, so a day of freshness with a week of
        // stale-while-revalidate is a safe win on flaky mobile networks:
        // repeat visits render the emoji frame and icons without a single
        // round trip.
        source: "/:asset(emojis|icons|images)/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
