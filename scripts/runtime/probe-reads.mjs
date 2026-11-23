/**
 * Focused probe: does Realtime deliver message_reads INSERTs to A?
 * Prints channel states and errors. Run: bun scripts/runtime/probe-reads.mjs
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

// Existing conversation
const { data: convs } = await A.from("conversations").select("id").eq("type", "direct").limit(1);
const convId = convs[0].id;
console.log("conversation:", convId.slice(0, 8));

// A recent message to read
const { data: msgs } = await A.from("messages").select("id").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(1);
const msgId = msgs[0].id;

// 0) Can A read B's read rows via plain PostgREST (RLS visibility)?
const { data: readsViaApi, error: readsErr } = await A.from("message_reads").select("*").eq("message_id", msgId);
console.log("A reads message_reads via API:", JSON.stringify(readsViaApi), readsErr?.message ?? "");

// 1) Subscribe with the app's exact filter
const ch = A.channel("probe-reads")
  .on("postgres_changes",
    { event: "INSERT", schema: "public", table: "message_reads", filter: `user_id=neq.${idA}` },
    (p) => console.log("EVENT (filtered):", JSON.stringify(p.new ?? p)))
  .on("postgres_changes",
    { event: "INSERT", schema: "public", table: "message_reads" },
    (p) => console.log("EVENT (unfiltered):", JSON.stringify(p.new ?? p)));
ch.subscribe((status) => console.log("channel status:", status, new Date().toISOString()));

await new Promise((r) => setTimeout(r, 3000));
console.log("inserting read receipt as B…");
const { error: upErr } = await B.from("message_reads").upsert(
  { message_id: msgId, user_id: idB, read_at: new Date().toISOString() },
  { onConflict: "message_id,user_id" },
);
console.log("upsert error:", upErr?.message ?? "none");
await new Promise((r) => setTimeout(r, 8000));
console.log("probe done");
process.exit(0);
