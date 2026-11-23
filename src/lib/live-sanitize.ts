import type { LiveData, LiveNews, LiveStat } from "./live-types";
import { BASELINE } from "./live-types";

/**
 * The defensive normaliser every engine payload passes through before a
 * visitor sees it. Pure and dependency free (no fs, no env, no server-only)
 * so tests can run it against every failure mode directly: malformed JSON,
 * missing fields, invalid URLs, invalid dates, oversized text and empty
 * lists. Anything that cannot be fully grounded is dropped and the previous
 * valid payload (or the verified baseline) takes over.
 */

function cleanText(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Keep only genuine https links: anything else (http, javascript:, redirect
 * wrappers) is dropped rather than shown to a visitor. Exported so the
 * thumbnail extractor applies exactly the same rules to scraped image URLs.
 * Article links are capped at 300 characters; image URLs may carry up to
 * 700, because signed CDN links (fbcdn, Akamai tokens) run far longer than
 * an article path and a truncated signature is a dead link.
 */
export function cleanUrl(input: unknown, max = 300): string | undefined {
  if (typeof input !== "string") return undefined;
  const url = input.trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) return undefined;
  // Search providers sometimes wrap results in redirect links; those are not
  // real sources, so they are dropped rather than shown to a visitor. Any
  // https URL that smuggles another URL inside its query is a redirect
  // wrapper too.
  if (/^https:\/\/(www\.)?google\.[a-z.]+\/(goto|url)\?/i.test(url)) return undefined;
  if (/\?.*https?:\/\//i.test(url)) return undefined;
  return url.slice(0, max);
}

function cleanDate(input: unknown): string | undefined {
  const date = cleanText(input, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  // Calendar-validate the shape: 2024-02-30 must not reach a visitor as a
  // date, because JavaScript would silently normalise it to March.
  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === date ? date : undefined;
}

/** Defensively normalise anything an engine returns before it reaches a visitor. */
export function sanitizeData(raw: unknown, previous?: LiveData): LiveData {
  const prev = previous?.stats?.length ? previous : BASELINE;
  const fallback: LiveData = {
    updatedAt: prev.updatedAt || BASELINE.updatedAt,
    generator: prev.generator || "baseline",
    stats: prev.stats.length ? prev.stats : BASELINE.stats,
    news: prev.news.length ? prev.news : BASELINE.news,
    encouragement: prev.encouragement.length ? prev.encouragement : BASELINE.encouragement,
    tip: prev.tip || BASELINE.tip,
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const obj = raw as Record<string, unknown>;

  // Fresh engine output carries no timestamp; a payload restored from the
  // cache does. Preserve the original so "updated at" reflects when the
  // data was actually generated, not when the cache happened to be read.
  const restoredAt =
    typeof obj.updatedAt === "string" && !Number.isNaN(Date.parse(obj.updatedAt))
      ? obj.updatedAt
      : new Date().toISOString();

  const stats: LiveStat[] = Array.isArray(obj.stats)
    ? (obj.stats as Record<string, unknown>[])
        .map((s) => ({
          value: cleanText(s?.value, 40),
          label: cleanText(s?.label, 220),
          source: cleanText(s?.source, 120),
          sourceUrl: cleanUrl(s?.sourceUrl),
        }))
        .filter((s) => s.value && s.label && s.source)
        .slice(0, 4)
    : [];

  const news: LiveNews[] = Array.isArray(obj.news)
    ? (obj.news as Record<string, unknown>[])
        .map((n) => ({
          title: cleanText(n?.title, 160),
          summary: cleanText(n?.summary, 320),
          source: cleanText(n?.source, 120),
          sourceUrl: cleanUrl(n?.sourceUrl),
          date: cleanDate(n?.date),
          image: cleanUrl(n?.image, 700),
        }))
        .filter((n) => n.title && n.summary && n.source)
        // Latest reporting leads: dated items sort newest first and undated
        // items sink to the end instead of breaking the reading order.
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, 4)
    : [];

  const encouragement = Array.isArray(obj.encouragement)
    ? (obj.encouragement as unknown[])
        .map((e) => cleanText(e, 140))
        .filter(Boolean)
        .slice(0, 16)
    : [];

  const tip = cleanText(obj.tip, 240);

  return {
    updatedAt: restoredAt,
    generator: obj.generator === "websearch" ? "websearch" : "gemini",
    stats: stats.length >= 2 ? stats : fallback.stats,
    news: news.length >= 1 ? news : fallback.news,
    encouragement: encouragement.length >= 2 ? encouragement : fallback.encouragement,
    tip: tip || fallback.tip,
  };
}
