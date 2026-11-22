import { NextResponse } from "next/server";
import { getLive } from "@/lib/live-fetch";

export const dynamic = "force-dynamic";

/**
 * Public read path for the live payload. Served from the server's hourly
 * cache, so thousands of visitors share one Gemini generation per hour.
 */
export async function GET() {
  try {
    const data = await getLive();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3540",
      },
    });
  } catch {
    // getLive never throws, but belt and braces: the page must always answer
    return NextResponse.json(
      { error: "live data unavailable" },
      { status: 503 },
    );
  }
}
