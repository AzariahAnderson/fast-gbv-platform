"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, CircleAlert, Copy, MapPin, Pin } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { ChatThread } from "@/components/app/chat-thread";
import { Avatar } from "@/components/app/avatar";
import { friendlyTime } from "@/lib/app/time";
import { listConversations } from "@/lib/app/messages";
import { createClient } from "@/lib/supabase/client";
import type { Checkin, FamilyMember, PublicProfile } from "@/lib/db-types";

/**
 * One family circle: its members with presence, check-ins (care, not
 * surveillance), the group conversation, and invite management for
 * owners/admins.
 */

const CHECKINS: { status: Checkin["status"]; label: string }[] = [
  { status: "safe", label: "I'm Safe" },
  { status: "on_my_way", label: "On my way" },
  { status: "arrived", label: "Arrived" },
  { status: "need_help", label: "Need help" },
];

export default function FamilyDetailPage() {
  const params = useParams<{ familyId: string }>();
  const familyId = params.familyId;
  const { user, loading } = useSession();
  const supabase = createClient();
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [members, setMembers] = useState<(FamilyMember & { profile: PublicProfile | null })[]>([]);
  const [checkins, setCheckins] = useState<(Checkin & { name: string | null })[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>("member");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<{ id: string; body: string | null; name: string | null }[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: fam }, { data: mems }] = await Promise.all([
      supabase.from("families").select("name, invite_code").eq("id", familyId).maybeSingle(),
      supabase.from("family_members").select("family_id, user_id, role, joined_at").eq("family_id", familyId),
    ]);
    if (!fam) return;
    setFamilyName(fam.name);
    setInviteCode(fam.invite_code);
    const ids = (mems ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles_public").select("*").in("id", ids)
      : { data: [] as PublicProfile[] };
    const pinned = ((fam as { pinned_message_ids?: string[] }).pinned_message_ids ?? []) as string[];
    setPinnedIds(pinned);
    if (pinned.length > 0) {
      const { data: pmsgs } = await supabase
        .from("messages")
        .select("id, body, sender_id")
        .in("id", pinned);
      setPinnedMessages(
        (pmsgs ?? []).map((m) => ({
          id: m.id,
          body: m.body,
          name: (profiles ?? []).find((p) => p.id === (m as { sender_id: string }).sender_id)?.display_name ?? null,
        })),
      );
    } else {
      setPinnedMessages([]);
    }
    setMembers(
      (mems ?? []).map((m) => ({
        ...m,
        role: (m as FamilyMember).role,
        profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? null,
      })),
    );
    setMyRole((mems ?? []).find((m) => m.user_id === user.id)?.role ?? "member");

    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", "family")
      .eq("family_id", familyId)
      .maybeSingle();
    setConversationId(conv?.id ?? null);

    const { data: checks } = await supabase
      .from("checkins")
      .select("id, user_id, family_id, status, note, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(10);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    setCheckins((checks ?? []).map((c) => ({ ...c, name: names.get(c.user_id) ?? null })));
  }, [user, familyId]);

  useEffect(() => {
    // Deferred one tick: the initial fetch must not synchronously setState
    // inside the effect (React 19 cascading-render rule).
    const initial = setTimeout(() => void refresh(), 0);
    // Live check-ins for this family.
    const channel = supabase
      .channel(`family:${familyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "checkins", filter: `family_id=eq.${familyId}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      clearTimeout(initial);
      supabase.removeChannel(channel);
    };
  }, [refresh, familyId]);

  async function sendCheckin(status: Checkin["status"]) {
    if (!user) return;
    const note = status === "need_help" ? window.prompt("What is happening? (optional)") ?? null : null;
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      family_id: familyId,
      status,
      note: note?.trim().slice(0, 200) || null,
    });
    if (error) {
      setNote("The check-in did not send. Please try again.");
    } else {
      setNote(status === "need_help"
        ? "Sent. Your family can see you need help — and calling the emergency line is still the fastest way to reach a person."
        : "Sent to your family.");
      void refresh();
    }
  }

  async function togglePin(messageId: string) {
    const next = pinnedIds.includes(messageId)
      ? pinnedIds.filter((id) => id !== messageId)
      : [...pinnedIds, messageId].slice(-5);
    const { error } = await supabase
      .from("families")
      .update({ pinned_message_ids: next })
      .eq("id", familyId);
    setNote(error ? "Could not pin that message." : null);
    void refresh();
  }

  async function createInvite() {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    const code = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
      .join("");
    const { error } = await supabase.from("family_invites").insert({
      family_id: familyId,
      code,
      created_by: me.user.id,
    });
    setNote(error ? "Could not create an invite." : `Invite created: ${code}. Share it with the person you want to add — it works for two weeks.`);
    setInviteCode(code);
  }

  async function removeMember(userId: string) {
    const sure = window.confirm("Remove this member from the family?");
    if (!sure) return;
    const { error } = await supabase.from("family_members")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", userId);
    setNote(error ? "Could not remove the member." : "Member removed.");
    void refresh();
  }

  async function leaveFamily() {
    const sure = window.confirm("Leave this family? You will need a new invite to rejoin.");
    if (!sure) return;
    if (!user) return;
    await supabase.from("family_members").delete().eq("family_id", familyId).eq("user_id", user.id);
    window.location.href = "/family";
  }

  if (loading) return <p className="text-base text-body">One moment…</p>;
  if (!user) return null;
  if (!familyName) {
    return (
      <div className="card-surface p-7 text-center">
        <p className="text-sm font-bold text-foreground">This family is not available.</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
          Either the link is wrong, or you are not a member. Fast will not
          show you a family circle you do not belong to — even if the address
          is guessed.
        </p>
      </div>
    );
  }

  const isAdmin = myRole === "owner" || myRole === "admin";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
            {familyName}
          </h1>
          <p className="mt-1 text-sm text-body">You are {myRole}.</p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => void leaveFamily()}
            className="lift rounded-2xl border-2 border-taupe px-4 py-2 text-xs font-bold text-dim hover:border-brand hover:text-brand"
          >
            Leave family
          </button>
        )}
      </section>

      {note && (
        <p role="status" className="rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>
      )}

      {/* Check-ins */}
      <section aria-label="Check in">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Check in</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CHECKINS.map(({ status, label }) => (
            <button
              key={status}
              onClick={() => void sendCheckin(status)}
              className={`lift flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold ${
                status === "need_help"
                  ? "border-taupe bg-taupe/20 text-foreground hover:border-brand"
                  : "border-taupe bg-taupe/15 text-body hover:border-brand hover:text-brand"
              }`}
            >
              {status === "need_help" ? (
                <CircleAlert className="h-4 w-4 text-brand" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
              )}
              {label}
            </button>
          ))}
        </div>

        {checkins.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {checkins.slice(0, 5).map((c) => (
              <li key={c.id} className="card-surface flex items-center gap-3 px-4 py-3">
                <Avatar name={c.name} size="sm" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-bold text-foreground">{c.name ?? "Someone"}</span>
                  <span className="text-dim"> · {c.status.replace(/_/g, " ")}</span>
                  {c.note && <span className="block truncate text-xs text-faint">{c.note}</span>}
                </span>
                <span className="shrink-0 text-[11px] text-faint">{friendlyTime(c.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members */}
      <section aria-label="Members">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Members</h2>
          {isAdmin && (
            <button
              onClick={() => void createInvite()}
              className="text-xs font-bold text-brand underline-offset-4 hover:underline"
            >
              Create invite code
            </button>
          )}
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className="card-surface flex items-center gap-3 px-4 py-3">
              <Avatar name={m.profile?.display_name} url={m.profile?.avatar_url} online={m.profile?.presence === "online"} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">{m.profile?.display_name ?? "Member"}</span>
                <span className="block text-xs text-dim">{m.role}</span>
              </span>
              {isAdmin && m.user_id !== user.id && (
                <button
                  onClick={() => void removeMember(m.user_id)}
                  className="text-xs font-bold text-dim hover:text-brand"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {isAdmin && inviteCode && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3">
            <Copy className="h-4 w-4 text-brand" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs text-body">
              Current invite code: <span className="font-bold text-foreground">{inviteCode}</span>
            </p>
            <button
              onClick={() => void navigator.clipboard.writeText(inviteCode).catch(() => {})}
              className="text-xs font-bold text-brand"
            >
              Copy
            </button>
          </div>
        )}
      </section>

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <section aria-label="Pinned messages">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Pinned</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pinnedMessages.map((m) => (
              <li key={m.id} className="card-surface flex items-center gap-3 px-4 py-3">
                <Pin className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm text-body">
                  {m.body ?? "A shared image"}
                  {m.name && <span className="block text-xs text-faint">— {m.name}</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Group chat */}
      {conversationId && (
        <section aria-label="Family conversation">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Family conversation</h2>
          <ChatThread
            conversationId={conversationId}
            meId={user.id}
            summary={null}
            pin={{ canPin: isAdmin, pinnedIds, toggle: (id) => void togglePin(id) }}
          />
        </section>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-faint">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        A family gives people a way to say "I'm safe". Seeing where someone
        is, is a separate, explicit choice they make on the Map page.
      </p>
    </div>
  );
}
