/**
 * Canonical origin for metadata, sitemap and structured data. Read from
 * NEXT_PUBLIC_SITE_URL so staging and production can differ. Set the real
 * production domain in Vercel environment variables before launch; the
 * fallback is only a local development default.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fast-gbv.vercel.app";
