import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db-types";

/**
 * Browser-side Supabase client. Uses the publishable (anon) key only —
 * every read and write is filtered by row-level security, so a leaked
 * token can never widen what a signed-in user is allowed to see.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

/** True when the owner has provided the public Supabase variables. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
