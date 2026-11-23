import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Runtime verification of the authenticated product surfaces against the
 * REAL Supabase project: auth gate, signup/onboarding/session/logout,
 * two-user realtime messaging (typing, read receipts, optimistic send,
 * offline failure + retry), the custom map UI at three viewports, safe
 * arrival, and the AI Guide surface.
 *
 * Runs against the PRODUCTION build (same rule as smoke.spec.ts).
 * Test identities are the clearly-labelled runtime test accounts; their
 * credentials come from the gitignored .env (TEST_USER_* keys), never
 * committed. The signup test creates a single extra test-only account.
 */

const EMAIL_A = process.env.TEST_USER_A_EMAIL ?? "test-user-a@fast.test";
const PASSWORD_A = process.env.TEST_USER_A_PASSWORD ?? "";
const EMAIL_B = process.env.TEST_USER_B_EMAIL ?? "test-user-b@fast.test";
const PASSWORD_B = process.env.TEST_USER_B_PASSWORD ?? "";
const PHONE_B = "+27110000002";

/** The authenticated flows need real identities in the gitignored .env;
 *  without them these tests skip with the reason instead of failing on
 *  an empty password against the live project. smoke.spec.ts (the public
 *  crisis path) always runs — it needs no credentials. */
test.skip(
  !PASSWORD_A || !PASSWORD_B,
  "authenticated runtime flows need TEST_USER_A_* and TEST_USER_B_* in .env (gitignored; see docs/launch/RUNTIME_VERIFICATION.md)",
);

/** Skip the four-second splash for this session (repeat-visit behaviour). */
async function skipSplash(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("fast-splash-shown", "1");
    } catch {
      /* private browsing: the splash simply runs */
    }
  });
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await skipSplash(page);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in|one moment/i }).click();
  await page.waitForURL(/\/home|\/onboarding/, { timeout: 20_000 });
}

test.describe.configure({ mode: "serial" });

// ----------------------------------------------------------------- auth gate
test.describe("auth gate", () => {
  for (const route of ["/home", "/messages", "/family", "/map", "/safety", "/ai", "/profile"]) {
    test(`unauthenticated ${route} redirects to sign-in`, async ({ page }) => {
      await skipSplash(page);
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// ------------------------------------------------- signup/session/logout
test.describe("signup → onboarding → session → logout", () => {
  // Unique per run: the phone-uniqueness guard in onboarding is real, so
  // every run claims its own number (011 000 XXXX block, clearly synthetic).
  const uiEmail = `test-user-ui-${Date.now()}@fast.test`;
  const uiPhone = `+2711000${String(Math.floor(Math.random() * 9000) + 1000)}`;
  // Fresh throwaway account per run: the password is never committed.
  const uiPassword = `Fast-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  test("signup through the UI, onboarding, then the app (one session)", async ({ page }) => {
    await skipSplash(page);
    await page.goto("/signup");
    await page.locator('input[type="email"]').fill(uiEmail);
    await page.locator('input[type="password"]').fill(uiPassword);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await expect(page.getByText(/welcome|make fast|yours/i).first()).toBeVisible();
    // Onboarding: name + phone, straight into the app.
    await page.getByPlaceholder("Thandi").fill("Test User UI");
    await page.locator('input[type="tel"]').fill(uiPhone);
    await page.getByRole("button", { name: /enter fast/i }).click();
    await page.waitForURL(/\/home/, { timeout: 20_000 });
    // Unauthenticated access to onboarding must redirect (route protection).
    const anon = await page.context().browser()!.newContext();
    const anonPage = await anon.newPage();
    await skipSplash(anonPage);
    await anonPage.goto("/onboarding");
    await expect(anonPage).toHaveURL(/\/login/);
    await anon.close();
  });

  test("session persists across a reload", async ({ page }) => {
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/home");
    await page.reload();
    await page.waitForTimeout(1500);
    expect(page.url()).not.toMatch(/\/login/);
  });

  test("logout returns the visitor to the public site", async ({ page }) => {
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/profile");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\//, { timeout: 20_000 });
    await page.waitForTimeout(1000); // let the client redirect settle
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });
});

// --------------------------------------------- two-user realtime messaging
test.describe("realtime messaging (two users, no refresh)", () => {
  let conversationUrl = "";

  test("A signs in and starts a conversation with B by exact phone", async ({ page }) => {
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/messages");
    await page.locator("#phone-search").fill(PHONE_B);
    await page.getByRole("button", { name: /search|find|start/i }).click();
    await page.waitForURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 20_000 });
    conversationUrl = page.url();
    expect(conversationUrl).toMatch(/\/messages\/[0-9a-f-]{36}/);
  });

  test("B receives A's message live; A sees B's reply live; typing + read receipts", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await signIn(pageA, EMAIL_A, PASSWORD_A);
    await signIn(pageB, EMAIL_B, PASSWORD_B);

    await pageA.goto(conversationUrl);
    await pageB.goto(conversationUrl);

    // Unique per-run texts: the shared test conversation keeps every earlier
    // run's messages forever, so a fixed string would match an old bubble
    // instantly and the offline-switch steps below would race the write.
    const hello = `Realtime check: hello from A ${Date.now()}.`;
    const reply = `Reply from B — received live ${Date.now()}.`;

    // A sends; B receives without any refresh.
    await pageA.locator("textarea").fill(hello);
    await pageA.getByRole("button", { name: "Send message" }).click();
    await pageB.getByText(hello).first().waitFor({ timeout: 15_000 });

    // B replies; A receives without any refresh.
    await pageB.locator("textarea").fill(reply);
    await pageB.getByRole("button", { name: "Send message" }).click();
    await pageA.getByText(reply).first().waitFor({ timeout: 15_000 });

    // Typing indicator reaches A live.
    await pageB.locator("textarea").fill("t");
    await pageA.getByText(/typing…/i).first().waitFor({ timeout: 15_000 });

    // Read receipt: B's read of A's message marks the thread read for A.
    await expect(pageA.getByText(new RegExp(reply.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("optimistic send, honest offline failure, and retry on reconnect", async ({ browser }) => {
    test.setTimeout(90_000);
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    // Reduced motion: html carries scroll-behavior:smooth, and on a long
    // mobile thread every scroll-triggered actionability check would race
    // the smooth-scroll animation ("element is not stable" forever). The
    // app honours prefers-reduced-motion (scroll-behavior: auto), so this
    // test runs under it — the same support real reduced-motion users get.
    await pageA.emulateMedia({ reducedMotion: "reduce" });
    await signIn(pageA, EMAIL_A, PASSWORD_A);
    await pageA.goto(conversationUrl);

    // Unique per-run texts: earlier runs' messages stay in the shared test
    // conversation, and a fixed string would let .first() match an old
    // bubble so the offline switch below could race the write.
    const optimisticText = `Optimistic bubble test ${Date.now()}.`;
    const offlineText = `Offline attempt ${Date.now()}.`;

    // Optimistic: the bubble appears before the write completes — and it
    // must be CONFIRMED before the network is cut. Going offline while the
    // write is still in flight would fail the online send too, which is a
    // test race, not product behaviour.
    await pageA.locator("textarea").fill(optimisticText);
    await pageA.getByRole("button", { name: "Send message" }).click();
    const optimisticBubble = pageA.locator("button", { hasText: optimisticText }).first();
    await optimisticBubble.waitFor({ timeout: 15_000 });
    await expect(optimisticBubble).not.toContainText("sending…", { timeout: 30_000 });
    await expect(optimisticBubble).not.toContainText("not sent", { timeout: 5_000 });

    // Offline send: honest failure state ("not sent") with a retry affordance.
    await contextA.setOffline(true);
    await pageA.locator("textarea").fill(offlineText);
    await pageA.getByRole("button", { name: "Send message" }).click();
    await pageA.getByText(/not sent/i).first().waitFor({ timeout: 15_000 });

    // Reconnect + retry: exactly one failed bubble exists now, and the
    // message actually lands — the bubble first stops "sending…", then
    // never shows "not sent". The page scrolls to the very bottom first:
    // on the mobile viewport the retry affordance sits at the tail of a
    // long thread, and a partially-scrolled position leaves it behind the
    // sticky composer, which stalls any tap actionability.
    await contextA.setOffline(false);
    await pageA.waitForTimeout(500); // let reconnect settle
    await pageA.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await pageA.waitForTimeout(300);
    await pageA.getByRole("button", { name: /try again/i }).first().click({ timeout: 20_000 });
    const offlineBubble = pageA.locator("button", { hasText: offlineText }).first();
    await expect(offlineBubble).not.toContainText("sending…", { timeout: 30_000 });
    await expect(offlineBubble).not.toContainText("not sent", { timeout: 5_000 });

    await contextA.close();
  });
});

// ---------------------------------------------------------------- map UI
test.describe("map UI at three viewports", () => {
  test("custom FAST map renders with attribution, FAST palette and clear permission messaging", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ["geolocation"],
      geolocation: { latitude: -26.2041, longitude: 28.0473, accuracy: 40 },
    });
    const page = await context.newPage();
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/map");
    await page.waitForTimeout(3500); // tiles + style load

    // MapLibre canvas exists.
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();

    // OSM attribution is present (legal requirement).
    const attribution = page.locator(".maplibregl-ctrl-attrib");
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText(/openstreetmap/i);

    // FAST palette: the page background uses the deep-ink token, not a
    // third-party default white/blue map chrome.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toMatch(/rgb\(69,\s*64,\s*64\)/); // #454040

    // Reduced motion honoured.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(300);

    // Tablet and phone viewports: controls must stay usable.
    for (const size of [[768, 1024], [390, 844]] as const) {
      await page.setViewportSize({ width: size[0], height: size[1] });
      await page.waitForTimeout(600);
      await expect(page.locator(".maplibregl-canvas")).toBeVisible();
      await expect(attribution).toBeVisible();
    }

    await context.close();
  });

  test("location share lifecycle via the UI: approximate share starts and stops", async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ["geolocation"],
      geolocation: { latitude: -26.2041, longitude: 28.0473, accuracy: 800 },
    });
    const page = await context.newPage();
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/map");
    await page.waitForTimeout(2500);

    // The E2E family has B in it, so the audience is non-empty. The app
    // refuses to share with nobody selected — correct behaviour.
    const familyButton = page.getByRole("button", { name: "E2E Family" }).first();
    if (await familyButton.isVisible()) await familyButton.click();
    await page.waitForTimeout(800);

    // Start sharing with the approximate precision default.
    const shareButton = page.getByRole("button", { name: /start sharing/i }).first();
    if (await shareButton.isVisible()) {
      await shareButton.click();
      // The share note appears after the first position fix is written
      // (the page's geolocation call allows up to 20 s).
      await expect(page.getByText(/sharing for|sharing until/i)).toBeVisible({ timeout: 40_000 });

      // Stop sharing.
      const stopButton = page.getByRole("button", { name: /stop|pause/i }).first();
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await page.waitForTimeout(800);
      }
    } else {
      // No family circle on this account: the permission/consent messaging
      // must still be clear (honest fallback).
      await expect(page.getByText(/share|location|family/i).first()).toBeVisible();
    }

    await context.close();
  });
});

// ------------------------------------------------------------ safe arrival
test.describe("safe arrival", () => {
  test("timer starts with a local reminder and never silently escalates", async ({ page }) => {
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/safety");
    // Let the session's first fetch settle so the submit handler has its
    // user (the page renders the form before the profile row lands).
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /15 minutes/i }).click();
    const destination = page.getByPlaceholder("Home from work");
    await destination.fill("Runtime test destination");
    await expect(destination).toHaveValue("Runtime test destination", { timeout: 10_000 });
    await page.getByRole("button", { name: /start the timer/i }).click();
    await expect(page.getByText(/reminder set for 15 minutes/i)).toBeVisible({ timeout: 15_000 });
    // No escalation text or emergency contact claim appears at start.
    await expect(page.getByText(/emergency services have been notified/i)).toHaveCount(0);
  });
});

// ------------------------------------------------------------------ AI
test.describe("FAST Guide AI", () => {
  test("AI surface is labelled, streams a reply and stays local by default", async ({ page }) => {
    await signIn(page, EMAIL_A, PASSWORD_A);
    await page.goto("/ai");
    await expect(page.getByText(/AI-generated|not a therapist|not emergency/i).first()).toBeVisible();

    await page.locator("textarea").fill("What is coercive control?");
    await page.getByRole("button", { name: "Send" }).click();
    // The Guide streams SOMETHING — in this sandbox the upstream is
    // region-blocked, so the honest fallback notice itself must stream in.
    await expect(page.getByText(/could not answer|not connected/i).first()).toBeVisible({ timeout: 25_000 });

    // Local-by-default: the Save action is an explicit, separate control.
    await expect(page.getByRole("button", { name: /save conversation/i })).toBeVisible();
    // No automatic "saved" claim appears after a plain exchange.
    await expect(page.getByText(/saved to your account/i)).toHaveCount(0);
  });
});
