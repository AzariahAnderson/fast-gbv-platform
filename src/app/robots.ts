import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Everything on the site is public awareness content and may be crawled.
 * The sitemap line is generated here so it always matches the canonical
 * origin instead of drifting from a hand-written static file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
