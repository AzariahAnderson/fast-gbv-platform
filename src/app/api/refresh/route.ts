import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { refreshLive } from "@/lib/live-fetch";
import { BASELINE } from "@/lib/live-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refresh endpoint. Two callers, two rules:
 *
 * - GET (the hourly Vercel cron): when CRON_SECRET is configured in the
 *   environment, the request must carry `Authorization: Bearer <secret>`,
 *   exactly as Vercel sends it. Outsiders cannot spend the Gemini quota.
 *   When CRON_SECRET is unset the endpoint behaves as before so local
 *   development and fresh deployments keep working.
 * - POST (the manual refresh button on the live section): allowed without
 *   a token, because refreshLive itself rate limits real generations to
 *   roughly one every nine minutes, so neither path can run the key dry.
 */
function cronAuthorized(req: Request): boolean {
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

async function handler(req: Request) {
  if (req.method === "GET" && !cronAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const { data, refreshed } = await refreshLive();
    return NextResponse.json(
      { ...data, refreshed },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ...BASELINE, refreshed: false, refreshError: (err as Error).message },
      { status: 200 },
    );
  }
}

export { handler as GET, handler as POST };
