"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once, after load, so the site keeps working
 * offline and stays cheap on mobile data. Also relays service-worker news
 * to the rest of the app as plain window events:
 *
 * - "fast:stale-build" — the running page requested a hashed asset that no
 *   longer exists on the deployment (an old build's HTML on a new deploy).
 * - "fast:controllerchange" — a newly installed service worker took over
 *   this page (a fresh deployment arrived while the tab was open).
 *
 * <UpdateBanner /> listens for both and offers a calm reload.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const announceStale = () => window.dispatchEvent(new CustomEvent("fast:stale-build"));

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // A waiting/activated successor means this page now runs against
          // an older build than the deployment.
          registration.addEventListener("updatefound", () => {
            const next = registration.installing;
            next?.addEventListener("statechange", () => {
              if (next.state === "activated" && navigator.serviceWorker.controller) {
                announceStale();
              }
            });
          });
        })
        .catch(() => {
          /* offline support is best effort */
        });
    };

    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === "fast:stale-build") {
        announceStale();
      }
    };
    const onControllerChange = () => {
      if (navigator.serviceWorker.controller) announceStale();
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
