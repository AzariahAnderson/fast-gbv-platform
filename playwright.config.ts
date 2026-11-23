import { defineConfig, devices } from "@playwright/test";

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
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
});
