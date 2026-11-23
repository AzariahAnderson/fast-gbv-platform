/**
 * Live-data failure mode tests. The sanitiser is the barrier between
 * whatever an engine returns and what a visitor sees; these tests run the
 * whole Phase 7 failure list against it and assert the outcome is always a
 * usable, grounded payload: the verified baseline, never fake content,
 * never an empty broken card, never a crash.
 */

import { describe, expect, it } from "bun:test";
import { sanitizeData } from "../src/lib/live-sanitize";
import { BASELINE, type LiveData } from "../src/lib/live-types";

describe("live data failure modes", () => {
  it("malformed payloads of every shape fall back to the baseline", () => {
    for (const raw of [null, undefined, 42, "not json at all", [], true]) {
      const result = sanitizeData(raw);
      expect(result.generator).toBe("baseline");
      expect(result.stats.length).toBeGreaterThanOrEqual(2);
      expect(result.news.length).toBeGreaterThanOrEqual(1);
      expect(result.encouragement.length).toBeGreaterThanOrEqual(2);
      expect(result.tip).not.toBe("");
    }
  });

  it("missing fields keep the previous good payload", () => {
    const previous: LiveData = {
      ...BASELINE,
      stats: BASELINE.stats.slice(0, 2),
    };
    const result = sanitizeData({ stats: [{ value: "1", label: "x", source: "y" }] }, previous);
    // A single stat is below the grounding floor, so the previous payload stays.
    expect(result.stats.length).toBe(2);
    expect(result.news).toEqual(previous.news);
  });

  it("invalid URLs are dropped, never shown", () => {
    const result = sanitizeData({
      stats: [
        { value: "1 in 3", label: "lifetime prevalence", source: "HSRC, 2024", sourceUrl: "javascript:alert(1)" },
        { value: "5x", label: "femicide rate", source: "WHO", sourceUrl: "http://insecure.example" },
        { value: "24/7", label: "always answered", source: "DSD", sourceUrl: "https://www.dsd.gov.za/redirect?http://evil" },
      ],
    });
    for (const stat of result.stats) {
      expect(stat.sourceUrl).toBeUndefined();
    }
  });

  it("redirect-wrapped search links are dropped", () => {
    const result = sanitizeData({
      stats: [
        { value: "1 in 3", label: "a", source: "b", sourceUrl: "https://www.google.com/url?q=https://realsource.example" },
        { value: "2", label: "c", source: "d", sourceUrl: "https://news.example/article" },
      ],
    });
    expect(result.stats[0].sourceUrl).toBeUndefined();
    expect(result.stats[1].sourceUrl).toBe("https://news.example/article");
  });

  it("invalid dates are dropped and dated news sorts latest first", () => {
    const result = sanitizeData({
      news: [
        { title: "t", summary: "s", source: "src", date: "13/45/2024" },
        { title: "t2", summary: "s2", source: "src2", date: "2024-02-30" },
        { title: "t3", summary: "s3", source: "src3", date: "2024-03-05" },
      ],
    });
    // The two invalid dates are gone; the valid one now leads the cards.
    expect(result.news[0].date).toBe("2024-03-05");
    expect(result.news[1].date).toBeUndefined();
    expect(result.news[2].date).toBeUndefined();
  });

  it("news sorts latest first, undated items last", () => {
    const result = sanitizeData({
      news: [
        { title: "older", summary: "s", source: "a", date: "2024-01-10" },
        { title: "newest", summary: "s", source: "b", date: "2024-05-02" },
        { title: "undated", summary: "s", source: "c" },
        { title: "mid", summary: "s", source: "d", date: "2024-03-01" },
      ],
    });
    expect(result.news.map((n) => n.title)).toEqual(["newest", "mid", "older", "undated"]);
  });

  it("thumbnail URLs pass the same https validation as source URLs", () => {
    const result = sanitizeData({
      news: [
        { title: "a", summary: "s", source: "x", image: "javascript:alert(1)" },
        { title: "b", summary: "s", source: "y", image: "http://cdn.example/pic.jpg" },
        { title: "c", summary: "s", source: "z", image: "https://cdn.example/pic.jpg" },
        { title: "d", summary: "s", source: "w" },
      ],
    });
    expect(result.news[0].image).toBeUndefined();
    expect(result.news[1].image).toBeUndefined();
    expect(result.news[2].image).toBe("https://cdn.example/pic.jpg");
    expect(result.news[3].image).toBeUndefined();
  });

  it("a cached payload keeps its verified thumbnail", () => {
    const cached = sanitizeData({
      news: [
        {
          title: "a",
          summary: "s",
          source: "x",
          sourceUrl: "https://news.example/a",
          image: "https://cdn.example/pic.jpg",
        },
      ],
      stats: BASELINE.stats,
    });
    const restored = sanitizeData(cached);
    expect(restored.news[0].image).toBe("https://cdn.example/pic.jpg");
  });

  it("long signed CDN image URLs are kept intact", () => {
    // Signed CDN links run far beyond the 300-char article cap; a truncated
    // signature is a dead link, so image URLs get a wider limit.
    const long = `https://cdn.example/pic.jpg?sig=${"a".repeat(500)}`;
    const result = sanitizeData({
      news: [{ title: "a", summary: "s", source: "x", image: long }],
    });
    expect(result.news[0].image).toBe(long);
  });

  it("oversized text is truncated to the display limits", () => {
    const result = sanitizeData({
      stats: [
        { value: "x".repeat(200), label: "y".repeat(500), source: "z".repeat(400) },
        { value: "ok", label: "fine", source: "fine" },
      ],
      tip: "t".repeat(1000),
    });
    expect(result.stats[0].value.length).toBeLessThanOrEqual(40);
    expect(result.stats[0].label.length).toBeLessThanOrEqual(220);
    expect(result.stats[0].source.length).toBeLessThanOrEqual(120);
    expect(result.tip.length).toBeLessThanOrEqual(240);
  });

  it("an empty news list falls back to the baseline news", () => {
    const result = sanitizeData({ news: [], stats: BASELINE.stats });
    expect(result.news).toEqual(BASELINE.news);
  });

  it("items missing a source are dropped entirely", () => {
    const result = sanitizeData({
      stats: [
        { value: "1 in 3", label: "prevalence" },
        { value: "5x", label: "femicide", source: "WHO" },
        { value: "24/7", label: "always", source: "DSD" },
      ],
    });
    // The sourceless item never reaches a visitor.
    expect(result.stats.length).toBe(2);
    for (const stat of result.stats) {
      expect(stat.source).not.toBe("");
    }
  });

  it("the generator label is whitelisted", () => {
    expect(sanitizeData({ stats: BASELINE.stats, generator: "hacked" }).generator).toBe("gemini");
    expect(sanitizeData({ stats: BASELINE.stats, generator: "websearch" }).generator).toBe("websearch");
  });
});
