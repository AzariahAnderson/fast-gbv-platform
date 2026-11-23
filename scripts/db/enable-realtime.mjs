/**
 * Add the tables the app subscribes to (postgres_changes) to the
 * supabase_realtime publication. Without this, Realtime delivers nothing.
 * Run: bun scripts/db/enable-realtime.mjs
 */
import { writeFileSync } from "node:fs";
import { getSql } from "./db.mjs";

const TABLES = [
  "messages",
  "typing_presence",
  "message_reads",
  "locations",
  "location_shares",
  "checkins",
];

const sql = getSql();
const result = { attempted: TABLES, added: [], already: [], errors: {} };

const before = new Set(
  (await sql`select tablename from pg_publication_tables where pubname = 'supabase_realtime'`).map((r) => r.tablename),
);

for (const t of TABLES) {
  if (before.has(t)) { result.already.push(t); continue; }
  try {
    await sql.unsafe(`alter publication supabase_realtime add table public.${t};`);
    result.added.push(t);
  } catch (err) {
    result.errors[t] = String(err.message || err).slice(0, 200);
  }
}

const after = await sql`select tablename from pg_publication_tables where pubname = 'supabase_realtime'`;
result.final_publication_tables = after.map((r) => r.tablename);
result.success = TABLES.every((t) => result.final_publication_tables.includes(t));

writeFileSync(
  new URL("../../docs/launch/runtime-verification/realtime-publication.json", import.meta.url),
  JSON.stringify(result, null, 2),
);

console.log("added:", result.added.join(", ") || "none");
console.log("already present:", result.already.join(", ") || "none");
console.log("errors:", JSON.stringify(result.errors, null, 2));
console.log("final publication tables:", result.final_publication_tables.join(", "));
console.log(result.success ? "REALTIME PUBLICATION READY" : "REALTIME PUBLICATION INCOMPLETE");
await sql.end({ timeout: 2 });
