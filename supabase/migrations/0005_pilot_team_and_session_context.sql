-- StayMotion — 0005 team invites + location context
-- Gives chain-level users a safe default location for manager/employee views
-- and closes role-escalation gaps in the pending-invitation RPC.

-- ---------------------------------------------------------------------------
-- Session context: owner/HQ/regional users get a default active location
-- ---------------------------------------------------------------------------

create or replace function public.get_my_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mem public.memberships;
  v_prof public.profiles;
  v_org public.organizations;
  v_loc public.locations;
begin
  if v_uid is null then return null; end if;

  select * into v_mem
  from public.memberships
  where user_id = v_uid and active = true
  order by
    case role
      when 'owner' then 0
      when 'hq' then 1
      when 'regional_manager' then 2
      when 'location_manager' then 3
      when 'shift_lead' then 4
      else 5
    end,
    created_at asc
  limit 1;

  if not found then return null; end if;

  select * into v_prof from public.profiles where id = v_uid;
  select * into v_org from public.organizations where id = v_mem.organization_id;

  if v_mem.location_id is not null then
    select * into v_loc from public.locations where id = v_mem.location_id;
  elsif v_mem.role in ('owner','hq','regional_manager') then
    -- Pilot default. A later location switcher can override this explicitly.
    select * into v_loc
    from public.locations
    where organization_id = v_mem.organization_id and active = true
    order by created_at asc
    limit 1;
  end if;

  return jsonb_build_object(
    'userId', v_uid,
    'fullName', coalesce(v_prof.full_name, v_prof.email, 'Bruker'),
    'role', v_mem.role,
    'organizationId', v_org.id,
    'organizationName', v_org.name,
    'locationId', v_loc.id,
    'locationName', v_loc.name,
    'departmentId', v_mem.department_id
  );
end;
$$;

revoke all on function public.get_my_session_context() from public;
grant execute on function public.get_my_session_context() to authenticated;

-- ---------------------------------------------------------------------------
-- Safe role hierarchy for invites
-- ---------------------------------------------------------------------------

create or replace function public.invite_member(
  p_organization_id uuid,
  p_location_id uuid,
  p_department_id uuid,
  p_role public.membership_role,
  p_name text,
  p_email text,
  p_language text default 'nb'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mem public.memberships;
  v_caller_role public.membership_role;
  v_location_org uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select organization_id into v_location_org from public.locations where id = p_location_id;
  if v_location_org is null or v_location_org <> p_organization_id then
    raise exception 'invalid location';
  end if;

  if not public.user_is_manager_at(p_location_id) then raise exception 'not allowed'; end if;
  v_caller_role := public.user_role_in_org(p_organization_id);

  if v_caller_role in ('owner','hq') then
    null; -- may grant all roles during pilot
  elsif v_caller_role = 'regional_manager' then
    if p_role not in ('location_manager','shift_lead','employee') then raise exception 'cannot grant that role'; end if;
  elsif v_caller_role = 'location_manager' then
    if p_role not in ('shift_lead','employee') then raise exception 'cannot grant that role'; end if;
  elsif v_caller_role = 'shift_lead' then
    if p_role <> 'employee' then raise exception 'cannot grant that role'; end if;
  else
    raise exception 'not allowed';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'name required'; end if;
  if v_email = '' then raise exception 'email required'; end if;

  if exists (
    select 1 from public.memberships m
    where m.organization_id = p_organization_id
      and m.location_id = p_location_id
      and m.active = true
      and m.user_id is null
      and lower(coalesce(m.invited_email, '')) = v_email
  ) then
    raise exception 'already invited';
  end if;

  insert into public.memberships(
    organization_id, user_id, role, location_id, department_id, invited_name, invited_email
  ) values (
    p_organization_id, null, p_role, p_location_id, p_department_id, trim(p_name), v_email
  ) returning * into v_mem;

  insert into public.audit_events(
    organization_id, location_id, actor_id, entity_type, entity_id, action, after_data
  ) values (
    p_organization_id,
    p_location_id,
    auth.uid(),
    'membership',
    v_mem.id,
    'invited',
    jsonb_build_object('name', trim(p_name), 'email', v_email, 'role', p_role)
  );

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_mem.id,
      'full_name', trim(p_name),
      'email', v_email,
      'preferred_language', coalesce(nullif(trim(p_language), ''), 'nb'),
      'created_at', v_mem.created_at
    ),
    'membership', to_jsonb(v_mem)
  );
end;
$$;

revoke all on function public.invite_member(uuid, uuid, uuid, public.membership_role, text, text, text) from public;
grant execute on function public.invite_member(uuid, uuid, uuid, public.membership_role, text, text, text) to authenticated;
