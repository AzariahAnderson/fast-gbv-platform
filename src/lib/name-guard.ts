/**
 * The greeting name is compulsory ("Appropriate username is compulsory")
 * and it is displayed on screen, so it must be something a stranger could
 * read over somebody's shoulder without harm. This guard rejects empty,
 * overlong, or hostile input before the profile is saved.
 *
 * The block list is deliberately compact and focuses on the strongest
 * English profanity, the worst South African slurs (including the k-word,
 * which in this country carries real, lived weight), and slurs against
 * groups this platform serves. It is not exhaustive: it is a kind gate,
 * not a censor. Everything runs on-device; no name ever leaves the phone.
 */

const BLOCKED_EXACT = new Set([
  // strong English profanity, incl. leet-prone short forms
  "fuck", "fuk", "fck", "shit", "sht", "bitch", "b1tch", "cunt", "kunt",
  "ass", "arse", "anus", "bastard", "bollocks", "twat", "prick", "wank",
  "wanker", "hoe", "cum", "jizz", "dick", "cock", "pussy", "tit", "tits",
  // South African slurs and targeted harassment
  "kaffir", "kaffer", "hotnot", "coolie", "boerehater",
  // slurs against protected groups
  "nigger", "nigga", "n1gger", "faggot", "fag", "dyke", "tranny",
  "retard", "mong", "kys", "gook", "chink",
  // gendered degradation
  "slut", "whore", "skank", "hoer",
  // violence
  "rapist", "rape", "rapes", "killme", "hangmyself",
  // degrading in a GBV context
  "sex", "sexy", "porn",
]);

/** Multi-word and joined phrases checked against the whole string. */
const BLOCKED_PHRASES = [
  "motherfucker", "shithead", "asshole", "arsehole", "dumbass", "jackass",
  "bullshit", "niggar", "kaffirboetie", "fuckyou", "screwyou", "killyou",
  "killall", "hateyou",
];

/** Characters commonly typed to slip past a word list. */
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
  "8": "b", "9": "g", "@": "a", "$": "s", "!": "i", "+": "t",
  "|": "i", "\u20ac": "e",
};

const MIN = 2;
const MAX = 24;
/** Letters, numbers, spaces and the punctuation real names use. */
const ALLOWED = /^[\p{L}\p{N} '\u2019.\-]+$/u;

export type NameCheck = { ok: true } | { ok: false; reason: string };

export const NAME_RULES = { min: MIN, max: MAX };

function deLeet(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[\u200b-\u200f\u2060]/g, "") // strip zero-width tricks
    .toLowerCase()
    .replace(/[0-9@$!+|\u20ac]/g, (c) => LEET[c] ?? " ");
}

/**
 * Validate any free-text name field (name, surname, nickname). Returns a
 * gentle, specific reason so the form can correct without shaming.
 */
export function checkName(raw: string, required: boolean): NameCheck {
  const value = raw.trim().replace(/\s+/g, " ");

  if (!value) {
    return required
      ? { ok: false, reason: "A name is needed so Fast can greet you." }
      : { ok: true };
  }
  if (value.length < MIN) {
    return { ok: false, reason: `At least ${MIN} letters, please.` };
  }
  if (value.length > MAX) {
    return { ok: false, reason: `Keep it under ${MAX} characters.` };
  }
  if (!ALLOWED.test(value)) {
    return {
      ok: false,
      reason: "Letters, numbers, spaces, apostrophes and hyphens only.",
    };
  }

  const flat = deLeet(value).replace(/[^a-z]/g, "");
  const tokens = deLeet(value).split(/[^a-z]+/).filter(Boolean);

  const hit =
    tokens.find((t) => BLOCKED_EXACT.has(t)) ??
    tokens.find((t) =>
      [...BLOCKED_EXACT]
        .filter((w) => w.length >= 5)
        .some((w) => t.includes(w)),
    ) ??
    (BLOCKED_PHRASES.some((p) => flat.includes(p)) ? flat : undefined);

  if (hit) {
    return {
      ok: false,
      reason: "Please choose a name that is kind and appropriate for everyone.",
    };
  }
  return { ok: true };
}
