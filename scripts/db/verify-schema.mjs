/**
 * Verify the remote schema: tables, RLS, policies, indexes, triggers,
 * functions, storage buckets, realtime publication.
 * Writes machine-readable evidence to docs/launch/runtime-verification/.
 * Run: bun scripts/db/verify-schema.mjs
 */
import { writeFileSync } from "node:fs";
import { getSql } from "./db.mjs";

const EXPECTED_TABLES = [
  "profiles", "conversations", "conversation_members", "messages",
  "message_reactions", "message_reads", "typing_presence",
  "families", "family_members", "family_invites",
  "locations", "location_shares", "location_share_viewers",
  "checkins", "safe_arrivals", "safety_plans", "safety_plan_shares",
  "safety_plan_contacts", "trusted_contacts", "notifications",
  "reports", "blocks", "ai_conversations", "ai_messages",
];

const EXPECTED_FUNCTIONS = [
  "normalise_phone", "search_profile_by_phone", "is_conversation_member",
  "is_family_member", "family_role", "start_direct_conversation",
  "create_family", "join_family_by_code", "touch_conversation", "touch_plan",
  "notify_new_message", "notify_checkin", "notify_safe_arrival", "notify_invite_accepted",
];

const sql = getSql();
const evidence = { generated_at: new Date().toISOString(), project: "cztdyqhatvogiaegniow" };

// 1. Tables
const tables = await sql`
  select t.table_name,
         c.relrowsecurity as rls_enabled
    from information_schema.tables t
    join pg_class c on c.relname = t.table_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
   order by t.table_name`;
evidence.tables = tables.map((t) => ({
  name: t.table_name,
  rls_enabled: t.rls_enabled,
  expected: EXPECTED_TABLES.includes(t.table_name),
}));
evidence.missing_tables = EXPECTED_TABLES.filter(
  (x) => !tables.some((t) => t.table_name === x),
);

// 2. Policies per table
const policies = await sql`
  select tablename, policyname, cmd
    from pg_policies where schemaname = 'public'
   order by tablename, policyname`;
evidence.policy_count = policies.length;
evidence.policies_by_table = {};
for (const p of policies) {
  (evidence.policies_by_table[p.tablename] ??= []).push(`${p.policyname} (${p.cmd})`);
}

// 3. Indexes per table
const indexes = await sql`
  select tablename, indexname from pg_indexes
   where schemaname = 'public' order by tablename, indexname`;
evidence.index_count = indexes.length;
evidence.indexes_by_table = {};
for (const i of indexes) {
  (evidence.indexes_by_table[i.tablename] ??= []).push(i.indexname);
}

// 4. Triggers
const triggers = await sql`
  select event_object_table as tbl, trigger_name, event_manipulation as evt
    from information_schema.triggers
   where trigger_schema = 'public' order by event_object_table, trigger_name`;
evidence.triggers = triggers.map((t) => `${t.tbl}.${t.trigger_name} [${t.evt}]`);

// 5. Functions
const fns = await sql`
  select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' order by p.proname`;
evidence.functions = fns.map((f) => `${f.proname}(${f.args})`);
evidence.missing_functions = EXPECTED_FUNCTIONS.filter(
  (x) => !fns.some((f) => f.proname === x),
);

// 6. Storage buckets
const buckets = await sql`
  select id, name, public, file_size_limit, allowed_mime_types
    from storage.buckets order by id`;
evidence.storage_buckets = buckets;

// 7. Realtime publication
const realtime = await sql`
  select pt.tablename, pt.schemaname
    from pg_publication_tables pt
   where pt.pubname = 'supabase_realtime'`;
evidence.realtime_publication_tables = realtime.map((r) => `${r.schemaname}.${r.tablename}`);
evidence.realtime_publication_exists = (
  await sql`select 1 from pg_publication where pubname = 'supabase_realtime'`
).length > 0;

// 8. RLS summary: every expected private table must have RLS on
evidence.rls_violations = evidence.tables
  .filter((t) => t.expected && !t.rls_enabled)
  .map((t) => t.name);

writeFileSync(
  new URL("../../docs/launch/runtime-verification/schema-verification.json", import.meta.url),
  JSON.stringify(evidence, null, 2),
);

console.log("tables:", evidence.tables.length, "| missing:", evidence.missing_tables.join(",") || "none");
console.log("policies:", evidence.policy_count, "| indexes:", evidence.index_count);
console.log("triggers:", evidence.triggers.length, "| functions:", evidence.functions.length,
  "| missing fns:", evidence.missing_functions.join(",") || "none");
console.log("buckets:", evidence.storage_buckets.map((b) => `${b.id}(public=${b.public})`).join(", "));
console.log("realtime publication:", evidence.realtime_publication_exists
  ? evidence.realtime_publication_tables.join(", ") || "(EMPTY — postgres_changes will deliver nothing)"
  : "MISSING");
console.log("RLS violations:", evidence.rls_violations.join(", ") || "none");
await sql.end({ timeout: 2 });
