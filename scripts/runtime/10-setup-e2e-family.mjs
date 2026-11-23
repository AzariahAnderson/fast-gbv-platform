/**
 * E2E setup: ensure Test User A owns a family with Test User B in it, so
 * UI tests have a stable two-person family (audience of one) to share with.
 * Idempotent. Run: bun scripts/runtime/10-setup-e2e-family.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}
const SUPA_URL = envFromDotenv("NEXT_PUBLIC_SUPABASE_URL");
const SUPA_PUB = envFromDotenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const A = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const B = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
await A.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_A_EMAIL"), password: envFromDotenv("TEST_USER_A_PASSWORD") });
await B.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_B_EMAIL"), password: envFromDotenv("TEST_USER_B_PASSWORD") });
const idA = (await A.auth.getUser()).data.user.id;
const idB = (await B.auth.getUser()).data.user.id;

// Clean up leftover runtime-test families so "E2E Family" is the only one
// and therefore the map's default active family in UI tests.
for (const name of ["Test Family", "Location Test Family", "Storage Test Family"]) {
  const { data: stale } = await A.from("families").select("id").eq("name", name);
  for (const f of stale ?? []) {
    await A.from("families").delete().eq("id", f.id);
    console.log(`removed leftover family "${name}"`);
  }
}

// Find or create the E2E family.
let { data: fam } = await A.from("families").select("id").eq("name", "E2E Family").maybeSingle();
if (!fam?.id) {
  const famId = await A.rpc("create_family", { name: "E2E Family" });
  fam = { id: famId };
  console.log("created E2E Family", fam.id);
} else {
  console.log("found E2E Family", fam.id);
}

// Ensure B is a member (fresh invite each time the membership is missing).
const { data: isMember } = await B.from("family_members").select("role").eq("family_id", fam.id).eq("user_id", idB).maybeSingle();
if (!isMember) {
  const code = `e2e-${Math.random().toString(36).slice(2, 10)}`;
  await A.from("family_invites").insert({ family_id: fam.id, code, created_by: idA, invitee_id: idB });
  await B.rpc("join_family_by_code", { code });
  console.log("added Test User B to the family");
} else {
  console.log("Test User B already a member");
}
console.log("E2E family state ready");
