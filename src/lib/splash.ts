/**
 * Splash state, kept in sessionStorage so the four second branding splash
 * runs on the first visit of a browser session and repeat visits within
 * that session go straight to the content. Guarded for SSR and for private
 * browsing modes where storage is unavailable.
 */
const KEY = "fast-splash-shown";

export function splashShownThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markSplashShown(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable, splash simply runs every visit */
  }
}

/**
 * Read once at module scope on the client so entrance choreography can
 * shorten its delays when the splash is being skipped this session.
 * On the server this is always false, which matches the SSR markup.
 */
export const SPLASH_SKIPPED = splashShownThisSession();

/**
 * Splash-to-welcome handoff. The welcome flow must open only once the
 * curtain has lifted, and only if it has not missed the moment (both the
 * preloader and the welcome mount in the same tick). The preloader calls
 * markSplashDone in every exit path; the welcome flow either receives the
 * event or sees the flag already set and opens a beat later.
 */
export const SPLASH_DONE_EVENT = "fast:splash-done";

let splashDoneFlag = false;

export function markSplashDone(): void {
  splashDoneFlag = true;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPLASH_DONE_EVENT));
}

export function splashIsDone(): boolean {
  return splashDoneFlag;
}
