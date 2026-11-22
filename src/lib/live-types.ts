/**
 * Live data contract shared by the server (Gemini refresh) and the client
 * (useLive hook). Kept dependency free so it can be imported anywhere.
 */

export type LiveStat = {
  /** Short display value, e.g. "1 in 3" or "5.5 per 100 000" */
  value: string;
  /** One sentence explaining the figure */
  label: string;
  /** Organisation and year, e.g. "HSRC National GBV Prevalence Survey, 2024" */
  source: string;
  /** Grounded link to the source, when one exists */
  sourceUrl?: string;
};

export type LiveNews = {
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  /** YYYY-MM-DD when the item carries a date */
  date?: string;
};

export type LiveData = {
  /** ISO timestamp of the last successful generation */
  updatedAt: string;
  /**
   * "gemini" when refreshed with Gemini and Google Search grounding,
   * "websearch" when the fallback search engine produced the payload,
   * "baseline" for the verified statics.
   */
  generator: "gemini" | "websearch" | "baseline";
  stats: LiveStat[];
  news: LiveNews[];
  /** Short compassionate lines shown in the encouragement strip */
  encouragement: string[];
  /** One practical safety or support tip */
  tip: string;
};

/**
 * Verified baseline content. It renders instantly (no spinner, no layout
 * shift) and takes over whenever the hourly Gemini refresh is unreachable,
 * so the page is never empty and never blocks on the network. Every figure
 * here was verified against the publishing organisation; the URLs are the
 * official domains, not invented deep links.
 */
export const BASELINE: LiveData = {
  updatedAt: "2024-11-01T00:00:00.000Z",
  generator: "baseline",
  stats: [
    {
      value: "1 in 3",
      label:
        "women in South Africa experience physical and/or sexual violence in their lifetime",
      source: "HSRC National GBV Prevalence Survey",
      sourceUrl: "https://www.hsrc.ac.za",
    },
    {
      value: "5.5",
      label:
        "of every 100 000 women are killed by an intimate partner, close to five times the global average",
      source: "South African Medical Research Council",
      sourceUrl: "https://www.samrc.ac.za",
    },
    {
      value: "5×",
      label:
        "South Africa's femicide rate compared to the global average",
      source: "WHO global femicide estimates",
      sourceUrl: "https://www.who.int",
    },
    {
      value: "24/7",
      label:
        "the GBV Command Centre never closes, and neither should hope",
      source: "Department of Social Development",
      sourceUrl: "https://www.dsd.gov.za",
    },
  ],
  news: [
    {
      title: "Protection orders remain free at every magistrates court",
      summary:
        "Under the Domestic Violence Act any court clerk can issue an interim protection order without a lawyer. SAPS must help you apply and must arrest when an order is breached.",
      source: "Department of Justice and Constitutional Development",
      sourceUrl: "https://www.justice.gov.za",
    },
    {
      title: "The GBV Command Centre answers around the clock",
      summary:
        "Crisis counselling, shelter placement and mobile social workers are coordinated nationally in all 11 official languages, for survivors and for people who want to stop harming.",
      source: "Department of Social Development",
      sourceUrl: "https://www.dsd.gov.za",
    },
    {
      title: "FCS units handle sexual offences countrywide",
      summary:
        "Every domestic violence complaint must be registered and investigated by the police. Dedicated Family Violence, Child Protection and Sexual Offences units operate in all provinces.",
      source: "South African Police Service",
      sourceUrl: "https://www.saps.gov.za",
    },
  ],
  encouragement: [
    "What happened to you was not your fault.",
    "Asking for help is a strong and brave thing to do.",
    "The pattern can be broken, and it starts with one call.",
    "You deserve to be safe in your own home.",
  ],
  tip: "Save 0800 428 428 under a different name in your phone, and keep a grab bag with documents and some cash in one place.",
};
