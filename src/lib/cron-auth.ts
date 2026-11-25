import { timingSafeEqual } from "crypto";

/**
 * Authentication and CSRF rules for /api/refresh, extracted so unit tests
 * can exercise them directly.
 *
 * - GET (the daily Vercel cron, 02:00 UTC): when CRON_SECRET is configured, the
 *   request must carry `Authorization: Bearer <secret>` exactly as Vercel
 *   sends it, compared in constant time. When CRON_SECRET is unset the
 *   endpoint stays open so local development and fresh deployments work.
 * - POST (the manual refresh button): allowed without a token because the
 *   refresh engine itself rate limits real generations, but the Origin
 *   must match the host so a page on another origin cannot make visitors
 *   silently trigger paid generations (classic CSRF). Non-browser callers
 *   attach no Origin and stay welcome.
 */

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured, endpoint stays open as before
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  // Length check first: timingSafeEqual throws on length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // curl, cron and other non-browser callers
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
