"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/app/setup-notice";

/** Create an account. Same two paths as sign-in; defaults to the code flow. */
export default function SignupPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice what="Creating an account" />;
  }
  return <SignupForm />;
}

function SignupForm() {
  const [mode, setMode] = useState<"code" | "password">("code");
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
      if (mode === "code") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/verify?signup=1`,
          },
        });
        if (error) throw error;
        window.location.href = `/verify?email=${encodeURIComponent(email)}&signup=1`;
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        window.location.href = "/onboarding";
        return;
      }
      // Email confirmation is enabled on the project — ask for the code.
      window.location.href = `/verify?email=${encodeURIComponent(email)}&signup=1`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
        Make Fast <span className="text-brand">yours</span>.
      </h1>
      <p className="mt-3 text-base leading-relaxed text-body">
        An account is only needed for messages, family and personal safety
        tools. The public help pages never ask you to sign up.
      </p>

      <form onSubmit={submit} className="card-surface mt-8 flex flex-col gap-5 p-6 sm:p-7">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-taupe bg-taupe/15 p-1.5" role="tablist" aria-label="Sign-up method">
          {(["code", "password"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 rounded-xl text-sm font-bold transition-colors duration-300 ${
                mode === m ? "bg-brand text-ink" : "text-body hover:text-foreground"
              }`}
            >
              {m === "code" ? "Email code" : "Password"}
            </button>
          ))}
        </div>

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

        {mode === "password" && (
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
        )}

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
      </form>

      <p className="mt-6 text-sm text-body">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-8 rounded-2xl border-2 border-taupe/60 bg-taupe/10 px-4 py-3 text-xs leading-relaxed text-dim">
        Fast asks for as little as possible. No tracking, no advertising, and
        your phone number stays hidden from everyone except you.
      </p>
    </div>
  );
}
