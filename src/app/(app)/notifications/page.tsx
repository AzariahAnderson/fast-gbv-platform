"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { friendlyTime } from "@/lib/app/time";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/db-types";

/**
 * The notification centre. Quiet by design: a list of what happened while
 * you were away, newest first, with per-kind mute controls. Nothing here
 * is a growth loop — no badges-for-engagement, no marketing messages.
 */

const KIND_LABEL: Record<AppNotification["kind"], string> = {
  new_message: "Message",
  family_message: "Family",
  family_invitation: "Family",
  checkin: "Check-in",
  safe_arrival: "Safe arrival",
  location_change: "Location",
  safety_alert: "Safety",
  system: "System",
};

const MUTEABLE: AppNotification["kind"][] = [
  "new_message",
  "family_message",
  "checkin",
  "safe_arrival",
  "location_change",
];

export default function NotificationsPage() {
  const { user, profile } = useSession();
  const supabase = createClient();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [muted, setMuted] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data ?? []) as AppNotification[]);
      const settings = (profile?.privacy_settings ?? {}) as { mutedNotifications?: string[] };
      setMuted(settings.mutedNotifications ?? []);
    })();
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    const unread = items.filter((i) => !i.read_at);
    if (unread.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .in("id", unread.map((i) => i.id))
      .eq("user_id", user.id);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
  }

  async function toggleMute(kind: AppNotification["kind"]) {
    if (!user) return;
    const next = muted.includes(kind) ? muted.filter((k) => k !== kind) : [...muted, kind];
    setMuted(next);
    const privacy = { ...((profile?.privacy_settings ?? {}) as object), mutedNotifications: next };
    await supabase.from("profiles").update({ privacy_settings: privacy }).eq("id", user.id);
  }

  async function remove(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (!user) return <p className="text-base text-body">One moment…</p>;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
            Notifications<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 max-w-lg text-base leading-relaxed text-body">
            What happened while you were away. Nothing more, nothing less.
          </p>
        </div>
        <button
          onClick={() => void markAllRead()}
          className="lift min-h-11 shrink-0 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-xs font-bold text-body hover:border-brand"
        >
          Mark all read
        </button>
      </section>

      <section className="flex flex-col gap-2.5">
        {items.length === 0 ? (
          <div className="card-surface p-7 text-center">
            <BellOff className="mx-auto h-7 w-7 text-dim" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-foreground">Nothing new</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              Messages, check-ins and invitations land here when they happen.
            </p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`card-surface flex items-start gap-3 px-5 py-4 ${n.read_at ? "opacity-70" : ""}`}
            >
              <span className="mt-1 min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="rounded-lg border-2 border-taupe bg-taupe/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-dim">
                    {KIND_LABEL[n.kind]}
                  </span>
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Unread" />}
                </span>
                <span className="mt-2 block text-sm font-bold text-foreground">{n.title}</span>
                {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-dim">{n.body}</span>}
                <span className="mt-1 block text-[11px] text-faint">{friendlyTime(n.created_at)}</span>
                {Boolean(n.data?.conversation_id) && (
                  <Link
                    href={`/messages/${n.data.conversation_id as string}`}
                    className="mt-2 inline-block text-xs font-bold text-brand underline-offset-4 hover:underline"
                  >
                    Open conversation
                  </Link>
                )}
              </span>
              <button onClick={() => void remove(n.id)} className="text-xs font-bold text-dim hover:text-brand">
                Clear
              </button>
            </div>
          ))
        )}
      </section>

      <section aria-label="Mute controls" className="card-surface p-6">
        <h2 className="text-sm font-bold text-foreground">Mute kinds of notifications</h2>
        <p className="mt-1 text-xs leading-relaxed text-dim">
          Muting silences the ping here and in notifications. A person who
          needs help — a "Need help" check-in or a safety alert — is never
          muted.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MUTEABLE.map((kind) => (
            <button
              key={kind}
              onClick={() => void toggleMute(kind)}
              aria-pressed={muted.includes(kind)}
              className={`min-h-11 rounded-2xl border-2 px-4 text-sm font-bold ${
                muted.includes(kind) ? "border-taupe text-dim" : "border-brand text-brand"
              }`}
            >
              {KIND_LABEL[kind]} {muted.includes(kind) ? "muted" : "on"}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
