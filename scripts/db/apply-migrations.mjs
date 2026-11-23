/**
 * Apply Supabase migrations to the remote database, in order, each file in
 * a single transaction. Run: bun scripts/db/apply-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { getSql } from "./db.mjs";

const MIGRATIONS_DIR = new URL("../../supabase/migrations/", import.meta.url);
const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

console.log("migration files:", files.join(", "));

const sql = getSql();

// Track applied migrations so the runner is idempotent (0001 is not fully
// re-runnable: a few policies lack their drop-if-exists guard).
await sql`create table if not exists public.fast_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
)`;

const applied = new Set(
  (await sql`select name from public.fast_migrations`).map((r) => r.name),
);

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skipping ${file} (already applied)`);
    continue;
  }
  const content = readFileSync(new URL(file, MIGRATIONS_DIR), "utf8");
  process.stdout.write(`applying ${file} ... `);
  try {
    await sql.begin(async (tx) => {
      // Multi-statement file through the simple query protocol.
      await tx.unsafe(content);
      await tx`insert into public.fast_migrations (name) values (${file})`;
    });
    console.log("OK");
  } catch (err) {
    console.log("FAILED");
    const msg = String(err.message || err);
    console.error("error:", msg.slice(0, 500).replace(/\n/g, " | "));
    console.error("aborting — fix and re-run");
    await sql.end({ timeout: 2 });
    process.exit(1);
  }
}

// Quick inventory after migration.
const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name`;
console.log("public tables now:", tables.length);
console.log(tables.map((t) => t.table_name).join(", "));

await sql.end({ timeout: 2 });
console.log("MIGRATIONS APPLIED");
