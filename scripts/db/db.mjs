/**
 * Shared Supabase DB connection for maintenance scripts.
 *
 * Uses the IPv4 session pooler (aws-1-<region>) because the sandbox has no
 * IPv6 route to db.<ref>.supabase.co. Credentials come from the project's
 * gitignored .env; no secret values are ever printed by scripts importing
 * this helper.
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";

export const PROJECT_REF = "cztdyqhatvogiaegniow";
export const POOLER_HOST = "aws-1-eu-west-1.pooler.supabase.com";

function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

export function poolerUrl() {
  const url = envFromDotenv("DATABASE_URL");
  const m = url.match(/^postgresql:\/\/[^:]+:([^@]+)@[^:]+:\d+\/(.+)$/);
  if (!m) throw new Error("cannot parse DATABASE_URL from .env");
  return `postgresql://postgres.${PROJECT_REF}:${m[1]}@${POOLER_HOST}:5432/${m[2]}`;
}

/** One shared pooler connection. Call sql.end() when finished. */
export function getSql() {
  return postgres(poolerUrl(), {
    max: 1,
    ssl: "require",
    connect_timeout: 10,
    idle_timeout: 5,
  });
}
