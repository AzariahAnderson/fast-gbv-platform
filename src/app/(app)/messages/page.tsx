"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { Avatar } from "@/components/app/avatar";
import { friendlyTime } from "@/lib/app/time";
import { listConversations, type ConversationSummary } from "@/lib/app/messages";
import { createClient } from "@/lib/supabase/client";
import { normalisePhone } from "@/lib/phone";

/**
 * Messages. The list of people you talk to, plus the one honest way to
 * meet someone new: they must already know your number. Search is an
 * exact phone match through a database function — never a directory, and
 * never a name search that could expose people.
 */
export default function MessagesPage() {
  const { user, loading } = useSession();
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    void refresh(user.id);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(user.id);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
     
  }, [user?.id]);

  async function refresh(userId: string) {
    setSummaries(await listConversations(userId));
  }

  async function findByPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotFound(false);
    const cleaned = normalisePhone(phone);
    if (!cleaned) {
      setError("That number does not look complete. Include the full number.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase
        .rpc("search_profile_by_phone", { query: phone });
      if (rpcError) throw rpcError;
      const match = data?.[0];
      if (!match) {
        setNotFound(true);
        return;
      }
      const { data: convId, error: startError } = await supabase
        .rpc("start_direct_conversation", { other: match.id });
      if (startError) throw startError;
      window.location.href = `/messages/${convId}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed.";
      setError(
        message.includes("unavailable")
          ? "You cannot start a conversation with this person."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-base text-body">One moment…</p>;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Messages<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-body">
          Private conversations, end to end with the people you choose.
        </p>
      </section>

      <form onSubmit={findByPhone} className="card-surface flex flex-col gap-3 p-5 sm:p-6">
        <label htmlFor="phone-search" className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
          Find someone by their phone number
        </label>
        <div className="flex gap-2">
          <input
            id="phone-search"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="082 123 4567"
            className="min-h-12 flex-1 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="lift inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-ink disabled:opacity-60"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {busy ? "Looking…" : "Find"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-dim">
          An exact match only. If someone has not signed up with that number,
          Fast will not pretend otherwise.
        </p>
        {error && (
          <p role="alert" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{error}</p>
        )}
        {notFound && (
          <p role="status" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
            No Fast account uses that number yet. They can sign up with it, and then you can find them here.
          </p>
        )}
      </form>

      <section aria-label="Conversations" className="flex flex-col gap-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Your conversations</h2>
        {summaries.length === 0 ? (
          <div className="card-surface p-7 text-center">
            <p className="text-sm font-bold text-foreground">No conversations yet</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              Find someone above with their phone number, or start talking in
              a family — every family has its own conversation.
            </p>
          </div>
        ) : (
          summaries.map((s) => {
            const other = s.otherMembers[0]?.profile ?? null;
            const title =
              s.conversation.type === "family"
                ? s.familyName ?? "Family"
                : other?.display_name ?? "Conversation";
            return (
              <a
                key={s.conversation.id}
                href={`/messages/${s.conversation.id}`}
                className="card-hover card-surface lift flex items-center gap-4 px-5 py-4"
              >
                {s.conversation.type === "direct" ? (
                  <Avatar name={other?.display_name} url={other?.avatar_url} online={other?.presence === "online"} />
                ) : (
                  <Avatar name={s.familyName ?? "F"} url={null} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-foreground">{title}</span>
                    {s.lastMessage && (
                      <span className="shrink-0 text-[11px] text-faint">{friendlyTime(s.lastMessage.created_at)}</span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-dim">
                      {s.lastMessage
                        ? s.lastMessage.deleted_at
                          ? "Message removed"
                          : s.lastMessage.kind === "image"
                            ? "Sent an image"
                            : s.lastMessage.body
                        : "Say hello when you are ready"}
                    </span>
                    {s.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-ink">
                        {s.unread}
                      </span>
                    )}
                  </span>
                </span>
              </a>
            );
          })
        )}
      </section>
    </div>
  );
}
