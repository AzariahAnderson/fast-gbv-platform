"use client";

import { useEffect } from "react";
import { Phone, RotateCcw, LifeBuoy } from "lucide-react";
import {
  CRISIS_LINE,
  CRISIS_TEL_HREF,
  DIRECTORY,
  telHref,
  telOf,
} from "@/lib/numbers";

// Secondary lines resolve from the single verified directory. If a rename
// ever breaks a lookup the directory integrity test fails before shipping;
// here the buttons simply disappear rather than ever showing a wrong number.
const police = DIRECTORY.find((d) => d.name === "SAPS, South African Police Service");
const cellphone = DIRECTORY.find((d) => d.name === "Cellphone emergency");

/**
 * Route-level error boundary. If the page ever crashes here it must never
 * fall to a blank screen: the verified emergency numbers stay on screen so
 * a visitor in crisis can still reach help, whatever the software did.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible in the browser console and in server logs, so problems are
    // debuggable instead of silently swallowed.
    console.error("[fast] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16 text-center">
      <p className="text-4xl font-black tracking-tight text-foreground">FAST</p>
      <p className="mt-6 max-w-md text-balance text-lg font-bold leading-snug text-foreground">
        Something broke on the page, but the help did not.
      </p>
      <p className="mt-3 max-w-md text-balance text-sm font-medium leading-relaxed text-body">
        The numbers below are the official, free, 24 hour South African
        services. They work no matter what this page is doing.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <a
          href={CRISIS_TEL_HREF}
          className="lift inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-brand text-xl font-black tracking-tight text-ink"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          {CRISIS_LINE.name} {CRISIS_LINE.display}
        </a>
        {police && cellphone && (
          <div className="grid grid-cols-2 gap-3">
            <a
              href={telHref(telOf(police))}
              className="lift inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-taupe bg-taupe/20 text-base font-black tracking-tight text-brand"
            >
              Police {police.number}
            </a>
            <a
              href={telHref(telOf(cellphone))}
              className="lift inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-taupe bg-taupe/20 text-base font-black tracking-tight text-brand"
            >
              Emergency {cellphone.number}
            </a>
          </div>
        )}
        <button
          onClick={reset}
          className="lift inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-taupe px-4 text-xs font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:border-brand hover:text-brand"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>

      <p className="mt-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
        <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
        Free, confidential, answered 24 hours a day
      </p>
    </div>
  );
}
