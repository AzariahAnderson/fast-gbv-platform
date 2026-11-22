"use client";

import { useCallback, useEffect, useState } from "react";
import { BASELINE, type LiveData } from "@/lib/live-types";

/**
 * Shared client store for the live payload: every component that calls
 * useLive participates in one fetch per page load, and the payload survives
 * route re-renders through the module cache. Baseline data renders first,
 * live data quietly replaces it, so nothing on the page ever blocks.
 */
const g = globalThis as unknown as {
  __fastLiveClient?: LiveData;
  __fastLiveJob?: Promise<void> | null;
};

/**
 * Fetch with a hard deadline. Without this, one hung request on a flaky
 * mobile network would leave the shared job promise pending forever and
 * block every later retry for the whole page session.
 */
function timedFetch(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(ms)
      : undefined;
  return fetch(url, { ...init, signal });
}

async function fetchLive(): Promise<LiveData> {
  // One quiet retry after a short backoff: the first attempt can fail on a
  // network handover, the second usually lands, and two attempts cap the
  // worst case at roughly twelve seconds before the baseline takes over.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await timedFetch("/api/live", 9000, { cache: "no-store" });
      if (!res.ok) throw new Error(`live ${res.status}`);
      const data = (await res.json()) as LiveData;
      if (!data?.stats?.length) throw new Error("live payload incomplete");
      return data;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw new Error("live fetch exhausted");
}

export function useLive() {
  const [data, setData] = useState<LiveData>(g.__fastLiveClient ?? BASELINE);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (g.__fastLiveClient) return;
    if (!g.__fastLiveJob) {
      g.__fastLiveJob = fetchLive()
        .then((fresh) => {
          g.__fastLiveClient = fresh;
          setData(fresh);
        })
        .catch(() => {
          /* baseline stays on screen */
        })
        .finally(() => {
          g.__fastLiveJob = null;
        });
    } else {
      g.__fastLiveJob.then(() => {
        if (g.__fastLiveClient) setData(g.__fastLiveClient);
      });
    }
  }, []);

  const refresh = useCallback(async (): Promise<"fresh" | "cached" | "failed"> => {
    setRefreshing(true);
    try {
      // The refresh path can legitimately take a while when the server has
      // to generate (up to its own 60s budget), so it gets a wider deadline
      // than the read path but still one a visitor will not outlive.
      const res = await timedFetch("/api/refresh", 65000, { method: "POST" });
      if (res.ok) {
        const fresh = (await res.json()) as LiveData & { refreshed?: boolean };
        g.__fastLiveClient = fresh;
        setData(fresh);
        // The server reports whether a real generation ran or the rate
        // limit returned the cached payload; the caller surfaces that.
        return fresh.refreshed === false ? "cached" : "fresh";
      }
      return "failed";
    } catch {
      /* keep showing the last known data */
      return "failed";
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { data, refreshing, refresh, isLive: data.generator !== "baseline" };
}
