-- StayMotion — 0003 real pilot hardening
-- Phase 3 focuses on real pilot safety rather than more demo features:
--   * reliable session context after Supabase OTP sign-in
--   * claim pending invitations even when the auth user already existed
--   * authenticated, tenant-derived AI quota/usage accounting
--   * stricter incident-photo storage policies
--   * realtime incidents for manager refresh
--
-- IMPORTANT: this migration assumes 0001_core.sql and 0002_pilot_foundation.sql
-- have already been applied. It does not rewrite either migration.

-- ---------------------------------------------------------------------------
-- Session bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.claim_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return 0; end if;

  update public.memberships
     set user_id = v_uid
   where user_id is null
     and invited_email is not null
     and lower(invited_email) = lower(v_email);
  get diagnostics v_count = row_count;

  update public.profiles
     set email = coalesce(email, v_email), updated_at = now()
   where id = v_uid;

  return v_count;
end;
$$;

revoke all on function public.claim_pending_invitations() from public;
grant execute on function public.claim_pending_invitations() to authenticated;

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
  else
    -- HQ/owner memberships are intentionally organization-wide. A default
    -- location is still useful for the manager view and capture context.
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
-- AI request accounting and hard quotas
-- ---------------------------------------------------------------------------

create table if not exists public.ai_request_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  input_chars integer not null default 0 check (input_chars >= 0),
  input_modality text not null default 'text',
  provider text,
  model text,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_nok numeric(12,4) not null default 0,
  actual_cost_nok numeric(12,4),
  fallback_used boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_request_events_user_window_idx
  on public.ai_request_events(user_id, action_type, created_at desc);
create index if not exists ai_request_events_org_day_idx
  on public.ai_request_events(organization_id, created_at desc);

alter table public.ai_request_events enable row level security;

-- Only owner/HQ can inspect raw cost rows from the browser. Writes are RPC-only.
drop policy if exists ai_request_events_read on public.ai_request_events;
create policy ai_request_events_read on public.ai_request_events
for select using (public.user_role_in_org(organization_id) in ('owner','hq'));

-- Atomic quota consumption. Limits are intentionally conservative defaults and
-- may later be overridden per organization through organizations.settings.aiLimits.
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
  v_effective_location uuid;
  v_window_count integer := 0;
  v_day_cost numeric := 0;
  v_request_id uuid;
  v_max_requests integer := 30;
  v_daily_budget numeric := 25;
  v_retry_after integer := 600;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- Prevent concurrent requests from racing through the same per-user window.
  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || coalesce(p_action_type, 'unknown'))::bigint);

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

  select * into v_org from public.organizations where id = v_mem.organization_id;
  v_effective_location := v_mem.location_id;
  if v_effective_location is null then
    select id into v_effective_location
    from public.locations
    where organization_id = v_mem.organization_id and active = true
    order by created_at asc
    limit 1;
  end if;

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
    v_mem.organization_id, v_effective_location, v_uid, left(coalesce(p_action_type, 'unknown'), 80),
    least(greatest(coalesce(p_input_chars, 0), 0), 100000),
    left(coalesce(p_input_modality, 'text'), 40),
    greatest(coalesce(p_estimated_cost_nok, 0), 0)
  ) returning id into v_request_id;

  return jsonb_build_object(
    'allowed', true,
    'requestId', v_request_id,
    'organizationId', v_mem.organization_id,
    'locationId', v_effective_location,
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

create or replace function public.finalize_ai_request(
  p_request_id uuid,
  p_provider text,
  p_model text,
  p_latency_ms integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost_nok numeric,
  p_fallback_used boolean,
  p_output_summary jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.ai_request_events;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_req
  from public.ai_request_events
  where id = p_request_id and user_id = v_uid;
  if not found then raise exception 'request not found'; end if;

  update public.ai_request_events
     set provider = left(coalesce(p_provider, 'unknown'), 80),
         model = left(coalesce(p_model, 'unknown'), 120),
         latency_ms = greatest(coalesce(p_latency_ms, 0), 0),
         input_tokens = greatest(coalesce(p_input_tokens, 0), 0),
         output_tokens = greatest(coalesce(p_output_tokens, 0), 0),
         estimated_cost_nok = greatest(coalesce(p_estimated_cost_nok, estimated_cost_nok, 0), 0),
         fallback_used = coalesce(p_fallback_used, false),
         completed_at = now()
   where id = p_request_id;

  insert into public.ai_actions(
    organization_id, location_id, requested_by, action_type, model_route,
    input_summary, output_summary, status, cost_estimate_nok
  ) values (
    v_req.organization_id,
    v_req.location_id,
    v_uid,
    v_req.action_type,
    left(coalesce(p_provider, 'unknown') || '/' || coalesce(p_model, 'unknown'), 200),
    jsonb_build_object('modality', v_req.input_modality, 'chars', v_req.input_chars, 'requestId', v_req.id),
    coalesce(p_output_summary, '{}'::jsonb) || jsonb_build_object(
      'latencyMs', greatest(coalesce(p_latency_ms, 0), 0),
      'fallbackUsed', coalesce(p_fallback_used, false),
      'inputTokens', greatest(coalesce(p_input_tokens, 0), 0),
      'outputTokens', greatest(coalesce(p_output_tokens, 0), 0)
    ),
    'executed',
    greatest(coalesce(p_estimated_cost_nok, 0), 0)
  );
end;
$$;

revoke all on function public.finalize_ai_request(uuid, text, text, integer, integer, integer, numeric, boolean, jsonb) from public;
grant execute on function public.finalize_ai_request(uuid, text, text, integer, integer, integer, numeric, boolean, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Incident-photo storage hardening
-- ---------------------------------------------------------------------------

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'incident-photos'
  and array_length(storage.foldername(name), 1) >= 5
  and (storage.foldername(name))[1] = 'org'
  and (storage.foldername(name))[3] = 'loc'
  and (storage.foldername(name))[5] = auth.uid()::text
  and public.user_belongs_to_org(((storage.foldername(name))[2])::uuid)
  and public.user_can_access_location(((storage.foldername(name))[4])::uuid)
  and exists (
    select 1 from public.locations l
    where l.id = ((storage.foldername(name))[4])::uuid
      and l.organization_id = ((storage.foldername(name))[2])::uuid
  )
);

drop policy if exists photos_delete_own on storage.objects;
create policy photos_delete_own on storage.objects for delete to authenticated using (
  bucket_id = 'incident-photos'
  and array_length(storage.foldername(name), 1) >= 5
  and (storage.foldername(name))[5] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- Realtime manager updates
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'incidents'
  ) then
    alter publication supabase_realtime add table public.incidents;
  end if;
end $$;
