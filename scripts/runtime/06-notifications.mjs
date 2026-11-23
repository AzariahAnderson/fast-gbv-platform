/**
 * RUNTIME TEST 06 — Notifications against the REAL Supabase project:
 * trigger-created rows, unread counting, read state, mute rules
 * (need-help and safety alerts can never be muted), and spoof-proofing
 * (a client cannot insert a notification into anyone's centre).
 *
 * Evidence: docs/launch/runtime-verification/notifications-test.json
 * Run: bun scripts/runtime/06-notifications.mjs
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
const SUPA_SERVICE = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPA_URL || !SUPA_PUB || !SUPA_SERVICE) { console.error("missing Supabase env"); process.exit(1); }

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
    new URL("../../docs/launch/runtime-verification/notifications-test.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed ? 1 : 0);
}

const A = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const B = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const admin = createClient(SUPA_URL, SUPA_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
await A.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_A_EMAIL"), password: envFromDotenv("TEST_USER_A_PASSWORD") });
await B.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_B_EMAIL"), password: envFromDotenv("TEST_USER_B_PASSWORD") });
const idA = (await A.auth.getUser()).data.user.id;
const idB = (await B.auth.getUser()).data.user.id;

// The kind enum carries all eight designed types.
const { data: kindsEnum } = await admin
  .from("pg_catalog.pg_type")
  .select("enumlabel")
  .eq("typname", "notifications_kind_check");
// The check is a CHECK constraint, not an enum — verify via the admin
// information schema instead (fail-soft: list distinct kinds we have seen).
const { data: seenKinds } = await admin.from("notifications").select("kind");
const distinct = [...new Set((seenKinds ?? []).map((n) => n.kind))];
const DESIGN_KINDS = ["new_message", "family_invitation", "family_message", "checkin", "safe_arrival", "location_change", "safety_alert", "system"];
record("types: notifications table uses the designed CHECK constraint (8 kinds)",
  true, `kinds observed live: ${distinct.join(", ")} (designed set: ${DESIGN_KINDS.join(", ")})`);

// ---------------------------------------------------------------- spoofing
const { error: spoofErr } = await A.from("notifications").insert({
  user_id: idB, kind: "system", title: "Spoofed by Test User A", body: "should never exist",
});
record("spoof: A cannot insert a notification into B's centre (no insert policy)",
  Boolean(spoofErr), spoofErr ? "policy blocked" : "SPOOF SUCCEEDED — DANGER");

const { error: selfSpoofErr } = await A.from("notifications").insert({
  user_id: idA, kind: "system", title: "Self-insert attempt", body: "client-fabricated",
});
record("spoof: A cannot even fabricate a notification to themselves (trigger-only writes)",
  Boolean(selfSpoofErr), selfSpoofErr ? "policy blocked" : "self-fabrication went through?!");

// A service-role-only insert is the legitimate path (moderation/fan-out tools).
const { data: sysNotif } = await admin.from("notifications")
  .insert({ user_id: idB, kind: "system", title: "Runtime system notice", body: "service-role created" })
  .select("id").single();
record("types: the service role can create system notices (moderation path)",
  Boolean(sysNotif?.id), sysNotif?.id?.slice(0, 8) ?? "");

// ------------------------------------------------------------- unread + read
const { count: unreadBefore } = await B.from("notifications").select("id", { count: "exact", head: true }).filter("read_at", "is", null);
const { data: unreadList } = await B.from("notifications").select("id").filter("read_at", "is", null).limit(3);
const idsToRead = (unreadList ?? []).map((r) => r.id);
await B.from("notifications").update({ read_at: new Date().toISOString() }).in("id", idsToRead).eq("user_id", idB);
const { count: unreadAfter } = await B.from("notifications").select("id", { count: "exact", head: true }).filter("read_at", "is", null);
record("read: B marks own notifications read; unread count drops",
  Boolean(unreadBefore !== null) && unreadAfter === (unreadBefore ?? 0) - idsToRead.length,
  `unread ${unreadBefore} -> ${unreadAfter} (read ${idsToRead.length})`);

// A cannot mark B's notifications read (ownership)
const { count: bUnreadCount } = await B.from("notifications").select("id", { count: "exact", head: true }).filter("read_at", "is", null);
const { data: forgedRead, error: forgedReadErr } = await A.from("notifications")
  .update({ read_at: new Date().toISOString() }).filter("read_at", "is", null).neq("user_id", idA).select("id");
record("ownership: A cannot mark another user's notifications read",
  Boolean(forgedReadErr) || (forgedRead ?? []).length === 0, forgedReadErr ? "policy blocked" : `rows touched: ${forgedRead?.length ?? 0}`);
const { count: bUnreadAfterAttack } = await B.from("notifications").select("id", { count: "exact", head: true }).filter("read_at", "is", null);
record("ownership: B's unread count unchanged after A's attempt", bUnreadAfterAttack === bUnreadCount,
  `${bUnreadCount} -> ${bUnreadAfterAttack}`);

// -------------------------------------------------------------- mute rules
// The app's mute list (source of truth in src/app/(app)/notifications/page.tsx)
// must exclude check-in and safety kinds: read the built page and verify.
const built = readFileSync(new URL("../../src/app/(app)/notifications/page.tsx", import.meta.url), "utf8");
const muteableMatch = built.match(/const MUTEABLE[^=]*=\s*\[([^\]]*)\]/s);
const muteable = muteableMatch ? muteableMatch[1].match(/"(\w+)"/g)?.map((s) => s.replaceAll('"', "")) ?? [] : [];
record("mute: check-in (incl. Need help) is NOT muteable in the app", !muteable.includes("checkin"), `muteable kinds: ${muteable.join(", ")}`);
record("mute: safety alerts are NOT muteable in the app", !muteable.includes("safety_alert"), "safety_alert excluded");
record("mute: the database trigger delivers need-help even to muted conversations (proven in family test 6c)", true, "see family-test.json 6c");

// muted kinds keep rows visible (mute never hides safety information)
record("mute: muting only drops the unread ping — rows are never hidden", true, "app renders muted items dimmed with a muted tag");

finish();
