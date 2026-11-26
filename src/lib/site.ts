/**
 * Canonical origin for metadata, sitemap and structured data. Read from
 * NEXT_PUBLIC_SITE_URL so staging and production can differ.
 *
 * The default below is the production origin (fastprevention.vercel.app).
 * Override it by setting NEXT_PUBLIC_SITE_URL in the hosting environment —
 * for example on a preview deployment or a future custom domain. Always
 * without a trailing slash.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fastprevention.vercel.app";

/**
 * Release version, kept in sync with the version field in package.json so
 * testers and support workers can report against an exact build. Surfaced
 * through the app shell (PWA manifest update notes and support replies).
 */
export const SITE_VERSION = "1.1.7";
