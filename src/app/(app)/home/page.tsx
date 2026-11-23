"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartHandshake, MapPin, MessageCircle, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { Avatar } from "@/components/app/avatar";
import { friendlyTime } from "@/lib/app/time";
import { createClient } from "@/lib/supabase/client";
import type { Checkin } from "@/lib/db-types";

/**
 * Home. A quiet start: a greeting, the four things a person actually
 * needs right now, and the latest family check-ins. No metrics, no feed
 * algorithm — the page answers "what can I do here" in one glance.
 */

const QUICK_ACTIONS = [
  { href: "/messages", label: "Messages", desc: "Talk to the people you trust", icon: MessageCircle },
  { href: "/family", label: "Family", desc: "Check in and see who is around", icon: HeartHandshake },
  { href: "/map", label: "Share where I am", desc: "Only when you choose, only who you choose", icon: MapPin },
  { href: "/safety", label: "My safety", desc: "Plans, check-ins and safe arrival", icon: ShieldCheck },
] as const;

const CHECKIN_COPY: Record<string, string> = {
  safe: "I'm Safe",
  on_my_way: "On my way",
  arrived: "Arrived",
  need_help: "Need help",
};

export default function HomePage() {
  const { user, profile, loading } = useSession();
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    (async () => {
      // My family check-ins, newest first. RLS already limits this to
      // families I belong to and my own rows.
      const { data: memberships } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id);
      const ids = (memberships ?? []).map((m) => m.family_id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("checkins")
        .select("id, user_id, family_id, status, note, created_at")
        .in("family_id", ids)
        .order("created_at", { ascending: false })
        .limit(6);
      setCheckins((data ?? []) as Checkin[]);
    })();
  }, [user]);

  if (loading) {
    return <p className="text-base text-body">One moment…</p>;
  }

  const name = profile?.display_name?.trim() || "Friend";
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">{greeting}</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          {name}
          <span className="text-brand">.</span>
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-body">
          Everything here is private by default. What you share, and with
          whom, is always your decision.
        </p>
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2">
        {QUICK_ACTIONS.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card-hover card-surface lift flex min-h-20 items-center gap-4 p-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-taupe bg-taupe/20">
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-foreground">{label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-dim">{desc}</span>
            </span>
          </Link>
        ))}
        <Link
          href="/ai"
          className="card-hover card-surface card-featured lift flex min-h-20 items-center gap-4 p-5 sm:col-span-2"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-brand/50 bg-brand/10">
            <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-foreground">FAST Guide</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-dim">
              Ask anything, privately. Calm guidance, real options, no judgement.
            </span>
          </span>
        </Link>
      </section>

      <section aria-label="Recent family check-ins">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">
            Family check-ins
          </h2>
          <Link href="/family" className="text-xs font-bold text-brand underline-offset-4 hover:underline">
            See families
          </Link>
        </div>
        {checkins.length === 0 ? (
          <div className="card-surface mt-4 p-7 text-center">
            <HeartHandshake className="mx-auto h-7 w-7 text-dim" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-foreground">No check-ins yet</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              Create or join a family, then a simple tap lets everyone know
              you are safe. Check-ins are for care, never for watching.
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {checkins.map((c) => (
              <li key={c.id} className="card-surface flex items-center gap-4 px-5 py-4">
                <CheckinAvatar userId={c.user_id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">
                    {CHECKIN_COPY[c.status] ?? c.status}
                    {c.note ? <span className="font-medium text-dim"> · {c.note}</span> : null}
                  </p>
                  <p className="text-xs text-faint">{friendlyTime(c.created_at)}</p>
                </div>
                <Timer className="h-4 w-4 text-faint" aria-hidden="true" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CheckinAvatar({ userId }: { userId: string }) {
  const [name, setName] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      setName(data?.display_name ?? null);
      setUrl(data?.avatar_url ?? null);
    })();
  }, [userId]);
  return <Avatar name={name} url={url} size="sm" />;
}
