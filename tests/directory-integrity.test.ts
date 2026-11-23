/**
 * Emergency directory integrity test — the automated guard for the project's
 * most important safety rule.
 *
 * src/lib/numbers.ts is the single authoritative source for every emergency
 * number, USSD code and SMS short code. These tests make violations fail the
 * build instead of shipping:
 *
 *  1. The directory itself is structurally sound (no duplicate numbers,
 *     dial-able entries always carry tel digits, USSD/SMS entries never do).
 *  2. The crisis line constant matches its directory entry exactly.
 *  3. No component under src/ hardcodes any directory number or builds a
 *     raw tel: link — every surface must import from the directory.
 *  4. public/offline.html (which cannot import TypeScript) may only present
 *     numbers that exist in the directory, so even the static offline
 *     fallback cannot drift away from the verified source.
 *
 * Run with: bun run test:directory
 */

import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CRISIS_LINE, DIRECTORY, telOf, type DirectoryEntry } from "../src/lib/numbers";

const ROOT = join(import.meta.dir, "..");

/** Recursively collect every .ts/.tsx file under a directory. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Remove comments so numbers mentioned in prose do not trip the scan.
 * Block comments go first; line comments are only stripped when the `//`
 * is not part of a URL scheme (https://, tel:) inside a string.
 */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Escape a string for regex use, letting separators flex: spaces and
 *  punctuation between digits may match with or without whitespace. */
function displayPattern(display: string): RegExp {
  const escaped = display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  return new RegExp(`(?<![\\dA-Za-z])${escaped}(?![\\dA-Za-z%])`, "g");
}

describe("directory structure", () => {
  it("every entry carries name, description, number, hours, tag and group", () => {
    for (const entry of DIRECTORY) {
      expect(entry.name.trim()).not.toBe("");
      expect(entry.what.trim()).not.toBe("");
      expect(entry.number.trim()).not.toBe("");
      expect(entry.hours.trim()).not.toBe("");
      expect(entry.tag.trim()).not.toBe("");
      expect(entry.group.trim()).not.toBe("");
    }
  });

  it("dial-able entries carry tel digits, silent channels do not", () => {
    for (const entry of DIRECTORY) {
      if (entry.channel === "call") {
        expect(entry.tel, `${entry.name} is missing tel digits`).toBeDefined();
        const digits = entry.number.replace(/\D/g, "");
        expect(entry.tel).toBe(digits);
      } else {
        // USSD codes and SMS short codes are copied or sent, never dialed.
        expect(entry.tel, `${entry.name} must not be dial-able`).toBeUndefined();
      }
    }
  });

  it("no number appears twice in the directory", () => {
    const seen = new Map<string, string>();
    for (const entry of DIRECTORY) {
      const digits = entry.number.replace(/\D/g, "");
      const previous = seen.get(digits);
      expect(previous ?? null, `duplicate number ${entry.number}`).toBeNull();
      seen.set(digits, entry.name);
    }
  });

  it("the crisis line constant matches its directory entry", () => {
    const crisis = DIRECTORY.find((d) => d.name === CRISIS_LINE.name);
    expect(crisis).toBeDefined();
    expect(crisis?.number).toBe(CRISIS_LINE.display);
    expect(crisis?.tel).toBe(CRISIS_LINE.tel);
    expect(crisis?.international).toBe(CRISIS_LINE.international);
    expect(crisisTelHref()).toBe(`tel:${CRISIS_LINE.tel}`);
  });

  it("international forms, when present, are exactly 27 + the national digits", () => {
    for (const entry of DIRECTORY) {
      if (!entry.international) continue;
      const national = entry.number.replace(/\D/g, "").replace(/^0/, "");
      expect(
        entry.international.replace(/\D/g, ""),
        `${entry.name} international form does not match its national digits`,
      ).toBe(`27${national}`);
    }
    expect(CRISIS_LINE.international.replace(/\D/g, "")).toBe(
      `27${CRISIS_LINE.tel.replace(/^0/, "")}`,
    );
  });

  it("telOf resolves digits for every dial-able entry and throws otherwise", () => {
    for (const entry of DIRECTORY) {
      if (entry.tel) expect(telOf(entry)).toBe(entry.tel);
    }
    const broken = { name: "Broken entry", number: "012 345 6789" } as DirectoryEntry;
    expect(() => telOf(broken)).toThrow();
  });
});

/** Rebuild the crisis href the same way the site does. */
function crisisTelHref(): string {
  const crisis = DIRECTORY.find((d) => d.name === CRISIS_LINE.name)!;
  return `tel:${telOf(crisis)}`;
}

describe("no hardcoded numbers outside the directory", () => {
  const files = walk(join(ROOT, "src")).filter((f) => !f.endsWith("numbers.ts"));

  it("src files exist to scan", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("no directory number is written as a literal anywhere in src/", () => {
    const violations: string[] = [];
    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const entry of DIRECTORY) {
        const digits = entry.number.replace(/\D/g, "");
        for (const [label, pattern] of [
          [entry.number, displayPattern(entry.number)],
          [digits, new RegExp(`(?<![\\dA-Za-z])${digits}(?![\\dA-Za-z%])`, "g")],
        ] as const) {
          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(code)) !== null) {
            const line = code.slice(0, match.index).split("\n").length;
            violations.push(`${file}:${line} hardcodes "${label}" (${entry.name})`);
          }
        }
      }
    }
    expect(violations.join("\n") || null).toBeNull();
  });

  it("no raw tel: link is built outside the directory module", () => {
    const violations: string[] = [];
    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"));
      const pattern = /tel:\+?\d+/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(code)) !== null) {
        const line = code.slice(0, match.index).split("\n").length;
        violations.push(`${file}:${line} builds a raw tel: link (use telHref from @/lib/numbers)`);
      }
    }
    expect(violations.join("\n") || null).toBeNull();
  });
});

describe("offline fallback stays in sync", () => {
  const html = readFileSync(join(ROOT, "public", "offline.html"), "utf8");

  it("every offline tel: link belongs to the verified directory", () => {
    const anchors = [...html.matchAll(/<a[^>]*href="tel:(\d+)"[^>]*>([^<]+)<\/a>/g)];
    expect(anchors.length).toBeGreaterThanOrEqual(2);
    for (const [, tel, text] of anchors) {
      const entry = DIRECTORY.find((d) => d.tel === tel);
      expect(entry, `offline.html dials ${tel} which is not in the directory`).toBeDefined();
      expect(text).toContain(entry!.number);
    }
  });
});
