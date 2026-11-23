/**
 * The verified emergency number directory — the single source of truth for
 * every phone number, USSD code and SMS short code on the site.
 *
 * This data is immutable by project rule: numbers here are official South
 * African services, verified at publishing time, and no code path may
 * derive, format or "improve" them. The emergency section renders it, the
 * error boundaries pin it, and any future surface that needs a crisis
 * number imports it from here so the numbers can never drift apart.
 *
 * Layout: presentation components (the emergency section, error screens)
 * never hardcode a number; they read CRISIS_LINE, or the full DIRECTORY,
 * or build a dial link with telHref().
 */

/** One verified service in the directory. */
export type DirectoryEntry = {
  name: string;
  what: string;
  /** The display string exactly as humans dial it. */
  number: string;
  /** Digits only for the tel: scheme; undefined for USSD/SMS short codes. */
  tel?: string;
  /** International (E.164-style) form for structured data. Verified, never
   *  derived at use sites — only entries that have one carry it. */
  international?: string;
  /** How the contact channel is used: "call" dials via tel:, "sms" and
   *  "ussd" are copied or sent, never dialed. Self-describing on purpose:
   *  a short code like 31531 is all digits but must never be dialed. */
  channel: "call" | "sms" | "ussd";
  hours: string;
  tag: string;
  group: string;
};

/**
 * The crisis line the whole site is built around. Featured in the hero,
 * the sticky bar, the welcome flow, the footer and every error boundary.
 */
export const CRISIS_LINE = {
  name: "GBV Command Centre",
  /** Display string, exactly as a human dials it. */
  display: "0800 428 428",
  /** Digits-only value for the tel: scheme. */
  tel: "0800428428",
  /** International form for structured data (schema.org ContactPoint). */
  international: "+27-800-428-428",
} as const;

/** Build a dial link from a digits-only number. */
export function telHref(tel: string): string {
  return `tel:${tel}`;
}

/** Convenience: the crisis line's dial link. */
export const CRISIS_TEL_HREF = telHref(CRISIS_LINE.tel);

/**
 * Digits for a dial link from a directory entry. Throws when an entry was
 * defined without tel digits, so a broken directory fails loudly in the
 * integrity test instead of silently rendering a dead button.
 */
export function telOf(entry: DirectoryEntry): string {
  if (!entry.tel) throw new Error(`Directory entry "${entry.name}" has no tel digits`);
  return entry.tel;
}

export const DIRECTORY: DirectoryEntry[] = [
  {
    name: "GBV Command Centre",
    what: "Crisis counselling, social workers, shelters and referrals, for survivors and abusers",
    number: "0800 428 428",
    tel: "0800428428",
    international: "+27-800-428-428",
    channel: "call",
    hours: "24 hours, free",
    tag: "First call",
    group: "Urgent and first call",
  },
  {
    name: "SAPS, South African Police Service",
    what: "Emergencies, opening a case, protection order enforcement, FCS units for sexual offences",
    number: "10111",
    tel: "10111",
    channel: "call",
    hours: "24 hours, free",
    tag: "Emergency",
    group: "Urgent and first call",
  },
  {
    name: "Cellphone emergency",
    what: "Routes you to the nearest police, ambulance or fire service from any cellphone",
    number: "112",
    tel: "112",
    channel: "call",
    hours: "24 hours, free",
    tag: "No airtime",
    group: "Urgent and first call",
  },
  {
    name: "Ambulance and fire",
    what: "Medical emergencies, serious injuries and firefighting response",
    number: "10177",
    tel: "10177",
    channel: "call",
    hours: "24 hours, free",
    tag: "Emergency",
    group: "Urgent and first call",
  },
  {
    name: "GBV Command Centre Please Call Me",
    what: "Send a free please-call-me and a counsellor calls you back, even with no airtime",
    number: "*120*7867#",
    channel: "ussd",
    hours: "24 hours, free",
    tag: "Silent help",
    group: "Silent and anonymous help",
  },
  {
    name: "GBV Command Centre SMS",
    what: "SMS the word Help and a counsellor replies, without a voice call",
    number: "31531",
    channel: "sms",
    hours: "24 hours",
    tag: "Silent help",
    group: "Silent and anonymous help",
  },
  {
    name: "TEARS Foundation",
    what: "Free SMS helpline for survivors of gender based and sexual violence",
    number: "*134*7355#",
    channel: "sms",
    hours: "24 hours, free",
    tag: "Silent help",
    group: "Silent and anonymous help",
  },
  {
    name: "Crime Stop",
    what: "Report crime anonymously, no names taken and no court appearances required",
    number: "0860 010 111",
    tel: "0860010111",
    channel: "call",
    hours: "24 hours, free",
    tag: "Anonymous",
    group: "Silent and anonymous help",
  },
  {
    name: "POWA, People Opposed to Women Abuse",
    what: "Counselling, shelters and court support for women experiencing abuse",
    number: "011 642 4345",
    tel: "0116424345",
    channel: "call",
    hours: "Office hours",
    tag: "Shelter",
    group: "Counselling, shelters and families",
  },
  {
    name: "Lifeline South Africa",
    what: "Emotional counselling for anyone, survivors, witnesses and those who cause harm",
    number: "0861 322 322",
    tel: "0861322322",
    channel: "call",
    hours: "24 hours, free",
    tag: "Counselling",
    group: "Counselling, shelters and families",
  },
  {
    name: "Family Life Centre, FAMSA",
    what: "Professional individual, relationship and family counselling in Johannesburg",
    number: "011 788 4784",
    tel: "0117884784",
    channel: "call",
    hours: "Mon to Fri, 08:00 to 17:00",
    tag: "Counselling",
    group: "Counselling, shelters and families",
  },
  {
    name: "Childline South Africa",
    what: "Child abuse, neglect and support for children and teenagers",
    number: "116",
    tel: "116",
    channel: "call",
    hours: "24 hours, free",
    tag: "Children",
    group: "Children and young people",
  },
  {
    name: "Sonke Gender Justice",
    what: "Men's behaviour change groups and gender justice advocacy",
    number: "011 339 3589",
    tel: "0113393589",
    channel: "call",
    hours: "Office hours",
    tag: "Change",
    group: "For those who cause harm",
  },
];

/** Grouping for the collapsed directory, in display order. */
export const DIRECTORY_GROUPS: { label: string; blurb: string }[] = [
  {
    label: "Urgent and first call",
    blurb: "Life-threatening danger, the police and medical response",
  },
  {
    label: "Silent and anonymous help",
    blurb: "Reach out without a voice call, without leaving a name",
  },
  {
    label: "Counselling, shelters and families",
    blurb: "Ongoing support for survivors, witnesses and their families",
  },
  {
    label: "Children and young people",
    blurb: "Abuse, neglect and anyone reporting a child at risk",
  },
  {
    label: "For those who cause harm",
    blurb: "Behaviour change support, without judgement",
  },
];
