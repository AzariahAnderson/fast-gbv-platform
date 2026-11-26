-- ============================================================================
-- FAST — Schema 0008: personal contacts directory.
--
-- A survivor's own list of people they trust: name, phone, email,
-- relationship, free-form notes, a preferred contact method and an
-- emergency flag. Rows are private to their owner — one policy, one column
-- check, the same owner-manage model as safety_plan_contacts and
-- trusted_contacts. Nothing joins this table and no view exposes it; the
-- only path in is owner_id = auth.uid().
--
-- The UI never messages anyone automatically: call/sms/email/WhatsApp
-- actions are explicit taps on explicit links.
-- ============================================================================

create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid (),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  relationship text,
  notes      text,
  preferred_method text not null default 'call'
    check (preferred_method in ('call', 'sms', 'email', 'whatsapp')),
  is_emergency boolean not null default false,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

alter table public.contacts enable row level security;

drop policy if exists "contacts: owner manage" on public.contacts;
create policy "contacts: owner manage" on public.contacts
  for all
  using (owner_id = auth.uid ())
  with check (owner_id = auth.uid ());

create index if not exists contacts_owner_listing_idx
  on public.contacts (owner_id, is_emergency desc, created_at desc);
