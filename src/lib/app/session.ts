"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/db-types";

/**
 * The current session: auth user + own profile row. RLS guarantees this is
 * the only full profile a client can read; everyone else appears through
 * the profiles_public projection.
 */
export function useSession() {
  // Lazy initial state: without Supabase variables the session simply
  // resolves to empty without scheduling any effect work.
  const [state, setState] = useState<{
    user: { id: string; email: string | null } | null;
    profile: Profile | null;
    loading: boolean;
  }>(() => ({
    user: null,
    profile: null,
    loading: isSupabaseConfigured(),
  }));

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let alive = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      setState({ user: { id: user.id, email: user.email ?? null }, profile, loading: false });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return state;
}
