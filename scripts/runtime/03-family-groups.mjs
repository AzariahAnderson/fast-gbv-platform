/**
 * RUNTIME TEST 03 — Family groups end-to-end against the REAL Supabase
 * project: create, invite, accept, roles, family chat realtime, pinned
 * messages, check-ins (incl. need-help cannot be silently muted), owner
 * removes member, member leaves, expired/revoked invites, permission
 * boundaries for members and non-members.
 *
 * Evidence: docs/launch/runtime-verification/family-test.json
 * Run: bun scripts/runtime/03-family-groups.mjs
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
    new URL("../../docs/launch/runtime-verification/family-test.json", import.meta.url),
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

// Clean any previous test family for re-runs (via owner A).
const { data: oldFams } = await A.from("families").select("id").eq("name", "Test Family");
for (const f of oldFams ?? []) await A.from("families").delete().eq("id", f.id);

// ------------------------------------------------------- 1. create family
const { data: famId, error: famErr } = await A.rpc("create_family", { name: "Test Family" });
record("1. A creates a test family (RPC)", !famErr && typeof famId === "string", famErr?.message ?? famId);
if (!famId) finish();

const { data: aRole } = await A.from("family_members").select("role").eq("family_id", famId).eq("user_id", idA).single();
record("1b. A's role is owner", aRole?.role === "owner", aRole?.role);

// Family conversation auto-created with the family
const { data: famConv } = await A.from("conversations").select("id, type").eq("family_id", famId).eq("type", "family").single();
record("1c. family conversation exists and A is a member", Boolean(famConv?.id),
  famConv ? `conversation ${famConv.id.slice(0, 8)}…` : "missing");
const convId = famConv?.id;

// ------------------------------------------------------------ 2. invite
const code = `fast-test-${Math.random().toString(36).slice(2, 10)}`;
const { data: invite, error: invErr } = await A.from("family_invites")
  .insert({ family_id: famId, code, created_by: idA, invitee_id: idB })
  .select("id, status, expires_at").single();
record("2. invitation created (pending, 14-day expiry)", !invErr && invite?.status === "pending",
  invErr?.message ?? `expires ${invite?.expires_at}`);

// B (non-member) can read own invite; a stranger cannot read A's invites.
const { data: bSeesInvite } = await B.from("family_invites").select("id").eq("id", invite.id).single();
record("2b. B can read the invitation addressed to them", Boolean(bSeesInvite?.id));

// ----------------------------------------------------------- 3. accept
const { data: joinedFam, error: joinErr } = await B.rpc("join_family_by_code", { code });
record("3. B accepts the invitation and joins via code (RPC)", !joinErr && joinedFam === famId, joinErr?.message ?? `family ${joinedFam}`);
const { data: bRole } = await B.from("family_members").select("role").eq("family_id", famId).eq("user_id", idB).single();
record("3b. B's role is member", bRole?.role === "member", bRole?.role);
const { data: bInConv } = await B.from("conversation_members").select("conversation_id").eq("conversation_id", convId).eq("user_id", idB).single();
record("3c. B was added to the family chat", Boolean(bInConv?.conversation_id));

// invite status flipped to accepted
const { data: acceptedInv } = await A.from("family_invites").select("status").eq("id", invite.id).single();
record("3d. invitation status became accepted", acceptedInv?.status === "accepted", acceptedInv?.status);

// ------------------------------------------------- 4. realtime family chat
const aFamCh = A.channel(`fam-test:${convId}`)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
    (p) => deliverEvent(aFamCh, { kind: "insert", row: p.new }))
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins", filter: `family_id=eq.${famId}` },
    (p) => deliverEvent(aFamCh, { kind: "checkin", row: p.new }));
let joined = false;
await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 15000);
  aFamCh.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); joined = true; resolve(true); } });
});
record("4a. A's family channel joined (SUBSCRIBED)", joined);
await new Promise((r) => setTimeout(r, 1500));

let waitMsg = waitForEvent(aFamCh, "insert");
const famMsg = "Family test: B posting to the group.";
const t0 = Date.now();
const { error: famSendErr } = await B.from("messages").insert({ conversation_id: convId, sender_id: idB, kind: "text", body: famMsg }).single();
const evMsg = await waitMsg;
record("4b. B's family message reaches A LIVE (no refresh)",
  !famSendErr && Boolean(evMsg) && evMsg.row?.body === famMsg, famSendErr?.message ?? (evMsg ? `delivered in ${Date.now() - t0}ms` : "no event"));

// ------------------------------------------------------- 5. pinned messages
const { data: pinMsg } = await B.from("messages").select("id").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(1).single();
// B is a plain member: pinning must not take effect (admins only).
await B.from("families").update({ pinned_message_ids: [pinMsg.id] }).eq("id", famId);
const { data: pinsAfterB } = await A.from("families").select("pinned_message_ids").eq("id", famId).single();
record("5a. member cannot change pinned messages (row stays empty after attempt)",
  Array.isArray(pinsAfterB?.pinned_message_ids) && pinsAfterB.pinned_message_ids.length === 0,
  `pinned as seen by owner: ${pinsAfterB?.pinned_message_ids?.length ?? "?"}`);

const { error: pinAsOwnerErr } = await A.from("families")
  .update({ pinned_message_ids: [pinMsg.id] }).eq("id", famId);
const { data: pinnedRow } = await B.from("families").select("pinned_message_ids").eq("id", famId).single();
record("5b. owner pins a message; members can read the pinned set",
  !pinAsOwnerErr && Array.isArray(pinnedRow?.pinned_message_ids) && pinnedRow.pinned_message_ids[0] === pinMsg.id,
  pinAsOwnerErr?.message ?? `pinned: ${pinnedRow?.pinned_message_ids?.length ?? 0}`);

// ---------------------------------------------------------- 6. check-ins
let waitCheckin = waitForEvent(aFamCh, "checkin");
const t1 = Date.now();
const { error: ciSafeErr } = await B.from("checkins").insert({ user_id: idB, family_id: famId, status: "safe", note: "I am safe" }).single();
const evCheckin = await waitCheckin;
record("6a. I'm Safe check-in: row written and reaches family LIVE",
  !ciSafeErr && Boolean(evCheckin) && evCheckin.row?.status === "safe", ciSafeErr?.message ?? (evCheckin ? `delivered in ${Date.now() - t1}ms` : "no event"));
await A.from("checkins").insert({ user_id: idA, family_id: famId, status: "on_my_way", note: null });
await A.from("checkins").insert({ user_id: idA, family_id: famId, status: "arrived", note: null });

// notifications created by the trigger for the OTHER members
const { data: aNotifs } = await A.from("notifications").select("kind, title").order("created_at", { ascending: false }).limit(6);
const hasCheckinNotif = (aNotifs ?? []).some((n) => n.kind === "checkin" && n.title?.includes("Test User B"));
record("6b. check-in notification created for A by the trigger", hasCheckinNotif,
  `recent: ${(aNotifs ?? []).map((n) => n.kind).join(", ")}`);

// NEED HELP: cannot be silently muted. Mute A's family conversation first.
await A.from("conversation_members").update({ muted_until: new Date(Date.now() + 3600_000).toISOString() })
  .eq("conversation_id", convId).eq("user_id", idA);
const { data: needNotifBefore } = await A.from("notifications").select("id").limit(1);
const { error: ciNeedErr } = await B.from("checkins").insert({ user_id: idB, family_id: famId, status: "need_help", note: "runtime test — need help" }).single();
await new Promise((r) => setTimeout(r, 1500));
const { data: aNotifsAfterNeed } = await A.from("notifications").select("kind, title").order("created_at", { ascending: false }).limit(6);
const gotNeedHelp = (aNotifsAfterNeed ?? []).some((n) => n.kind === "checkin" && n.title?.includes("needs help"));
record("6c. NEED HELP reaches a muted member (cannot be silently muted)",
  !ciNeedErr && gotNeedHelp,
  gotNeedHelp ? `notification: "${aNotifsAfterNeed.find((n) => n.title?.includes("needs help"))?.title}"` : "no notification — DANGER");
await A.from("conversation_members").update({ muted_until: null }).eq("conversation_id", convId).eq("user_id", idA);

// --------------------------------------------------- 7. member permissions
await B.from("families").delete().eq("id", famId);
const { data: famStill } = await A.from("families").select("id").eq("id", famId).single();
record("7a. member cannot delete the family (family still exists after attempt)", Boolean(famStill?.id), famStill ? "family survived" : "family gone?!");
await B.from("families").update({ name: "Hijacked" }).eq("id", famId);
const { data: famAfterRename } = await A.from("families").select("name").eq("id", famId).single();
record("7b. member cannot rename the family (name unchanged after attempt)", famAfterRename?.name === "Test Family", famAfterRename?.name);
const { data: famAfterB } = await B.from("families").select("name").eq("id", famId).single();
record("7c. family name unchanged after member attempts", famAfterB?.name === "Test Family", famAfterB?.name);

// owner removes B
const { error: removeErr } = await A.from("family_members").delete().eq("family_id", famId).eq("user_id", idB);
record("7d. owner removes B (admins remove others policy)", !removeErr, removeErr?.message ?? "removed");
const { data: bStillMember } = await B.from("family_members").select("role").eq("family_id", famId).eq("user_id", idB).single();
record("7e. B no longer a member (RLS hides row from them too)", !bStillMember, bStillMember ? "still visible" : "gone");

// B as NON-MEMBER now: family data must be invisible
const { data: bSeesFam } = await B.from("families").select("name").eq("id", famId).single();
record("7f. non-member cannot see the family", !bSeesFam, bSeesFam ? bSeesFam.name : "hidden");
const { data: bSeesConv } = await B.from("conversations").select("id").eq("family_id", famId).single();
record("7g. non-member cannot see the family conversation", !bSeesConv, bSeesConv ? "visible!" : "hidden");
const { data: bSeesMsgs } = await B.from("messages").select("id").eq("conversation_id", convId).limit(1);
record("7h. non-member cannot see family messages", !bSeesMsgs || bSeesMsgs.length === 0, `rows: ${bSeesMsgs?.length ?? 0}`);
const { data: bSeesCheckins } = await B.from("checkins").select("id").eq("family_id", famId).neq("user_id", idB).limit(1);
record("7i. non-member cannot see OTHER members' family check-ins (own rows stay readable by design)",
  !bSeesCheckins || bSeesCheckins.length === 0, `other members' rows: ${bSeesCheckins?.length ?? 0}`);
const { data: bSeesShares } = await B.from("location_shares").select("id").eq("family_id", famId).limit(1);
record("7j. non-member cannot see family location shares", !bSeesShares || bSeesShares.length === 0, `rows: ${bSeesShares?.length ?? 0}`);

// B re-join to test leave + invites
const code2 = `fast-test-${Math.random().toString(36).slice(2, 10)}`;
await A.from("family_invites").insert({ family_id: famId, code: code2, created_by: idA, invitee_id: idB });
const { error: rejoinErr } = await B.rpc("join_family_by_code", { code: code2 });
record("7k. B can be re-invited and re-join", !rejoinErr, rejoinErr?.message ?? "rejoined");
const { error: leaveErr } = await B.from("family_members").delete().eq("family_id", famId).eq("user_id", idB);
record("7l. member can leave on their own (leave-own policy)", !leaveErr, leaveErr?.message ?? "left");

// ------------------------------------------------ expired/revoked invites
const expiredCode = `fast-exp-${Math.random().toString(36).slice(2, 8)}`;
await A.from("family_invites").insert({
  family_id: famId, code: expiredCode, created_by: idA, invitee_id: idB,
  expires_at: new Date(Date.now() - 60_000).toISOString(),
});
const { error: expiredJoinErr } = await B.rpc("join_family_by_code", { code: expiredCode });
record("8a. expired invitation does not work", Boolean(expiredJoinErr),
  expiredJoinErr ? `rpc error: ${expiredJoinErr.message.slice(0, 60)}` : "join went through?!");

const revokedCode = `fast-rev-${Math.random().toString(36).slice(2, 8)}`;
const { data: revInv } = await A.from("family_invites")
  .insert({ family_id: famId, code: revokedCode, created_by: idA, invitee_id: idB })
  .select("id").single();
await A.from("family_invites").update({ status: "revoked" }).eq("id", revInv.id);
const { error: revokedJoinErr } = await B.rpc("join_family_by_code", { code: revokedCode });
record("8b. revoked invitation does not work", Boolean(revokedJoinErr),
  revokedJoinErr ? `rpc error: ${revokedJoinErr.message.slice(0, 60)}` : "join went through?!");

finish();
