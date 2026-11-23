/**
 * Find the IPv4-reachable Supabase session pooler region for this project.
 * Parallel probing with hard timeouts; unbuffered file logging.
 * Prints no secret values. Run: bun scripts/db/region-probe.mjs
 */
import postgres from "postgres";
import net from "node:net";
import dns from "node:dns";
import { appendFileSync } from "node:fs";
import { readFileSync } from "node:fs";

const LOG = "/tmp/region-probe.log";
const log = (line) => appendFileSync(LOG, line + "\n");

function envFromDotenv(key) {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

const url = envFromDotenv("DATABASE_URL");
const m = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
if (!m) { console.error("cannot parse DATABASE_URL"); process.exit(1); }
const password = m[2];
const ref = m[3].split(".")[1]; // db.<ref>.supabase.co -> <ref>

const regions = [
  "eu-west-1", "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2",
  "eu-north-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
  "ap-south-1", "sa-east-1",
];

// New projects register on the aws-1 pooler cluster; older ones on aws-0.
const prefixes = ["aws-1", "aws-0"];

function tcpProbe(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const finish = (ok) => { s.destroy(); resolve(ok); };
    s.setTimeout(timeoutMs, () => finish(false));
    s.once("connect", () => finish(true));
    s.once("error", () => finish(false));
  });
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms)),
  ]);
}

await Promise.all(regions.flatMap((region) => prefixes.map(async (prefix) => {
  const host = `${prefix}-${region}.pooler.supabase.com`;
  const tag = `${prefix}-${region}`;
  try {
    const [v4] = await withTimeout(
      new Promise((res, rej) => dns.resolve4(host, (e, a) => (e ? rej(e) : res(a)))),
      5000, "dns-timeout",
    );
    const okTcp = await tcpProbe(v4, 5432, 4000);
    if (!okTcp) { log(`${tag}: tcp-fail`); return; }
    const connString = `postgresql://postgres.${ref}:${password}@${v4}:5432/postgres`;
    const sql = postgres(connString, { max: 1, ssl: "require", connect_timeout: 6, idle_timeout: 1 });
    const r = await withTimeout(sql`select current_user as u`, 9000, "auth-timeout");
    log(`${tag}: AUTH-OK user=${r[0].u}`);
    await sql.end({ timeout: 2 });
  } catch (err) {
    const msg = String(err.message || err).slice(0, 80).replace(/\n/g, " ");
    log(`${tag}: ${msg}`);
  }
})));

log("PROBE-COMPLETE");
