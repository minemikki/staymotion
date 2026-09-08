-- StayMotion — 0004 pilot RLS + task hardening
-- Tightens the remaining browser-visible policies from 0001/0002 and makes
-- employee task completion go through a narrowly scoped RPC.
-- Assumes 0001, 0002 and 0003 are already applied.

-- ---------------------------------------------------------------------------
-- Profile / membership visibility
-- ---------------------------------------------------------------------------

create or replace function public.user_can_view_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user = auth.uid() or exists (
    select 1
    from public.memberships m
    where m.user_id = target_user
      and m.active = true
      and (
        public.user_role_in_org(m.organization_id) in ('owner','hq','regional_manager')
        or (m.location_id is not null and public.user_is_manager_at(m.location_id))
      )
  );
$$;

revoke all on function public.user_can_view_profile(uuid) from public;
grant execute on function public.user_can_view_profile(uuid) to authenticated;

drop policy if exists profile_self_read on public.profiles;
drop policy if exists profiles_read_scoped on public.profiles;
create policy profiles_read_scoped on public.profiles
for select using (public.user_can_view_profile(id));

drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships
for select using (
  user_id = auth.uid()
  or public.user_role_in_org(organization_id) in ('owner','hq','regional_manager')
  or (location_id is not null and public.user_is_manager_at(location_id))
);

-- Direct membership writes are reserved for chain-level roles. Location
-- managers add people through invite_member(), which validates the target
-- location and prevents owner/HQ privilege escalation.
drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships
for all
using (public.user_role_in_org(organization_id) in ('owner','hq','regional_manager'))
with check (public.user_role_in_org(organization_id) in ('owner','hq','regional_manager'));

-- ---------------------------------------------------------------------------
-- Tasks: employees only see/complete tasks intended for them
-- ---------------------------------------------------------------------------

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
for select using (
  public.user_is_manager_at(location_id)
  or (
    public.user_can_access_location(location_id)
    and (
      assigned_to is null
      or assigned_to = auth.uid()
      or assigned_role = 'employee'
    )
  )
);

-- Employees should not create arbitrary tasks or edit task metadata directly.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
for insert with check (public.user_is_manager_at(location_id));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
for update
using (public.user_is_manager_at(location_id))
with check (public.user_is_manager_at(location_id));

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
    and (v_task.assigned_to is null or v_task.assigned_to = v_uid or v_task.assigned_role = 'employee') then
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

-- ---------------------------------------------------------------------------
-- Incident event / audit / AI visibility
-- ---------------------------------------------------------------------------

drop policy if exists incident_events_read on public.incident_events;
create policy incident_events_read on public.incident_events
for select using (
  exists (
    select 1
    from public.incidents i
    where i.id = incident_id
      and (
        public.user_is_manager_at(i.location_id)
        or i.reported_by = auth.uid()
      )
  )
);

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events
for select using (
  actor_id = auth.uid()
  or public.user_role_in_org(organization_id) in ('owner','hq','regional_manager')
  or (location_id is not null and public.user_is_manager_at(location_id))
);

drop policy if exists ai_actions_read on public.ai_actions;
create policy ai_actions_read on public.ai_actions
for select using (public.user_role_in_org(organization_id) in ('owner','hq'));

-- Real-mode AI usage is written by finalize_ai_request() (security definer),
-- not directly by browser clients.
drop policy if exists ai_actions_insert on public.ai_actions;

-- ---------------------------------------------------------------------------
-- Private incident photos: employee sees own uploads, managers see location
-- ---------------------------------------------------------------------------

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
for select to authenticated using (
  bucket_id = 'incident-photos'
  and array_length(storage.foldername(name), 1) >= 5
  and (storage.foldername(name))[1] = 'org'
  and (storage.foldername(name))[3] = 'loc'
  and public.user_can_access_location(((storage.foldername(name))[4])::uuid)
  and (
    (storage.foldername(name))[5] = auth.uid()::text
    or public.user_is_manager_at(((storage.foldername(name))[4])::uuid)
  )
);

-- ---------------------------------------------------------------------------
-- AI quota concurrency: serialize checks per organization
-- ---------------------------------------------------------------------------

create or replace function public.consume_ai_quota(
  p_action_type text,
  p_input_chars integer,
  p_input_modality text,
  p_estimated_cost_nok numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mem public.memberships;
  v_org public.organizations;
  v_window_count integer := 0;
  v_day_cost numeric := 0;
  v_request_id uuid;
  v_max_requests integer := 30;
  v_daily_budget numeric := 25;
  v_retry_after integer := 600;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_mem
  from public.memberships
  where user_id = v_uid and active = true
  order by
    case role
      when 'owner' then 0 when 'hq' then 1 when 'regional_manager' then 2
      when 'location_manager' then 3 when 'shift_lead' then 4 else 5 end,
    created_at asc
  limit 1;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_membership');
  end if;

  -- Without this lock, two users in the same tenant could race the daily
  -- budget check. The transaction-scoped advisory lock serializes quota
  -- consumption per organization while remaining cheap at pilot scale.
  perform pg_advisory_xact_lock(hashtextextended(v_mem.organization_id::text, 0));

  select * into v_org from public.organizations where id = v_mem.organization_id;

  begin
    v_max_requests := greatest(5, least(300, coalesce((v_org.settings #>> '{aiLimits,requestsPer10m}')::integer, 30)));
  exception when others then
    v_max_requests := 30;
  end;
  begin
    v_daily_budget := greatest(1, least(5000, coalesce((v_org.settings #>> '{aiLimits,dailyBudgetNok}')::numeric, 25)));
  exception when others then
    v_daily_budget := 25;
  end;

  select count(*) into v_window_count
  from public.ai_request_events
  where user_id = v_uid
    and action_type = p_action_type
    and created_at >= now() - interval '10 minutes';

  if v_window_count >= v_max_requests then
    select greatest(1, ceil(extract(epoch from ((min(created_at) + interval '10 minutes') - now()))))::integer
      into v_retry_after
    from public.ai_request_events
    where user_id = v_uid
      and action_type = p_action_type
      and created_at >= now() - interval '10 minutes';

    return jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'retryAfterSeconds', coalesce(v_retry_after, 600),
      'limit', v_max_requests,
      'remaining', 0
    );
  end if;

  select coalesce(sum(coalesce(actual_cost_nok, estimated_cost_nok, 0)), 0)
    into v_day_cost
  from public.ai_request_events
  where organization_id = v_mem.organization_id
    and created_at >= date_trunc('day', now());

  if v_day_cost + greatest(coalesce(p_estimated_cost_nok, 0), 0) > v_daily_budget then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_budget',
      'dailyBudgetNok', v_daily_budget,
      'spentTodayNok', v_day_cost,
      'remaining', 0
    );
  end if;

  insert into public.ai_request_events(
    organization_id, location_id, user_id, action_type, input_chars,
    input_modality, estimated_cost_nok
  ) values (
    v_mem.organization_id, v_mem.location_id, v_uid, left(coalesce(p_action_type, 'unknown'), 80),
    least(greatest(coalesce(p_input_chars, 0), 0), 100000),
    left(coalesce(p_input_modality, 'text'), 40),
    greatest(coalesce(p_estimated_cost_nok, 0), 0)
  ) returning id into v_request_id;

  return jsonb_build_object(
    'allowed', true,
    'requestId', v_request_id,
    'organizationId', v_mem.organization_id,
    'locationId', v_mem.location_id,
    'userId', v_uid,
    'limit', v_max_requests,
    'remaining', greatest(v_max_requests - v_window_count - 1, 0),
    'dailyBudgetNok', v_daily_budget,
    'spentTodayNok', v_day_cost
  );
end;
$$;

revoke all on function public.consume_ai_quota(text, integer, text, numeric) from public;
grant execute on function public.consume_ai_quota(text, integer, text, numeric) to authenticated;
