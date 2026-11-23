import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { CRISIS_LINE, DIRECTORY } from "../../src/lib/numbers";

/**
 * Production smoke tests for the crisis path, the PWA and accessibility.
 * Every test skips the four-second splash via sessionStorage (repeat-visit
 * behaviour) and the welcome tests start from a wiped profile so the exact
 * first-visit flow is exercised.
 */

const CRISIS_TEL = `tel:${CRISIS_LINE.tel}`;
/** Every verified dial target, derived from the directory — nothing else. */
const VERIFIED_TELS = DIRECTORY.filter((d) => d.tel).map((d) => `tel:${d.tel}`);

/** Skip the splash for this browser session, exactly like a repeat visit. */
async function skipSplash(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("fast-splash-shown", "1");
    } catch {
      /* private browsing: the splash simply runs */
    }
  });
}

/** First visit: no profile, no previous skip decision. */
async function freshVisitor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("fast-profile");
      window.localStorage.removeItem("fast-welcome-skip");
    } catch {
      /* ignore */
    }
  });
}
test.beforeEach(async ({ page }) => {
  await skipSplash(page);
  // Default to a returning visitor so interaction tests exercise the page
  // beneath the welcome flow; the welcome journey test wipes this state and
  // removes the skip flag to replay the exact first visit.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("fast-welcome-skip", "1");
    } catch {
      /* ignore */
    }
  });
  // Uncaught exceptions fail the test; failed network requests do not,
  // because offline behaviour deliberately lets requests fail.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  (page as unknown as { __pageErrors: string[] }).__pageErrors = errors;
});

test.afterEach(async ({ page }) => {
  const errors = (page as unknown as { __pageErrors: string[] }).__pageErrors;
  expect(errors, `uncaught page errors: ${errors.join(" | ")}`).toEqual([]);
});

test.describe("desktop", () => {
  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only");
  });

  test("homepage loads with hero and crisis line", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Fast/);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByText(CRISIS_LINE.display).first()).toBeVisible();
  });

  test("every crisis dial link comes from the directory", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator(`a[href="${CRISIS_TEL}"]`).count();
    expect(hrefs).toBeGreaterThanOrEqual(3);
    // No dial link may point anywhere except a verified directory number.
    const allTel = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="tel:"]')].map((a) =>
        (a as HTMLAnchorElement).getAttribute("href"),
      ),
    );
    for (const href of allTel) expect(VERIFIED_TELS).toContain(href);
  });

  test("emergency navigation reaches the verified directory", async ({ page }) => {
    await page.goto("/");
    // The desktop sticky bar is intentionally free of section links; the
    // hero's "In danger right now" link is the path a visitor in crisis
    // sees first, and it must land on the verified directory.
    await page.getByRole("link", { name: /In danger right now/ }).click();
    const emergency = page.locator("#emergency");
    await expect(emergency).toBeVisible();
    await expect(emergency.getByText(CRISIS_LINE.name).first()).toBeVisible();
    await expect(emergency.locator(`a[href="${CRISIS_TEL}"]`).first()).toBeVisible();
    // Silent channels render their directory values.
    await expect(emergency.getByText("*120*7867#")).toBeVisible();
    await expect(emergency.getByText("31531")).toBeVisible();
  });

  test("all sections render", async ({ page }) => {
    await page.goto("/");
    for (const id of ["emergency", "survivors", "live", "change", "faq"]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    await expect(page.locator("footer")).toBeAttached();
  });

  test("faq accordion opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.locator("#faq").scrollIntoViewIfNeeded();
    const trigger = page.locator("#faq [aria-expanded]").first();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("keyboard: the first tab stop is the skip link", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator("a.skip-link")).toBeFocused();
  });
});

test.describe("mobile", () => {
  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("crisis CTA is reachable without opening the menu", async ({ page }) => {
    await page.goto("/");
    // The first tel: link in the DOM is the desktop navbar button, hidden
    // on small screens; assert on a crisis button that is actually shown.
    await expect(page.locator(`a[href="${CRISIS_TEL}"]:visible`).first()).toBeVisible();
  });

  test("mobile menu opens and closes", async ({ page }) => {
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Open menu" });
    await opener.click();
    await expect(opener).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("welcome flow: language, name guard, greeting, removal", async ({ page }) => {
    await freshVisitor(page);
    await page.goto("/");

    // Step 1: language. Accessible names combine greeting and native name,
    // e.g. "Welcome English", "Sawubona isiZulu".
    await expect(page.getByText("How should Fast greet you?")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /English/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: the compulsory name guard rejects an inappropriate name by
    // disabling the continue button outright — an invalid name cannot be
    // submitted at all.
    await expect(page.getByText("And what should we call you?")).toBeVisible();
    const nameBox = page.getByRole("textbox", { name: /^Name/ });
    await nameBox.fill("Thandi<3");
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    // A plain name passes.
    await nameBox.fill("Thandi");
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: dignified multi-select; the struggles step is optional by
    // design ("Enter Fast" is never disabled) and nothing has to be picked.
    await expect(page.getByText("What is going on for you right now?")).toBeVisible();
    await page.getByRole("button", { name: "Enter Fast" }).click();

    // The hero greets the visitor by name.
    await expect(page.getByText(/THANDI/i).first()).toBeVisible({ timeout: 10_000 });

    // Two-tap removal from the footer personalise link.
    await page.getByRole("button", { name: /Personalise/i }).click();
    await page.getByRole("button", { name: "Remove my greeting" }).click();
    await page.getByRole("button", { name: "Tap again to remove" }).click();
    await expect(page.getByText("Greeting removed.")).toBeVisible();
    await expect(page.getByText(/THANDI/i)).toHaveCount(0);
  });
});

test.describe("pwa and offline", () => {
  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only");
  });

  test("service worker takes control without breaking the page", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
      timeout: 20_000,
    });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("offline: the crisis numbers stay reachable, no uncaught errors", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
      timeout: 20_000,
    });
    await context.setOffline(true);
    await page.reload();
    // Either the cached app or the offline fallback must show a verified
    // number; a blank page or an exception is a failure.
    await expect(
      page.getByText(new RegExp(`${CRISIS_LINE.display}|GBV Command Centre`)).first(),
    ).toBeVisible({ timeout: 15_000 });
    await context.setOffline(false);
  });
});

test.describe("accessibility", () => {
  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only");
  });

  test("axe finds no critical or serious violations on the settled page", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Scroll through the page first so reveal-on-scroll sections finish
    // their entrance: axe must judge the settled page, not mid-animation
    // opacity.
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 1600));
    });
    // axe-core ships a browser bundle inside node_modules; playwright runs
    // with the project root as the working directory.
    const axeSource = readFileSync(
      join(process.cwd(), "node_modules", "axe-core", "axe.min.js"),
      "utf8",
    );
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(
      async () =>
        await (
          window as unknown as {
            axe: {
              run: (
                d: Document,
                o: object,
              ) => Promise<{ violations: { id: string; impact: string | null; nodes: { target: string[] }[] }[] }>;
            };
          }
        ).axe.run(document, { resultTypes: ["violations"] }),
    );
    const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    const summary = results.violations
      .map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`)
      .join(", ");
    // Log everything found so non-critical items stay visible for triage.
    test.info().annotations.push({ type: "axe", description: summary || "no violations" });
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" "))}`),
    ).toEqual([]);
  });
});
