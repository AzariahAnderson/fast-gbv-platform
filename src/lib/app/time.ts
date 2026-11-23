/** Small time helpers shared across the app. All strings are English. */

export function timeOfDay(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function shortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

/** "just now", "3 min ago", "14:32 today", "2 Mar, 09:14" — calm, human. */
export function friendlyTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) return timeOfDay(d);
  return `${shortDate(d)}, ${timeOfDay(d)}`;
}

/** Group chat timestamps by day for the thread separators. */
export function dayLabel(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date().toDateString() === d.toDateString();
  const yesterday =
    new Date(Date.now() - 86_400_000).toDateString() === d.toDateString();
  if (today) return "Today";
  if (yesterday) return "Yesterday";
  return shortDate(d);
}

/** Initials for avatar fallbacks, maximum two letters. */
export function initials(name: string | null | undefined): string {
  if (!name) return "F";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "F";
}
