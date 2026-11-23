"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, ShieldCheck, Smartphone } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthSplit } from "@/components/app/auth-split";

/**
 * Enter the six-digit code Supabase emailed. Verifying creates the
 * session; first-time visitors continue to /onboarding to choose a name.
 * This screen belongs to the email-code sign-in path — email
 * *confirmation* is off on the project, so password sign-ups never see
 * this page at all.
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
    <AuthSplit
      eyebrow="Almost there"
      title={
        <>
          One code and you are <span className="text-brand">in</span>.
        </>
      }
      note="Six digits from your inbox, and Fast opens. Codes expire quickly — that is what keeps your account safe."
      bullets={[
        { icon: Clock, label: "A code only lives for a few minutes" },
        { icon: ShieldCheck, label: "The code works once, on this device only" },
        { icon: Smartphone, label: "Nothing about this step is shared with anyone on Fast" },
      ]}
      emojis={[
        // Trio (left) and floats (right band, clear of the content column).
        { src: "/emojis/2728-128.webp", pos: "", size: "h-10 w-10", rotate: 10, drift: "a", life: "twinkle", lifeDur: "3.4s" },
        { src: "/emojis/1f340-128.webp", pos: "", size: "h-9 w-9", rotate: -8, drift: "b", life: "bob", lifeDur: "6.9s" },
        { src: "/emojis/1f388-128.webp", pos: "", size: "h-10 w-10", rotate: 12, drift: "a", life: "bob", lifeDur: "6.2s" },
        { src: "/emojis/1f31e-128.webp", pos: "sm:block top-[2.5%] right-[30%]", size: "h-6 w-6", rotate: -6, drift: "b", life: "bob", lifeDur: "6.6s" },
        { src: "/emojis/1f54a-128.webp", pos: "sm:block top-[8%] right-[4%]", size: "h-10 w-10", rotate: 10, drift: "a", life: "bob", lifeDur: "7.4s" },
        { src: "/emojis/1f496-128.webp", pos: "sm:block top-[37%] right-[4.5%]", size: "h-7 w-7", rotate: 12, drift: "b", life: "bob", lifeDur: "7s" },
        { src: "/emojis/1f337-128.webp", pos: "sm:block bottom-[31%] right-[4.5%]", size: "h-6 w-6", rotate: -10, drift: "a", life: "sway", lifeDur: "7.1s" },
        { src: "/emojis/1f49b-128.webp", pos: "sm:block bottom-[6%] right-[4%]", size: "h-9 w-9", rotate: -8, drift: "b", life: "twinkle", lifeDur: "4.2s" },
      ]}
    >
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Check your <span className="text-brand">email</span>.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-body">
          We sent a six-digit code{email ? <> to <span className="font-semibold text-foreground">{email}</span></> : null}. It
          stays valid for a short while, then you can ask for a fresh one.
        </p>

        {!email && (
          <p className="mt-5 rounded-2xl border-2 border-taupe/60 bg-taupe/10 px-4 py-3 text-sm leading-relaxed text-body">
            No code has been asked for yet.{" "}
            <Link href="/login" className="font-bold text-brand underline-offset-4 hover:underline">
              Start from the sign-in page
            </Link>{" "}
            and one will be on its way.
          </p>
        )}

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
    </AuthSplit>
  );
}
