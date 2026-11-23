"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Signpost } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { Avatar } from "@/components/app/avatar";
import { createClient } from "@/lib/supabase/client";
import { displayPhone, normalisePhone } from "@/lib/phone";

/**
 * Profile. The small, honest surface of you on Fast: a name, an optional
 * photo, an optional line about yourself. Phone and email are visible
 * here to you alone.
 */
export default function ProfilePage() {
  const { user, profile, loading } = useSession();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setPhone(profile.phone ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  async function pickAvatar(file: File) {
    if (!user) return;
    if (file.size > 4 * 1024 * 1024) {
      setNote("Photos stay under 4 MB.");
      return;
    }
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (error) {
      setNote("The photo could not upload.");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setNote("Photo updated. Remember to save.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const cleaned = phone.trim() ? normalisePhone(phone) : null;
      if (phone.trim() && !cleaned) {
        setNote("That phone number does not look complete.");
        return;
      }
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: name.trim() || "Friend",
        bio: bio.trim() || null,
        phone: cleaned,
        avatar_url: avatarUrl,
      });
      if (error) {
        setNote(error.code === "23505"
          ? "That number belongs to another Fast account."
          : "Could not save — please try again.");
        return;
      }
      setNote("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <p className="text-base text-body">One moment…</p>;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Profile<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-body">
          Other people see your name, photo and bio — nothing else. Your
          number and email stay yours.
        </p>
      </section>

      <form onSubmit={save} className="card-surface flex flex-col gap-5 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={name} url={avatarUrl} size="lg" online={profile?.presence === "online"} />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="lift min-h-11 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-sm font-bold text-body hover:border-brand"
            >
              Change photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickAvatar(f);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-xs text-faint">{user.email}</p>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Name</span>
          <input
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground focus:border-brand focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">About you</span>
          <textarea
            rows={3}
            maxLength={200}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 text-sm leading-relaxed text-foreground focus:border-brand focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
            Phone <span className="font-medium normal-case tracking-normal text-faint">(only friends who know it can find you; it is never shown)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="082 123 4567"
            className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground focus:border-brand focus:outline-none"
          />
          {profile?.phone && (
            <span className="text-xs text-dim">Saved: {displayPhone(profile.phone)}</span>
          )}
        </label>

        {note && <p role="status" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="lift inline-flex min-h-12 items-center rounded-2xl bg-brand px-6 text-sm font-bold text-ink disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <Link
            href="/settings"
            className="lift inline-flex min-h-12 items-center gap-2 rounded-2xl border-[3px] border-taupe bg-taupe/15 px-6 text-sm font-bold text-foreground hover:border-brand"
          >
            <Signpost className="h-4 w-4" aria-hidden="true" />
            Privacy and settings
          </Link>
        </div>
      </form>

      <button
        onClick={() => void signOut()}
        className="lift min-h-11 self-start rounded-2xl border-2 border-taupe px-5 text-sm font-bold text-dim hover:border-brand hover:text-brand"
      >
        Sign out
      </button>
    </div>
  );
}
