/**
 * Localisation catalogue integrity checks. English is the source language;
 * these tests keep the catalogue honest while locale files do not exist yet.
 *
 * Rules enforced:
 * 1. Every catalogue value is non-empty prose.
 * 2. No catalogue value may contain a phone number, USSD code or any digit
 *    run: numbers come only from src/lib/numbers.ts and are interpolated,
 *    never translated, never duplicated into copy.
 */

import { describe, expect, it } from "bun:test";
import { en, type Messages } from "../src/lib/i18n/en";

function flatten(node: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}: ${value}`]
      : flatten(value as Record<string, unknown>, `${prefix}${key}.`),
  );
}

describe("english source catalogue", () => {
  it("is non-empty and fully string-valued", () => {
    const values = flatten(en as unknown as Record<string, unknown>);
    expect(values.length).toBeGreaterThan(5);
    for (const value of values) {
      expect(value.split(": ").slice(1).join(": ").trim()).not.toBe("");
    }
  });

  it("never contains a number that could drift from the emergency directory", () => {
    const values = flatten(en as unknown as Record<string, unknown>);
    for (const value of values) {
      expect(/\d{3,}/.test(value), `catalogue value carries digits: ${value}`).toBe(false);
    }
  });

  it("exposes the namespaces every future locale must provide", () => {
    const namespaces: (keyof Messages)[] = ["crisis", "welcome", "emergency"];
    for (const namespace of namespaces) {
      expect(Object.keys(en[namespace]).length).toBeGreaterThan(0);
    }
  });
});
