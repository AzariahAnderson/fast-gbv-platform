"use client";

import { useEffect, useState } from "react";

/**
 * True while the browser has a network connection. Starts `true` so the
 * server render and the first client render agree (offline devices only
 * flip the banner after hydration, which avoids a hydration mismatch).
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

/**
 * True when an error looks like a network failure rather than an
 * application or authentication failure. Used to keep "you are offline"
 * apart from "wrong password" — a survivor must never be told their
 * credentials are wrong when the network simply dropped.
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /failed to fetch|fetch failed|networkerror|network request failed|load failed|err_internet_disconnected|aborted/i.test(
    message,
  );
}
