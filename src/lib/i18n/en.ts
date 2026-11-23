/**
 * English message catalogue — the source language of the localisation
 * architecture. Stage 1 ships the catalogue and the rules; stage 2 (wiring
 * components to catalogues per locale) is specified in docs/LOCALISATION.md
 * and starts only once professionally reviewed translations exist.
 *
 * Hard rules this file encodes:
 *
 * - Emergency numbers, USSD codes, SMS short codes and the official names of
 *   services are NEVER translated and NEVER copied into a catalogue. They
 *   live only in src/lib/numbers.ts and are interpolated at render time, so
 *   a translation can never alter a number or an official service name.
 * - Every value here is the exact string the component renders today. When
 *   a component is wired to a locale it must read the catalogue; until then
 *   the catalogue mirrors the hardcoded string so wiring is a no-op swap.
 * - New locales are added as sibling files (e.g. af.ts, zu.ts) typed as
 *   Messages, reviewed by a human translator and a community reviewer
 *   before shipping.
 */

export const en = {
  crisis: {
    /** Sticky crisis bar eyebrow, shown on every step of the page. */
    inDanger: "In danger right now",
    /** Accessible name of the crisis call button in the navbar. */
    callAria: "Call the GBV Command Centre now",
  },
  welcome: {
    /** Step headings of the welcome flow, in order. */
    languageStep: "How should Fast greet you?",
    nameStep: "And what should we call you?",
    strugglesStep: "What is going on for you right now?",
    back: "Back",
    continue: "Continue",
    skip: "Skip for now",
    removeGreeting: "Remove my greeting",
    removeConfirm: "Tap again to remove",
  },
  emergency: {
    /** Silent-help card title. */
    silentTitle: "Can't speak out loud?",
  },
} as const;

export type Messages = typeof en;
export type MessageNamespace = keyof Messages;
