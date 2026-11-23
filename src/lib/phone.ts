/**
 * Phone normalisation, mirrored exactly from the database's
 * public.normalise_phone() (see supabase/migrations/0001_fast_schema.sql).
 * Used so the client can display numbers in the same shape the server
 * stores them: E.164 with a +27 prefix for South African numbers.
 */
export function normalisePhone(input: string): string | null {
  const cleaned = (input || "").replace(/[^0-9+]/g, "");
  if (!cleaned) return null;
  let out: string;
  if (cleaned.startsWith("+")) out = cleaned;
  else if (cleaned.startsWith("27")) out = "+" + cleaned;
  else if (cleaned.startsWith("0")) out = "+27" + cleaned.slice(1);
  else out = cleaned;
  // A useful number needs a country code and at least 8 more digits.
  return /^\+\d{9,15}$/.test(out) ? out : null;
}

/** Pretty grouping for South African numbers: +27 82 123 4567. Numbers
 *  from other countries pass through untouched — never reformatted. */
export function displayPhone(e164: string): string {
  if (!e164.startsWith("+27")) return e164;
  const m = e164.match(/^(\+27)(\d{2})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
