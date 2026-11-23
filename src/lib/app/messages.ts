import "client-only";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message, PublicProfile } from "@/lib/db-types";

/**
 * Client-side messaging data layer. Every call runs against RLS: the
 * database, not this code, is what keeps one user out of another user's
 * conversation. Realtime uses Supabase Realtime (postgres_changes for
 * rows, presence for typing/online).
 */

export interface ConversationSummary {
  conversation: Conversation;
  otherMembers: { profile: PublicProfile | null; userId: string }[];
  lastMessage: Message | null;
  unread: number;
  mutedUntil: string | null;
  archived: boolean;
  familyName: string | null;
}

export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const supabase = createClient();

  const { data: myMemberships, error } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, muted_until, archived")
    .eq("user_id", userId);
  if (error || !myMemberships?.length) return [];

  const convIds = myMemberships.map((m) => m.conversation_id);
  const [{ data: conversations }, { data: allMembers }] = await Promise.all([
    supabase.from("conversations").select("*").in("id", convIds),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", convIds),
  ]);
  const convs = (conversations ?? []) as Conversation[];
  if (convs.length === 0) return [];

  const otherIds = Array.from(
    new Set(
      (allMembers ?? [])
        .filter((m) => m.user_id !== userId)
        .map((m) => m.user_id),
    ),
  );
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles_public").select("*").in("id", otherIds)
    : { data: [] as PublicProfile[] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const familyIds = Array.from(
    new Set(convs.filter((c) => c.family_id).map((c) => c.family_id as string)),
  );
  const { data: families } = familyIds.length
    ? await supabase.from("families").select("id, name").in("id", familyIds)
    : { data: [] as { id: string; name: string }[] };
  const familyNames = new Map((families ?? []).map((f) => [f.id, f.name]));

  // Last message and unread count per conversation. Small-N per-conversation
  // queries keep the client honest with the database's own indexes.
  const summaries = await Promise.all(
    convs.map(async (conversation) => {
      const [lastRes, unreadRes] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .gt("created_at", myMemberships.find((m) => m.conversation_id === conversation.id)!.last_read_at)
          .neq("sender_id", userId),
      ]);
      const membership = myMemberships.find((m) => m.conversation_id === conversation.id)!;
      return {
        conversation,
        otherMembers: (allMembers ?? [])
          .filter((m) => m.conversation_id === conversation.id && m.user_id !== userId)
          .map((m) => ({ userId: m.user_id, profile: profileMap.get(m.user_id) ?? null })),
        lastMessage: (lastRes.data as Message | null) ?? null,
        unread: unreadRes.count ?? 0,
        mutedUntil: membership.muted_until,
        archived: membership.archived,
        familyName: conversation.family_id ? familyNames.get(conversation.family_id) ?? null : null,
      };
    }),
  );

  return summaries.sort(
    (a, b) =>
      new Date(b.conversation.last_message_at).getTime() -
      new Date(a.conversation.last_message_at).getTime(),
  );
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? []) as Message[];
}

export async function sendMessage(
  conversationId: string,
  payload: { body?: string; kind: "text" | "image"; imagePath?: string; replyToId?: string | null },
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session ended. Please sign in again.");
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    kind: payload.kind,
    body: payload.body ?? null,
    image_path: payload.imagePath ?? null,
    reply_to_id: payload.replyToId ?? null,
  });
  if (error) {
    if (error.code === "42501") {
      throw new Error("You cannot send messages in this conversation anymore.");
    }
    throw new Error(error.message);
  }
}

export async function editMessage(id: string, body: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeMessage(id: string): Promise<void> {
  // Soft remove keeps the thread honest: "Message removed" instead of a
  // disappearing act. The row is cleared by the update policy (own rows).
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), body: null, image_path: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  await supabase.from("conversation_members")
    .update({ last_read_at: now })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  // Read receipts for the other side's messages that are new to me.
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id")
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .gt("created_at", new Date(Date.now() - 12 * 3600 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  const unread = (data ?? []).filter((m) => m.sender_id !== userId);
  if (unread.length) {
    await supabase.from("message_reads").upsert(
      unread.map((m) => ({ message_id: m.id, user_id: userId })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
  }
}

export async function setTyping(conversationId: string, userId: string, typing: boolean) {
  const supabase = createClient();
  await supabase.from("typing_presence").upsert(
    { conversation_id: conversationId, user_id: userId, typing, updated_at: new Date().toISOString() },
    { onConflict: "conversation_id,user_id" },
  );
}

export async function signedImage(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("chat-images")
    .createSignedUrl(path, 60 * 60 * 12);
  return data?.signedUrl ?? null;
}

export interface RealtimeHandlers {
  onInsert: (message: Message) => void;
  onUpdate: (message: Message) => void;
}

/** Live messages + ephemeral presence for one conversation. */
export function subscribeThread(
  conversationId: string,
  userId: string,
  handlers: RealtimeHandlers,
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`thread:${conversationId}`, { config: { presence: { key: userId } } })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => handlers.onInsert(payload.new as Message),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => handlers.onUpdate(payload.new as Message),
    );

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
