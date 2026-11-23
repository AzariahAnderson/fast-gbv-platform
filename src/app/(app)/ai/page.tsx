"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, SendHorizontal, Trash2 } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { createClient } from "@/lib/supabase/client";
import { CRISIS_LINE } from "@/lib/numbers";

/**
 * FAST Guide. Looks like FAST, not like a chat product: one quiet column,
 * warm type, suggested first questions, and honest privacy — the
 * conversation lives in this tab only, until the user explicitly saves
 * it. A persistent emergency CTA stays within reach, because a Guide that
 * can't hand off to real humans would be a failure.
 */

const SUGGESTIONS = [
  "Is this relationship becoming controlling?",
  "How can I help a friend?",
  "Help me make a safety plan.",
  "What should I do if I feel unsafe?",
  "What is coercive control?",
];

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function AiPage() {
  const { user } = useSession();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, streaming]);

  async function ask(question: string) {
    if (!question.trim() || streaming) return;
    setError(null);
    setNote(null);
    const next: Turn[] = [...turns, { role: "user", content: question.trim() }];
    setTurns(next);
    setDraft("");
    setStreaming(true);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: abortRef.current.signal,
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setTurns([...next, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        setTurns([...next, { role: "assistant", content: assistant }]);
      }
      if (!assistant.trim()) {
        setTurns([
          ...next,
          {
            role: "assistant",
            content:
              `I could not answer just now. If you are in danger, call ${CRISIS_LINE.display} — free, 24 hours.`,
          },
        ]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("The Guide is quiet right now. Please try again in a moment.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function saveConversation() {
    if (!user || turns.length === 0) return;
    const supabase = createClient();
    const title =
      turns.find((t) => t.role === "user")?.content.slice(0, 60) ?? "Private conversation";
    const { data: conv, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (error || !conv) {
      setNote("Could not save — please try again.");
      return;
    }
    await supabase.from("ai_messages").insert(
      turns.map((t) => ({ conversation_id: conv.id, role: t.role, content: t.content })),
    );
    setNote("Saved to your account. You can delete it any time from Settings.");
  }

  function newConversation() {
    abortRef.current?.abort();
    setTurns([]);
    setNote(null);
    setError(null);
  }

  return (
    <div className="flex min-h-[72dvh] flex-col">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
            FAST <span className="text-brand">Guide</span>
          </h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
            Ask anything. Calm guidance, real options, no judgement. This
            conversation stays on this screen unless you save it.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={newConversation}
            className="lift inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-xs font-bold text-body hover:border-brand"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </button>
        </div>
      </section>

      {/* Conversation */}
      <div className="mt-5 flex-1 rounded-3xl border-2 border-taupe/60 bg-taupe/10 px-4 py-5 sm:px-6">
        {turns.length === 0 ? (
          <div className="py-6">
            <p className="text-sm font-bold text-foreground">Start wherever it hurts most</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void ask(s)}
                  className="lift min-h-11 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-sm font-semibold text-body hover:border-brand hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl border-2 px-4 py-3 text-sm leading-relaxed ${
                    t.role === "user"
                      ? "border-brand/60 bg-brand/15 text-foreground"
                      : "border-taupe bg-taupe/25 text-body"
                  }`}
                >
                  {t.content || (streaming && i === turns.length - 1 ? "…" : "")}
                </p>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{error}</p>
      )}
      {note && (
        <p role="status" className="mt-3 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>
      )}

      {/* Privacy + actions row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs leading-relaxed text-faint">
          The Guide is not a therapist and not an emergency service. Answers
          are processed by an external AI provider — don't share names,
          addresses, passwords or financial details.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void saveConversation()}
            disabled={turns.length === 0}
            className="lift min-h-10 rounded-xl border-2 border-taupe bg-taupe/15 px-3 text-xs font-bold text-body hover:border-brand disabled:opacity-50"
          >
            Save conversation
          </button>
          <button
            onClick={() => {
              setTurns([]);
              setNote("Deleted from this screen.");
            }}
            disabled={turns.length === 0}
            className="lift inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-taupe bg-taupe/15 px-3 text-xs font-bold text-body hover:border-brand disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      {/* Composer + crisis line — pinned above the mobile bottom nav so
          asking for help is always one tap away (sticky returns the pair
          to its flow position on taller screens). */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 border-t-2 border-taupe/50 bg-background/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
        <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(draft);
            }
          }}
          placeholder="Write to the Guide…"
          aria-label="Message the FAST Guide"
          className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
        />
        <button
          onClick={() => void ask(draft)}
          disabled={!draft.trim() || streaming}
          aria-label="Send"
          className="lift inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 font-bold text-ink disabled:opacity-50"
        >
          <SendHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
        <p className="mt-2 px-1 text-xs text-dim">
          In danger right now? Call{" "}
          <span className="font-bold text-brand">{CRISIS_LINE.display}</span> — free, 24 hours, answered by people.
        </p>
      </div>
    </div>
  );
}
