/**
 * Hand-maintained database types matching supabase/migrations/0001_fast_schema.sql.
 * Kept in sync by tests/db-security.test.ts, which asserts both the tables
 * listed here and the RLS policy blocks exist in the migration.
 */

export type Presence = "online" | "away" | "offline";
export type FamilyRole = "owner" | "admin" | "member";
export type MessageKind = "text" | "image" | "system";
export type PrecisionLevel = "approximate" | "precise";
export type ShareStatus = "active" | "paused";
export type CheckinStatus = "safe" | "on_my_way" | "arrived" | "need_help";
export type SafeArrivalStatus = "active" | "arrived" | "expired" | "escalated";
export type NotificationKind =
  | "new_message"
  | "family_invitation"
  | "family_message"
  | "checkin"
  | "safe_arrival"
  | "location_change"
  | "safety_alert"
  | "system";

export type Profile = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  last_seen_at: string;
  presence: Presence;
  location_sharing_enabled: boolean;
  privacy_settings: Record<string, unknown>;
};

/** The only projection of a profile other users can ever see. */
export type PublicProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  presence: Presence;
  last_seen_at: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  type: "direct" | "family";
  family_id: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  last_read_at: string;
  muted_until: string | null;
  archived: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  image_path: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type Family = {
  id: string;
  name: string;
  avatar_url: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  /** Messages pinned by family admins (migration 0002). */
  pinned_message_ids: string[];
};

export type FamilyMember = {
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
};

export type FamilyInvite = {
  id: string;
  family_id: string;
  code: string;
  created_by: string;
  invitee_id: string | null;
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
  expires_at: string;
};

export type LocationRow = {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  precision_level: PrecisionLevel;
  shared_at: string;
  expires_at: string;
};

export type LocationShare = {
  id: string;
  user_id: string;
  family_id: string;
  precision_level: PrecisionLevel;
  status: ShareStatus;
  started_at: string;
  expires_at: string | null;
};

export type Checkin = {
  id: string;
  user_id: string;
  family_id: string;
  status: CheckinStatus;
  note: string | null;
  created_at: string;
};

export type SafeArrival = {
  id: string;
  user_id: string;
  destination_label: string;
  expected_at: string;
  trusted_contact_ids: string[];
  status: SafeArrivalStatus;
  created_at: string;
  resolved_at: string | null;
};

export type SafetyPlan = {
  id: string;
  owner_id: string;
  title: string;
  sections: Record<string, string>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type AiConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
};

export type AiMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/**
 * Loose database shape for the typed supabase-js client. Helper types keep
 * every table uniform: Row / Insert / Update / Relationships — the shape
 * supabase-js's generics require (a missing Relationships entry collapses
 * inference to `never`, so it is provided for every relation).
 */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type View<Row> = { Row: Row; Relationships: [] };

type Fn<Args, Returns> = { Args: Args; Returns: Returns };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      conversations: Table<Conversation>;
      conversation_members: Table<ConversationMember>;
      messages: Table<Message>;
      message_reactions: Table<{
        message_id: string;
        user_id: string;
        emoji: string;
        created_at: string;
      }>;
      message_reads: Table<{
        message_id: string;
        user_id: string;
        read_at: string;
      }>;
      typing_presence: Table<{
        conversation_id: string;
        user_id: string;
        typing: boolean;
        updated_at: string;
      }>;
      families: Table<Family>;
      family_members: Table<FamilyMember>;
      family_invites: Table<FamilyInvite>;
      locations: Table<LocationRow>;
      location_shares: Table<LocationShare>;
      location_share_viewers: Table<{ share_id: string; viewer_id: string }>;
      checkins: Table<Checkin>;
      safe_arrivals: Table<SafeArrival>;
      safety_plans: Table<SafetyPlan>;
      safety_plan_shares: Table<{
        plan_id: string;
        viewer_id: string;
        created_at: string;
      }>;
      safety_plan_contacts: Table<{
        id: string;
        plan_id: string;
        name: string;
        phone: string | null;
        relation: string | null;
        created_at: string;
      }>;
      trusted_contacts: Table<{
        owner_id: string;
        contact_id: string;
        label: string | null;
        created_at: string;
      }>;
      notifications: Table<AppNotification>;
      reports: Table<{
        id: string;
        reporter_id: string;
        target_type: "message" | "user" | "family";
        target_id: string;
        reason: string;
        details: string | null;
        status: "open" | "reviewed" | "resolved";
        created_at: string;
      }>;
      blocks: Table<{
        blocker_id: string;
        blocked_id: string;
        created_at: string;
      }>;
      ai_conversations: Table<AiConversation>;
      ai_messages: Table<AiMessage>;
    };
    Views: {
      profiles_public: View<PublicProfile>;
    };
    Functions: {
      search_profile_by_phone: Fn<
        { query: string },
        { id: string; display_name: string; avatar_url: string | null }[]
      >;
      start_direct_conversation: Fn<{ other: string }, string>;
      create_family: Fn<{ name: string; avatar_url?: string | null }, string>;
      join_family_by_code: Fn<{ code: string }, string>;
    };
  };
};
