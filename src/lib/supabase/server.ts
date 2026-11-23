import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as makeSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";

/**
 * Server-side Supabase client bound to the request cookies, so RLS sees
 * the signed-in user. Next 15+ exposes an async cookie store — both calls
 * are awaited. Never holds privileged keys: the publishable key only.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — middleware refreshes
            // sessions, so a failed set here is expected and harmless.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS — reserved for server routes that
 * genuinely need it (AI persistence on behalf of the user, notification
 * fan-out). Never imported from client code: this module is server-only.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return makeSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True when the server-side Supabase variables are present. */
export function isServerSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
