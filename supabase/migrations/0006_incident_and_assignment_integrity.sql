-- StayMotion — 0006 incident + assignment integrity
-- Final database-side guardrails for the first real pilot.
-- Assumes migrations 0001–0005 are applied in order.

-- ---------------------------------------------------------------------------
-- Tasks: an employee sees/completes only a task assigned to them or a shared
-- employee task. Merely being unassigned is not enough.
-- ---------------------------------------------------------------------------

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
for select using (
  public.user_is_manager_at(location_id)
  or (
    public.user_can_access_location(location_id)
    and (
      assigned_to = auth.uid()
      or (assigned_to is null and assigned_role = 'employee')
    )
  )
);

create or replace function public.set_task_completion(p_task_id uuid, p_done boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks;
  v_allowed boolean := false;
  v_before public.task_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then raise exception 'task not found'; end if;

  if public.user_is_manager_at(v_task.location_id) then
    v_allowed := true;
  elsif public.user_can_access_location(v_task.location_id)
    and (
      v_task.assigned_to = v_uid
      or (v_task.assigned_to is null and v_task.assigned_role = 'employee')
    ) then
    v_allowed := true;
  end if;

  if not v_allowed then raise exception 'not allowed'; end if;

  v_before := v_task.status;
  update public.tasks
     set status = case when p_done then 'done'::public.task_status else 'open'::public.task_status end,
         completed_at = case when p_done then now() else null end,
         completed_by = case when p_done then v_uid else null end,
         updated_at = now()
   where id = p_task_id
   returning * into v_task;

  insert into public.audit_events(
    organization_id, location_id, actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    v_task.organization_id,
    v_task.location_id,
    v_uid,
    'task',
    v_task.id,
    case when p_done then 'completed' else 'reopened' end,
    jsonb_build_object('status', v_before),
    jsonb_build_object('status', v_task.status)
  );

  return to_jsonb(v_task);
end;
$$;

revoke all on function public.set_task_completion(uuid, boolean) from public;
grant execute on function public.set_task_completion(uuid, boolean) to authenticated;

-- Direct browser updates may only touch completion fields, and RLS still makes
-- direct updates manager-only. Employees use set_task_completion().
revoke update on public.tasks from authenticated;
grant update (status, completed_at, completed_by, updated_at) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Incident inserts: tenant, department and compliance confirmation are enforced
-- in Postgres even if somebody bypasses the StayMotion UI.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_incident_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_settings jsonb;
  v_requires boolean := false;
begin
  select organization_id into v_org
  from public.locations
  where id = new.location_id and active = true;

  if v_org is null then raise exception 'invalid location'; end if;
  if new.organization_id is distinct from v_org then raise exception 'organization/location mismatch'; end if;

  if new.department_id is not null and not exists (
    select 1 from public.departments d
    where d.id = new.department_id and d.location_id = new.location_id
  ) then
    raise exception 'department/location mismatch';
  end if;

  if v_uid is not null then
    if not public.user_can_access_location(new.location_id) then raise exception 'not allowed'; end if;
    new.reported_by := v_uid;
  end if;

  select settings into v_settings from public.organizations where id = v_org;
  v_requires := coalesce(v_settings->'requireConfirmationFor', '[]'::jsonb) ? new.category;

  if v_requires then
    new.requires_human_confirmation := true;
    if not coalesce(new.confirmed_by_reporter, false) then
      raise exception 'confirmation required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists incidents_enforce_integrity on public.incidents;
create trigger incidents_enforce_integrity
before insert on public.incidents
for each row execute function public.enforce_incident_integrity();

-- Managers can change workflow state, but the original employee report,
-- transcript, AI extraction, measurement, location and reporter are immutable
-- through the browser API.
revoke update on public.incidents from authenticated;
grant update (
  status,
  acknowledged_by,
  acknowledged_at,
  resolved_by,
  resolved_at,
  owner_role,
  updated_at
) on public.incidents to authenticated;

-- ---------------------------------------------------------------------------
-- Invites: department must belong to the selected location.
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

  select organization_id into v_location_org from public.locations where id = p_location_id and active = true;
  if v_location_org is null or v_location_org <> p_organization_id then
    raise exception 'invalid location';
  end if;

  if p_department_id is not null and not exists (
    select 1 from public.departments d
    where d.id = p_department_id and d.location_id = p_location_id
  ) then
    raise exception 'invalid department';
  end if;

  if not public.user_is_manager_at(p_location_id) then raise exception 'not allowed'; end if;
  v_caller_role := public.user_role_in_org(p_organization_id);

  if v_caller_role in ('owner','hq') then
    null;
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
