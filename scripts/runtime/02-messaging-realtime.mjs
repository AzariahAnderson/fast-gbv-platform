/**
 * RUNTIME TEST 02 — Direct messaging end-to-end against the REAL Supabase
 * project, including LIVE postgres_changes delivery (no refresh, no
 * polling): A→B message, B→A reply, typing, read state, edit, soft delete,
 * mute (notification suppression), archive, block, report.
 *
 * Evidence: docs/launch/runtime-verification/messaging-test.json
 * Run: bun scripts/runtime/02-messaging-realtime.mjs
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

// Service-role client: verifies insert-only rows out-of-band (reports).
const admin = createClient(SUPA_URL, SUPA_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const results = { started_at: new Date().toISOString(), tests: [] };
function record(name, pass, detail) {
  results.tests.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}
function failHard(msg) { record("fatal", false, msg); finish(1); }
function finish(code = results.tests.some((t) => !t.pass) ? 1 : 0) {
  results.finished_at = new Date().toISOString();
  results.passed = results.tests.filter((t) => t.pass).length;
  results.failed = results.tests.filter((t) => !t.pass).length;
  writeFileSync(
    new URL("../../docs/launch/runtime-verification/messaging-test.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  process.exit(code);
}

// Sign in the two seeded test users (created by 01-auth-and-isolation.mjs).
const A = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const B = createClient(SUPA_URL, SUPA_PUB, { auth: { persistSession: false } });
const signIn = async (client, email, password) => {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) failHard(`sign-in failed for ${email}: ${error.message}`);
};
await signIn(A, envFromDotenv("TEST_USER_A_EMAIL"), envFromDotenv("TEST_USER_A_PASSWORD"));
await signIn(B, envFromDotenv("TEST_USER_B_EMAIL"), envFromDotenv("TEST_USER_B_PASSWORD"));
const idA = (await A.auth.getUser()).data.user?.id;
const idB = (await B.auth.getUser()).data.user?.id;
if (!idA || !idB) failHard("missing user ids");

// Helper: wait for a specific realtime event (kind + optional predicate).
function waitForEvent(channel, kind, predicate = null, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    channel.queue = channel.queue || [];
    const tryMatch = (payload) => {
      if (payload.kind !== kind || (predicate && !predicate(payload))) {
        channel.queue.push(payload); // keep for other waiters
        channel.resolveNext = tryMatch; // keep this waiter armed
        return;
      }
      clearTimeout(timer);
      channel.resolveNext = null;
      resolve(payload);
    };
    channel.resolveNext = tryMatch;
    // Deliver any queued matches immediately.
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
  if (channel.resolveNext) {
    const r = channel.resolveNext;
    channel.resolveNext = null;
    r(payload);
  } else {
    channel.queue.push(payload); // no waiter yet: queue for the next one
  }
}

// ---------------------------------------------------------------- 1. search
const { data: found, error: searchErr } = await A.rpc("search_profile_by_phone", { query: "+27110000002" });
record("1. A finds B by exact verified phone (RPC)", !searchErr && Array.isArray(found) && found.length === 1 && found[0].id === idB,
  searchErr?.message ?? `returned id match, columns: ${found?.[0] ? Object.keys(found[0]).join(",") : "none"}`);

// Near-miss: the search must NOT be a prefix scan or a listing.
const { data: partial } = await A.rpc("search_profile_by_phone", { query: "+2711000000" });
record("1b. phone search is exact-match only (prefix returns nothing)", Array.isArray(partial) && partial.length === 0, `rows: ${partial?.length ?? 0}`);

// --------------------------------------------------- 2. start conversation
const { data: convId, error: convErr } = await A.rpc("start_direct_conversation", { other: idB });
record("2. A starts a direct conversation with B (RPC returns id)", !convErr && typeof convId === "string", convErr?.message ?? convId);

// Realtime subscriptions: B listens for INSERTs on the thread; A for B's events.
const bThread = B.channel(`rt-test-b:${convId}`, { config: { presence: { key: idB } } })
  .on("postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
    (p) => deliverEvent(bThread, { kind: "insert", row: p.new }))
  .on("postgres_changes",
    { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
    (p) => deliverEvent(bThread, { kind: "update", row: p.new }));
let bJoined = false;
await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 15000);
  bThread.subscribe((status) => {
    if (status === "SUBSCRIBED") { clearTimeout(t); bJoined = true; resolve(true); }
  });
});
record("realtime: B's live channel joined (SUBSCRIBED)", bJoined);
// Realtime attaches postgres_changes RLS authorization shortly after the
// phoenix join settles; give it a beat so the very first event is not
// consumed by the subscription handshake itself.
await new Promise((r) => setTimeout(r, 1500));

// ------------------------------------------------------------ 3./4. A→B
let waitB = waitForEvent(bThread, "insert", (p) => p.row?.body === msgA);
const msgA = "Hi B, this is Test User A — first real message.";
const t0 = Date.now();
const { data: insertedA, error: sendErrA } = await A.from("messages")
  .insert({ conversation_id: convId, sender_id: idA, kind: "text", body: msgA })
  .select("id, body, created_at").single();
record("3. A sends a message (row written to Postgres)", !sendErrA && Boolean(insertedA?.id), sendErrA?.message ?? `id ${insertedA?.id?.slice(0, 8)}…`);
const evB = await waitB;
record("4. B receives A's message LIVE (postgres_changes INSERT, no refresh)",
  Boolean(evB) && evB.row?.body === msgA, evB ? `delivered in ${Date.now() - t0}ms` : "no event within 15s");

// ------------------------------------------------------------- 5. B→A reply
const aThread = A.channel(`rt-test-a:${convId}`, { config: { presence: { key: idA } } })
  .on("postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
    (p) => deliverEvent(aThread, { kind: "insert", row: p.new }))
  .on("postgres_changes",
    { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
    (p) => deliverEvent(aThread, { kind: "update", row: p.new }))
  .on("postgres_changes",
    { event: "*", schema: "public", table: "typing_presence", filter: `conversation_id=eq.${convId}` },
    (p) => deliverEvent(aThread, { kind: "typing", row: p.new ?? p.old }))
  .on("postgres_changes",
    { event: "INSERT", schema: "public", table: "message_reads", filter: `user_id=neq.${idA}` },
    (p) => deliverEvent(aThread, { kind: "read", row: p.new }));
let aJoined = false;
await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 15000);
  aThread.subscribe((status) => { if (status === "SUBSCRIBED") { clearTimeout(t); aJoined = true; resolve(true); } });
});
record("realtime: A's live channel joined (SUBSCRIBED)", aJoined);
await new Promise((r) => setTimeout(r, 1500));

let waitA = waitForEvent(aThread, "insert", (p) => p.row?.body === replyB);
const replyB = "Received loud and clear — Test User B replying.";
const t1 = Date.now();
const { error: sendErrB } = await B.from("messages")
  .insert({ conversation_id: convId, sender_id: idB, kind: "text", body: replyB })
  .single();
record("5a. B replies (row written)", !sendErrB, sendErrB?.message);
const evA = await waitA;
record("5b. A receives B's reply LIVE (no refresh)", Boolean(evA) && evA.row?.body === replyB, evA ? `delivered in ${Date.now() - t1}ms` : "no event within 15s");

// ------------------------------------------------------- 6. typing indicator
let waitTyping = waitForEvent(aThread, "typing", (p) => p.row?.typing === true);
const t2 = Date.now();
await B.from("typing_presence").upsert(
  { conversation_id: convId, user_id: idB, typing: true, updated_at: new Date().toISOString() },
  { onConflict: "conversation_id,user_id" },
);
const evTyping = await waitTyping;
record("6. typing indicator: A sees B typing LIVE",
  Boolean(evTyping) && evTyping.row?.typing === true, evTyping ? `delivered in ${Date.now() - t2}ms` : "no event within 15s");
await B.from("typing_presence").upsert(
  { conversation_id: convId, user_id: idB, typing: false, updated_at: new Date().toISOString() },
  { onConflict: "conversation_id,user_id" },
);

// ------------------------------------------------------------ 7. read state
const debugEvents = [];
const debugOff = (() => {
  // Temporary tap: log every raw event aThread receives during this window.
  const chan = aThread;
  const origPush = chan.queue.push.bind(chan.queue);
  chan.queue.push = (...items) => { for (const it of items) debugEvents.push(it); return origPush(...items); };
  return () => { chan.queue.push = origPush; };
})();
let waitRead = waitForEvent(aThread, "read", (p) => p.row?.message_id === insertedA.id, 20000);
const { error: readErr } = await B.from("message_reads").upsert(
  { message_id: insertedA.id, user_id: idB, read_at: new Date().toISOString() },
  { onConflict: "message_id,user_id" },
);
const evRead = await waitRead;
debugOff();
record("7. read state: B's read receipt lands and A sees it LIVE",
  !readErr && Boolean(evRead) && evRead.row?.message_id === insertedA.id,
  readErr?.message ?? (evRead ? "read event delivered" : `no event in 20s; received: [${debugEvents.map((e) => `${e.kind}=${e.row?.message_id ?? e.row?.typing ?? ""}`).join("; ") || "none"}] | expected message_id=${insertedA.id}`));

// ------------------------------------------------------------------ 9. edit
let waitEdit = waitForEvent(bThread, "update", (p) => p.row?.body?.includes("(edited)"));
const t3 = Date.now();
const { error: editErr } = await A.from("messages")
  .update({ body: msgA + " (edited)", edited_at: new Date().toISOString() })
  .eq("id", insertedA.id);
const evEdit = await waitEdit;
record("9. A edits own message; B receives the UPDATE live",
  !editErr && Boolean(evEdit) && evEdit.row?.body?.includes("(edited)"), editErr?.message ?? (evEdit ? `delivered in ${Date.now() - t3}ms` : "no event"));
// B must NOT be able to edit A's message.
const { data: forged, error: forgeErr } = await B.from("messages")
  .update({ body: "B was here — forged edit" })
  .eq("id", insertedA.id).select("id").single();
record("9b. B cannot modify A's message (RLS update blocked)", forgeErr && !forged, forgeErr ? `policy error: ${forgeErr.message.slice(0, 80)}` : "update went through?!");

// ----------------------------------------------------------- 10. soft delete
let waitDel = waitForEvent(bThread, "update", (p) => Boolean(p.row?.deleted_at));
const { error: delErr } = await A.from("messages")
  .update({ deleted_at: new Date().toISOString(), body: null })
  .eq("id", insertedA.id);
const evDel = await waitDel;
record("10. A soft-deletes own message; B sees deleted_at set (UPDATE live)",
  !delErr && Boolean(evDel) && Boolean(evDel.row?.deleted_at), delErr?.message ?? (evDel ? "delete event delivered" : "no event"));

// --------------------------------------------------------------- 12. mute
const muteUntil = new Date(Date.now() + 3600_000).toISOString();
await A.from("conversation_members").update({ muted_until: muteUntil })
  .eq("conversation_id", convId).eq("user_id", idA);
const { data: muteCheck } = await A.from("conversation_members")
  .select("muted_until").eq("conversation_id", convId).eq("user_id", idA).single();
record("12a. A mutes the conversation (muted_until persisted)",
  muteCheck?.muted_until != null && Math.abs(new Date(muteCheck.muted_until).getTime() - new Date(muteUntil).getTime()) < 1000,
  muteCheck?.muted_until ?? "not set");

// B sends while A muted: notification trigger must SKIP A (mute honoured).
const { error: bSendErr } = await B.from("messages")
  .insert({ conversation_id: convId, sender_id: idB, kind: "text", body: "ping while A muted" }).single();
record("12b. B's message still delivers while A muted", !bSendErr, bSendErr?.message);
await new Promise((r) => setTimeout(r, 1500)); // trigger runs synchronously; small settle delay
const { data: aNotifs } = await A.from("notifications").select("kind, body").order("created_at", { ascending: false }).limit(5);
const gotMutedPing = (aNotifs ?? []).some((n) => n.body === "ping while A muted");
record("12c. muted conversation produced NO notification row for A (mute honoured by trigger)",
  !gotMutedPing, `recent kinds: ${(aNotifs ?? []).map((n) => n.kind).join(", ") || "none"}`);

// ------------------------------------------------------------- 13. archive
await A.from("conversation_members").update({ archived: true })
  .eq("conversation_id", convId).eq("user_id", idA);
const { data: archCheck } = await A.from("conversation_members")
  .select("archived").eq("conversation_id", convId).eq("user_id", idA).single();
record("13. A archives the conversation (archived persisted per-member)", archCheck?.archived === true, `archived=${archCheck?.archived}`);
await A.from("conversation_members").update({ archived: false, muted_until: null })
  .eq("conversation_id", convId).eq("user_id", idA);

// ---------------------------------------------------------------- 14. block
const { error: blockErr } = await A.from("blocks").insert({ blocker_id: idA, blocked_id: idB });
record("14a. A blocks B (blocks row written)", !blockErr, blockErr?.message);

const { error: blockedSendErr } = await B.from("messages")
  .insert({ conversation_id: convId, sender_id: idB, kind: "text", body: "attempt while blocked" }).single();
record("14b. B cannot send while blocked (insert violates send policy)",
  Boolean(blockedSendErr), blockedSendErr ? `policy error: ${blockedSendErr.message.slice(0, 80)}` : "send went through?!");

const { data: convAfterBlock, error: convBlockErr } = await B.rpc("start_direct_conversation", { other: idA });
record("14c. B cannot open a new direct conversation with A via RPC while blocked",
  Boolean(convBlockErr) && convBlockErr.message.includes("conversation unavailable"),
  convBlockErr?.message ?? `rpc returned ${convAfterBlock}`);

// RPC path (server-side manipulation attempt) is covered by 14c; the direct
// insert path by 14b. Membership manipulation: B cannot add A to a new
// conversation that bypasses the block because every insert policy is
// member-gated; B also cannot add *itself* into A's conversation.
const { error: selfJoinErr } = await B.from("conversation_members").insert({ conversation_id: convId, user_id: idB });
record("14d. B cannot re-insert own membership row to bypass the block",
  Boolean(selfJoinErr), selfJoinErr ? `policy error: ${selfJoinErr.message.slice(0, 80)}` : "insert went through?!");

const { error: unblockErr } = await A.from("blocks").delete().eq("blocker_id", idA).eq("blocked_id", idB);
record("14e. A unblocks B (cleanup for family tests)", !unblockErr, unblockErr?.message);

// --------------------------------------------------------------- 15. report
const { error: reportErr } = await A.from("reports")
  .insert({ reporter_id: idA, target_type: "user", target_id: idB, reason: "harassment", details: "runtime test report" });
// Existence is verified out-of-band with the service role: reports have no
// select policy, so the reporter cannot read the row back (by design).
const { data: adminCheck } = await admin.from("reports")
  .select("id, status").eq("reporter_id", idA).limit(1);
record("15a. A files a report (secure moderation record created)",
  !reportErr && Boolean(adminCheck?.[0]?.id), reportErr?.message ?? `status ${adminCheck?.[0]?.status ?? "?"} (verified via service role)`);

const { data: bSeesReport } = await B.from("reports").select("id").limit(1);
record("15b. reports are insert-only for users: B cannot read A's report", !bSeesReport || bSeesReport.length === 0, `rows: ${bSeesReport?.length ?? 0}`);

await removeChannels([aThread, bThread]);
finish();

function removeChannels(clientsChannels) {
  for (const ch of clientsChannels) { try { ch.unsubscribe?.(); } catch {} }
}
