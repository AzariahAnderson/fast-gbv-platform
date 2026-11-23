-- ============================================================================
-- FAST — Family Assistance & Safety Technology
-- Schema 0001: core product tables, indexes, security-definer helpers,
-- row-level security and storage policies.
--
-- Design rules baked in:
--   * Every private table has RLS enabled. No exceptions.
--   * Phone numbers and emails are never readable by other users. A
--     security-definer RPC allows exact-match phone search and returns
--     only display-safe columns.
--   * Location data is single-row-per-user, expires, and is readable only
--     by the explicit audience of an active share. No history tables.
--   * Safety plans are private by default; sharing is an explicit row.
--   * Blockers always win: a blocked user cannot message, see presence in
--     a conversation with the blocker, or start a new conversation.
--   * Reports never expose the reporter to other users (insert-only).
--
-- Run in the Supabase SQL editor (or `supabase db push`) as the owner.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Friend',
  phone text unique,                -- normalised E.164 (+27...), nullable
  email text,                       -- mirror of auth email, own-row only
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  presence text not null default 'offline' check (presence in ('online','away','offline')),
  location_sharing_enabled boolean not null default false,
  privacy_settings jsonb not null default '{}'::jsonb
);

alter table public.profiles enable row level security;

-- Own row only. Everyone else uses the public view below.
drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select using (auth.uid () = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid () = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid () = id)
  with check (auth.uid () = id);

-- Safe projection: identity + presence, never phone/email/privacy blobs.
-- Owner-rights view on purpose: it is the ONLY way other users see you.
drop view if exists public.profiles_public;
create view public.profiles_public as
  select id, display_name, avatar_url, bio, presence, last_seen_at, created_at
  from public.profiles;

grant select on public.profiles_public to authenticated;

-- Phone normalisation must exist before any language-sql function body that
-- references it: SQL functions are validated at creation time, so a forward
-- reference here is a genuine incompatibility (reported by Postgres itself).
create or replace function public.normalise_phone(input text)
returns text
language sql immutable
as $$
  -- Keep the leading + and digits only; a South African 0-prefix becomes +27.
  select case
    when left(clean, 1) = '+' then clean
    when left(clean, 2) = '27' then '+' || clean
    when left(clean, 1) = '0' then '+27' || right(clean, length(clean) - 1)
    else clean
  end
  from (select regexp_replace(coalesce(input, ''), '[^0-9+]', '', 'g') as clean) s
  where clean <> '';
$$;

-- Exact-match phone search. Never a listing, never a prefix scan.
create or replace function public.search_profile_by_phone(query text)
returns table (id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where p.phone = public.normalise_phone(query)
    and p.id <> auth.uid ()
  limit 1;
$$;

revoke all on function public.search_profile_by_phone(text) from public, anon;
grant execute on function public.search_profile_by_phone(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. CONVERSATIONS + MEMBERS + MESSAGES
-- ----------------------------------------------------------------------------

-- families must be created before conversations: conversations.family_id
-- carries a foreign key to it (Postgres validates references at create time).
create table if not exists public.families (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  avatar_url text,
  invite_code text not null unique default encode(gen_random_bytes(9), 'base64'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid (),
  type text not null check (type in ('direct','family')),
  family_id uuid references public.families (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted_until timestamptz,
  archived boolean not null default false,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid (),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','image','system')),
  body text,
  image_path text,
  reply_to_id uuid references public.messages (id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.typing_presence (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists messages_by_conversation
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_by_conversation_id
  on public.messages (conversation_id, id desc);
create index if not exists message_reads_by_user
  on public.message_reads (user_id);
create index if not exists members_by_user
  on public.conversation_members (user_id);
create index if not exists conversations_last_message
  on public.conversations (last_message_at desc);

-- ----------------------------------------------------------------------------
-- 3. FAMILIES (members + invites; the families table itself is created in
--    section 2 because conversations.family_id references it)
-- ----------------------------------------------------------------------------

create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null references public.families (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create index if not exists family_members_by_user
  on public.family_members (user_id);
create index if not exists family_invites_by_family
  on public.family_invites (family_id, status);

-- ----------------------------------------------------------------------------
-- 4. LOCATION — minimal, expiring, consent-first
-- ----------------------------------------------------------------------------

-- One current fix per user. Not history: the row is overwritten and expires.
create table if not exists public.locations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision,
  precision_level text not null default 'approximate'
    check (precision_level in ('approximate','precise')),
  shared_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.location_shares (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  precision_level text not null default 'approximate'
    check (precision_level in ('approximate','precise')),
  status text not null default 'active' check (status in ('active','paused')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,             -- null = until turned off
  unique (user_id, family_id)
);

-- The explicit audience: only these viewers may read the location row.
create table if not exists public.location_share_viewers (
  share_id uuid not null references public.location_shares (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  primary key (share_id, viewer_id)
);

create index if not exists location_shares_by_family
  on public.location_shares (family_id, status);
create index if not exists locations_by_expiry
  on public.locations (expires_at);

-- ----------------------------------------------------------------------------
-- 5. CHECK-INS + SAFE ARRIVAL
-- ----------------------------------------------------------------------------

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  status text not null check (status in ('safe','on_my_way','arrived','need_help')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists checkins_by_family
  on public.checkins (family_id, created_at desc);
create index if not exists checkins_by_user
  on public.checkins (user_id, created_at desc);

create table if not exists public.safe_arrivals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  destination_label text not null,
  expected_at timestamptz not null,
  trusted_contact_ids uuid[] not null default '{}',
  status text not null default 'active'
    check (status in ('active','arrived','expired','escalated')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 6. SAFETY PLANS — private by default
-- ----------------------------------------------------------------------------

create table if not exists public.safety_plans (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My safety plan',
  sections jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_plan_shares (
  plan_id uuid not null references public.safety_plans (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, viewer_id)
);

create table if not exists public.safety_plan_contacts (
  id uuid primary key default gen_random_uuid (),
  plan_id uuid not null references public.safety_plans (id) on delete cascade,
  name text not null,
  phone text,
  relation text,
  created_at timestamptz not null default now()
);

create table if not exists public.trusted_contacts (
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references auth.users (id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id)
);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATIONS, MODERATION, AI
-- ----------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'new_message','family_invitation','family_message','checkin',
    'safe_arrival','location_change','safety_alert','system'
  )),
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_by_user
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread
  on public.notifications (user_id)
  where read_at is null;

-- Insert-only for users: a reporter can file but never re-read (identity
-- stays private); service role reviews via the dashboard.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid (),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('message','user','family')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Private conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid (),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_by_conversation
  on public.ai_messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- 8. SECURITY-DEFINER HELPERS
-- ----------------------------------------------------------------------------

create or replace function public.is_conversation_member(conv uuid, uid uuid default auth.uid ())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = uid
  );
$$;

create or replace function public.is_family_member(fam uuid, uid uuid default auth.uid ())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fam and m.user_id = uid
  );
$$;

create or replace function public.family_role(fam uuid, uid uuid default auth.uid ())
returns text
language sql stable security definer set search_path = public
as $$
  select m.role from public.family_members m
  where m.family_id = fam and m.user_id = uid
  limit 1;
$$;

create or replace function public.start_direct_conversation(other uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid ();
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other = me then raise exception 'cannot message yourself'; end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = me and blocked_id = other)
       or (blocker_id = other and blocked_id = me)
  ) then
    raise exception 'conversation unavailable';
  end if;

  select c.id into conv
  from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = me
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = other
  where c.type = 'direct'
  limit 1;

  if conv is not null then return conv; end if;

  insert into public.conversations (type, created_by)
  values ('direct', me) returning id into conv;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (conv, me, 'owner'), (conv, other, 'member');

  return conv;
end;
$$;

revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

create or replace function public.create_family(name text, avatar_url text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid ();
  fam uuid;
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(name), '') = '' then raise exception 'family needs a name'; end if;

  insert into public.families (name, avatar_url, created_by)
  values (btrim(name), avatar_url, me) returning id into fam;

  insert into public.family_members (family_id, user_id, role)
  values (fam, me, 'owner');

  insert into public.conversations (type, family_id, created_by)
  values ('family', fam, me) returning id into conv;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (conv, me, 'owner');

  return fam;
end;
$$;

revoke all on function public.create_family(text, text) from public, anon;
grant execute on function public.create_family(text, text) to authenticated;

create or replace function public.join_family_by_code(code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid ();
  inv public.family_invites;
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select * into inv from public.family_invites
  where family_invites.code = code and status = 'pending' and expires_at > now()
  limit 1;
  if inv is null then raise exception 'invite not found or expired'; end if;
  if inv.invitee_id is not null and inv.invitee_id <> me then
    raise exception 'invite not found or expired';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (inv.family_id, me, 'member')
  on conflict (family_id, user_id) do nothing;

  update public.family_invites
  set status = 'accepted', invitee_id = me
  where id = inv.id;

  select id into conv from public.conversations
  where type = 'family' and family_id = inv.family_id limit 1;
  if conv is not null then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (conv, me, 'member')
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return inv.family_id;
end;
$$;

revoke all on function public.join_family_by_code(text) from public, anon;
grant execute on function public.join_family_by_code(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.message_reactions    enable row level security;
alter table public.message_reads        enable row level security;
alter table public.typing_presence      enable row level security;
alter table public.families             enable row level security;
alter table public.family_members       enable row level security;
alter table public.family_invites       enable row level security;
alter table public.locations            enable row level security;
alter table public.location_shares      enable row level security;
alter table public.location_share_viewers enable row level security;
alter table public.checkins             enable row level security;
alter table public.safe_arrivals        enable row level security;
alter table public.safety_plans         enable row level security;
alter table public.safety_plan_shares   enable row level security;
alter table public.safety_plan_contacts enable row level security;
alter table public.trusted_contacts     enable row level security;
alter table public.notifications        enable row level security;
alter table public.reports              enable row level security;
alter table public.blocks               enable row level security;
alter table public.ai_conversations     enable row level security;
alter table public.ai_messages          enable row level security;

-- conversations: members read.
drop policy if exists "conversations: members read" on public.conversations;
create policy "conversations: members read" on public.conversations
  for select using (public.is_conversation_member (id));

drop policy if exists "conversations: insert direct own" on public.conversations;
create policy "conversations: insert direct own" on public.conversations
  for insert with check (type = 'direct' and created_by = auth.uid ());

drop policy if exists "conversations: family admins update" on public.conversations;
create policy "conversations: family admins update" on public.conversations
  for update using (
    type = 'family' and family_id is not null
    and public.family_role (family_id) in ('owner','admin')
  );

-- conversation_members
drop policy if exists "members: read shared membership" on public.conversation_members;
create policy "members: read shared membership" on public.conversation_members
  for select using (
    user_id = auth.uid ()
    or public.is_conversation_member (conversation_id)
  );

drop policy if exists "members: join direct" on public.conversation_members;
create policy "members: join direct" on public.conversation_members
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.type = 'direct' and c.created_by = auth.uid ()
    )
    and user_id <> auth.uid ()
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid () and b.blocked_id = user_id)
         or (b.blocker_id = user_id and b.blocked_id = auth.uid ())
    )
  );

drop policy if exists "members: manage own membership" on public.conversation_members;
create policy "members: manage own membership" on public.conversation_members
  for update using (user_id = auth.uid ()) with check (user_id = auth.uid ());

drop policy if exists "members: leave or admins remove" on public.conversation_members;
create policy "members: leave or admins remove" on public.conversation_members
  for delete using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.type = 'family'
        and public.family_role (c.family_id) in ('owner','admin')
    )
  );

-- messages
drop policy if exists "messages: members read" on public.messages;
create policy "messages: members read" on public.messages
  for select using (public.is_conversation_member (conversation_id));

drop policy if exists "messages: members send as self" on public.messages;
create policy "messages: members send as self" on public.messages
  for insert with check (
    sender_id = auth.uid ()
    and public.is_conversation_member (conversation_id)
    and not exists (
      select 1 from public.conversation_members other
      where other.conversation_id = conversation_id
        and other.user_id <> auth.uid ()
        and exists (
          select 1 from public.blocks b
          where (b.blocker_id = other.user_id and b.blocked_id = auth.uid ())
             or (b.blocker_id = auth.uid () and b.blocked_id = other.user_id)
        )
    )
  );

drop policy if exists "messages: edit own" on public.messages;
create policy "messages: edit own" on public.messages
  for update using (sender_id = auth.uid ()) with check (sender_id = auth.uid ());

drop policy if exists "messages: soft-delete own" on public.messages;
create policy "messages: soft-delete own" on public.messages
  for delete using (sender_id = auth.uid ());

-- reactions / reads / typing
drop policy if exists "reactions: members read" on public.message_reactions;
create policy "reactions: members read" on public.message_reactions
  for select using (public.is_conversation_member (
    (select conversation_id from public.messages m where m.id = message_id)));

drop policy if exists "reactions: members react as self" on public.message_reactions;
create policy "reactions: members react as self" on public.message_reactions
  for insert with check (
    user_id = auth.uid ()
    and public.is_conversation_member (
      (select conversation_id from public.messages m where m.id = message_id))
  );

drop policy if exists "reactions: own unreact" on public.message_reactions;
create policy "reactions: own unreact" on public.message_reactions
  for delete using (user_id = auth.uid ());

drop policy if exists "reads: members read" on public.message_reads;
create policy "reads: members read" on public.message_reads
  for select using (public.is_conversation_member (
    (select conversation_id from public.messages m where m.id = message_id)));

drop policy if exists "reads: mark own" on public.message_reads;
create policy "reads: mark own" on public.message_reads
  for insert with check (user_id = auth.uid ());

drop policy if exists "typing: members read" on public.typing_presence;
create policy "typing: members read" on public.typing_presence
  for select using (public.is_conversation_member (conversation_id));

drop policy if exists "typing: own row insert" on public.typing_presence;
create policy "typing: own row insert" on public.typing_presence
  for insert with check (user_id = auth.uid ());

drop policy if exists "typing: own row update" on public.typing_presence;
create policy "typing: own row update" on public.typing_presence
  for update using (user_id = auth.uid ()) with check (user_id = auth.uid ());

-- families
drop policy if exists "families: members read" on public.families;
create policy "families: members read" on public.families
  for select using (public.is_family_member (id));

drop policy if exists "families: admins update" on public.families;
create policy "families: admins update" on public.families
  for update using (public.family_role (id) in ('owner','admin'))
  with check (public.family_role (id) in ('owner','admin'));

drop policy if exists "families: owner deletes" on public.families;
create policy "families: owner deletes" on public.families
  for delete using (created_by = auth.uid ());

-- family_members
drop policy if exists "family_members: members read" on public.family_members;
create policy "family_members: members read" on public.family_members
  for select using (public.is_family_member (family_id));

drop policy if exists "family_members: self join via accepted invite" on public.family_members;
create policy "family_members: self join via accepted invite" on public.family_members
  for insert with check (
    user_id = auth.uid ()
    and exists (
      select 1 from public.family_invites i
      where i.family_id = family_id
        and i.status = 'accepted'
        and i.invitee_id = auth.uid ()
        and i.expires_at > now()
    )
  );

drop policy if exists "family_members: leave own" on public.family_members;
create policy "family_members: leave own" on public.family_members
  for delete using (user_id = auth.uid ());

drop policy if exists "family_members: admins manage roles" on public.family_members;
create policy "family_members: admins manage roles" on public.family_members
  for update using (
    public.family_role (family_id) in ('owner','admin')
    and user_id <> auth.uid ()
  );

drop policy if exists "family_members: admins remove others" on public.family_members;
create policy "family_members: admins remove others" on public.family_members
  for delete using (
    user_id <> auth.uid ()
    and public.family_role (family_id) in ('owner','admin')
  );

-- family_invites: admins manage within their family; an invitee may read a
-- pending invite addressed to them (the join RPC also guards this).
drop policy if exists "invites: admins read" on public.family_invites;
create policy "invites: admins read" on public.family_invites
  for select using (public.family_role (family_id) in ('owner','admin'));

drop policy if exists "invites: invitee reads own" on public.family_invites;
create policy "invites: invitee reads own" on public.family_invites
  for select using (
    status = 'pending' and invitee_id = auth.uid () and expires_at > now()
  );

drop policy if exists "invites: admins create" on public.family_invites;
create policy "invites: admins create" on public.family_invites
  for insert with check (
    created_by = auth.uid ()
    and public.family_role (family_id) in ('owner','admin')
  );

drop policy if exists "invites: admins revoke" on public.family_invites;
create policy "invites: admins revoke" on public.family_invites
  for update using (public.family_role (family_id) in ('owner','admin'))
  with check (public.family_role (family_id) in ('owner','admin'));

-- locations: own row always; viewers of an active, unexpired share.
drop policy if exists "locations: own row" on public.locations;
create policy "locations: own row" on public.locations
  for select using (user_id = auth.uid ());

drop policy if exists "locations: audience read" on public.locations;
create policy "locations: audience read" on public.locations
  for select using (
    exists (
      select 1
      from public.location_shares s
      join public.location_share_viewers v on v.share_id = s.id
      where s.user_id = locations.user_id
        and s.status = 'active'
        and (s.expires_at is null or s.expires_at > now())
        and v.viewer_id = auth.uid ()
        and locations.expires_at > now()
    )
  );

drop policy if exists "locations: write own" on public.locations;
create policy "locations: write own" on public.locations
  for insert with check (user_id = auth.uid ());
create policy "locations: update own" on public.locations
  for update using (user_id = auth.uid ()) with check (user_id = auth.uid ());
create policy "locations: delete own" on public.locations
  for delete using (user_id = auth.uid ());

-- location_shares
drop policy if exists "shares: owner manage" on public.location_shares;
create policy "shares: owner manage" on public.location_shares
  for all using (user_id = auth.uid ()) with check (
    user_id = auth.uid ()
    and public.is_family_member (family_id, user_id)
  );

drop policy if exists "shares: viewers read" on public.location_shares;
create policy "shares: viewers read" on public.location_shares
  for select using (
    exists (
      select 1 from public.location_share_viewers v
      where v.share_id = id and v.viewer_id = auth.uid ()
    )
  );

drop policy if exists "share_viewers: owner manage" on public.location_share_viewers;
create policy "share_viewers: owner manage" on public.location_share_viewers
  for all using (
    exists (
      select 1 from public.location_shares s
      where s.id = share_id and s.user_id = auth.uid ()
    )
  ) with check (
    exists (
      select 1 from public.location_shares s
      where s.id = share_id and s.user_id = auth.uid ()
    )
  );

drop policy if exists "share_viewers: viewer reads own grant" on public.location_share_viewers;
create policy "share_viewers: viewer reads own grant" on public.location_share_viewers
  for select using (viewer_id = auth.uid ());

-- checkins: own; family sees its members' check-ins
drop policy if exists "checkins: own and family read" on public.checkins;
create policy "checkins: own and family read" on public.checkins
  for select using (
    user_id = auth.uid () or public.is_family_member (family_id)
  );

drop policy if exists "checkins: write own" on public.checkins;
create policy "checkins: write own" on public.checkins
  for insert with check (user_id = auth.uid () and public.is_family_member (family_id));

drop policy if exists "checkins: delete own" on public.checkins;
create policy "checkins: delete own" on public.checkins
  for delete using (user_id = auth.uid ());

-- safe_arrivals: owner + explicitly trusted contacts
drop policy if exists "safe_arrivals: owner read" on public.safe_arrivals;
create policy "safe_arrivals: owner read" on public.safe_arrivals
  for select using (user_id = auth.uid ());

drop policy if exists "safe_arrivals: trusted read" on public.safe_arrivals;
create policy "safe_arrivals: trusted read" on public.safe_arrivals
  for select using (auth.uid () = any (trusted_contact_ids));

drop policy if exists "safe_arrivals: write own" on public.safe_arrivals;
create policy "safe_arrivals: write own" on public.safe_arrivals
  for insert with check (user_id = auth.uid ());
create policy "safe_arrivals: update own" on public.safe_arrivals
  for update using (user_id = auth.uid ()) with check (user_id = auth.uid ());
create policy "safe_arrivals: delete own" on public.safe_arrivals
  for delete using (user_id = auth.uid ());

-- safety_plans: owner only, unless explicitly shared
drop policy if exists "plans: owner read" on public.safety_plans;
create policy "plans: owner read" on public.safety_plans
  for select using (owner_id = auth.uid ());

drop policy if exists "plans: shared viewer read" on public.safety_plans;
create policy "plans: shared viewer read" on public.safety_plans
  for select using (
    exists (
      select 1 from public.safety_plan_shares v
      where v.plan_id = id and v.viewer_id = auth.uid ()
    )
  );

drop policy if exists "plans: owner write" on public.safety_plans;
create policy "plans: owner write" on public.safety_plans
  for insert with check (owner_id = auth.uid ());
create policy "plans: owner update" on public.safety_plans
  for update using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
create policy "plans: owner delete" on public.safety_plans
  for delete using (owner_id = auth.uid ());

drop policy if exists "plan_shares: owner manage" on public.safety_plan_shares;
create policy "plan_shares: owner manage" on public.safety_plan_shares
  for all using (
    exists (
      select 1 from public.safety_plans p
      where p.id = plan_id and p.owner_id = auth.uid ()
    )
  ) with check (
    exists (
      select 1 from public.safety_plans p
      where p.id = plan_id and p.owner_id = auth.uid ()
    )
  );

drop policy if exists "plan_shares: viewer reads own grant" on public.safety_plan_shares;
create policy "plan_shares: viewer reads own grant" on public.safety_plan_shares
  for select using (viewer_id = auth.uid ());

drop policy if exists "plan_contacts: owner manage" on public.safety_plan_contacts;
create policy "plan_contacts: owner manage" on public.safety_plan_contacts
  for all using (
    exists (
      select 1 from public.safety_plans p
      where p.id = plan_id and p.owner_id = auth.uid ()
    )
  ) with check (
    exists (
      select 1 from public.safety_plans p
      where p.id = plan_id and p.owner_id = auth.uid ()
    )
  );

-- trusted_contacts
drop policy if exists "trusted: owner manage" on public.trusted_contacts;
create policy "trusted: owner manage" on public.trusted_contacts
  for all using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());

-- notifications
drop policy if exists "notifications: own read" on public.notifications;
create policy "notifications: own read" on public.notifications
  for select using (user_id = auth.uid ());
create policy "notifications: mark own" on public.notifications
  for update using (user_id = auth.uid ()) with check (user_id = auth.uid ());
create policy "notifications: delete own" on public.notifications
  for delete using (user_id = auth.uid ());
-- inserts happen server-side (service role) so a client cannot spoof a
-- notification into someone else's centre.

-- reports: insert-only for users
drop policy if exists "reports: file own" on public.reports;
create policy "reports: file own" on public.reports
  for insert with check (reporter_id = auth.uid ());
-- no select/update/delete policies: only the service role can review.

-- blocks
drop policy if exists "blocks: own manage" on public.blocks;
create policy "blocks: own manage" on public.blocks
  for all using (blocker_id = auth.uid ()) with check (blocker_id = auth.uid ());

-- ai
drop policy if exists "ai_conversations: own" on public.ai_conversations;
create policy "ai_conversations: own" on public.ai_conversations
  for all using (user_id = auth.uid ()) with check (user_id = auth.uid ());

drop policy if exists "ai_messages: own" on public.ai_messages;
create policy "ai_messages: own" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid ()
    )
  ) with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid ()
    )
  );

-- ----------------------------------------------------------------------------
-- 10. STORAGE
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('family-images', 'family-images', false)
on conflict (id) do nothing;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid ()::text = (storage.foldername (name))[1]
  );

drop policy if exists "avatars: manage own" on storage.objects;
create policy "avatars: manage own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid ()::text = (storage.foldername (name))[1]
  );
create policy "avatars: delete own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid ()::text = (storage.foldername (name))[1]
  );

-- Chat images: path convention chat-images/{conversation_id}/{uid}/{file}.
drop policy if exists "chat-images: members read" on storage.objects;
create policy "chat-images: members read" on storage.objects
  for select using (
    bucket_id = 'chat-images'
    and public.is_conversation_member (((storage.foldername (name))[1])::uuid)
  );

drop policy if exists "chat-images: members upload own" on storage.objects;
create policy "chat-images: members upload own" on storage.objects
  for insert with check (
    bucket_id = 'chat-images'
    and public.is_conversation_member (((storage.foldername (name))[1])::uuid)
    and auth.uid ()::text = (storage.foldername (name))[2]
  );

drop policy if exists "chat-images: manage own" on storage.objects;
create policy "chat-images: manage own" on storage.objects
  for update using (
    bucket_id = 'chat-images'
    and auth.uid ()::text = (storage.foldername (name))[2]
  );
create policy "chat-images: delete own" on storage.objects
  for delete using (
    bucket_id = 'chat-images'
    and auth.uid ()::text = (storage.foldername (name))[2]
  );

-- Family images: path convention family-images/{family_id}/{uid}/{file}.
drop policy if exists "family-images: members read" on storage.objects;
create policy "family-images: members read" on storage.objects
  for select using (
    bucket_id = 'family-images'
    and public.is_family_member (((storage.foldername (name))[1])::uuid)
  );

drop policy if exists "family-images: admins upload" on storage.objects;
create policy "family-images: admins upload" on storage.objects
  for insert with check (
    bucket_id = 'family-images'
    and public.family_role (((storage.foldername (name))[1])::uuid) in ('owner','admin')
  );

drop policy if exists "family-images: admins manage" on storage.objects;
create policy "family-images: admins manage" on storage.objects
  for update using (
    bucket_id = 'family-images'
    and public.family_role (((storage.foldername (name))[1])::uuid) in ('owner','admin')
  );
create policy "family-images: admins delete" on storage.objects
  for delete using (
    bucket_id = 'family-images'
    and public.family_role (((storage.foldername (name))[1])::uuid) in ('owner','admin')
  );

-- ----------------------------------------------------------------------------
-- 11. INTEGRITY TRIGGERS
-- ----------------------------------------------------------------------------

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation ();

create or replace function public.touch_plan()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists safety_plans_touch on public.safety_plans;
create trigger safety_plans_touch
  before update on public.safety_plans
  for each row execute function public.touch_plan ();
