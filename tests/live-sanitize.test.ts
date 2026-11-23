/**
 * Live-data failure mode tests. The sanitiser is the barrier between
 * whatever an engine returns and what a visitor sees; these tests run the
 * failure list against it and assert the outcome is always a usable,
 * grounded payload: the verified baseline, never fake content, never an
 * empty broken card, never a crash.
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
      expect(result.encouragement.length).toBeGreaterThanOrEqual(2);
      expect(result.tip).not.toBe("");
    }
  });

  it("no engine payload can reintroduce a news field", () => {
    const result = sanitizeData({
      stats: BASELINE.stats,
      news: [{ title: "t", summary: "s", source: "x" }],
    });
    expect("news" in result).toBe(false);
  });

  it("missing fields keep the previous good payload", () => {
    const previous: LiveData = {
      ...BASELINE,
      stats: BASELINE.stats.slice(0, 2),
    };
    const result = sanitizeData({ stats: [{ value: "1", label: "x", source: "y" }] }, previous);
    // A single stat is below the grounding floor, so the previous payload stays.
    expect(result.stats.length).toBe(2);
    expect(result.encouragement).toEqual(previous.encouragement);
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
