import { describe, expect, test } from "bun:test";
import { normalisePhone, displayPhone } from "../src/lib/phone";
import { makeApproximate } from "../src/lib/app/map-style";

/**
 * Parity and behaviour tests for the privacy-critical helpers the client
 * shares with the database: phone normalisation must agree with the SQL
 * normalise_phone() (same rules, same output), and approximate location
 * precision must genuinely blur the point before it ever leaves the
 * device.
 */

describe("phone normalisation (mirrors public.normalise_phone)", () => {
  test("south african local format becomes +27", () => {
    expect(normalisePhone("082 123 4567")).toBe("+27821234567");
    expect(normalisePhone("021 555 0100")).toBe("+27215550100");
  });

  test("already international numbers are kept", () => {
    expect(normalisePhone("+27821234567")).toBe("+27821234567");
    expect(normalisePhone("+44 7700 900123")).toBe("+447700900123");
  });

  test("a leading 27 without plus becomes international", () => {
    expect(normalisePhone("27821234567")).toBe("+27821234567");
  });

  test("noise characters are stripped before formatting", () => {
    expect(normalisePhone("(082) 123-4567")).toBe("+27821234567");
    expect(normalisePhone("  082.123.4567 ")).toBe("+27821234567");
  });

  test("incomplete or empty numbers are rejected, never guessed", () => {
    expect(normalisePhone("")).toBeNull();
    expect(normalisePhone("123")).toBeNull();
    expect(normalisePhone("082")).toBeNull();
    expect(normalisePhone("not a number")).toBeNull();
  });

  test("display grouping keeps the number readable", () => {
    expect(displayPhone("+27821234567")).toBe("+27 82 123 4567");
    expect(displayPhone("+27215550100")).toBe("+27 21 555 0100");
    // Unusual lengths pass through untouched — never reformatted.
    expect(displayPhone("+447700900123")).toBe("+447700900123");
  });
});

describe("approximate location precision", () => {
  test("rounds the point to roughly a few hundred metres", () => {
    // Cape Town city centre vs the rounded approximation.
    const { latitude, longitude } = makeApproximate(-33.924875, 18.424567);
    expect(latitude).toBe(-33.92);
    expect(longitude).toBe(18.42);
    // Two decimal places is up to ~1.1 km at this latitude — neighbourhood
    // scale, never a doorstep.
    const latShift = Math.abs(-33.924875 - latitude) * 111;
    expect(latShift).toBeLessThan(1.5);
    expect(latShift).toBeGreaterThan(0.1);
  });

  test("different nearby points collapse to the same approximate cell", () => {
    const a = makeApproximate(-26.107501, 28.056321); // Braamfontein
    const b = makeApproximate(-26.107889, 28.056842);
    expect(a.latitude).toBe(b.latitude);
    expect(a.longitude).toBe(b.longitude);
  });

  test("the function never returns more precision than two decimals", () => {
    const { latitude, longitude } = makeApproximate(-28.4793123456, 24.7612345678);
    expect(String(latitude).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
    expect(String(longitude).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});
