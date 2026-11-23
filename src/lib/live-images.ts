import "server-only";

import type { LiveData } from "./live-types";
import { extractThumb } from "./thumb-extract";

/**
 * Best-effort thumbnail enrichment, run once per hourly refresh after an
 * engine succeeds. Each news item's own article page is fetched with a
 * short timeout and its og:image extracted; the image URL is stored on the
 * item and later served to visitors through the constrained /api/image
 * proxy, so publisher servers never see a visitor's IP.
 *
 * This deliberately runs for every engine (Gemini and the web-search
 * fallback alike) because both produce real article URLs, and it never
 * runs for the verified baseline, whose URLs are organisation homepages
 * rather than articles. Every failure — bot wall, timeout, missing tag,
 * oversized page — simply leaves the item without an image, which renders
 * as the fallback tile. Nothing is invented to fill the gap.
 */

const FETCH_TIMEOUT_MS = 4_000;
const MAX_HTML_CHARS = 400_000;
const UA =
  "Mozilla/5.0 (compatible; FAST-crisis-support/1.0; reads article previews only)";

export async function withThumbnails(data: LiveData): Promise<LiveData> {
  if (!data.news.length) return data;
  const news = await Promise.all(
    data.news.map(async (item): Promise<LiveData["news"][number]> => {
      if (!item.sourceUrl || item.image) return item;
      try {
        const res = await fetch(item.sourceUrl, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          redirect: "follow",
          headers: { Accept: "text/html", "User-Agent": UA },
        });
        if (!res.ok) return item;
        // Read only the head of the document: the social preview tags live
        // in <head>, and capping the parse keeps a huge page from costing
        // memory on a tiny serverless instance.
        const html = (await res.text()).slice(0, MAX_HTML_CHARS);
        const image = extractThumb(html, res.url || item.sourceUrl);
        return image ? { ...item, image } : item;
      } catch {
        // Timeout, bot wall, offline: the card keeps its fallback tile.
        return item;
      }
    }),
  );
  return { ...data, news };
}
