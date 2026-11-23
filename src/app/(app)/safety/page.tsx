"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileHeart, Timer } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { EmergencyButton } from "@/components/app/emergency-sheet";
import { createClient } from "@/lib/supabase/client";
import { friendlyTime } from "@/lib/app/time";
import type { SafeArrival } from "@/lib/db-types";

/**
 * The safety hub. Three honest tools: the emergency directory one tap
 * away, a safe-arrival timer that reminds before it ever alerts anyone,
 * and private safety plans. Nothing here calls anyone without the user
 * having chosen exactly that.
 */
export default function SafetyPage() {
  const { user } = useSession();
  const supabase = createClient();
  const [arrivals, setArrivals] = useState<SafeArrival[]>([]);
  const [destination, setDestination] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("safe_arrivals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setArrivals((data ?? []) as SafeArrival[]);
    })();
  }, [user]);

  async function startArrival(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const expected = new Date(Date.now() + minutes * 60_000).toISOString();
    // A timer starts with no trusted contacts: it reminds YOU first, and
    // only the user can later share it with chosen people.
    const { data, error } = await supabase
      .from("safe_arrivals")
      .insert({
        user_id: user.id,
        destination_label: destination.trim(),
        expected_at: expected,
        trusted_contact_ids: [],
        status: "active",
      })
      .select("id")
      .single();
    if (error || !data) {
      setNote("The timer did not start. Please try again.");
      return;
    }
    setNote(
      `Reminder set for ${minutes} minutes. When it ends, Fast reminds you first — nobody is told anything without your choice.`,
    );
    setDestination("");
    // Local reminder: simple and honest, fires while the app is open.
    setTimeout(async () => {
      await supabase.from("safe_arrivals").update({ status: "expired", resolved_at: new Date().toISOString() }).eq("id", data.id);
      setNote(`Your ${minutes}-minute timer to "${destination.trim()}" has ended. If you did not arrive safely, reach your family on the Family page — or call for help now.`);
      void refresh();
    }, minutes * 60_000);
  }

  async function refresh() {
    if (!user) return;
    const { data } = await supabase
      .from("safe_arrivals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setArrivals((data ?? []) as SafeArrival[]);
  }

  async function markArrived(id: string) {
    await supabase.from("safe_arrivals").update({ status: "arrived", resolved_at: new Date().toISOString() }).eq("id", id);
    setNote("Glad you arrived.");
    void refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Safety<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-body">
          The tools here follow one rule: you decide, always. A reminder
          never escalates by itself, and a plan is private until you share it.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card-surface card-featured flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Immediate help</p>
          <p className="text-sm leading-relaxed text-body">
            Verified emergency services, the same directory as everywhere on
            Fast. Calling is always the fastest way to reach a person.
          </p>
          <EmergencyButton className="mt-1 self-start" />
        </div>
        <div className="card-surface flex flex-col gap-3 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Private plans</p>
          <p className="text-sm leading-relaxed text-body">
            Write down the things that matter before you need them: people,
            places, documents, an exit plan.
          </p>
          <Link
            href="/safety/plans"
            className="lift inline-flex min-h-11 items-center gap-2 self-start rounded-2xl border-[3px] border-taupe bg-taupe/15 px-5 text-sm font-bold text-foreground hover:border-brand hover:text-brand"
          >
            <FileHeart className="h-4 w-4" aria-hidden="true" />
            My safety plans
          </Link>
        </div>
      </section>

      {/* Safe arrival */}
      <section aria-label="Safe arrival">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Timer className="h-4 w-4 text-brand" aria-hidden="true" /> Safe arrival
        </h2>
        <form onSubmit={startArrival} className="card-surface mt-3 flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Where are you heading?</span>
            <input
              required
              maxLength={80}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Home from work"
              className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </label>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Expected time</legend>
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                className={`min-h-11 rounded-2xl border-2 px-4 text-sm font-bold ${
                  minutes === m ? "border-brand text-brand" : "border-taupe text-body"
                }`}
              >
                {m} minutes
              </button>
            ))}
          </fieldset>
          <button
            type="submit"
            className="lift inline-flex min-h-12 items-center justify-center self-start rounded-2xl bg-brand px-6 text-sm font-bold text-ink"
          >
            Start the timer
          </button>
          {note && (
            <p role="status" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>
          )}
          <p className="text-xs leading-relaxed text-faint">
            An ordinary timer is never turned into an emergency call. If you
            want people told, you tell them — or you choose trusted contacts
            explicitly when you create the timer next time.
          </p>
        </form>

        {arrivals.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {arrivals.map((a) => (
              <li key={a.id} className="card-surface flex items-center gap-3 px-5 py-4">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{a.destination_label}</p>
                  <p className="text-xs text-dim">
                    Expected {friendlyTime(a.expected_at)} · {a.status.replace(/_/g, " ")}
                  </p>
                </div>
                {a.status === "active" && (
                  <button onClick={() => void markArrived(a.id)} className="text-xs font-bold text-brand">
                    I arrived
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
