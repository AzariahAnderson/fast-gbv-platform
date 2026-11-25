/**
 * Post-login redirect validation.
 *
 * The login form accepts a `next` query parameter (set by the middleware
 * when it bounces an unauthenticated visitor to /login). Left unvalidated
 * that value is an open redirect: `?next=https://evil.example` would walk a
 * freshly signed-in survivor straight to an attacker-controlled phishing
 * page that imitates Fast. This guard keeps only genuine in-app paths —
 * a value is accepted when it is a relative path starting with a single
 * slash and carries no scheme, protocol-relative `//`, backslash or
 * userinfo tricks. Anything else resolves to the dashboard.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/home"): string {
  if (!raw) return fallback;
  // Trim stray whitespace that browsers may keep in the query value.
  const candidate = raw.trim();
  if (!candidate.startsWith("/")) return fallback;
  // "//evil.example" and "/\evil.example" are protocol-relative forms that
  // browsers normalise into a cross-origin navigation.
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  // A backslash or an embedded scheme ("https://") cannot be part of a
  // sane in-app path; control characters are never legitimate either.
  if (/[\\:\u0000-\u001f]/.test(candidate)) return fallback;
  return candidate;
}
