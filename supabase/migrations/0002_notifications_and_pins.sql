-- ============================================================================
-- FAST — Schema 0002: pinned family messages + notification fan-out.
--
-- Notifications are created by database triggers, not by client calls:
-- a client can never spoof a notification into someone else's centre.
-- ============================================================================

-- Pinned messages: a family conversation can pin a few messages (the
-- address that matters, the agreed plan). Only admins can change the set;
-- every member can read it.
alter table public.families
  add column if not exists pinned_message_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------------
-- new message -> notify the other members of the conversation
-- ---------------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  conv_type text;
  fam uuid;
begin
  if new.sender_id is null then return new; end if;

  select type, family_id into conv_type, fam
  from public.conversations where id = new.conversation_id;

  insert into public.notifications (user_id, kind, title, body, data)
  select
    m.user_id,
    case when conv_type = 'family' then 'family_message' else 'new_message' end,
    case
      when conv_type = 'family' then 'New message in your family'
      else 'New message'
    end,
    case
      when new.kind = 'image' then 'An image was shared'
      when new.deleted_at is not null then null
      else left(coalesce(new.body, ''), 120)
    end,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
  from public.conversation_members m
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id
    -- skip muted members: muted_until in the future silences the ping
    and (m.muted_until is null or m.muted_until < now())
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message ();

-- ---------------------------------------------------------------------------
-- check-in -> notify the family
-- ---------------------------------------------------------------------------
create or replace function public.notify_checkin()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  who text;
begin
  select display_name into who from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, kind, title, body, data)
  select
    m.user_id,
    'checkin',
    case new.status
      when 'need_help' then coalesce(who, 'Someone') || ' needs help'
      else coalesce(who, 'Someone') || ' checked in: ' || replace(new.status, '_', ' ')
    end,
    new.note,
    jsonb_build_object('family_id', new.family_id, 'checkin_id', new.id)
  from public.family_members m
  where m.family_id = new.family_id
    and m.user_id <> new.user_id
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists checkins_notify on public.checkins;
create trigger checkins_notify
  after insert on public.checkins
  for each row execute function public.notify_checkin ();

-- ---------------------------------------------------------------------------
-- safe arrival -> notify the chosen trusted contacts only
-- ---------------------------------------------------------------------------
create or replace function public.notify_safe_arrival()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  who text;
begin
  select display_name into who from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, kind, title, body, data)
  select
    t.contact_id,
    'safe_arrival',
    coalesce(who, 'Someone') || ' is heading somewhere',
    new.destination_label,
    jsonb_build_object('safe_arrival_id', new.id, 'expected_at', new.expected_at)
  from unnest(new.trusted_contact_ids) as t(contact_id)
  where t.contact_id <> new.user_id
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists safe_arrivals_notify on public.safe_arrivals;
create trigger safe_arrivals_notify
  after insert on public.safe_arrivals
  for each row execute function public.notify_safe_arrival ();

-- ---------------------------------------------------------------------------
-- invite accepted -> tell the inviter their circle grew
-- ---------------------------------------------------------------------------
create or replace function public.notify_invite_accepted()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  fam_name text;
  who text;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    select name into fam_name from public.families where id = new.family_id;
    select display_name into who from public.profiles where id = new.invitee_id;

    insert into public.notifications (user_id, kind, title, body, data)
    values (
      new.created_by,
      'family_invitation',
      coalesce(who, 'Someone') || ' joined ' || coalesce(fam_name, 'your family'),
      null,
      jsonb_build_object('family_id', new.family_id)
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists invites_notify on public.family_invites;
create trigger invites_notify
  after update on public.family_invites
  for each row execute function public.notify_invite_accepted ();
