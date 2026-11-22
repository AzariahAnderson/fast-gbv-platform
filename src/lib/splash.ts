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
