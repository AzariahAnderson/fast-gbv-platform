"use client";

import { useEffect, useState } from "react";
import { FileHeart } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { createClient } from "@/lib/supabase/client";
import { friendlyTime } from "@/lib/app/time";
import type { SafetyPlan } from "@/lib/db-types";

/**
 * Safety plans. Private by default — the database only lets the owner
 * (and people the owner explicitly shared with) read a plan. Sections are
 * plain writing, not forms: plans are personal.
 */

const SECTION_LABELS: { key: string; label: string; hint: string }[] = [
  { key: "people", label: "People I trust", hint: "Who you would call, and what they can help with" },
  { key: "places", label: "Safe places", hint: "Where you can go and be safe, at any hour if possible" },
  { key: "contacts", label: "Emergency contacts", hint: "Numbers written where you can reach them with low battery" },
  { key: "transport", label: "Transport", hint: "How you would leave: taxi money, a route, a backup" },
  { key: "documents", label: "Important documents", hint: "ID, bank cards, medication scripts — and where copies live" },
  { key: "essentials", label: "Medication and essentials", hint: "Only if you want to write it here" },
  { key: "notes", label: "Notes to myself", hint: "Anything you want your future self to remember" },
  { key: "exit", label: "Exit plan", hint: "The steps, in order, for the day you decide to go" },
];

export default function SafetyPlansPage() {
  const { user } = useSession();
  const supabase = createClient();
  const [plans, setPlans] = useState<SafetyPlan[]>([]);
  const [editing, setEditing] = useState<SafetyPlan | null>(null);
  const [title, setTitle] = useState("My safety plan");
  const [sections, setSections] = useState<Record<string, string>>({});
  const [sharedWith, setSharedWith] = useState<{ id: string; name: string | null }[]>([]);
  const [possibleViewers, setPossibleViewers] = useState<{ id: string; name: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void reload();
     
  }, [user?.id]);

  async function reload() {
    if (!user) return;
    const { data } = await supabase.from("safety_plans").select("*").order("updated_at", { ascending: false });
    setPlans((data ?? []) as SafetyPlan[]);
  }

  async function loadViewers() {
    if (!user) return;
    // People who could ever be invited to read a plan: family members.
    const { data: fams } = await supabase.from("family_members").select("family_id").eq("user_id", user.id);
    const ids = (fams ?? []).map((f) => f.family_id);
    if (ids.length === 0) {
      setPossibleViewers([]);
      return;
    }
    const { data: mems } = await supabase.from("family_members").select("user_id").in("family_id", ids).neq("user_id", user.id);
    const uids = Array.from(new Set((mems ?? []).map((m) => m.user_id)));
    const { data: profiles } = uids.length
      ? await supabase.from("profiles_public").select("id, display_name").in("id", uids)
      : { data: [] as { id: string; display_name: string }[] };
    setPossibleViewers((profiles ?? []).map((p) => ({ id: p.id, name: p.display_name })));
  }

  async function openPlan(plan: SafetyPlan | null) {
    setNote(null);
    if (!plan) {
      setEditing({ id: "", owner_id: "", title: "My safety plan", sections: {}, notes: null, created_at: "", updated_at: "" });
      setTitle("My safety plan");
      setSections({});
      setSharedWith([]);
      await loadViewers();
      return;
    }
    setEditing(plan);
    setTitle(plan.title);
    setSections((plan.sections ?? {}) as Record<string, string>);
    await loadViewers();
    const { data: shares } = await supabase.from("safety_plan_shares").select("viewer_id").eq("plan_id", plan.id);
    setSharedWith((shares ?? []).map((s) => ({ id: s.viewer_id, name: possibleViewers.find((p) => p.id === s.viewer_id)?.name ?? null })));
  }

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const payload = { title: title.trim() || "My safety plan", sections, owner_id: user.id };
      if (editing?.id) {
        const { error } = await supabase.from("safety_plans").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("safety_plans").insert(payload).select("id").single();
        if (error) throw error;
        if (sharedWith.length && data) {
          await supabase.from("safety_plan_shares").insert(
            sharedWith.map((v) => ({ plan_id: data.id, viewer_id: v.id })),
          );
        }
      }
      setNote("Saved. Only you" + (sharedWith.length ? " and the people you chose" : "") + " can read this.");
      setEditing(null);
      void reload();
    } catch {
      setNote("Could not save — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const sure = window.confirm("Delete this plan? This cannot be undone.");
    if (!sure) return;
    await supabase.from("safety_plans").delete().eq("id", id);
    void reload();
  }

  async function toggleShare(viewerId: string) {
    if (!editing?.id) {
      setSharedWith((s) => (s.some((x) => x.id === viewerId) ? s.filter((x) => x.id !== viewerId) : [...s, { id: viewerId, name: null }]));
      return;
    }
    const has = sharedWith.some((x) => x.id === viewerId);
    if (has) {
      await supabase.from("safety_plan_shares").delete().eq("plan_id", editing.id).eq("viewer_id", viewerId);
      setSharedWith((s) => s.filter((x) => x.id !== viewerId));
    } else {
      await supabase.from("safety_plan_shares").insert({ plan_id: editing.id, viewer_id: viewerId });
      setSharedWith((s) => [...s, { id: viewerId, name: null }]);
    }
    setNote("Sharing updated.");
  }

  if (!user) return <p className="text-base text-body">One moment…</p>;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
            Safety plans<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
            Written for the day things are hard. Private until you choose to
            show someone — sharing is always explicit, person by person.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => void openPlan(null)}
            className="lift inline-flex min-h-12 shrink-0 items-center rounded-2xl bg-brand px-5 text-sm font-bold text-ink"
          >
            New plan
          </button>
        )}
      </section>

      {note && <p role="status" className="rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>}

      {!editing && (
        <section className="flex flex-col gap-2.5">
          {plans.length === 0 ? (
            <div className="card-surface p-7 text-center">
              <FileHeart className="mx-auto h-7 w-7 text-dim" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-foreground">No plans yet</p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
                A plan takes five minutes to start and only ever helps. Start
                with the people you would call.
              </p>
            </div>
          ) : (
            plans.map((p) => (
              <div key={p.id} className="card-hover card-surface flex items-center gap-4 px-5 py-4">
                <button onClick={() => void openPlan(p)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">{p.title}</p>
                  <p className="text-xs text-dim">Updated {friendlyTime(p.updated_at)}</p>
                </button>
                <button onClick={() => void remove(p.id)} className="text-xs font-bold text-dim hover:text-brand">
                  Delete
                </button>
              </div>
            ))
          )}
        </section>
      )}

      {editing && (
        <div className="card-surface flex flex-col gap-5 p-6">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Plan name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base font-bold text-foreground focus:border-brand focus:outline-none"
            />
          </label>

          {SECTION_LABELS.map(({ key, label, hint }) => (
            <label key={key} className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">{label}</span>
              <span className="text-xs text-faint">{hint}</span>
              <textarea
                rows={2}
                value={sections[key] ?? ""}
                onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
                className="rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 text-sm leading-relaxed text-foreground focus:border-brand focus:outline-none"
              />
            </label>
          ))}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
              Share with (only these people can read this plan)
            </legend>
            {possibleViewers.length === 0 ? (
              <p className="text-xs text-dim">
                Join a family and the people in it can be invited here. Plans
                stay private until then.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {possibleViewers.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => void toggleShare(v.id)}
                    aria-pressed={sharedWith.some((x) => x.id === v.id)}
                    className={`min-h-11 rounded-2xl border-2 px-4 text-sm font-bold ${
                      sharedWith.some((x) => x.id === v.id) ? "border-brand text-brand" : "border-taupe text-body"
                    }`}
                  >
                    {v.name ?? "Member"}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="lift inline-flex min-h-12 items-center rounded-2xl bg-brand px-6 text-sm font-bold text-ink disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save plan"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="lift inline-flex min-h-12 items-center rounded-2xl border-[3px] border-taupe bg-taupe/15 px-6 text-sm font-bold text-foreground hover:border-brand"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
