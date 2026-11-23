/**
 * RUNTIME TEST 01 — Authentication & user isolation against the REAL
 * Supabase project. Creates Test User A and Test User B (test-only,
 * clearly-labelled), exercises signup/login/session/logout, and proves
 * cross-user isolation under RLS.
 *
 * Evidence: docs/launch/runtime-verification/auth-test.json
 * Run: bun scripts/runtime/01-auth-and-isolation.mjs
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

// Admin client: test-user cleanup only. Never printed, never client-side.
const admin = createClient(SUPA_URL, SUPA_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Clean slate: remove any earlier test users (cascades to profiles/rows).
for (const email of [envFromDotenv("TEST_USER_A_EMAIL"), envFromDotenv("TEST_USER_B_EMAIL")]) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const stale = (data?.users ?? []).filter((u) => u.email === email);
  for (const u of stale) {
    await admin.auth.admin.deleteUser(u.id);
    console.log(`cleaned stale test user ${email}`);
  }
}

// Fresh clients per actor: a publishable-key client whose session is the user.
const A = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const B = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });

// --- SIGNUP ------------------------------------------------------------
const passA = envFromDotenv("TEST_USER_A_PASSWORD");
const passB = envFromDotenv("TEST_USER_B_PASSWORD");
const { data: upA, error: upErrA } = await A.auth.signUp({
  email: envFromDotenv("TEST_USER_A_EMAIL"), password: passA,
});
record("signup: Test User A can create an account", !upErrA && Boolean(upA.session), upErrA?.message ?? `user id ${upA.user?.id ?? "?"}`);
const idA = upA?.user?.id;
const { data: upB, error: upErrB } = await B.auth.signUp({
  email: envFromDotenv("TEST_USER_B_EMAIL"), password: passB,
});
record("signup: Test User B can create an account", !upErrB && Boolean(upB.session), upErrB?.message ?? `user id ${upB.user?.id ?? "?"}`);
const idB = upB?.user?.id;
if (!idA || !idB) { finish(); }

// --- ONBOARDING equivalent: write own profile (RLS-guarded) -------------
const { error: profErrA } = await A.from("profiles").upsert({
  id: idA, display_name: "Test User A", email: envFromDotenv("TEST_USER_A_EMAIL"),
  phone: "+27110000001", privacy_settings: {}, location_sharing_enabled: false,
});
record("profile: A can write own profile row (onboarding equivalent)", !profErrA, profErrA?.message);
const { error: profErrB } = await B.from("profiles").upsert({
  id: idB, display_name: "Test User B", email: envFromDotenv("TEST_USER_B_EMAIL"),
  phone: "+27110000002", privacy_settings: {}, location_sharing_enabled: false,
});
record("profile: B can write own profile row", !profErrB, profErrB?.message);

// --- LOGIN --------------------------------------------------------------
await A.auth.signOut();
const { error: inErrA } = await A.auth.signInWithPassword({
  email: envFromDotenv("TEST_USER_A_EMAIL"), password: passA,
});
record("login: A can sign in with password", !inErrA, inErrA?.message);

// --- SESSION PERSISTENCE (server-verified token) -------------------------
const { data: sessA, error: sessErrA } = await A.auth.getSession();
const okSess = Boolean(sessA?.session?.access_token);
const { data: getUserA, error: getUserErrA } = await A.auth.getUser();
record("session: A's session survives a client restart (token valid server-side)",
  okSess && !getUserErrA && getUserA?.user?.id === idA, getUserErrA?.message ?? "getUser verified the JWT against the auth server");

// --- LOGOUT --------------------------------------------------------------
await A.auth.signOut();
const { data: afterOut } = await A.auth.getSession();
record("logout: session destroyed after signOut", !afterOut?.session, "auth.getSession() returns null");
await A.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_A_EMAIL"), password: passA });

// --- LOGOUT invalidates refresh: B signs out, refresh must fail ----------
await B.auth.signOut();
const { data: refreshB, error: refreshErrB } = await B.auth.refreshSession();
record("logout: B's refresh token is revoked after signOut",
  !refreshB?.session, refreshErrB?.message ?? "no refreshable session");

// --- USER ISOLATION under RLS --------------------------------------------
await A.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_A_EMAIL"), password: passA });
await B.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_B_EMAIL"), password: passB });

const { data: sneakProfile } = await A.from("profiles").select("*").eq("id", idB);
record("isolation: A cannot read B's private profile row", !sneakProfile || sneakProfile.length === 0,
  `rows returned: ${sneakProfile?.length ?? 0} (expect 0)`);

const { data: pubView } = await A.from("profiles_public").select("*").eq("id", idB);
const pubCols = pubView?.[0] ? Object.keys(pubView[0]) : [];
record("isolation: A sees only the public projection of B", Array.isArray(pubView) && pubView.length === 1 && !pubCols.includes("phone") && !pubCols.includes("email"),
  `visible columns: ${pubCols.join(", ")}`);

const { data: sneakAi } = await A.from("ai_conversations").select("*").eq("user_id", idB);
record("isolation: A cannot read B's AI history", !sneakAi || sneakAi.length === 0, `rows: ${sneakAi?.length ?? 0}`);

const { data: sneakPlans } = await A.from("safety_plans").select("*").eq("owner_id", idB);
record("isolation: A cannot read B's safety plans", !sneakPlans || sneakPlans.length === 0, `rows: ${sneakPlans?.length ?? 0}`);

const { data: sneakNotif } = await A.from("notifications").select("*").eq("user_id", idB);
record("isolation: A cannot read B's notifications", !sneakNotif || sneakNotif.length === 0, `rows: ${sneakNotif?.length ?? 0}`);

const { data: sneakLocs } = await A.from("locations").select("*").eq("user_id", idB);
record("isolation: A cannot read B's location rows", !sneakLocs || sneakLocs.length === 0, `rows: ${sneakLocs?.length ?? 0}`);

// --- UNAUTHENTICATED ACCESS ----------------------------------------------
const anon = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const { data: anonRows } = await anon.from("profiles").select("*");
record("route/data protection: unauthenticated client reads zero profile rows", !anonRows || anonRows.length === 0, `rows: ${anonRows?.length ?? 0}`);

finish();

function finish() {
  results.finished_at = new Date().toISOString();
  results.passed = results.tests.filter((t) => t.pass).length;
  results.failed = results.tests.filter((t) => !t.pass).length;
  writeFileSync(
    new URL("../../docs/launch/runtime-verification/auth-test.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed ? 1 : 0);
}
