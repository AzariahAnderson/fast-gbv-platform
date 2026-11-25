#!/usr/bin/env node
/**
 * Production environment variable audit. Run locally or in any CI:
 *
 *     node scripts/check-env.mjs
 *     bun run check:env
 *
 * Prints which of the production variables are present, which are
 * missing, and exits non-zero only when required variables are missing
 * AND --strict is passed (so a local run is always safe). Values are
 * NEVER printed — only presence, name and scope.
 */

const REQUIRED = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", scope: "public (build + runtime)", note: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", scope: "public (build + runtime)", note: "Supabase publishable anon key — safe for the browser by design" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", scope: "SERVER-ONLY", note: "bypasses RLS; used by AI persistence and notification fan-out" },
  { name: "GEMINI_API_KEY", scope: "SERVER-ONLY", note: "FAST Guide + live data generation" },
  { name: "NEXT_PUBLIC_SITE_URL", scope: "public (build + runtime)", note: "canonical origin for metadata, sitemap, robots, structured data" },
  { name: "CRON_SECRET", scope: "SERVER-ONLY", note: "bearer token Vercel cron sends to /api/refresh" },
];

const OPTIONAL = [
  { name: "GEMINI_MODEL", scope: "SERVER-ONLY", note: "defaults to gemini-flash-latest" },
  { name: "GEMINI_BASE_URL", scope: "SERVER-ONLY", note: "defaults to the Google API endpoint" },
  { name: "NEXT_PUBLIC_MAP_STYLE_URL", scope: "public (build + runtime)", note: "defaults to the shipped map style" },
];

const OBSOLETE = [
  { name: "NEXT_PUBLIC_PHONE_AUTH_ENABLED", reason: "the phone verification-code flow was removed in v1.1.4; setting it has no effect" },
];

const loadDotEnv = () => {
  try {
    for (const line of require("node:fs").readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env file — that is fine outside local development */
  }
};
loadDotEnv();

const strict = process.argv.includes("--strict");
let missing = 0;

console.log("FAST production environment audit\n");

console.log("Required for production:");
for (const v of REQUIRED) {
  const present = Boolean(process.env[v.name] && process.env[v.name].length > 0);
  if (!present) missing += 1;
  console.log(`  ${present ? "PRESENT" : "MISSING"}  ${v.name}  [${v.scope}] — ${v.note}`);
}

console.log("\nOptional (safe defaults exist):");
for (const v of OPTIONAL) {
  const present = Boolean(process.env[v.name] && process.env[v.name].length > 0);
  console.log(`  ${present ? "set    " : "default"}  ${v.name}  — ${v.note}`);
}

console.log("\nObsolete (do not set):");
for (const v of OBSOLETE) {
  const present = Boolean(process.env[v.name]);
  console.log(`  ${present ? "STILL SET — remove it" : "not set (correct)"}  ${v.name} — ${v.reason}`);
}

if (strict && missing > 0) {
  console.error(`\nFAIL: ${missing} required variable(s) missing`);
  process.exit(1);
}
console.log(
  missing === 0
    ? "\nAll required production variables are present."
    : `\n${missing} required production variable(s) missing. Set them on the deployment platform (Vercel) before going live.`,
);
