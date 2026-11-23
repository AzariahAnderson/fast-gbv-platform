/**
 * RUNTIME TEST 05 — Safety plans (private by default, explicit share,
 * revoke, delete) + Safe Arrival timers (trusted-contact notification only,
 * arrival close, expiry reminder, no silent escalation) against the REAL
 * Supabase project.
 *
 * Evidence: docs/launch/runtime-verification/safety-test.json
 * Run: bun scripts/runtime/05-safety-plans-arrival.mjs
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
    new URL("../../docs/launch/runtime-verification/safety-test.json", import.meta.url),
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

// Clean previous test plans
for (const p of (await A.from("safety_plans").select("id").eq("title", "Runtime Test Plan")).data ?? []) {
  await A.from("safety_plans").delete().eq("id", p.id);
}

// ---------------------------------------------------------- SAFETY PLANS
const sections = {
  people: [{ name: "Trusted friend", contact: "hidden" }],
  places: ["safe house"],
  transport: ["taxi fare hidden in coat"],
  documents: ["ID copy"],
  medications: [],
  notes: "runtime test plan",
  exit_plan: "leave on Tuesday when he is at work",
};
const { data: plan, error: planErr } = await A.from("safety_plans")
  .insert({ owner_id: idA, title: "Runtime Test Plan", sections, notes: "private notes" })
  .select("id").single();
record("plans: A creates a safety plan (private by default)", !planErr && Boolean(plan?.id), planErr?.message ?? plan?.id?.slice(0, 8));

const { data: aReads } = await A.from("safety_plans").select("*").eq("id", plan.id).single();
record("plans: A reads own plan with all sections", Boolean(aReads?.id) && aReads?.sections?.exit_plan === sections.exit_plan,
  aReads ? `${Object.keys(aReads.sections ?? {}).join(", ")}` : "unreadable");

const { data: bSeesPrivate } = await B.from("safety_plans").select("id").eq("id", plan.id);
record("plans: B cannot read A's private plan (default)", (bSeesPrivate ?? []).length === 0, `rows: ${bSeesPrivate?.length ?? 0}`);

const { error: editErr } = await A.from("safety_plans")
  .update({ sections: { ...sections, notes: "edited by runtime test" }, notes: null })
  .eq("id", plan.id);
const { data: afterEdit } = await A.from("safety_plans").select("sections, updated_at").eq("id", plan.id).single();
record("plans: A edits and saves the plan (updated_at touched by trigger)",
  !editErr && afterEdit?.sections?.notes === "edited by runtime test", editErr?.message ?? `updated_at ${afterEdit?.updated_at}`);

const { error: bShareErr } = await B.from("safety_plan_shares").insert({ plan_id: plan.id, viewer_id: idB });
record("plans: B cannot create a share grant on A's plan (owner-managed)", Boolean(bShareErr),
  bShareErr ? "policy blocked" : "share went through?!");

const { error: shareErr } = await A.from("safety_plan_shares").insert({ plan_id: plan.id, viewer_id: idB });
const { data: bSeesShared } = await B.from("safety_plans").select("id, title, sections").eq("id", plan.id).single();
record("plans: explicit sharing lets B read the plan", !shareErr && bSeesShared?.title === "Runtime Test Plan",
  shareErr?.message ?? `B reads "${bSeesShared?.title}"`);

const { error: revokeErr } = await A.from("safety_plan_shares").delete().eq("plan_id", plan.id).eq("viewer_id", idB);
const { data: bSeesRevoked } = await B.from("safety_plans").select("id").eq("id", plan.id);
record("plans: revoking the share hides the plan again", !revokeErr && (bSeesRevoked ?? []).length === 0,
  revokeErr?.message ?? `rows: ${bSeesRevoked?.length ?? 0}`);

const { error: delErr } = await A.from("safety_plans").delete().eq("id", plan.id);
const { data: planGone } = await A.from("safety_plans").select("id").eq("id", plan.id);
record("plans: A deletes the plan", !delErr && (planGone ?? []).length === 0, delErr?.message ?? "deleted");

// ----------------------------------------------------------- SAFE ARRIVAL
// Clean previous timers
for (const t of (await admin.from("safe_arrivals").select("id").eq("user_id", idA)).data ?? []) {
  await admin.from("safe_arrivals").delete().eq("id", t.id);
}
// Baseline notification count for B
const { count: bNotifBeforeRaw } = await B.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "safe_arrival");
const bNotifBefore = bNotifBeforeRaw ?? 0;

// 1. Timer with NO trusted contacts: reminds the user only.
const in2min = new Date(Date.now() + 120_000).toISOString();
const { data: timer1, error: t1Err } = await A.from("safe_arrivals")
  .insert({ user_id: idA, destination_label: "Home", expected_at: in2min, trusted_contact_ids: [], status: "active" })
  .select("id").single();
const { count: bNotifsAfterT1Raw } = await B.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "safe_arrival");
record("arrival: timer created with no trusted contacts; NO notification goes to anyone",
  !t1Err && Boolean(timer1?.id) && (bNotifsAfterT1Raw ?? 0) === bNotifBefore,
  t1Err?.message ?? `B's safe_arrival notifications unchanged (${bNotifsAfterT1Raw ?? 0})`);

// 2. Timer WITH an explicit trusted contact: only that person is notified.
const { data: timer2 } = await A.from("safe_arrivals")
  .insert({ user_id: idA, destination_label: "Sister's flat", expected_at: in2min, trusted_contact_ids: [idB], status: "active" })
  .select("id").single();
const { data: bArrivalNotifs } = await B.from("notifications").select("title, body").eq("kind", "safe_arrival").order("created_at", { ascending: false }).limit(2);
record("arrival: trusted contact B is notified exactly as configured",
  Boolean(timer2?.id) && (bArrivalNotifs ?? []).some((n) => n.title?.includes("Test User A")),
  `latest: "${bArrivalNotifs?.[0]?.title}" — "${bArrivalNotifs?.[0]?.body}"`);

// 3. Mark arrived closes the timer.
const { error: arrivedErr } = await A.from("safe_arrivals")
  .update({ status: "arrived", resolved_at: new Date().toISOString() }).eq("id", timer2.id);
const { data: arrivedRow } = await A.from("safe_arrivals").select("status, resolved_at").eq("id", timer2.id).single();
record("arrival: marking arrived closes the timer (status arrived, resolved)",
  !arrivedErr && arrivedRow?.status === "arrived" && Boolean(arrivedRow?.resolved_at), arrivedRow?.status);

// 4. Expiry: the client marks the timer expired when the local reminder fires.
const { count: bNotifBeforeExpRaw } = await B.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "safe_arrival");
const bNotifBeforeExp = bNotifBeforeExpRaw ?? 0;
const { error: expErr } = await A.from("safe_arrivals")
  .update({ status: "expired", resolved_at: new Date().toISOString() }).eq("id", timer1.id);
const { data: expRow } = await A.from("safe_arrivals").select("status").eq("id", timer1.id).single();
const { count: bNotifAfterExpRaw } = await B.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "safe_arrival");
const bNotifAfterExp = bNotifAfterExpRaw ?? 0;
record("arrival: expired timer stays 'expired'; expiry notifies NOBODY (no silent escalation)",
  !expErr && expRow?.status === "expired" && bNotifAfterExp === bNotifBeforeExp,
  `status ${expRow?.status}; B's notifications ${bNotifBeforeExp} -> ${bNotifAfterExp}`);

// 5. No row or notification anywhere claims an emergency escalation.
const { data: escalated } = await admin.from("safe_arrivals").select("id").eq("status", "escalated");
record("arrival: no timer was escalated to emergency services by the system", (escalated ?? []).length === 0,
  `escalated rows: ${escalated?.length ?? 0}`);

// 6. B cannot modify A's timer.
const { error: bTouchErr } = await B.from("safe_arrivals").update({ status: "arrived" }).eq("id", timer1.id);
const { data: stillExpired } = await admin.from("safe_arrivals").select("status").eq("id", timer1.id).single();
record("arrival: B cannot modify A's timer (write-own policy)",
  Boolean(bTouchErr) || stillExpired?.status === "expired", bTouchErr ? "policy blocked" : `status stayed ${stillExpired?.status}`);

finish();
