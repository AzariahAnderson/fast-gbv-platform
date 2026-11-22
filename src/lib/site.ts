/**
 * Canonical origin for metadata, sitemap and structured data. Read from
 * NEXT_PUBLIC_SITE_URL so staging and production can differ. Set the real
 * production domain in Vercel environment variables before launch; the
 * fallback is only a local development default.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fast-gbv.vercel.app";

/**
 * Release version, surfaced in the footer so testers and support workers can
 * report against an exact build. Keep in sync with the version field in
 * package.json.
 */
export const SITE_VERSION = "0.9.0-beta.9";
