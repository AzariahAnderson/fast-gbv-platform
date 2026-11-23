import { NextResponse } from "next/server";
import { getLive } from "@/lib/live-fetch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 3 * 1024 * 1024;
const UA =
  "Mozilla/5.0 (compatible; FAST-crisis-support/1.0; reads article previews only)";

/**
 * Constrained thumbnail proxy.
 *
 * A survivor's device talks only to Fast: article preview images are
 * fetched by this server and re-served same-origin, so no publisher CDN
 * ever sees a visitor's IP, and the Content-Security-Policy keeps its
 * img-src locked to 'self' instead of opening to arbitrary https origins.
 *
 * There is no open-proxy surface: the `u` parameter is accepted only when
 * it is byte-for-byte an image URL currently held in the server's own live
 * cache, which was produced by the sanitiser (https only, no redirect
 * wrappers) at refresh time. Anything else is a 404. A failed fetch is
 * also a 404, which the news card answers with its fallback tile.
 */
export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get("u");
  if (!requested) {
    return new NextResponse(null, { status: 400 });
  }
  let cached: Awaited<ReturnType<typeof getLive>>;
  try {
    cached = await getLive();
  } catch {
    // getLive never throws, but the crisis page must never 500.
    return new NextResponse(null, { status: 404 });
  }
  if (!cached.news.some((item) => item.image === requested)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const upstream = await fetch(requested, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*", "User-Agent": UA },
      redirect: "follow",
    });
    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new NextResponse(null, { status: 404 });
    }
    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": type,
        // The URL is a fingerprint of the article image; edge caching keeps
        // repeat loads off the serverless function entirely.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
