/**
 * Focused probe: family image access after membership ends.
 * Run: bun scripts/runtime/probe-family-image.mjs
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

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63640000000600023081d2f4500000000049454e44ae426082",
  "hex",
);
const pngFile = new File([PNG], "p.png", { type: "image/png" });

// Use the existing "Storage Test Family" (B left in the last run).
const { data: fams } = await A.from("families").select("id").eq("name", "Storage Test Family").limit(1);
const famId = fams[0].id;
console.log("family:", famId.slice(0, 8));

// Is B still a member (per policy helpers)?
const { data: memberRow, error: memberErr } = await B.from("family_members").select("role").eq("family_id", famId).eq("user_id", idB).maybeSingle();
console.log("B sees own membership row:", memberRow, memberErr?.message ?? "");

const { error: rpcErr, data: rpcData } = await B.rpc("is_family_member", { fam: famId });
console.log("B calls is_family_member:", rpcData, rpcErr?.message ?? "");

// A re-adds B, uploads, then removes B again; probe download at each step.
const code = `probe-${Math.random().toString(36).slice(2, 8)}`;
await A.from("family_invites").insert({ family_id: famId, code, created_by: idA, invitee_id: idB });
await B.rpc("join_family_by_code", { code });
const famPath = `${famId}/${idA}/probe.png`;
await A.storage.from("family-images").upload(famPath, pngFile, { upsert: true });
const { data: blob1 } = await B.storage.from("family-images").download(famPath);
console.log("B (member) download:", blob1 ? "OK" : "blocked");

await A.from("family_members").delete().eq("family_id", famId).eq("user_id", idB);
const { data: checkRow } = await B.from("family_members").select("role").eq("family_id", famId).eq("user_id", idB).maybeSingle();
console.log("after removal, B sees own membership row:", checkRow);

const { data: blob2 } = await B.storage.from("family-images").download(famPath);
console.log("B (removed) download:", blob2 ? "OK — LEAK?" : "blocked");

// Also try a signed URL (the app may use signed URLs for images).
const { data: signed } = await B.storage.from("family-images").createSignedUrl(famPath, 60);
console.log("B (removed) signed URL:", signed?.signedUrl ? "CREATED — LEAK?" : "blocked");
process.exit(0);
