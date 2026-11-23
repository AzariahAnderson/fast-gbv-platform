import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and guards the
 * authenticated area. Public routes (landing, auth pages, emergency
 * endpoints, static assets) pass straight through. An unauthenticated
 * visit to an app route lands on /login; a signed-in visit to /login or
 * /signup is redirected home, so nobody re-authenticates needlessly.
 */

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/offline.html",
  "/api/live",
  "/api/refresh",
];

const AUTH_ONLY_ROUTES = ["/login", "/signup"];

/** The authenticated surfaces. Only these redirect to sign-in when there is
 *  no session — a mistyped or unknown URL must keep reaching the real 404
 *  page (with its emergency CTA), never a redirect into the login form. */
const APP_PREFIXES = [
  "/home",
  "/messages",
  "/family",
  "/map",
  "/safety",
  "/ai",
  "/profile",
  "/notifications",
  "/settings",
  "/onboarding",
  "/api/ai",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const path = request.nextUrl.pathname;

  // Without Supabase variables the product pages stay public and the app
  // routes render their own setup notice — nothing crashes.
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic =
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/")) ||
    path === "/" ||
    path.startsWith("/_next") ||
    path.includes(".");

  const isAppRoute = APP_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && isAppRoute && !isPublic) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (user && AUTH_ONLY_ROUTES.includes(path)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/home";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}
