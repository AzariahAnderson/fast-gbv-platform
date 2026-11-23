import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the middleware convention to proxy; the session
// refresh logic itself lives in lib/supabase/middleware.ts unchanged.

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static files — the session is
     * refreshed site-wide so server components always see a fresh token.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|emojis|images|icons|sounds|apple-icon.png|icon.png|robots.txt|sitemap.xml).*)",
  ],
};
