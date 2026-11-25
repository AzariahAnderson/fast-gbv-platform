"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Languages, MapPinOff, Clock } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthSplit } from "@/components/app/auth-split";

/**
 * Sign in with email + password against real Supabase Auth. There are no
 * verification codes anywhere in Fast: no emailed one-time codes and no
 * phone OTP — one thing to remember, one step, straight into the app.
 */
export default function LoginPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice what="Signing in" />;
  }
  return <LoginForm />;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      // Validated in-app path only: an external "next" value would send a
      // freshly signed-in person to a phishing copy of Fast (open redirect).
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      eyebrow="Stay close. Stay safe."
      title={
        <>
          Your people are one{" "}
          <span className="text-brand">sign-in</span> away.
        </>
      }
      note="Your messages, your family circle and your personal safety tools live behind this door — and they open in seconds."
      bullets={[
        { icon: EyeOff, label: "Your email is never shown to anyone on Fast" },
        { icon: MapPinOff, label: "Location sharing starts switched off, and only runs when you turn it on" },
        { icon: Clock, label: "Help is answered 24 hours a day, every day" },
        { icon: Languages, label: "Every one of South Africa's 11 official languages" },
      ]}
      emojis={[
        // Trio (left, beside the words) and floats (right band, always
        // clear of the content column) use different companions.
        { src: "/emojis/1f496-128.webp", pos: "", size: "h-10 w-10", rotate: 8, drift: "a", life: "bob", lifeDur: "6.8s" },
        { src: "/emojis/1f338-128.webp", pos: "", size: "h-9 w-9", rotate: -10, drift: "b", life: "sway", lifeDur: "7.2s" },
        { src: "/emojis/1f54a-128.webp", pos: "", size: "h-10 w-10", rotate: 8, drift: "a", life: "bob", lifeDur: "7.4s" },
        { src: "/emojis/2728-128.webp", pos: "sm:block top-[2.5%] right-[30%]", size: "h-6 w-6", rotate: -6, drift: "b", life: "twinkle", lifeDur: "3.8s" },
        { src: "/emojis/1f49a-128.webp", pos: "sm:block top-[8%] right-[4%]", size: "h-10 w-10", rotate: 10, drift: "a", life: "bob", lifeDur: "6.4s" },
        { src: "/emojis/1f339-128.webp", pos: "sm:block top-[37%] right-[4.5%]", size: "h-7 w-7", rotate: 12, drift: "b", life: "sway", lifeDur: "7.6s" },
        { src: "/emojis/1f49c-128.webp", pos: "sm:block bottom-[31%] right-[4.5%]", size: "h-6 w-6", rotate: -8, drift: "a", life: "bob", lifeDur: "7.1s" },
        { src: "/emojis/1f388-128.webp", pos: "sm:block bottom-[6%] right-[4%]", size: "h-10 w-10", rotate: 12, drift: "b", life: "bob", lifeDur: "6.2s" },
      ]}
    >
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Welcome <span className="text-brand">back</span>.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-body">
          Sign in to reach your messages, family and safety tools.
        </p>

        <form onSubmit={submit} className="card-surface mt-8 flex flex-col gap-5 p-6 sm:p-7">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.co.za"
              className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground focus:border-brand focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="lift inline-flex min-h-13 items-center justify-center rounded-2xl bg-brand px-8 text-base font-bold text-ink disabled:opacity-60"
          >
            {busy ? "One moment…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-body">
          New to Fast?{" "}
          <Link href="/signup" className="font-bold text-brand underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>

        <p className="mt-8 rounded-2xl border-2 border-taupe/60 bg-taupe/10 px-4 py-3 text-xs leading-relaxed text-dim">
          One email, one password, no verification codes. Your email is never
          shown to other people on Fast.
        </p>
      </div>
    </AuthSplit>
  );
}
