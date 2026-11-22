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
  // data: covers the inline SVG film grain in globals.css, blob: covers
  // in-memory previews no page code currently creates but the platform may.
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
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
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), magnetometer=(), accelerometer=(), gyroscope=(), idle-detection=(), screen-wake-lock=(), display-capture=()",
  },
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
    ];
  },
};

export default nextConfig;
