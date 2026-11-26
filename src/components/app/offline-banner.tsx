"use client";

import { Phone } from "lucide-react";
import { useOnline } from "@/hooks/use-online";
import { CRISIS_LINE, POLICE_LINE, telHref, telOf } from "@/lib/numbers";

/**
 * Offline notice for the signed-in app. Appears the moment the browser
 * loses connectivity and disappears when it returns. Calm and honest:
 * no spinner theatre, no fake data — just what still works offline and
 * the two numbers that always answer.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-3xl border-2 border-taupe bg-taupe/15 px-5 py-4"
    >
      <p className="text-sm font-bold text-foreground">You are offline right now.</p>
      <p className="mt-1 text-sm leading-relaxed text-body">
        The page you already have open still works, and anything you write
        stays on this screen. Fresh pages need your connection back — and
        these two numbers always work from any phone:
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={telHref(CRISIS_LINE.tel)}
          className="lift inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-ink"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          {CRISIS_LINE.display}
        </a>
        <a
          href={telHref(telOf(POLICE_LINE))}
          className="lift inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-taupe px-4 text-sm font-bold text-body hover:border-brand"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Police {POLICE_LINE.number}
        </a>
      </div>
    </div>
  );
}
