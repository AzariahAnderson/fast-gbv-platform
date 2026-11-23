import Link from "next/link";

/**
 * Shown where a signed-in experience is requested but the owner has not
 * yet connected a Supabase project. Honest about what is missing, and it
 * never blocks the public safety pages.
 */
export function SetupNotice({ what }: { what: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-dim">
        Fast
      </p>
      <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-foreground">
        Almost there.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-body">
        {what} needs the FAST account backend to be connected. The owner has
        to set the Supabase project variables (
        <span className="font-semibold text-foreground">NEXT_PUBLIC_SUPABASE_URL</span>{" "}
        and{" "}
        <span className="font-semibold text-foreground">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </span>
        ) and run the database migration. Everything else on Fast still
        works right now.
      </p>
      <Link
        href="/"
        className="lift mt-8 inline-flex min-h-12 items-center rounded-2xl border-[3px] border-taupe bg-taupe/15 px-6 text-sm font-bold text-foreground hover:border-brand hover:text-brand"
      >
        Back to Fast
      </Link>
    </main>
  );
}
