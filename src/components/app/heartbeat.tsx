"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Presence heartbeat. Marks the profile online on load, refreshes
 * last_seen_at every minute and on tab focus, and best-effort marks it
 * offline when the tab is closed. Nothing here tracks what you do — only
 * that your account is reachable, because family visibility depends on it.
 */
export function Heartbeat() {
  const [enabled] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let stop = false;

    const setPresence = async (presence: "online" | "offline") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({
        presence,
        last_seen_at: new Date().toISOString(),
      }).eq("id", user.id);
    };

    setPresence("online");
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") setPresence("online");
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setPresence("online");
    };
    const onLeave = () => {
      void setPresence("offline");
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);

    return () => {
      stop = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      if (!stop) void setPresence("offline");
    };
  }, [enabled]);

  return null;
}
