"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Deployment-transition banner. When the service worker reports that the
 * running page no longer matches the deployment (a hashed asset from an
 * older build disappeared), or a freshly installed worker takes over the
 * tab, this quiet card offers a one-tap reload. Old clients recover in one
 * tap instead of failing with cryptic module errors — and nothing reloads
 * on its own while someone might be mid-sentence.
 */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onStale = () => setStale(true);
    window.addEventListener("fast:stale-build", onStale);
    return () => window.removeEventListener("fast:stale-build", onStale);
  }, []);

  if (!stale || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-90 mx-auto max-w-md rounded-2xl border-2 border-brand/60 bg-background px-4 py-3 shadow-lg lg:bottom-6"
    >
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm font-semibold leading-snug text-foreground">
          Fast was updated. Reload to get the latest version.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="lift inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-ink"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reload
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notice"
          className="lift min-h-11 rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
