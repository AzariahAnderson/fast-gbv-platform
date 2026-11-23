"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ShieldOff, UserX } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { ChatThread } from "@/components/app/chat-thread";
import { Avatar } from "@/components/app/avatar";
import { listConversations } from "@/lib/app/messages";
import { createClient } from "@/lib/supabase/client";
import type { ConversationSummary } from "@/lib/app/messages";

/**
 * One conversation. The header carries the person, their presence and the
 * safety controls (mute, archive, block, report) — because leaving
 * quietly should always be possible.
 */
export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user, loading } = useSession();
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await listConversations(user.id);
      setSummary(list.find((s) => s.conversation.id === conversationId) ?? null);
    })();
  }, [user, conversationId]);

  if (loading) return <p className="text-base text-body">One moment…</p>;
  if (!user) return null;

  const other = summary?.otherMembers[0]?.profile ?? null;
  const isDirect = summary?.conversation.type === "direct";

  async function blockPerson() {
    if (!summary || !isDirect) return;
    const blockedId = summary.otherMembers[0]?.userId;
    if (!blockedId) return;
    const sure = window.confirm("Block this person? They will not be able to message you, and you will not see their messages.");
    if (!sure) return;
    const { error } = await createClient().from("blocks").insert({ blocked_id: blockedId });
    setNote(error ? "Could not block — please try again." : "Blocked. They can no longer reach you here.");
  }

  async function reportPerson() {
    if (!summary) return;
    const target = isDirect ? summary.otherMembers[0]?.userId : null;
    if (!target) return;
    const reason = window.prompt("Tell the moderation queue what happened (they are the only ones who can read this).");
    if (!reason?.trim()) return;
    await createClient().from("reports").insert({
      target_type: "user",
      target_id: target,
      reason: reason.trim().slice(0, 200),
    });
    setNote("Report sent. Only the moderation queue can see it — the person you reported will never see your name.");
  }

  async function toggleMute() {
    if (!summary || !user) return;
    const muted = summary.mutedUntil && new Date(summary.mutedUntil) > new Date();
    const supabase = createClient();
    const { error } = await supabase.from("conversation_members")
      .update({ muted_until: muted ? null : new Date(Date.now() + 8 * 3600 * 1000).toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    setNote(error ? "Could not change mute." : muted ? "Unmuted." : "Muted for 8 hours.");
    void refresh();
  }

  async function toggleArchive() {
    if (!summary || !user) return;
    const supabase = createClient();
    await supabase.from("conversation_members")
      .update({ archived: !summary.archived })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    setNote(summary.archived ? "Returned to your list." : "Archived.");
    void refresh();
  }

  async function refresh() {
    const list = await listConversations(user!.id);
    setSummary(list.find((s) => s.conversation.id === conversationId) ?? null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            aria-label="Back to messages"
            className="lift rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          {isDirect ? (
            <Avatar name={other?.display_name} url={other?.avatar_url} online={other?.presence === "online"} />
          ) : (
            <Avatar name={summary?.familyName ?? "F"} url={null} />
          )}
          <div>
            <p className="text-sm font-bold text-foreground">
              {isDirect ? other?.display_name ?? "Conversation" : summary?.familyName ?? "Family"}
            </p>
            <p className="text-xs text-faint">
              {isDirect
                ? other?.presence === "online"
                  ? "Online now"
                  : "Offline"
                : "Family conversation"}
            </p>
          </div>
        </div>
        {isDirect && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => void toggleMute()}
              className="lift rounded-xl border-2 border-taupe px-3 py-2 text-xs font-bold text-dim hover:border-brand hover:text-brand"
            >
              {summary?.mutedUntil && new Date(summary.mutedUntil) > new Date() ? "Unmute" : "Mute 8h"}
            </button>
            <button
              onClick={() => void toggleArchive()}
              className="lift rounded-xl border-2 border-taupe px-3 py-2 text-xs font-bold text-dim hover:border-brand hover:text-brand"
            >
              {summary?.archived ? "Unarchive" : "Archive"}
            </button>
            <button
              onClick={() => void reportPerson()}
              aria-label="Report this person"
              className="lift rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
            >
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => void blockPerson()}
              aria-label="Block this person"
              className="lift rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
            >
              <UserX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {note && (
        <p role="status" className="rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
          {note}
        </p>
      )}

      <ChatThread conversationId={conversationId} meId={user.id} summary={summary} />
    </div>
  );
}
