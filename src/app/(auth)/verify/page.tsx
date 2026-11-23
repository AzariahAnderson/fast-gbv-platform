"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/app/setup-notice";

/**
 * Enter the six-digit code Supabase emailed. Verifying creates the
 * session; first-time visitors continue to /onboarding to choose a name.
 */
export default function VerifyPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice what="Verifying your code" />;
  }
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const signup = params.get("signup") === "1";
  const next = params.get("next") || (signup ? "/onboarding" : "/home");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: "email",
      });
      if (error) throw error;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not match. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
        Check your <span className="text-brand">email</span>.
      </h1>
      <p className="mt-3 text-base leading-relaxed text-body">
        We sent a six-digit code{email ? <> to <span className="font-semibold text-foreground">{email}</span></> : null}. It
        stays valid for a short while, then you can ask for a fresh one.
      </p>

      <form onSubmit={submit} className="card-surface mt-8 flex flex-col gap-5 p-6 sm:p-7">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Code</span>
          <input
            inputMode="numeric"
            pattern="[0-9 ]*"
            autoComplete="one-time-code"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="000000"
            className="min-h-14 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-center text-2xl font-bold tracking-[0.4em] text-foreground placeholder:tracking-[0.4em] placeholder:text-faint focus:border-brand focus:outline-none"
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
          {busy ? "Checking…" : "Verify and continue"}
        </button>
      </form>
    </div>
  );
}
