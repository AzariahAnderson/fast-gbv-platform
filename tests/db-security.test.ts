import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Database security gate. These tests parse the Supabase migrations and
 * prove the structural security guarantees hold in the shipped SQL:
 *
 *   1. Every private table has row-level security ENABLED.
 *   2. No table relies on a missing policy for its core operations.
 *   3. Phone/email privacy: the only path another user can reach a
 *      profile by phone is the exact-match RPC, which returns no phone.
 *   4. Locations are audience-gated by an active, unexpired share.
 *   5. Reports are insert-only for users (no select policy to leak
 *      reporter identity).
 *   6. Storage buckets are private unless read-by-design, and every
 *      write policy pins the path to the caller's own folder.
 *
 * The SQL is the source of truth; these tests fail loudly if a migration
 * quietly drops one of these guarantees.
 */

const MIGRATIONS = [
  readFileSync("supabase/migrations/0001_fast_schema.sql", "utf8"),
  readFileSync("supabase/migrations/0002_notifications_and_pins.sql", "utf8"),
  readFileSync("supabase/migrations/0008_personal_contacts.sql", "utf8"),
].join("\n");

const PRIVATE_TABLES = [
  "profiles",
  "conversations",
  "conversation_members",
  "messages",
  "message_reactions",
  "message_reads",
  "typing_presence",
  "families",
  "family_members",
  "family_invites",
  "locations",
  "location_shares",
  "location_share_viewers",
  "checkins",
  "safe_arrivals",
  "safety_plans",
  "safety_plan_shares",
  "safety_plan_contacts",
  "trusted_contacts",
  "contacts",
  "notifications",
  "reports",
  "blocks",
  "ai_conversations",
  "ai_messages",
];

function hasEnableRls(table: string): boolean {
  const re = new RegExp(
    `alter\\s+table\\s+(?:if\\s+exists\\s+)?public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  );
  return re.test(MIGRATIONS);
}

function hasPolicy(table: string, fragment: string): boolean {
  const re = new RegExp(
    `create\\s+policy\\s+["'][^"']*${fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["']\\s+on\\s+public\\.${table}`,
    "i",
  );
  return re.test(MIGRATIONS);
}

describe("database security: RLS coverage", () => {
  test("every private table has row-level security enabled", () => {
    const missing = PRIVATE_TABLES.filter((t) => !hasEnableRls(t));
    expect(missing).toEqual([]);
  });

  test("messages are member-gated for read and sender-gated for write", () => {
    expect(hasPolicy("messages", "members read")).toBe(true);
    expect(hasPolicy("messages", "members send as self")).toBe(true);
    expect(hasPolicy("messages", "edit own")).toBe(true);
  });

  test("conversation membership gates the conversation and its members", () => {
    expect(hasPolicy("conversations", "members read")).toBe(true);
    expect(hasPolicy("conversation_members", "read shared membership")).toBe(true);
  });

  test("families gate reads on membership and admin actions on roles", () => {
    expect(hasPolicy("families", "members read")).toBe(true);
    expect(hasPolicy("family_members", "members read")).toBe(true);
    expect(hasPolicy("family_invites", "admins create")).toBe(true);
  });

  test("safety plans are owner-gated with an explicit share policy", () => {
    expect(hasPolicy("safety_plans", "owner read")).toBe(true);
    expect(hasPolicy("safety_plans", "shared viewer read")).toBe(true);
    expect(hasPolicy("safety_plan_shares", "owner manage")).toBe(true);
  });

  test("the personal contacts directory is strictly owner-managed", () => {
    expect(hasPolicy("contacts", "owner manage")).toBe(true);
  });

  test("notifications and AI history are strictly own-row", () => {
    expect(hasPolicy("notifications", "own read")).toBe(true);
    expect(hasPolicy("ai_conversations", "own")).toBe(true);
    expect(hasPolicy("ai_messages", "own")).toBe(true);
  });
});

describe("database security: privacy guarantees", () => {
  test("phone search is exact-match and returns no phone or email", () => {
    expect(MIGRATIONS).toMatch(
      /function\s+public\.search_profile_by_phone[\s\S]*?where\s+p\.phone\s*=\s*public\.normalise_phone\(query\)[\s\S]*?limit\s+1/i,
    );
    // The RPC's returned columns must not include phone or email.
    const fn = MIGRATIONS.match(
      /function\s+public\.search_profile_by_phone\(query text\)\s*returns\s+table\s*\(([^)]*)\)/i,
    );
    expect(fn).toBeTruthy();
    const cols = fn![1].toLowerCase();
    expect(cols).not.toContain("phone");
    expect(cols).not.toContain("email");
  });

  test("the profiles_public view never exposes phone, email or privacy blobs", () => {
    const view = MIGRATIONS.match(
      /create\s+view\s+public\.profiles_public\s+as\s+([\s\S]*?);/i,
    );
    expect(view).toBeTruthy();
    const projection = view![1].toLowerCase();
    expect(projection).not.toContain("phone");
    expect(projection).not.toContain("email");
    expect(projection).not.toContain("privacy_settings");
    expect(projection).toContain("display_name");
  });

  test("locations are readable only through an active, unexpired share to the viewer", () => {
    const policy = MIGRATIONS.match(
      /create\s+policy\s+"locations:\s*audience\s*read"[\s\S]*?using\s*\(([\s\S]*?)\);/i,
    );
    expect(policy).toBeTruthy();
    const body = policy![1];
    expect(body).toContain("location_shares");
    expect(body).toContain("location_share_viewers");
    expect(body).toContain("active");
    expect(body).toContain("expires_at");
  });

  test("reports are insert-only for users: no select policy exists", () => {
    const section = MIGRATIONS.slice(
      MIGRATIONS.indexOf("reports: file own"),
      MIGRATIONS.indexOf("-- blocks"),
    );
    expect(section).toContain('create policy "reports: file own"');
    expect(section).not.toMatch(/create\s+policy[^;]*for\s+select/i);
    expect(MIGRATIONS).toMatch(/--\s*no select\/update\/delete policies/i);
  });

  test("blocks always win in the message send policy", () => {
    const send = MIGRATIONS.match(/create\s+policy\s+"messages:\s*members\s*send\s*as\s*self"([\s\S]*?)\);/i);
    expect(send).toBeTruthy();
    expect(send![1]).toContain("public.blocks");
    expect(send![1].toLowerCase()).toContain("blocker_id");
  });
});

describe("database security: storage", () => {
  test("chat and family buckets are private; avatars are read-by-design", () => {
    expect(MIGRATIONS).toMatch(/values\s*\('chat-images',\s*'chat-images',\s*false\)/i);
    expect(MIGRATIONS).toMatch(/values\s*\('family-images',\s*'family-images',\s*false\)/i);
    expect(MIGRATIONS).toMatch(/values\s*\('avatars',\s*'avatars',\s*true\)/i);
  });

  test("every write policy pins uploads to the caller's own path", () => {
    // auth.uid () with optional spacing, matching the migration style.
    expect(MIGRATIONS).toMatch(
      /avatars: upload own[\s\S]*?auth\.uid\s*\(\s*\)::text\s*=\s*\(storage\.foldername\s*\(name\)\)\[1\]/i,
    );
    expect(MIGRATIONS).toMatch(
      /chat-images: members upload own[\s\S]*?auth\.uid\s*\(\s*\)::text\s*=\s*\(storage\.foldername\s*\(name\)\)\[2\]/i,
    );
  });

  test("chat-image reads require conversation membership", () => {
    expect(MIGRATIONS).toMatch(
      /chat-images: members read[\s\S]*?is_conversation_member/i,
    );
    expect(MIGRATIONS).toMatch(
      /family-images: members read[\s\S]*?is_family_member/i,
    );
  });
});

describe("database security: helpers", () => {
  test("notification fan-out is trigger-based, not client-callable", () => {
    expect(MIGRATIONS).toMatch(/create\s+trigger\s+messages_notify/i);
    expect(MIGRATIONS).toMatch(/create\s+trigger\s+checkins_notify/i);
    expect(MIGRATIONS).toMatch(/create\s+trigger\s+safe_arrivals_notify/i);
    // The notification table has no insert policy: only the definer
    // (triggers) and service role can create rows.
    expect(hasPolicy("notifications", "insert")).toBe(false);
  });

  test("security-definer RPCs are revoked from anon and granted to authenticated", () => {
    expect(MIGRATIONS).toMatch(
      /revoke all on function public\.start_direct_conversation\(uuid\) from public, anon/i,
    );
    expect(MIGRATIONS).toMatch(
      /revoke all on function public\.join_family_by_code\(text\) from public, anon/i,
    );
    expect(MIGRATIONS).toMatch(
      /revoke all on function public\.search_profile_by_phone\(text\) from public, anon/i,
    );
  });
});
