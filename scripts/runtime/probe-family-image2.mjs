/**
 * Confirm the family-image leak source: fresh object never downloaded before,
 * fetched by a removed member. Run: bun scripts/runtime/probe-family-image2.mjs
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

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63640000000600023081d2f4500000000049454e44ae426082",
  "hex",
);
const pngFile = new File([PNG], "p.png", { type: "image/png" });

const { data: fams } = await A.from("families").select("id").eq("name", "Storage Test Family").limit(1);
const famId = fams[0].id;

// B must not be a member now.
await A.from("family_members").delete().eq("family_id", famId).eq("user_id", (await B.auth.getUser()).data.user.id);
const { data: stillMember } = await B.from("family_members").select("role").eq("family_id", famId).maybeSingle();
console.log("B membership row:", stillMember ?? "none (removed)");

// Fresh object, never fetched by anyone.
const freshPath = `${famId}/${(await A.auth.getUser()).data.user.id}/fresh-${Date.now()}.png`;
await A.storage.from("family-images").upload(freshPath, pngFile, { upsert: true });

const { data: blob } = await B.storage.from("family-images").download(freshPath);
console.log("B (removed) downloads FRESH object:", blob ? "LEAK — policy/caching hole" : "blocked (policy works; earlier leak was CDN cache)");

// And the previously downloaded object once more (cache check).
const { data: blob2 } = await B.storage.from("family-images").download(`${famId}/${(await A.auth.getUser()).data.user.id}/probe.png`);
console.log("B (removed) downloads PREVIOUSLY fetched object:", blob2 ? "served from cache (cache leak)" : "blocked");
process.exit(0);
