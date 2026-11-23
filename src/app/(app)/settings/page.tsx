"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/app/session";
import { createClient } from "@/lib/supabase/client";

/**
 * Settings. The privacy switches that matter, written in plain language:
 * location master switch, AI history deletion, location data deletion,
 * and the honest statement of what Fast does and does not collect.
 */
export default function SettingsPage() {
  const { user, profile, loading } = useSession();
  const supabase = createClient();
  const [override, setOverride] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Derived, not mirrored: the profile row is the truth; the override only
  // exists between the tap and the database confirm.
  const sharing = override ?? profile?.location_sharing_enabled ?? false;

  async function toggleSharing() {
    if (!user) return;
    const next = !sharing;
    setOverride(next);
    await supabase.from("profiles").update({ location_sharing_enabled: next }).eq("id", user.id);
    setNote(next
      ? "Location features are available. Sharing with people still requires you to start it, per person."
      : "Location is switched off everywhere. Nothing on your phone or in Fast collects it now.");
  }

  async function deleteAiHistory() {
    if (!user) return;
    const sure = window.confirm("Delete all saved FAST Guide conversations? This cannot be undone.");
    if (!sure) return;
    await supabase.from("ai_conversations").delete().eq("user_id", user.id);
    setNote("All saved Guide conversations were deleted.");
  }

  async function deleteLocationData() {
    if (!user) return;
    const sure = window.confirm("Delete your current location data and pause all shares?");
    if (!sure) return;
    await supabase.from("locations").delete().eq("user_id", user.id);
    await supabase.from("location_shares").delete().eq("user_id", user.id);
    setNote("Location data deleted. No shares remain active.");
  }

  if (loading) return <p className="text-base text-body">One moment…</p>;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Settings<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-body">
          Few switches, plainly labelled — because you should never have to
          wonder what Fast is doing.
        </p>
      </section>

      {note && <p role="status" className="rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>}

      <section className="card-surface p-6" aria-label="Location">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">Location features</p>
            <p className="mt-1 text-xs leading-relaxed text-dim">
              The master switch for the map and location sharing. Off means
              off: no collection, no sharing, anywhere.
            </p>
          </div>
          <button
            onClick={() => void toggleSharing()}
            role="switch"
            aria-checked={sharing}
            aria-label="Location features"
            className={`lift relative h-8 w-14 rounded-full border-2 transition-colors duration-300 ${
              sharing ? "border-brand bg-brand/30" : "border-taupe bg-taupe/20"
            }`}
          >
            <span
              className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-300 ${
                sharing ? "left-7 bg-brand" : "left-1 bg-taupe"
              }`}
            />
          </button>
        </div>
        <button
          onClick={() => void deleteLocationData()}
          className="lift mt-4 min-h-11 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-xs font-bold text-body hover:border-brand"
        >
          Delete my location data now
        </button>
      </section>

      <section className="card-surface p-6" aria-label="FAST Guide privacy">
        <p className="text-sm font-bold text-foreground">FAST Guide conversations</p>
        <p className="mt-1 text-xs leading-relaxed text-dim">
          Conversations live on your screen only, until you save them. Saved
          conversations are processed by an external AI provider — Fast does
          not claim end-to-end encryption, and never sells or advertises
          against this content.
        </p>
        <button
          onClick={() => void deleteAiHistory()}
          className="lift mt-4 min-h-11 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-xs font-bold text-body hover:border-brand"
        >
          Delete all saved conversations
        </button>
      </section>

      <section className="card-surface p-6" aria-label="What Fast keeps">
        <p className="text-sm font-bold text-foreground">What Fast keeps</p>
        <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-dim">
          <li>· Your profile: name, optional photo, optional bio, optional phone.</li>
          <li>· The messages you send, until you remove them.</li>
          <li>· Check-ins and safety timers you create.</li>
          <li>· One current location row per share, which expires. No history.</li>
          <li>· No advertising, no trackers, no analytics about people.</li>
        </ul>
      </section>
    </div>
  );
}
