import { NextRequest, NextResponse } from "next/server";
import { refreshLive } from "@/lib/live-fetch";
import { BASELINE } from "@/lib/live-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refresh endpoint: called once an hour by the cron in vercel.json and by
 * the manual refresh button on the live section. GET without a token is
 * treated as a manual refresh, which refreshLive rate limits to about one
 * generation every nine minutes so the key can never be run dry.
 */
async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.method === "GET") {
    const token = req.headers.get("authorization");
    const isCron = token === `Bearer ${secret}`;
    if (!isCron) {
      // Manual browser refresh: allowed, refreshLive handles rate limiting.
    }
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
