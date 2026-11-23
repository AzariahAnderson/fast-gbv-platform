/**
 * Probe direct Supabase DB connectivity and report basic server facts.
 * Prints no secret values. Run: bun scripts/db/connect-probe.mjs
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";

// The sandbox OS exports a placeholder DATABASE_URL (sqlite), so parse .env
// directly and let the project .env win over the inherited environment.
function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

const url = envFromDotenv("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL missing in .env");
  process.exit(1);
}

// Redact the password for any error output.
const safeUrl = url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");

try {
  const sql = postgres(url, { max: 1, ssl: "require", connect_timeout: 15 });
  const info = await sql`select version() as v, current_database() as db`;
  console.log("CONNECTED", info[0].db);
  console.log("server:", String(info[0].v).slice(0, 60));
  const pubTables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`;
  console.log("public tables:", pubTables.length ? pubTables.map((r) => r.table_name).join(", ") : "(none)");
  await sql.end();
} catch (err) {
  console.error("FAILED:", safeUrl);
  console.error(String(err.message || err));
  process.exit(1);
}
