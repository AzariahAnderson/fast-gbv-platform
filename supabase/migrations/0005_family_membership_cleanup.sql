-- ============================================================================
-- FAST — Schema 0005: leaving/removing a family member also ends their
-- conversation access.
--
-- Runtime testing against the live database found a genuine access hole:
-- removing a member (or leaving) deletes only the family_members row, while
-- the family conversation's conversation_members row stays behind. Every
-- chat policy gates on is_conversation_member(), so a removed member could
-- still read the family conversation, its messages and its check-ins.
--
-- Fix: a SECURITY DEFINER trigger deletes the conversation membership when
-- family membership ends — for owner removal, admin removal and voluntary
-- leave alike, no matter which client issued the delete.
-- ============================================================================

create or replace function public.cleanup_family_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.conversation_members cm
  using public.conversations c
  where cm.conversation_id = c.id
    and c.type = 'family'
    and c.family_id = old.family_id
    and cm.user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists family_members_cleanup on public.family_members;
create trigger family_members_cleanup
  after delete on public.family_members
  for each row execute function public.cleanup_family_conversation_member ();
