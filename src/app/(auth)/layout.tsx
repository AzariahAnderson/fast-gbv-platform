import Link from "next/link";

/**
 * Shell for the four authentication screens. Deliberately quiet: no app
 * navigation, no marketing, just FAST's wordmark, the task at hand and a
 * way back to the public site.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atmos-glow animate-drift-a" />
        <div className="atmos-field-r animate-drift-b" />
      </div>
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-2 pt-7 sm:px-8">
        <Link
          href="/"
          className="text-[1.35rem] font-black leading-none tracking-tight text-foreground transition-colors duration-300 hover:text-brand"
          aria-label="Fast, back to the homepage"
        >
          FAST
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-dim">
          Stay close. Stay safe.
        </p>
      </header>
      <div className="relative mx-auto w-full max-w-md px-5 pb-24 pt-10 sm:px-0">
        {children}
      </div>
    </div>
  );
}
