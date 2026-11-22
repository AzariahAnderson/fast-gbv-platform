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

async function fetchLive(): Promise<LiveData> {
  const res = await fetch("/api/live", { cache: "no-store" });
  if (!res.ok) throw new Error(`live ${res.status}`);
  const data = (await res.json()) as LiveData;
  if (!data?.stats?.length) throw new Error("live payload incomplete");
  return data;
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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (res.ok) {
        const fresh = (await res.json()) as LiveData;
        g.__fastLiveClient = fresh;
        setData(fresh);
      }
    } catch {
      /* keep showing the last known data */
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { data, refreshing, refresh, isLive: data.generator !== "baseline" };
}
