-- ============================================================================
-- FAST — Schema 0006: break RLS policy recursion for location shares and
-- safety plan shares.
--
-- Runtime testing against the live database hit
--   "infinite recursion detected in policy for relation \"location_shares\""
-- The cross-referencing policy pairs recurse:
--   location_shares."shares: viewers read"  -> location_share_viewers
--   location_share_viewers."share_viewers: owner manage" -> location_shares
-- and identically for safety_plans <-> safety_plan_shares (plus
-- safety_plan_contacts). Any INSERT ... RETURNING or viewer SELECT walks
-- the cycle until Postgres aborts.
--
-- Fix: evaluate the cross-table checks through SECURITY DEFINER helpers.
-- Definer function bodies bypass RLS on the tables they read, so the chain
-- terminates. Policy intent is unchanged.
-- ============================================================================

-- True when the current user owns the location share row.
create or replace function public.owns_location_share(share uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.location_shares s
    where s.id = share and s.user_id = auth.uid ()
  );
$$;

-- True when the current user is an explicit viewer of the share.
create or replace function public.can_view_location_share(share uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.location_share_viewers v
    where v.share_id = share and v.viewer_id = auth.uid ()
  );
$$;

-- True when the current user owns the safety plan row.
create or replace function public.owns_plan(plan uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.safety_plans p
    where p.id = plan and p.owner_id = auth.uid ()
  );
$$;

-- True when the current user holds an explicit share grant on the plan.
create or replace function public.can_view_plan(plan uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.safety_plan_shares v
    where v.plan_id = plan and v.viewer_id = auth.uid ()
  );
$$;

revoke all on function public.owns_location_share(uuid) from public, anon;
revoke all on function public.can_view_location_share(uuid) from public, anon;
revoke all on function public.owns_plan(uuid) from public, anon;
revoke all on function public.can_view_plan(uuid) from public, anon;
grant execute on function public.owns_location_share(uuid) to authenticated;
grant execute on function public.can_view_location_share(uuid) to authenticated;
grant execute on function public.owns_plan(uuid) to authenticated;
grant execute on function public.can_view_plan(uuid) to authenticated;

-- location share policies: same rules, definer-backed checks.
drop policy if exists "shares: viewers read" on public.location_shares;
create policy "shares: viewers read" on public.location_shares
  for select using (public.can_view_location_share (id));

drop policy if exists "share_viewers: owner manage" on public.location_share_viewers;
create policy "share_viewers: owner manage" on public.location_share_viewers
  for all using (public.owns_location_share (share_id))
  with check (public.owns_location_share (share_id));

-- safety plan policies: same rules, definer-backed checks.
drop policy if exists "plans: shared viewer read" on public.safety_plans;
create policy "plans: shared viewer read" on public.safety_plans
  for select using (public.can_view_plan (id));

drop policy if exists "plan_shares: owner manage" on public.safety_plan_shares;
create policy "plan_shares: owner manage" on public.safety_plan_shares
  for all using (public.owns_plan (plan_id))
  with check (public.owns_plan (plan_id));

drop policy if exists "plan_contacts: owner manage" on public.safety_plan_contacts;
create policy "plan_contacts: owner manage" on public.safety_plan_contacts
  for all using (public.owns_plan (plan_id))
  with check (public.owns_plan (plan_id));
