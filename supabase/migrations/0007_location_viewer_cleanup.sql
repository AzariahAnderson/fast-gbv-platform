-- ============================================================================
-- FAST — Schema 0007: ending family membership also ends location-share
-- viewer grants.
--
-- Runtime testing found that the location-share audience is family-scoped
-- (location_shares.family_id), but removing a member from the family left
-- their location_share_viewers grant behind — a removed member could keep
-- reading the sharer's location for as long as the grant row existed.
--
-- Fix: extend the membership cleanup trigger (0005) to also purge
-- location_share_viewers rows granted to the departing member for shares in
-- that family. Safety-plan shares stay untouched: they are explicit
-- person-to-person grants, deliberately not family-scoped.
-- ============================================================================

create or replace function public.cleanup_family_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- End chat access for the family conversation.
  delete from public.conversation_members cm
  using public.conversations c
  where cm.conversation_id = c.id
    and c.type = 'family'
    and c.family_id = old.family_id
    and cm.user_id = old.user_id;

  -- End location-share audience grants inside this family.
  delete from public.location_share_viewers v
  using public.location_shares s
  where v.share_id = s.id
    and s.family_id = old.family_id
    and v.viewer_id = old.user_id;

  return old;
end;
$$;

-- Re-attach (drop if exists keeps this idempotent).
drop trigger if exists family_members_cleanup on public.family_members;
create trigger family_members_cleanup
  after delete on public.family_members
  for each row execute function public.cleanup_family_conversation_member ();
