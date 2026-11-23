-- ============================================================================
-- FAST — Schema 0003: block precedence that holds for every side.
--
-- Runtime testing against the live database found a genuine RLS blind spot:
-- the "blocks always win" subqueries in the messages-send and join-direct
-- policies run as the invoking user (security invoker). A user who has been
-- blocked cannot see the block row (it belongs to the blocker), so the
-- subquery never fires for them and they can keep sending into an existing
-- direct conversation. The RPC path (start_direct_conversation) was never
-- affected — it is security definer — but inserts into an existing
-- conversation and direct-conversation joins were.
--
-- Fix: evaluate block existence through a SECURITY DEFINER helper that can
-- see every blocks row regardless of caller. Policy intent is unchanged:
-- blocks always win. RLS on blocks itself is untouched (own-manage only).
-- ============================================================================

-- True when any block exists between the two users, seen without RLS
-- restrictions. Stable + security definer on purpose.
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function public.blocked_between(uuid, uuid) from public, anon;
grant execute on function public.blocked_between(uuid, uuid) to authenticated;

-- Messages send policy: same rules, block check now definer-backed.
drop policy if exists "messages: members send as self" on public.messages;
create policy "messages: members send as self" on public.messages
  for insert with check (
    sender_id = auth.uid ()
    and public.is_conversation_member (conversation_id)
    and not exists (
      select 1 from public.conversation_members other
      where other.conversation_id = conversation_id
        and other.user_id <> auth.uid ()
        and public.blocked_between (other.user_id, auth.uid ())
    )
  );

-- Join-direct policy: same rules, block check now definer-backed.
drop policy if exists "members: join direct" on public.conversation_members;
create policy "members: join direct" on public.conversation_members
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.type = 'direct' and c.created_by = auth.uid ()
    )
    and user_id <> auth.uid ()
    and not public.blocked_between (user_id, auth.uid ())
  );
