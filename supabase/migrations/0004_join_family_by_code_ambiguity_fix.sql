-- ============================================================================
-- FAST — Schema 0004: fix ambiguous parameter reference in join_family_by_code.
--
-- Runtime testing against the live database found the RPC failing with
-- `column reference "code" is ambiguous`: the plpgsql parameter `code`
-- collides with family_invites.code inside the WHERE clause (both are in
-- scope for column references in PL/pgSQL SQL statements). The fix keeps
-- the public parameter name (the app calls rpc("join_family_by_code",
-- { code })) and qualifies the parameter with the function name, which is
-- the standard PL/pgSQL disambiguation.
-- ============================================================================

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
  where family_invites.code = join_family_by_code.code
    and status = 'pending' and expires_at > now()
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
