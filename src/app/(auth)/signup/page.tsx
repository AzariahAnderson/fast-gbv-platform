"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Lock, ShieldCheck, Zap } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthSplit } from "@/components/app/auth-split";

/**
 * Create an account. Email confirmation is OFF on the Supabase project
 * (mailer_autoconfirm), so password sign-up returns a session straight
 * away and the very next screen is onboarding — no email to wait for,
 * and no verification codes anywhere: no emailed one-time codes, no
 * phone OTP. One email, one password, in.
 */
export default function SignupPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice what="Creating an account" />;
  }
  return <SignupForm />;
}

function SignupForm() {
  // Password only: with confirmation off it is the fastest way in —
  // one step, one screen, straight to onboarding. No codes are ever sent.
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        window.location.href = "/onboarding";
        return;
      }
      // Defensive only: with confirmation off Supabase always returns a
      // session here. If it ever does not, say so honestly — there is no
      // code screen to fall back to.
      throw new Error(
        "Your account was created but sign-in did not start. Please sign in with your new password.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      eyebrow="Join Fast"
      title={
        <>
          Make Fast <span className="text-brand">yours</span>.
        </>
      }
      note="One small account for the people side of Fast: messages, family and personal safety tools. The public help pages never ask you to sign up."
      bullets={[
        { icon: ShieldCheck, label: "Fast asks for as little as possible — no tracking, no advertising" },
        { icon: EyeOff, label: "Your phone number stays hidden from everyone, always" },
        { icon: Zap, label: "No email confirmation — choose a password and you are in, straight away" },
        { icon: Lock, label: "Your session lives on this device, never on someone else's screen" },
      ]}
      emojis={[
        // Trio (left) and floats (right band, clear of the content column).
        { src: "/emojis/2728-128.webp", pos: "", size: "h-10 w-10", rotate: 8, drift: "a", life: "twinkle", lifeDur: "3.6s" },
        { src: "/emojis/1f49c-128.webp", pos: "", size: "h-9 w-9", rotate: -10, drift: "b", life: "bob", lifeDur: "7s" },
        { src: "/emojis/1f98b-128.webp", pos: "", size: "h-10 w-10", rotate: 14, drift: "a", life: "bob", lifeDur: "6.6s" },
        { src: "/emojis/1f54a-128.webp", pos: "sm:block top-[2.5%] right-[30%]", size: "h-6 w-6", rotate: -6, drift: "b", life: "bob", lifeDur: "7.4s" },
        { src: "/emojis/1f496-128.webp", pos: "sm:block top-[8%] right-[4%]", size: "h-10 w-10", rotate: 10, drift: "a", life: "bob", lifeDur: "6.9s" },
        { src: "/emojis/1f338-128.webp", pos: "sm:block top-[37%] right-[4.5%]", size: "h-7 w-7", rotate: 12, drift: "b", life: "sway", lifeDur: "7.2s" },
        { src: "/emojis/1f340-128.webp", pos: "sm:block bottom-[31%] right-[4.5%]", size: "h-6 w-6", rotate: -8, drift: "a", life: "bob", lifeDur: "6.7s" },
        { src: "/emojis/1f490-128.webp", pos: "sm:block bottom-[6%] right-[4%]", size: "h-10 w-10", rotate: -9, drift: "b", life: "sway", lifeDur: "7.8s" },
      ]}
    >
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Create <span className="text-brand">your account</span>.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-body">
          An email and a password — that is the whole form. No confirmation
          email, no waiting.
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
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
              Password <span className="font-medium normal-case tracking-normal text-faint">(10+ characters)</span>
            </span>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
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
            {busy ? "One moment…" : "Continue"}
          </button>

          <p className="text-xs leading-relaxed text-dim">
            Email confirmation is off: the moment this succeeds you are
            signed in and Fast moves straight to choosing your name.
          </p>
        </form>

        <p className="mt-6 text-sm text-body">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-8 rounded-2xl border-2 border-taupe/60 bg-taupe/10 px-4 py-3 text-xs leading-relaxed text-dim">
          No verification codes, ever — your password is the only thing Fast
          will ever ask you to remember.
        </p>
      </div>
    </AuthSplit>
  );
}
