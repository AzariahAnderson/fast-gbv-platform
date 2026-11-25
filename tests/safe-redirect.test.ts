import { describe, expect, test } from "bun:test";
import { safeNextPath } from "../src/lib/safe-redirect";

/**
 * Security tests for the post-login redirect. The `next` query parameter
 * must never be able to walk a freshly signed-in person off the site —
 * an open redirect here would hand phishers a trusted Fast URL that ends
 * on their own domain.
 */
describe("safeNextPath (open-redirect guard)", () => {
  test("legitimate in-app paths pass through untouched", () => {
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("/messages")).toBe("/messages");
    expect(safeNextPath("/safety/plans")).toBe("/safety/plans");
    expect(safeNextPath("/family/9f8b3c1a-0000-4000-8000-000000000001")).toBe(
      "/family/9f8b3c1a-0000-4000-8000-000000000001",
    );
    expect(safeNextPath("/map?lat=-33.9&lng=18.4")).toBe("/map?lat=-33.9&lng=18.4");
  });

  test("external absolute URLs are rejected", () => {
    expect(safeNextPath("https://evil.example/login-copy")).toBe("/home");
    expect(safeNextPath("http://evil.example")).toBe("/home");
    expect(safeNextPath("javascript:alert(1)")).toBe("/home");
    expect(safeNextPath("data:text/html,<h1>phish</h1>")).toBe("/home");
    expect(safeNextPath("ftp://mirror.evil/payload")).toBe("/home");
  });

  test("protocol-relative forms are rejected", () => {
    // Browsers normalise both of these into a cross-origin navigation.
    expect(safeNextPath("//evil.example/phish")).toBe("/home");
    expect(safeNextPath("/\\evil.example/phish")).toBe("/home");
    expect(safeNextPath("\\\\evil.example")).toBe("/home");
  });

  test("backslashes and embedded schemes cannot smuggle an origin", () => {
    expect(safeNextPath("/home\\..\\evil")).toBe("/home");
    expect(safeNextPath("/redirect?to=https://evil.example")).toBe("/home");
  });

  test("empty, missing or junk values fall back to the dashboard", () => {
    expect(safeNextPath(null)).toBe("/home");
    expect(safeNextPath(undefined)).toBe("/home");
    expect(safeNextPath("")).toBe("/home");
    expect(safeNextPath("   ")).toBe("/home");
    expect(safeNextPath("nonsense")).toBe("/home");
  });

  test("whitespace around an in-app path is tolerated", () => {
    expect(safeNextPath("  /messages  ")).toBe("/messages");
  });

  test("a custom fallback is honoured for rejected values", () => {
    expect(safeNextPath("https://evil.example", "/onboarding")).toBe("/onboarding");
    expect(safeNextPath(null, "/onboarding")).toBe("/onboarding");
  });

  test("control characters never survive validation", () => {
    expect(safeNextPath("/home\nHeader: injected")).toBe("/home");
    expect(safeNextPath("/home\r\nSet-Cookie: x=1")).toBe("/home");
  });
});
