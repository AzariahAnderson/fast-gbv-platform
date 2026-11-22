/**
 * The eleven official languages of South Africa (in the order the site's
 * structured data lists them), each with the standard one-person greeting
 * a speaker would naturally open a conversation with.
 *
 * Greetings are deliberately single, universally recognised words rather
 * than translated sentences: Fast's interface stays in English, but the
 * greeting lets every visitor be met in their own language from the very
 * first screen. Sawubona, for example, literally means "I see you" — for
 * a platform serving people who often feel invisible, that greeting was
 * chosen with intent.
 */
export type OfficialLanguage = {
  /** Stable identifier stored in the on-device profile. */
  code: string;
  /** The language's own name, as South Africans write it. */
  native: string;
  /** English name, for clarity on a multilingual screen. */
  english: string;
  /** Standard single-person greeting in that language. */
  greeting: string;
  /** Short meaning note where the greeting carries one. */
  note?: string;
};

export const LANGUAGES: OfficialLanguage[] = [
  { code: "en", native: "English", english: "English", greeting: "Welcome" },
  { code: "af", native: "Afrikaans", english: "Afrikaans", greeting: "Welkom" },
  {
    code: "zul",
    native: "isiZulu",
    english: "Zulu",
    greeting: "Sawubona",
    note: "literally \u201cI see you\u201d",
  },
  { code: "xho", native: "isiXhosa", english: "Xhosa", greeting: "Molo" },
  { code: "sot", native: "Sesotho", english: "Sesotho", greeting: "Lumela" },
  { code: "tsn", native: "Setswana", english: "Setswana", greeting: "Dumela" },
  { code: "nso", native: "Sepedi", english: "Sepedi", greeting: "Thobela" },
  { code: "ssw", native: "siSwati", english: "Swati", greeting: "Sawubona" },
  { code: "ven", native: "Tshivenda", english: "Venda", greeting: "Ndaa" },
  { code: "tso", native: "Xitsonga", english: "Tsonga", greeting: "Avuxeni" },
  {
    code: "nbl",
    native: "isiNdebele",
    english: "Ndebele",
    greeting: "Lotjhani",
  },
];

/** All greeting words, keyed by language code, for the hero eyebrow. */
export const GREETINGS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.greeting]),
);

/** Fallback used when a stored profile names an unknown language. */
export const DEFAULT_LANGUAGE = LANGUAGES[0];

export function languageByCode(code: string): OfficialLanguage {
  return LANGUAGES.find((l) => l.code === code) ?? DEFAULT_LANGUAGE;
}
