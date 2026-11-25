import { NextResponse } from "next/server";
import { refreshLive } from "@/lib/live-fetch";
import { BASELINE } from "@/lib/live-types";
import { cronAuthorized, sameOrigin } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refresh endpoint. Three callers, three rules:
 *
 * - GET (the hourly Vercel cron): when CRON_SECRET is configured in the
 *   environment, the request must carry `Authorization: Bearer <secret>`,
 *   exactly as Vercel sends it. Outsiders cannot spend the Gemini quota.
 *   When CRON_SECRET is unset the endpoint behaves as before so local
 *   development and fresh deployments keep working.
 * - POST (the manual refresh button on the live section): allowed without
 *   a token, because refreshLive itself rate limits real generations to
 *   roughly one every nine minutes, so neither path can run the key dry.
 *   But the Origin must match the site, so a page on another origin cannot
 *   make visitors silently trigger generations (classic CSRF); browsers
 *   always attach Origin to same-origin POSTs, non-browser callers attach
 *   none and stay welcome.
 *
 * Both gates live in src/lib/cron-auth.ts and carry their own focused
 * unit tests (tests/cron-auth.test.ts).
 */

async function handler(req: Request) {
  if (req.method === "GET" && !cronAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (req.method === "POST" && !sameOrigin(req)) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const { data, refreshed } = await refreshLive();
    return NextResponse.json(
      { ...data, refreshed },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    // Details stay in the server log only: a public endpoint must never
    // echo internal error text back to a visitor.
    console.error("[refresh] failed:", (err as Error).message);
    return NextResponse.json(
      { ...BASELINE, refreshed: false },
      { status: 200 },
    );
  }
}

export { handler as GET, handler as POST };
