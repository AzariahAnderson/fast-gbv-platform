import { isNetworkError } from "@/hooks/use-online";

/**
 * Turn raw auth failures into calm, specific, honest copy. The distinction
 * matters: a survivor told "Invalid login credentials" while their data is
 * actually down wastes precious minutes re-typing a password they know is
 * right. Network failures never read as credential failures.
 */
export function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";

  if (isNetworkError(err)) {
    return "You seem to be offline. Nothing was sent — check your connection and try again.";
  }
  if (/invalid login credentials/i.test(raw)) {
    return "That email and password don't match an account yet. Check both, then try again.";
  }
  if (/over_request_rate_limit|too many requests/i.test(raw)) {
    return "Too many attempts just now. Wait a minute and try again — there is nothing wrong with your account.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "Your email still needs to be confirmed. Open the confirmation link we emailed you, then sign in.";
  }
  if (/user already registered|already exists|been taken/i.test(raw)) {
    return "An account already exists for this email. Sign in instead, or use a different email.";
  }
  if (/password should be at least|at least \d+ characters/i.test(raw)) {
    return "Passwords need at least 10 characters. A few words strung together work well.";
  }
  return raw || "That did not work. Please try again.";
}
