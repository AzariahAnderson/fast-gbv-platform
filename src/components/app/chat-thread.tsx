"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Pin, Reply, RotateCcw, SendHorizontal, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Avatar } from "./avatar";
import { dayLabel, timeOfDay } from "@/lib/app/time";
import {
  editMessage,
  fetchMessages,
  markRead,
  removeMessage,
  sendMessage,
  setTyping,
  signedImage,
  subscribeThread,
  type ConversationSummary,
} from "@/lib/app/messages";
import { createClient } from "@/lib/supabase/client";
import type { Message, PublicProfile } from "@/lib/db-types";

/**
 * The one conversation surface used by direct chats and family group
 * chats alike. Realtime via Supabase, optimistic send with honest failure
 * states, reply, edit, soft remove, read receipts, typing indicator,
 * image attachments — and not a single fake row: everything here is
 * either already in the database or being written to it.
 */

const QUICK_EMOJI = ["❤️", "🙏", "👍", "😢", "😅", "🤗"];

type Phase = "idle" | "sending" | "failed";

export interface PinControl {
  canPin: boolean;
  pinnedIds: string[];
  toggle: (messageId: string) => void;
}

export function ChatThread({
  conversationId,
  meId,
  summary,
  pin,
}: {
  conversationId: string;
  meId: string;
  summary: ConversationSummary | null;
  pin?: PinControl;
}) {
  const reduce = useReducedMotion();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<
    { clientId: string; body: string; phase: Phase }[]
  >([]);
  const [profiles, setProfiles] = useState<Map<string, PublicProfile>>(new Map());
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [reads, setReads] = useState<Map<string, string[]>>(new Map());
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const others = useMemo(
    () => (summary?.otherMembers ?? []).map((m) => m.userId),
    [summary],
  );
  const profileOf = useCallback(
    (id: string) => profiles.get(id) ?? summary?.otherMembers.find((m) => m.userId === id)?.profile ?? null,
    [profiles, summary],
  );

  // Initial load + realtime subscription.
  useEffect(() => {
    let alive = true;
    fetchMessages(conversationId).then((rows) => alive && setMessages(rows));

    const unsub = subscribeThread(conversationId, meId, {
      onInsert: (m) => {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        setPending((prev) => {
          // Reconcile by body, not by blind FIFO: the same account can be
          // signed in on two devices or tabs at once (a real situation for
          // this audience), and the other session's own-message insert
          // also reaches this page. A blind slice(1) would then consume
          // the wrong optimistic row — or leave the real one stuck at
          // "not sent" forever.
          const idx = m.sender_id === meId ? prev.findIndex((x) => x.body === m.body) : -1;
          return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
        });
      },
      onUpdate: (m) => {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      },
    });

    // Ephemeral presence: who is in this thread right now.
    const channel = supabase
      .channel(`presence:${conversationId}`, { config: { presence: { key: meId } } })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });

    return () => {
      alive = false;
      unsub();
      supabase.removeChannel(channel);
    };
  }, [conversationId, meId, supabase, reduce]);

  // Names/avatars of the other participants.
  useEffect(() => {
    if (others.length === 0) return;
    const sup = createClient();
    sup.from("profiles_public").select("*").in("id", others)
      .then(({ data }) => {
        setProfiles(new Map((data ?? []).map((p) => [p.id, p])));
      });
  }, [others.join(",")]);  

  // Typing indicator via the typing_presence table (RLS-scoped rows).
  useEffect(() => {
    const sup = createClient();
    const channel = sup
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing_presence", filter: `conversation_id=eq.${conversationId}` },
        () => {
          sup.from("typing_presence").select("user_id, typing, updated_at")
            .eq("conversation_id", conversationId)
            .gt("updated_at", new Date(Date.now() - 6000).toISOString())
            .then(({ data }) => {
              setTypingUsers(new Set((data ?? []).filter((t) => t.typing && t.user_id !== meId).map((t) => t.user_id)));
            });
        },
      )
      .subscribe();
    return () => {
      sup.removeChannel(channel);
    };
  }, [conversationId, meId]);

  // Read receipts: mark mine-read when opened; watch for others reading.
  useEffect(() => {
    void markRead(conversationId, meId);
    const sup = createClient();
    const channel = sup
      .channel(`reads:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reads", filter: `user_id=neq.${meId}` },
        () => void refreshReads(conversationId, setReads),
      )
      .subscribe();
    void refreshReads(conversationId, setReads);
    return () => {
      sup.removeChannel(channel);
    };
  }, [conversationId, meId]);

  // Resolve signed URLs for image messages (private bucket). Runs as an
  // effect, never during render.
  useEffect(() => {
    const missing = messages
      .filter((m) => m.image_path && !imageUrls.has(m.image_path))
      .map((m) => m.image_path!);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      const next = new Map(imageUrls);
      for (const path of missing) {
        const url = await signedImage(path);
        if (url && alive) next.set(path, url);
      }
      if (alive) setImageUrls(next);
    })();
    return () => {
      alive = false;
    };
  }, [messages, imageUrls]);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending.length, typingUsers.size]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    void setTyping(conversationId, meId, false);
    const clientId = crypto.randomUUID();
    setPending((p) => [...p, { clientId, body, phase: "sending" }]);
    try {
      await sendMessage(conversationId, {
        body,
        kind: "text",
        replyToId: replyTo?.id ?? null,
      });
      setReplyTo(null);
      // The realtime INSERT reconciles this pending row.
    } catch (err) {
      setPending((p) => p.map((x) => (x.clientId === clientId ? { ...x, phase: "failed" } : x)));
      setError(err instanceof Error ? err.message : "The message did not send.");
    }
  };

  const retry = async (clientId: string) => {
    const item = pending.find((p) => p.clientId === clientId);
    if (!item) return;
    setPending((p) => p.map((x) => (x.clientId === clientId ? { ...x, phase: "sending" } : x)));
    try {
      await sendMessage(conversationId, { body: item.body, kind: "text" });
    } catch (err) {
      setPending((p) => p.map((x) => (x.clientId === clientId ? { ...x, phase: "failed" } : x)));
      setError(err instanceof Error ? err.message : "Still not sending.");
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    void setTyping(conversationId, meId, value.trim().length > 0);
  };

  const attachImage = async (file: File) => {
    if (file.size > 6 * 1024 * 1024) {
      setError("Images stay under 6 MB so they load for everyone.");
      return;
    }
    const path = `${conversationId}/${meId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      setError("The image could not be uploaded. Please try again.");
      return;
    }
    try {
      await sendMessage(conversationId, { kind: "image", imagePath: path, replyToId: replyTo?.id ?? null });
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The image message did not send.");
    }
  };

  const selectedMessage = messages.find((m) => m.id === selected) ?? null;

  return (
    <div className="flex min-h-[70dvh] flex-col">
      {/* Pinned presence strip: who is here right now */}
      <p className="px-1 pb-2 text-xs text-faint" aria-live="polite">
        {typingUsers.size > 0
          ? `${typingUsers.size === 1 ? "Someone is" : `${typingUsers.size} people are`} typing…`
          : online.size > 1
            ? `${online.size} people here now`
            : "You are here"}
      </p>

      {/* Reply / selected action bar */}
      <AnimatePresence>
        {(replyTo || selectedMessage) && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            className="mb-2 rounded-2xl border-2 border-brand/50 bg-brand/10 px-4 py-3"
          >
            {replyTo && (
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs text-body">
                  Replying to <span className="font-bold text-foreground">{profileOf(replyTo.sender_id)?.display_name ?? "a message"}</span>: {replyTo.body ?? "an image"}
                </p>
                <button onClick={() => setReplyTo(null)} className="text-xs font-bold text-brand">Cancel</button>
              </div>
            )}
            {selectedMessage && !replyTo && (
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton icon={Reply} label="Reply" onClick={() => { setReplyTo(selectedMessage); setSelected(null); }} />
                {selectedMessage.body && (
                  <ActionButton
                    label="Copy"
                    onClick={async () => {
                      await navigator.clipboard.writeText(selectedMessage.body ?? "").catch(() => {});
                      setSelected(null);
                    }}
                  />
                )}
                {selectedMessage.sender_id === meId && selectedMessage.kind === "text" && (
                  <ActionButton
                    label="Edit"
                    onClick={() => {
                      const next = window.prompt("Edit your message", selectedMessage.body ?? "");
                      if (next && next.trim()) void editMessage(selectedMessage.id, next.trim());
                      setSelected(null);
                    }}
                  />
                )}
                {selectedMessage.sender_id === meId && (
                  <ActionButton
                    icon={Trash2}
                    label="Remove"
                    onClick={async () => {
                      await removeMessage(selectedMessage.id).catch(() => {});
                      setSelected(null);
                    }}
                  />
                )}
                {selectedMessage.sender_id !== meId && (
                  <ActionButton
                    label="Report"
                    onClick={async () => {
                      const reason = window.prompt("What is wrong with this message? (shown only to the moderation queue)");
                      if (reason?.trim()) {
                        await supabase.from("reports").insert({
                          target_type: "message",
                          target_id: selectedMessage.id,
                          reason: reason.trim().slice(0, 200),
                        }).then(() => setError("Thank you. The report was sent to the moderation queue — only the queue can see it."));
                      }
                      setSelected(null);
                    }}
                  />
                )}
                {pin?.canPin && (
                  <ActionButton
                    icon={Pin}
                    label={pin.pinnedIds.includes(selectedMessage.id) ? "Unpin" : "Pin"}
                    onClick={() => {
                      pin.toggle(selectedMessage.id);
                      setSelected(null);
                    }}
                  />
                )}
                <button onClick={() => setSelected(null)} className="ml-auto text-xs font-bold text-dim">Close</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex flex-col gap-1 overflow-y-auto rounded-3xl border-2 border-taupe/60 bg-taupe/10 px-3 py-4 sm:px-5">
        {groupedByDay(messages).map(({ day, items }) => (
          <div key={day}>
            <p className="my-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-faint">{day}</p>
            {items.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                mine={m.sender_id === meId}
                profile={profileOf(m.sender_id)}
                imageUrl={m.image_path ? imageUrls.get(m.image_path) : undefined}
                onPick={() => setSelected(m.id === selected ? null : m.id)}
                picked={selected === m.id}
                read={m.sender_id === meId && (reads.get(m.id)?.length ?? 0) > 0}
              />
            ))}
          </div>
        ))}
        {pending.map((p) => (
          <Bubble
            key={p.clientId}
            message={{
              id: p.clientId,
              conversation_id: conversationId,
              sender_id: meId,
              kind: "text",
              body: p.body,
              image_path: null,
              reply_to_id: null,
              edited_at: null,
              deleted_at: null,
              created_at: new Date().toISOString(),
            }}
            mine
            profile={null}
            phase={p.phase}
            onRetry={() => void retry(p.clientId)}
            onPick={() => undefined}
            picked={false}
            read={false}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-bold text-brand">Dismiss</button>
        </p>
      )}

      {/* Composer — pinned above the mobile bottom nav so it is always
          reachable, however long the thread (sticky returns it to its
          flow position once the conversation is scrolled above). */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 mt-0 flex flex-col gap-2 border-t-2 border-taupe/50 bg-background/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:mt-3 lg:backdrop-blur-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-faint">Quick:</span>
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => setDraft((d) => d + e)}
              className="lift rounded-xl border-2 border-taupe bg-taupe/15 px-2 py-1 text-base hover:border-brand"
              aria-label={`Add ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label className="lift cursor-pointer rounded-2xl border-2 border-taupe bg-taupe/15 p-3 text-dim hover:border-brand hover:text-brand" aria-label="Attach an image">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void attachImage(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Write a message…"
            aria-label="Message"
            className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <button
            onClick={() => void send()}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="lift inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 font-bold text-ink disabled:opacity-50"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  mine,
  profile,
  imageUrl,
  onPick,
  picked,
  read,
  phase,
  onRetry,
}: {
  message: Message;
  mine: boolean;
  profile: PublicProfile | null;
  imageUrl?: string;
  onPick: () => void;
  picked: boolean;
  read: boolean;
  phase?: Phase;
  onRetry?: () => void;
}) {
  const removed = Boolean(message.deleted_at);
  return (
    <div className={`group flex w-full gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      {!mine && <Avatar name={profile?.display_name} url={profile?.avatar_url} size="sm" />}
      <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? "items-end" : ""}`}>
        {!mine && (
          <p className="mb-0.5 px-1 text-[11px] font-bold text-dim">
            {profile?.display_name ?? "Someone"}
          </p>
        )}
        <button
          onClick={onPick}
          className={`w-full rounded-2xl border-2 px-4 py-2.5 text-left transition-colors duration-300 ${
            picked ? "border-brand" : "border-taupe"
          } ${
            mine
              ? "border-brand/60 bg-brand/15 text-foreground"
              : "border-taupe bg-taupe/25 text-body"
          } ${removed ? "opacity-60" : ""}`}
        >
          {removed ? (
            <span className="text-sm italic text-dim">Message removed</span>
          ) : message.kind === "image" && message.image_path ? (
            <span className="block overflow-hidden rounded-xl">
              {imageUrl ? (
                 
                <img src={imageUrl} alt="Shared image" className="max-h-72 w-full object-contain" loading="lazy" />
              ) : (
                <span className="flex h-40 items-center justify-center bg-taupe/30 text-xs text-dim">Loading image…</span>
              )}
            </span>
          ) : (
            <span className="block whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</span>
          )}
          <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${mine ? "justify-end" : ""} text-faint`}>
            {timeOfDay(message.created_at)}
            {message.edited_at && !removed && <span>· edited</span>}
            {read && !removed && <span className="text-brand">· read</span>}
            {phase === "sending" && <span>· sending…</span>}
            {phase === "failed" && <span className="text-brand">· not sent</span>}
          </span>
        </button>
        {phase === "failed" && onRetry && (
          <button onClick={onRetry} className="mt-1 flex items-center gap-1 px-1 text-xs font-bold text-brand">
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="lift inline-flex min-h-9 items-center gap-1.5 rounded-xl border-2 border-taupe bg-taupe/20 px-3 text-xs font-bold text-foreground hover:border-brand"
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
}

function groupedByDay(messages: Message[]) {
  const groups: { day: string; items: Message[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

async function refreshReads(
  conversationId: string,
  setReads: (next: Map<string, string[]>) => void,
) {
  const sup = createClient();
  const { data } = await sup
    .from("message_reads")
    .select("message_id, user_id")
    .in("message_id",
      (await sup.from("messages").select("id").eq("conversation_id", conversationId)).data?.map((m) => m.id) ?? []
    );
  const map = new Map<string, string[]>();
  for (const r of data ?? []) {
    map.set(r.message_id, [...(map.get(r.message_id) ?? []), r.user_id]);
  }
  setReads(map);
}
