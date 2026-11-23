import { cleanUrl } from "./live-sanitize";

/**
 * Extract the publisher's own social preview image from an article page.
 *
 * Pure and dependency free (no fs, no env, no server-only) so the unit
 * tests can run every HTML shape directly. The image always comes from
 * the article's own markup — og:image / twitter:image — never from the
 * language model, because a model asked for image URLs will happily
 * invent ones that 404 or point somewhere else entirely.
 *
 * Anything that cannot be fully verified is dropped: no meta tags, a
 * relative URL on an https page resolves only if the result is https, a
 * redirect wrapper fails the shared cleanUrl rules, and a plain http
 * image never reaches a visitor. A dropped image simply means the card
 * renders its fallback tile.
 */

/** Decode the handful of entities that appear inside meta content values. */
function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'");
}

// Attribute order varies by publisher: <meta property=... content=...> and
// <meta content=... property=...> are both common, so every source is
// matched in both orders. secure_url is preferred because it is https by
// definition; twitter:image covers publishers that only ship that tag.
const PATTERNS = [
  /<meta[^>]+property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
  /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
];

/** Returns the verified https image URL, or undefined when none can be trusted. */
export function extractThumb(html: string, baseUrl: string): string | undefined {
  for (const pattern of PATTERNS) {
    const match = html.match(pattern);
    if (!match) continue;
    const raw = decodeEntities(match[1].trim());
    try {
      // Publishers often ship relative preview paths; resolve them against
      // the final URL after redirects so the image belongs to the same
      // origin the article actually ended up on.
      const resolved = new URL(raw, baseUrl);
      if (resolved.protocol !== "https:") continue;
      // 700 for images: signed CDN links run long and a truncated
      // signature is a dead link (article URLs keep the 300 cap).
      const verified = cleanUrl(resolved.toString(), 700);
      if (verified) return verified;
    } catch {
      /* malformed URL: fall through to the next candidate tag */
    }
  }
  return undefined;
}
