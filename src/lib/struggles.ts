/**
 * The options shown on the "what is going on for you" screen of the
 * welcome flow. Written as experiences, not clinical labels, in the
 * second person, because the screen is read by people at their most
 * vulnerable. The last three cover the reader who is not a survivor:
 * someone causing harm and ready to change, someone worried about a
 * third person, and someone who simply is not ready — which must always
 * be a legitimate answer on a platform like this one.
 *
 * Selections live only in the on-device profile (localStorage). They are
 * never displayed anywhere on the page: a bystander glancing at the
 * screen sees a greeting, never what somebody is struggling with.
 */
export type Struggle = {
  id: string;
  label: string;
};

export const STRUGGLES: Struggle[] = [
  { id: "hurt", label: "Someone is hurting me" },
  { id: "threats", label: "Someone threatens, controls or frightens me" },
  { id: "sexual", label: "I have experienced sexual violence" },
  { id: "words", label: "Someone insults, humiliates or shouts at me" },
  { id: "money", label: "Someone controls my money or things I need" },
  { id: "stalking", label: "Someone follows, watches or tracks me" },
  { id: "online", label: "Someone harasses me online" },
  { id: "change", label: "I am hurting someone, and I want to stop" },
  { id: "someone-else", label: "I am worried about someone else" },
  { id: "talk", label: "I just need someone to talk to" },
  { id: "not-ready", label: "I am not ready to talk about it yet" },
];

const VALID = new Set(STRUGGLES.map((s) => s.id));

/** Keep only known ids, preserving the order the list defines. */
export function normaliseStruggles(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return STRUGGLES.filter((s) => ids.includes(s.id)).map((s) => s.id);
}

export function isKnownStruggle(id: string): boolean {
  return VALID.has(id);
}
