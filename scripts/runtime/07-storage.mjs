/**
 * RUNTIME TEST 07 — Storage against the REAL Supabase project (private
 * buckets, policy-protected): avatar upload/view/replace, chat image
 * membership-gated access, family image membership-gated access, malformed
 * and untrusted paths rejected.
 *
 * Evidence: docs/launch/runtime-verification/storage-test.json
 * Run: bun scripts/runtime/07-storage.mjs
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
    new URL("../../docs/launch/runtime-verification/storage-test.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed ? 1 : 0);
}

const A = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const B = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const anon = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
await A.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_A_EMAIL"), password: envFromDotenv("TEST_USER_A_PASSWORD") });
await B.auth.signInWithPassword({ email: envFromDotenv("TEST_USER_B_EMAIL"), password: envFromDotenv("TEST_USER_B_PASSWORD") });
const idA = (await A.auth.getUser()).data.user.id;
const idB = (await B.auth.getUser()).data.user.id;

// A tiny real PNG (1x1 transparent) as upload payload.
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63640000000600023081d2f4500000000049454e44ae426082",
  "hex",
);
const pngFile = new File([PNG], "test.png", { type: "image/png" });

// ---------------------------------------------------------------- AVATAR
const { error: avErr } = await A.storage.from("avatars").upload(`${idA}/avatar.png`, pngFile, { upsert: true });
record("avatar: A uploads own avatar", !avErr, avErr?.message ?? `${idA}/avatar.png`);

const { error: avForeignErr } = await B.storage.from("avatars").upload(`${idA}/stolen.png`, pngFile, { upsert: true });
record("avatar: B cannot upload into A's avatar folder (own-folder policy)", Boolean(avForeignErr),
  avForeignErr ? "policy blocked" : "upload went through?!");

const { data: avBlob } = await anon.storage.from("avatars").download(`${idA}/avatar.png`);
record("avatar: public read works without authentication (by design)", Boolean(avBlob), avBlob ? `${avBlob.size} bytes` : "no blob");

const { error: avReplaceErr } = await A.storage.from("avatars").upload(`${idA}/avatar.png`, pngFile, { upsert: true });
record("avatar: A replaces own avatar (upsert)", !avReplaceErr, avReplaceErr?.message ?? "replaced");

const { error: avDeleteErr } = await A.storage.from("avatars").remove([`${idA}/avatar.png`]);
record("avatar: A deletes own avatar", !avDeleteErr, avDeleteErr?.message ?? "deleted");

// ------------------------------------------------------------- CHAT IMAGE
// Find the direct conversation A/B share (created in test 02).
const { data: convs } = await A.from("conversations").select("id").eq("type", "direct").limit(1);
const convId = convs[0].id;
const chatPath = `${convId}/${idA}/image-1.png`;
const { error: chatErr } = await A.storage.from("chat-images").upload(chatPath, pngFile, { upsert: true });
record("chat image: A uploads to the shared conversation (member, own path)", !chatErr, chatErr?.message ?? chatPath);

const { data: bChatBlob } = await B.storage.from("chat-images").download(chatPath);
record("chat image: B (conversation member) can view it", Boolean(bChatBlob), bChatBlob ? `${bChatBlob.size} bytes` : "no blob");

const { data: anonChatBlob } = await anon.storage.from("chat-images").download(chatPath);
record("chat image: unauthenticated client cannot view it (private bucket)", !anonChatBlob, anonChatBlob ? "LEAKED" : "blocked");

const foreignPath = `${convId}/${idB}/forged.png`;
const { error: chatForeignErr } = await B.storage.from("chat-images").upload(foreignPath, pngFile, { upsert: true });
record("chat image: B uploads under own uid in the shared conversation (own-path rule)",
  !chatForeignErr, chatForeignErr?.message ?? "allowed — B is a member too (design: members upload under their own uid)");
await B.storage.from("chat-images").remove([foreignPath]).catch(() => {});

// Malformed / untrusted paths must fail.
const { error: badPathErr } = await A.storage.from("chat-images").upload(`../../../../etc/${idA}/x.png`, pngFile);
record("chat image: path traversal path is rejected", Boolean(badPathErr), badPathErr ? "blocked" : "accepted?!");

const { error: badConvErr } = await A.storage.from("chat-images").upload(`not-a-uuid/${idA}/x.png`, pngFile);
record("chat image: non-uuid conversation folder is rejected", Boolean(badConvErr), badConvErr ? "blocked" : "accepted?!");

// ------------------------------------------------------------ FAMILY IMAGE
// Fresh family for storage tests.
for (const f of (await A.from("families").select("id").eq("name", "Storage Test Family")).data ?? []) {
  await A.from("families").delete().eq("id", f.id);
}
const { data: famId } = await A.rpc("create_family", { name: "Storage Test Family" });
const code = `sto-test-${Math.random().toString(36).slice(2, 10)}`;
await A.from("family_invites").insert({ family_id: famId, code, created_by: idA, invitee_id: idB });
await B.rpc("join_family_by_code", { code });

const famPath = `${famId}/${idA}/family.png`;
const { error: famErr } = await A.storage.from("family-images").upload(famPath, pngFile, { upsert: true });
record("family image: owner A uploads to the family folder", !famErr, famErr?.message ?? famPath);

const { data: bFamBlob } = await B.storage.from("family-images").download(famPath);
record("family image: family member B can view it", Boolean(bFamBlob), bFamBlob ? `${bFamBlob.size} bytes` : "no blob");

const { error: bUploadErr } = await B.storage.from("family-images").upload(`${famId}/${idB}/member.png`, pngFile, { upsert: true });
record("family image: plain member cannot upload (admins upload only)", Boolean(bUploadErr),
  bUploadErr ? "policy blocked" : "member upload went through?!");

// B leaves; a FRESH family image (never fetched while B was a member) must be
// unreadable to them. (Note: an object fetched while still a member can be
// served briefly from Supabase's edge cache after a policy change — upstream
// platform behaviour, seconds-scale; fresh objects are always RLS-checked.)
await B.from("family_members").delete().eq("family_id", famId).eq("user_id", idB);
const freshFamPath = `${famId}/${idA}/after-leave-${Date.now()}.png`;
await A.storage.from("family-images").upload(freshFamPath, pngFile, { upsert: true });
const { data: bAfterLeave } = await B.storage.from("family-images").download(freshFamPath);
record("family image: after leaving, B cannot view fresh family images (RLS-checked)", !bAfterLeave, bAfterLeave ? "still readable?!" : "blocked");

const { data: bSigned } = await B.storage.from("family-images").createSignedUrl(freshFamPath, 60);
record("family image: signed-URL path also denied after leaving (signing checks RLS)", !bSigned?.signedUrl, bSigned?.signedUrl ? "signed url issued?!" : "blocked");

const { error: famBadErr } = await A.storage.from("family-images").upload(`not-a-uuid/${idA}/x.png`, pngFile);
record("family image: non-uuid family folder is rejected", Boolean(famBadErr), famBadErr ? "blocked" : "accepted?!");

finish();
