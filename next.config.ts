import type { NextConfig } from "next";

/**
 * Production configuration.
 * - No typescript.ignoreBuildErrors: type errors must fail the build.
 * - Strict mode on: catches unsafe effects during development.
 * - Security headers: hardening that does not affect how the page renders.
 *   A CSP is deliberately not set here: Next.js inline bootstrap scripts need
 *   a nonce-based middleware CSP, which is a bigger change than is safe to
 *   bolt on in this pass. Everything else ships now.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Survivors follow outbound links to news sources and services;
          // never leak that they came from a GBV support page.
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
