"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, Plus } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { createClient } from "@/lib/supabase/client";

/**
 * Family. Small, deliberate circles — you create one with a name, or
 * join one with a code someone gave you. Everything inside respects the
 * family's own roles.
 */
export default function FamilyPage() {
  const { user, profile, loading } = useSession();
  const supabase = createClient();
  const [families, setFamilies] = useState<{ id: string; name: string; role: string }[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberships } = await supabase
        .from("family_members")
        .select("family_id, role")
        .eq("user_id", user.id);
      const ids = (memberships ?? []).map((m) => m.family_id);
      if (ids.length === 0) {
        setFamilies([]);
        return;
      }
      const { data: fams } = await supabase.from("families").select("id, name").in("id", ids);
      setFamilies(
        (fams ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          role: (memberships ?? []).find((m) => m.family_id === f.id)?.role ?? "member",
        })),
      );
    })();
  }, [user]);

  async function createFamily(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: familyId, error } = await supabase.rpc("create_family", {
        name: name.trim(),
        avatar_url: null,
      });
      if (error) throw error;
      window.location.href = `/family/${familyId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the family.");
    } finally {
      setBusy(false);
    }
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: familyId, error } = await supabase.rpc("join_family_by_code", {
        code: code.trim(),
      });
      if (error) throw error;
      window.location.href = `/family/${familyId}`;
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("not found")
          ? "That code is not valid anymore. Ask the person who shared it for a fresh one."
          : err instanceof Error
            ? err.message
            : "Could not join.",
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
          Family<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-body">
          The people you want close when things matter. Check-ins are care,
          not surveillance — no one can see where you are unless you share it.
        </p>
      </section>

      {note && (
        <p role="status" className="rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>
      )}

      <section aria-label="Your families" className="flex flex-col gap-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Your families</h2>
        {families.length === 0 ? (
          <div className="card-surface p-7 text-center">
            <HeartHandshake className="mx-auto h-7 w-7 text-dim" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-foreground">No family circles yet</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              Create one below, or join one with a code from someone you trust.
            </p>
          </div>
        ) : (
          families.map((f) => (
            <a key={f.id} href={`/family/${f.id}`} className="card-hover card-surface lift flex items-center justify-between px-5 py-4">
              <span>
                <span className="block text-sm font-bold text-foreground">{f.name}</span>
                <span className="block text-xs text-dim">You are {f.role}</span>
              </span>
              <span className="text-xs font-bold text-brand">Open →</span>
            </a>
          ))
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <form onSubmit={createFamily} className="card-surface flex flex-col gap-4 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Plus className="h-4 w-4 text-brand" aria-hidden="true" /> Create a family
          </h2>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Family name</span>
            <input
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Mokoena family"
              className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="lift inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-bold text-ink disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create family"}
          </button>
        </form>

        <form onSubmit={joinByCode} className="card-surface flex flex-col gap-4 p-6">
          <h2 className="text-sm font-bold text-foreground">Join with an invite code</h2>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Code</span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste the code you were given"
              className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="lift inline-flex min-h-12 items-center justify-center rounded-2xl border-[3px] border-taupe bg-taupe/15 px-6 text-sm font-bold text-foreground hover:border-brand hover:text-brand disabled:opacity-60"
          >
            Join family
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{error}</p>
      )}

      <p className="text-xs leading-relaxed text-faint">
        {profile?.display_name ? `Signed in as ${profile.display_name}. ` : ""}
        Your role in each circle is set by its owner. An owner or admin can
        invite people with a code; a code expires after two weeks.
      </p>
    </div>
  );
}
