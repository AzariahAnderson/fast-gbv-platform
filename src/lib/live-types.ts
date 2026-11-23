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
  encouragement: [
    "What happened to you was not your fault.",
    "Asking for help is a strong and brave thing to do.",
    "The pattern can be broken, and it starts with one call.",
    "You deserve to be safe in your own home.",
    "You are not alone. People answer this line every hour of every day.",
    "Fear kept you quiet. Speaking now is how the fear starts to lose.",
    "Leaving takes courage, and you already have more of it than you know.",
    "Your safety matters more than keeping the peace in that house.",
    "Healing is not a straight line. Every small step still counts.",
    "The children are watching. Breaking the cycle protects them too.",
    "Strength is not staying. Strength is choosing yourself for once.",
    "One conversation with a counsellor can change what the next year looks like.",
    "Trust what your gut is telling you. It has been trying to keep you safe.",
    "There is a place for you to sleep tonight, and people ready to listen.",
    "Choosing to stop harming is possible, and help exists for that choice too.",
    "You survived the worst of it. You do not have to survive it quietly.",
    "Telling one trusted person today can lift a weight you have carried alone.",
    "A shelter is not the end of your story. It is the first quiet morning of a new one.",
    "The person you were before this is still in there, and they are worth protecting.",
    "Love should never cost you your safety, your voice or your family.",
    "You can love someone and still refuse to accept being hurt by them.",
    "Worried about a friend? One gentle question can open a door they thought was locked.",
    "Real men ask for help. Reaching out is not weakness, it is leadership.",
    "The call is free, the conversation is private, and nothing changes unless you want it to.",
  ],
  tip: "Save the Command Centre number under a different name in your phone, and keep a grab bag with documents and some cash in one place.",
};
