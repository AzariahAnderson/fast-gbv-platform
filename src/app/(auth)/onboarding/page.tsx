"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/app/setup-notice";
import { normalisePhone } from "@/lib/phone";

/**
 * One short step: choose the name Fast greets you with, and add a phone
 * number only if you want friends to find you by it. Location sharing is
 * created OFF — no Fast setting ever turns it on for you.
 */
export default function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice what="Setting up your profile" />;
  }
  return <OnboardingForm />;
}

function OnboardingForm() {
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, bio")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.display_name && data.display_name !== "Friend") {
        setAlreadyDone(true);
        window.location.href = "/home";
        return;
      }
      setBusy(false);
    })();
     
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session ended. Please sign in again.");

      const cleaned = phone ? normalisePhone(phone) : null;
      if (phone && !cleaned) {
        throw new Error("That phone number does not look complete. Include the full number.");
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim() || "Friend",
        phone: cleaned,
        email: user.email ?? null,
        bio: bio.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          throw new Error("That phone number is already connected to another Fast account.");
        }
        throw error;
      }
      window.location.href = "/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (busy || alreadyDone) {
    return <p className="text-base text-body">One moment…</p>;
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
        How should Fast <span className="text-brand">greet you</span>?
      </h1>
      <p className="mt-3 text-base leading-relaxed text-body">
        Your name is the only thing other people will see, besides what you
        choose to write about yourself.
      </p>

      <form onSubmit={submit} className="card-surface mt-8 flex flex-col gap-5 p-6 sm:p-7">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Your name</span>
          <input
            required
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Thandi"
            className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
            Phone <span className="font-medium normal-case tracking-normal text-faint">(optional)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="082 123 4567"
            className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <span className="text-xs leading-relaxed text-dim">
            Only friends who already know your number can find you, and your
            number is never shown to anyone.
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
            A line about you <span className="font-medium normal-case tracking-normal text-faint">(optional)</span>
          </span>
          <textarea
            rows={3}
            maxLength={200}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Big sister. Good at quiet morning drives and bad jokes."
            className="rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="lift inline-flex min-h-13 items-center justify-center rounded-2xl bg-brand px-8 text-base font-bold text-ink disabled:opacity-60"
        >
          {saving ? "Saving…" : "Enter Fast"}
        </button>

        <p className="text-xs leading-relaxed text-dim">
          Location sharing starts switched off and only ever runs while you
          turn it on, for people you choose, for a time you set.
        </p>
      </form>
    </div>
  );
}
