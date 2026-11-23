/**
 * Canonical origin for metadata, sitemap and structured data. Read from
 * NEXT_PUBLIC_SITE_URL so staging and production can differ.
 *
 * HUMAN ACTION REQUIRED before production: set NEXT_PUBLIC_SITE_URL in the
 * hosting environment (Vercel) to the real production origin. The fallback
 * below exists only so local development can resolve absolute metadata
 * URLs; it is a placeholder domain and must never be the shipped canonical.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fast-gbv.vercel.app";

/**
 * Release version, kept in sync with the version field in package.json so
 * testers and support workers can report against an exact build. Surfaced
 * through the app shell (PWA manifest update notes and support replies).
 */
export const SITE_VERSION = "1.1.5";
