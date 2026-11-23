import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Test identities (TEST_USER_*) and any local variables live in the
 * gitignored .env. The runner is spawned by node, not bun, so the file is
 * parsed here and injected into process.env explicitly.
 */
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env: runtime tests will use their documented fallbacks */
}

/**
 * Playwright smoke tests for Fast. They always run against a PRODUCTION
 * build: start it with `bun run build && bun run start` (port 3000) and set
 * E2E_BASE_URL if the server lives somewhere else. No dev server, no mocks:
 * the crisis path must be tested in the shape it ships.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Headless Chromium needs explicit software-GL consent since
        // Chrome 139; real devices use hardware WebGL and are unaffected.
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
      },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
      },
    },
  ],
});
