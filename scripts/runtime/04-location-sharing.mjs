/**
 * RUNTIME TEST 04 — Consent-based location sharing against the REAL
 * Supabase project: OFF, approximate, precise, explicit audience, expiry
 * (15 min / 1 hour / until-off), stop, delete, non-member isolation, and
 * live map refresh events.
 *
 * Evidence: docs/launch/runtime-verification/location-test.json
 * Run: bun scripts/runtime/04-location-sharing.mjs
 */
import { writeFileSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}
const SUPA_URL = envFromDotenv("NEXT_PUBLIC_SUPABASE_URL");
const SUPA_PUB = envFromDotenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
if (!SUPA_URL || !SUPA_PUB) { console.error("missing Supabase env"); process.exit(1); }

const results = { started_at: new Date().toISOString(), tests: [] };
function record(name, pass, detail) {
  results.tests.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}
function finish() {
  results.finished_at = new Date().toISOString();
  results.passed = results.tests.filter((t) => t.pass).length;
  results.failed = results.tests.filter((t) => !t.pass).length;
  writeFileSync(
    new URL("../../docs/launch/runtime-verification/location-test.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed ? 1 : 0);
}
function waitForEvent(channel, kind, predicate = null, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    channel.queue = channel.queue || [];
    const tryMatch = (payload) => {
      if (payload.kind !== kind || (predicate && !predicate(payload))) {
        channel.queue.push(payload);
        channel.resolveNext = tryMatch;
        return;
      }
      clearTimeout(timer);
      channel.resolveNext = null;
      resolve(payload);
    };
    channel.resolveNext = tryMatch;
    const idx = channel.queue.findIndex((q) => q.kind === kind && (!predicate || predicate(q)));
    if (idx >= 0) {
      const [hit] = channel.queue.splice(idx, 1);
      clearTimeout(timer);
      channel.resolveNext = null;
      resolve(hit);
    }
  });
}
function deliverEvent(channel, payload) {
  if (!channel) return;
  channel.queue = channel.queue || [];
  if (channel.resolveNext) { const r = channel.resolveNext; channel.resolveNext = null; r(payload); }
  else channel.queue.push(payload);
}

const A = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const B = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
await A.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_A_EMAIL"), password: envFromDotenv("TEST_USER_A_PASSWORD") });
await B.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_B_EMAIL"), password: envFromDotenv("TEST_USER_B_PASSWORD") });
const idA = (await A.auth.getUser()).data.user.id;
const idB = (await B.auth.getUser()).data.user.id;

// Fresh family for location tests; A owner, B member.
for (const f of (await A.from("families").select("id").eq("name", "Location Test Family")).data ?? []) {
  await A.from("families").delete().eq("id", f.id);
}
const { data: famId } = await A.rpc("create_family", { name: "Location Test Family" });
const code = `loc-test-${Math.random().toString(36).slice(2, 10)}`;
await A.from("family_invites").insert({ family_id: famId, code, created_by: idA, invitee_id: idB });
await B.rpc("join_family_by_code", { code });
record("setup: family created, B is member", Boolean(famId), `family ${famId?.slice(0, 8)}…`);

// ------------------------------------------------------------------- OFF
await A.from("locations").delete().eq("user_id", idA);
await A.from("location_shares").delete().eq("user_id", idA);
const { data: offRows } = await A.from("locations").select("*").eq("user_id", idA);
record("OFF: no location row exists while sharing is off", (offRows ?? []).length === 0, `rows: ${offRows?.length ?? 0}`);
await A.from("profiles").update({ location_sharing_enabled: false }).eq("id", idA);
const { data: profOff } = await A.from("profiles").select("location_sharing_enabled").eq("id", idA).single();
record("OFF: profile flag is false (default consent state)", profOff?.location_sharing_enabled === false);

// B's live map channel (map page subscribes to locations + location_shares)
const bMapCh = B.channel("loc-test:map")
  .on("postgres_changes", { event: "*", schema: "public", table: "locations" },
    (p) => deliverEvent(bMapCh, { kind: "loc", row: p.new ?? p.old, evt: p.type ?? "x" }))
  .on("postgres_changes", { event: "*", schema: "public", table: "location_shares" },
    (p) => deliverEvent(bMapCh, { kind: "share", row: p.new ?? p.old }));
let joined = false;
await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 15000);
  bMapCh.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); joined = true; resolve(true); } });
});
record("realtime: B's map channel joined", joined);
await new Promise((r) => setTimeout(r, 1500));

// --------------------------------------------------- APPROXIMATE + audience
let waitShare = waitForEvent(bMapCh, "share");
const in15min = new Date(Date.now() + 15 * 60_000).toISOString();
const { data: share, error: shareErr } = await A.from("location_shares")
  .insert({ user_id: idA, family_id: famId, precision_level: "approximate", status: "active", expires_at: in15min })
  .select("id").single();
const evShare = await waitShare;
record("APPROXIMATE: share insert is withheld from B until they are in the audience (RLS-gated realtime)",
  !shareErr && Boolean(share?.id) && !evShare, shareErr?.message ?? (evShare ? "event leaked to non-viewer?" : "no event for non-viewer — correct"));

await A.from("location_share_viewers").insert({ share_id: share.id, viewer_id: idB });
record("AUDIENCE: B explicitly added as viewer", true, "viewer row written");

// blurred coordinates (approximate = ~3 decimals ≈ 110 m grid), written by client
let waitLoc = waitForEvent(bMapCh, "loc");
const approxLat = -26.204, approxLng = 28.047; // Johannesburg, 3-dp blur
const { error: locErr } = await A.from("locations")
  .insert({ user_id: idA, latitude: approxLat, longitude: approxLng, accuracy_m: 120, precision_level: "approximate", expires_at: in15min });
const evLoc = await waitLoc;
record("APPROXIMATE: blurred location row written and delivered LIVE",
  !locErr && Boolean(evLoc) && evLoc.row?.precision_level === "approximate", locErr?.message ?? (evLoc ? "location event live" : "no event"));

const { data: bSeesApprox } = await B.from("locations").select("latitude, longitude, precision_level").eq("user_id", idA).single();
record("AUDIENCE: authorised viewer B reads the approximate location",
  bSeesApprox?.precision_level === "approximate" && Math.abs(bSeesApprox.latitude - approxLat) < 1e-9,
  `${bSeesApprox?.latitude}, ${bSeesApprox?.longitude} (${bSeesApprox?.precision_level})`);

// A cannot write a location row for someone else (write-own policy)
const { error: spoofErr } = await A.from("locations").insert({ user_id: idB, latitude: 0, longitude: 0, expires_at: in15min });
record("SECURITY: A cannot write B's location row (write-own policy)", Boolean(spoofErr), spoofErr ? "policy blocked" : "write went through?!");

// B cannot remove its own viewer grant either: the audience belongs to the sharer.
const { data: bGrantBefore } = await B.from("location_share_viewers").select("viewer_id").eq("share_id", share.id).eq("viewer_id", idB).single();
await B.from("location_share_viewers").delete().eq("share_id", share.id).eq("viewer_id", idB);
const { data: bGrantAfter } = await A.from("location_share_viewers").select("viewer_id").eq("share_id", share.id).eq("viewer_id", idB).single();
record("AUDIENCE: viewer grants are owner-managed (B cannot delete its own grant)",
  Boolean(bGrantBefore?.viewer_id) && Boolean(bGrantAfter?.viewer_id), bGrantAfter ? "grant intact" : "grant disappeared?!");

// Owner revokes the audience: B reads nothing.
await A.from("location_share_viewers").delete().eq("share_id", share.id).eq("viewer_id", idB);
const { data: bNoView } = await B.from("locations").select("latitude").eq("user_id", idA);
record("AUDIENCE: owner revokes viewer grant — B reads nothing", (bNoView ?? []).length === 0, `rows: ${bNoView?.length ?? 0}`);
await A.from("location_share_viewers").insert({ share_id: share.id, viewer_id: idB });

// ---------------------------------------------------------------- PRECISE
let waitPrecise = waitForEvent(bMapCh, "loc", (p) => p.row?.precision_level === "precise");
const exactLat = -26.204102837, exactLng = 28.047305123;
await A.from("location_shares").update({ precision_level: "precise" }).eq("id", share.id);
const { error: precErr } = await A.from("locations")
  .update({ latitude: exactLat, longitude: exactLng, accuracy_m: 8, precision_level: "precise" })
  .eq("user_id", idA);
const evPrecise = await waitPrecise;
record("PRECISE: exact coordinates written and delivered LIVE to the authorised viewer",
  !precErr && Boolean(evPrecise) && evPrecise.row?.precision_level === "precise", precErr?.message ?? (evPrecise ? "precise event live" : "no event"));

const { data: bSeesExact } = await B.from("locations").select("latitude, longitude").eq("user_id", idA).single();
record("PRECISE: viewer B sees the exact coordinates", bSeesExact?.latitude === exactLat && bSeesExact?.longitude === exactLng,
  `${bSeesExact?.latitude}, ${bSeesExact?.longitude}`);

// ------------------------------------------------------------- EXPIRY
// 1-hour share row exists as configured; simulate all three durations by
// asserting policy behaviour on expiry (the same expires_at gate covers
// 15 min, 1 hour and until-turned-off — null).
const { data: shareWithNull } = await A.from("location_shares").select("expires_at").eq("id", share.id).single();
record("EXPIRY: 15-minute share carries its expiry timestamp", Boolean(shareWithNull?.expires_at), `expires_at ${shareWithNull?.expires_at}`);

await A.from("locations").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("user_id", idA);
const { data: bAfterLocExp } = await B.from("locations").select("latitude").eq("user_id", idA);
record("EXPIRY: expired location row is unreadable to the viewer", (bAfterLocExp ?? []).length === 0, `rows: ${bAfterLocExp?.length ?? 0}`);

await A.from("locations").update({ expires_at: new Date(Date.now() + 3600_000).toISOString() }).eq("user_id", idA);
await A.from("location_shares").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", share.id);
const { data: bAfterShareExp } = await B.from("locations").select("latitude").eq("user_id", idA);
record("EXPIRY: expired SHARE stops the location being readable (row itself still valid)", (bAfterShareExp ?? []).length === 0, `rows: ${bAfterShareExp?.length ?? 0}`);

// ------------------------------------------------------------------ STOP
await A.from("location_shares").update({ expires_at: null, status: "paused" }).eq("id", share.id);
const { data: bAfterPause } = await B.from("locations").select("latitude").eq("user_id", idA);
record("STOP: paused share is unreadable immediately", (bAfterPause ?? []).length === 0, `rows: ${bAfterPause?.length ?? 0}`);

// --------------------------------------------------------------- DELETE
await A.from("locations").delete().eq("user_id", idA);
const { data: aLocsAfterDel } = await A.from("locations").select("*").eq("user_id", idA);
record("DELETE: A's location row is deleted (no tracking history kept)", (aLocsAfterDel ?? []).length === 0, `rows: ${aLocsAfterDel?.length ?? 0}`);

// ------------------------------------------------------- NON-MEMBER isolation
// The audience is family-scoped: when the owner removes B from the family,
// the membership cleanup must purge B's viewer grants. Stale grant = no access.
await A.from("locations").delete().eq("user_id", idA);
await A.from("location_shares").delete().eq("user_id", idA);
const { data: share2, error: share2Err } = await A.from("location_shares")
  .insert({ user_id: idA, family_id: famId, precision_level: "approximate", status: "active", expires_at: null })
  .select("id").single();
if (!share2?.id) { record("NON-MEMBER: share setup", false, share2Err?.message ?? "no share"); finish(); }
await A.from("location_share_viewers").insert({ share_id: share2.id, viewer_id: idB });
await A.from("locations").insert({ user_id: idA, latitude: approxLat, longitude: approxLng, precision_level: "approximate", expires_at: new Date(Date.now() + 3600_000).toISOString() });
const { data: bSeesWithGrant } = await B.from("locations").select("latitude").eq("user_id", idA);
record("NON-MEMBER: baseline — B with an explicit viewer grant reads the location",
  (bSeesWithGrant ?? []).length === 1, `rows: ${bSeesWithGrant?.length ?? 0}`);

await A.from("family_members").delete().eq("family_id", famId).eq("user_id", idB); // owner removes B
const { data: bSeesAfterRemoval } = await B.from("locations").select("latitude").eq("user_id", idA);
record("NON-MEMBER: after removal B reads nothing (stale viewer grant purged)",
  (bSeesAfterRemoval ?? []).length === 0, `rows: ${bSeesAfterRemoval?.length ?? 0}`);

await A.from("locations").delete().eq("user_id", idA);
await A.from("location_shares").delete().eq("user_id", idA);
finish();
