"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { Pause, Play, ShieldCheck, Square } from "lucide-react";
import { useSession } from "@/lib/app/session";
import { Avatar } from "@/components/app/avatar";
import { friendlyTime } from "@/lib/app/time";
import { createClient } from "@/lib/supabase/client";
import { loadFastStyle, makeApproximate } from "@/lib/app/map-style";
import type { LocationRow, LocationShare, PublicProfile } from "@/lib/db-types";

/**
 * The FAST map. Family presence only, and only by consent: a member
 * appears here because they started a share, chose the audience, chose
 * the precision and chose the duration. Nothing is collected silently,
 * nothing is kept as history — one current row per person, always
 * expiring.
 */

const DURATIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 0, label: "Until turned off" },
] as const;

interface SharedPerson {
  userId: string;
  profile: PublicProfile | null;
  location: LocationRow | null;
  share: LocationShare | null;
}

export default function MapPage() {
  const { user, profile, loading } = useSession();
  const supabase = createClient();
  // Derived, not state: whether this browser can share location at all.
  const geoUnavailable = typeof navigator !== "undefined" && !navigator.geolocation;
  const mapRef = useRef<MLMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const watchRef = useRef<number | null>(null);
  const lastPushRef = useRef(0);
  const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [precision, setPrecision] = useState<"approximate" | "precise">("approximate");
  const [duration, setDuration] = useState<15 | 60 | 0>(15);
  const [audience, setAudience] = useState<string[]>([]);
  const [memberOptions, setMemberOptions] = useState<{ id: string; name: string | null }[]>([]);
  const [sharing, setSharing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  // Map bootstrap — FAST style, graceful fallback. Depends on `loading`:
  // the container div is only mounted once the session check completes,
  // so this effect must re-run after that flip or the map never starts.
  useEffect(() => {
    if (loading) return;
    if (!containerRef.current || mapRef.current) return;
    let map: MLMap;
    (async () => {
      const style = await loadFastStyle();
      if (!containerRef.current) return;
      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [24.6, -28.5], // South Africa, first view
          zoom: 4.4,
          attributionControl: { compact: false },
        });
      } catch {
        // Rare devices cannot create a WebGL context at all. Say so plainly:
        // the family list, sharing controls and emergency tools keep working.
        setMapFailed(true);
        return;
      }
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.dragPan.enable();
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 11, duration: 900 });
          },
          () => {
            /* no permission yet — the map still shows the country */
          },
        );
      }
    })();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [loading]);

  // Families + members of the selected family.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mems } = await supabase.from("family_members").select("family_id").eq("user_id", user.id);
      const ids = (mems ?? []).map((m) => m.family_id);
      if (ids.length === 0) return;
      const { data: fams } = await supabase.from("families").select("id, name").in("id", ids);
      setFamilies(fams ?? []);
      setActiveFamily((prev) => prev ?? (fams?.[0]?.id ?? null));
    })();
  }, [user]);

  useEffect(() => {
    if (!activeFamily || !user) return;
    (async () => {
      const { data: mems } = await supabase.from("family_members").select("user_id").eq("family_id", activeFamily).neq("user_id", user.id);
      const ids = (mems ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles_public").select("*").in("id", ids)
        : { data: [] as PublicProfile[] };
      setMemberOptions((profiles ?? []).map((p) => ({ id: p.id, name: p.display_name })));
      setAudience((profiles ?? []).map((p) => p.id));
      // Existing share, if any.
      const { data: mine } = await supabase
        .from("location_shares")
        .select("*")
        .eq("user_id", user.id)
        .eq("family_id", activeFamily)
        .maybeSingle();
      if (mine) {
        setSharing(mine.status === "active");
        setPaused(mine.status === "paused");
        setPrecision(mine.precision_level);
        if (mine.expires_at) {
          const mins = Math.round((new Date(mine.expires_at).getTime() - Date.now()) / 60000);
          setDuration(mins > 15 && mins <= 90 ? 60 : mins > 0 ? 15 : 0);
        } else setDuration(0);
        const { data: viewers } = await supabase.from("location_share_viewers").select("viewer_id").eq("share_id", mine.id);
        if (viewers?.length) setAudience(viewers.map((v) => v.viewer_id));
      } else {
        setSharing(false);
        setPaused(false);
      }
    })();
  }, [activeFamily, user]);

  // Who is sharing with me right now (RLS returns only permitted rows).
  const refreshPeople = useCallback(async () => {
    if (!user) return;
    const { data: shares } = await supabase
      .from("location_shares")
      .select("*")
      .eq("status", "active");
    const visible = (shares ?? []).filter((s) => s.user_id !== user.id);
    if (visible.length === 0) {
      setPeople([]);
      return;
    }
    const sharerIds = visible.map((s) => s.user_id);
    const [{ data: profiles }, { data: locs }] = await Promise.all([
      supabase.from("profiles_public").select("*").in("id", sharerIds),
      supabase.from("locations").select("*").in("user_id", sharerIds),
    ]);
    setPeople(
      visible.map((s) => ({
        userId: s.user_id,
        profile: (profiles ?? []).find((p) => p.id === s.user_id) ?? null,
        location: (locs ?? []).find((l) => l.user_id === s.user_id) ?? null,
        share: s,
      })).filter((p) => p.location),
    );
  }, [user]);

  useEffect(() => {
    // Deferred one tick so the first fetch never setState synchronously
    // inside the effect.
    const initial = setTimeout(() => void refreshPeople(), 0);
    const channel = supabase
      .channel("map:live")
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, () => void refreshPeople())
      .on("postgres_changes", { event: "*", schema: "public", table: "location_shares" }, () => void refreshPeople())
      .subscribe();
    return () => {
      clearTimeout(initial);
      supabase.removeChannel(channel);
    };
  }, [refreshPeople]);

  // Markers render from state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const render = (
      key: string,
      lng: number,
      lat: number,
      label: string,
      mine: boolean,
    ) => {
      const existing = markersRef.current.get(key);
      if (existing) {
        // MapLibre v6 has no setElement: reposition the existing marker.
        existing.setLngLat([lng, lat]);
        return;
      }
      const el = document.createElement("div");
      el.className = "fast-marker";
      el.innerHTML = mine
        ? `<span class="fast-marker-dot fast-marker-dot-mine"></span>`
        : `<span class="fast-marker-dot"></span><span class="fast-marker-ring"></span>`;
      el.title = label;
      el.setAttribute("aria-label", label);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
      markersRef.current.set(key, marker);
    };

    for (const p of people) {
      if (!p.location) continue;
      render(
        p.userId,
        p.location.longitude,
        p.location.latitude,
        `${p.profile?.display_name ?? "Family"} · updated ${friendlyTime(p.location.shared_at)}${p.location.precision_level === "approximate" ? " · approximate" : ""}`,
        false,
      );
    }
    if (myLocation) {
      render("me", myLocation.lng, myLocation.lat, "You", true);
    }
  }, [people, myLocation]);

  // Foreground location stream while sharing.
  useEffect(() => {
    if (!sharing || paused || !user || !activeFamily) return;
    if (!navigator.geolocation) return; // geoUnavailable is surfaced below
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const now = Date.now();
        if (now - lastPushRef.current < 30_000) return; // one row per 30s
        lastPushRef.current = now;
        const point =
          precision === "approximate"
            ? makeApproximate(pos.coords.latitude, pos.coords.longitude)
            : { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        const { data: share } = await supabase
          .from("location_shares")
          .select("id, expires_at")
          .eq("user_id", user.id)
          .eq("family_id", activeFamily)
          .maybeSingle();
        if (!share) return;
        const expires = share.expires_at
          ? new Date(share.expires_at)
          : new Date(Date.now() + 24 * 3600 * 1000);
        await supabase.from("locations").upsert({
          user_id: user.id,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy_m: precision === "approximate" ? Math.max(pos.coords.accuracy ?? 50, 300) : pos.coords.accuracy ?? 50,
          precision_level: precision,
          shared_at: new Date().toISOString(),
          expires_at: expires.toISOString(),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setSharing(false);
        }
      },
      { enableHighAccuracy: precision === "precise", maximumAge: 20_000, timeout: 20_000 },
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [sharing, paused, user, activeFamily, precision]);

  async function startSharing() {
    if (!user || !activeFamily) return;
    if (audience.length === 0) {
      setNote("Choose at least one person who may see you.");
      return;
    }
    const expiresAt = duration > 0 ? new Date(Date.now() + duration * 60_000).toISOString() : null;
    const { data: share, error } = await supabase
      .from("location_shares")
      .upsert(
        {
          user_id: user.id,
          family_id: activeFamily,
          precision_level: precision,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_id,family_id" },
      )
      .select("id")
      .single();
    if (error || !share) {
      setNote("The share could not start.");
      return;
    }
    // Replace the audience explicitly.
    await supabase.from("location_share_viewers").delete().eq("share_id", share.id);
    await supabase.from("location_share_viewers").insert(
      audience.map((viewerId) => ({ share_id: share.id, viewer_id: viewerId })),
    );
    setSharing(true);
    setPaused(false);
    setNote(
      duration > 0
        ? `Sharing for ${duration === 15 ? "15 minutes" : "1 hour"}, ${precision === "approximate" ? "approximately" : "precisely"}. It stops by itself.`
        : `Sharing until you turn it off, ${precision === "approximate" ? "approximately" : "precisely"}.`,
    );
  }

  async function setShareStatus(status: "active" | "paused") {
    if (!user || !activeFamily) return;
    await supabase.from("location_shares")
      .update({ status })
      .eq("user_id", user.id)
      .eq("family_id", activeFamily);
    setPaused(status === "paused");
    setSharing(true);
    setNote(status === "paused" ? "Paused. Nobody can see you while paused." : "Sharing again.");
  }

  async function stopSharing() {
    if (!user || !activeFamily) return;
    await supabase.from("location_shares")
      .delete()
      .eq("user_id", user.id)
      .eq("family_id", activeFamily);
    await supabase.from("locations").delete().eq("user_id", user.id);
    setSharing(false);
    setPaused(false);
    setMyLocation(null);
    setNote("Stopped. Your location was deleted — nothing is kept as history.");
  }

  if (loading) return <p className="text-base text-body">One moment…</p>;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          Map<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-body">
          You see someone here only because they chose to share, chose the
          people and chose for how long. Nobody can see you until you do the
          same.
        </p>
      </section>

      {families.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {families.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFamily(f.id)}
              className={`lift min-h-11 rounded-2xl border-2 px-4 text-sm font-bold ${
                activeFamily === f.id ? "border-brand bg-brand/10 text-brand" : "border-taupe bg-taupe/15 text-body"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border-2 border-taupe">
        <div ref={containerRef} className="h-[46dvh] min-h-72 w-full" aria-label="Family map" role="application">
          {mapFailed && (
            <p role="status" className="flex h-full items-center justify-center px-6 text-center text-sm leading-relaxed text-body">
              The map could not open on this device. Everything else still works — your family list and sharing controls are below.
            </p>
          )}
        </div>
        <p className="absolute bottom-1 right-2 z-10 rounded bg-black/50 px-2 py-0.5 text-[10px] text-body">
          © OpenStreetMap contributors
        </p>
      </div>

      {/* Sharing consent panel */}
      <section className="card-surface p-6" aria-label="My location sharing">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Sharing my location</h2>
          <span className={`rounded-full border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
            sharing && !paused ? "border-brand text-brand" : "border-taupe text-dim"
          }`}>
            {sharing && !paused ? "Sharing" : paused ? "Paused" : "Off"}
          </span>
        </div>

        {sharing ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => void setShareStatus(paused ? "active" : "paused")} className="lift inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-sm font-bold text-body hover:border-brand">
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? "Continue sharing" : "Pause sharing"}
            </button>
            <button onClick={() => void stopSharing()} className="lift inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-sm font-bold text-body hover:border-brand">
              <Square className="h-4 w-4" aria-hidden="true" />
              Stop and delete my location
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Precision</span>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-taupe bg-taupe/15 p-1.5">
                  {(["approximate", "precise"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPrecision(p)}
                      aria-pressed={precision === p}
                      className={`min-h-10 rounded-xl text-sm font-bold ${precision === p ? "bg-brand text-ink" : "text-body"}`}>
                      {p === "approximate" ? "Approximate" : "Precise"}
                    </button>
                  ))}
                </div>
                <span className="text-xs leading-relaxed text-dim">
                  Approximate shows your neighbourhood, never your doorstep.
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Duration</span>
                <div className="flex flex-col gap-1.5">
                  {DURATIONS.map((d) => (
                    <button key={d.minutes} type="button" onClick={() => setDuration(d.minutes as 15 | 60 | 0)}
                      aria-pressed={duration === d.minutes}
                      className={`min-h-10 rounded-xl border-2 px-3 text-sm font-bold ${duration === d.minutes ? "border-brand text-brand" : "border-taupe text-body"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
                Who may see me
              </legend>
              {memberOptions.length === 0 ? (
                <p className="text-xs text-dim">
                  {families.length === 0
                    ? "You need a family circle first — the map shares only inside families you belong to."
                    : "No other members in this family yet."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {memberOptions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAudience((a) => (a.includes(m.id) ? a.filter((x) => x !== m.id) : [...a, m.id]))}
                      aria-pressed={audience.includes(m.id)}
                      className={`min-h-11 rounded-2xl border-2 px-4 text-sm font-bold ${
                        audience.includes(m.id) ? "border-brand bg-brand/10 text-brand" : "border-taupe text-body"
                      }`}
                    >
                      {m.name ?? "Member"}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            <button
              onClick={() => void startSharing()}
              className="lift inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-bold text-ink"
            >
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              Start sharing
            </button>
          </div>
        )}

        {geoUnavailable && sharing && (
          <p role="note" className="mt-3 rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
            This browser cannot share location. FAST can continue sharing while the app is active on a device that provides location.
          </p>
        )}
        {permissionDenied && (
          <p role="alert" className="mt-3 rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
            Location permission was declined. Fast will not ask again on this
            page until you reload it — and nothing has been shared.
          </p>
        )}
        {note && (
          <p role="status" className="mt-3 rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">{note}</p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-faint">
          FAST can continue sharing while this app is active. Continuous
          background location requires device-level support.
        </p>
      </section>

      {/* People currently visible */}
      <section aria-label="People sharing with you">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">Sharing with you</h2>
        {people.length === 0 ? (
          <div className="card-surface mt-3 p-7 text-center">
            <p className="text-sm font-bold text-foreground">Nobody is sharing right now</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              When someone in your family starts a share, their general area
              appears here until it expires.
            </p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {people.map((p) => (
              <li key={p.userId} className="card-surface flex items-center gap-4 px-5 py-4">
                <Avatar name={p.profile?.display_name} url={p.profile?.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{p.profile?.display_name ?? "Family member"}</p>
                  <p className="text-xs text-dim">
                    {p.location?.precision_level === "approximate" ? "Approximate area" : "Precise"} · updated {friendlyTime(p.location!.shared_at)}
                    {p.location?.accuracy_m ? ` · ±${Math.round(p.location.accuracy_m)} m` : ""}
                  </p>
                </div>
                {p.share?.expires_at && (
                  <span className="shrink-0 text-[11px] text-faint">until {friendlyTime(p.share.expires_at)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
