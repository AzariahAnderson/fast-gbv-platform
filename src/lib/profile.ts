/**
 * The on-device welcome profile: language, names and what the visitor is
 * going through. Privacy rules for this platform are absolute:
 *
 * - Everything lives in localStorage on the visitor's device only.
 * - Nothing here is ever sent to a server, logged or included in analytics.
 * - The struggles list is never rendered on the page; only the greeting
 *   (a language word and a first name) is ever shown, so a bystander
 *   glancing at the screen learns nothing about the visitor's situation.
 * - Every storage read is guarded: private browsing modes and iOS lockdown
 *   modes throw on storage access, and the site must keep working as the
 *   unpersonalised page it was before this feature existed.
 */

import { normaliseStruggles } from "@/lib/struggles";

const KEY = "fast-profile";
const SKIP_KEY = "fast-welcome-skip";

/** Fired on window whenever the profile is saved or cleared. */
export const PROFILE_EVENT = "fast:profile-changed";
/** Fired on window to re-open the welcome flow (footer personalise link). */
export const WELCOME_OPEN_EVENT = "fast:welcome-open";

export type FastProfile = {
  v: 1;
  /** Language code from src/lib/languages.ts */
  lang: string;
  /** Compulsory: the name Fast greets the visitor with. */
  name: string;
  surname: string;
  nickname: string;
  /** Ids from src/lib/struggles.ts, possibly empty. */
  struggles: string[];
  completedAt: string;
};

function isProfile(value: unknown): value is FastProfile {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.lang === "string" &&
    typeof p.name === "string" &&
    p.name.trim().length > 0
  );
}

export function getProfile(): FastProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isProfile(parsed)) return null;
    return {
      ...parsed,
      surname: typeof parsed.surname === "string" ? parsed.surname : "",
      nickname: typeof parsed.nickname === "string" ? parsed.nickname : "",
      struggles: normaliseStruggles(parsed.struggles),
    };
  } catch {
    return null;
  }
}

/*
 * React integration: the profile is an external store, so components read
 * it with useSyncExternalStore. The snapshot is cached at module level so
 * React's Object.is comparison sees a stable value between renders; it is
 * refreshed by the saver itself and invalidated on storage events (another
 * tab changing the profile must not go unnoticed).
 */
let snapshotCache: FastProfile | null | undefined;

export function getProfileSnapshot(): FastProfile | null {
  if (snapshotCache === undefined) snapshotCache = getProfile();
  return snapshotCache;
}

export function subscribeProfile(onChange: () => void): () => void {
  const handler = () => {
    snapshotCache = undefined;
    onChange();
  };
  window.addEventListener(PROFILE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(PROFILE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function saveProfile(profile: Omit<FastProfile, "v" | "completedAt">): void {
  if (typeof window === "undefined") return;
  const full: FastProfile = {
    v: 1,
    ...profile,
    completedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(full));
    window.localStorage.removeItem(SKIP_KEY);
    snapshotCache = full;
    window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
  } catch {
    /* storage unavailable: the site simply stays unpersonalised */
  }
}

/** Wipe the profile (used by Personalise via the welcome flow's reopen). */
export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    snapshotCache = null;
    window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
  } catch {
    /* ignore */
  }
}

export function markWelcomeSkipped(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SKIP_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function welcomeWasSkipped(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The name the hero greets with: the nickname when there is one, else the
 * compulsory name. Surnames are intentionally never displayed on screen.
 */
export function greetingName(profile: FastProfile): string {
  const nick = profile.nickname.trim();
  if (nick) return nick;
  return profile.name.trim();
}
