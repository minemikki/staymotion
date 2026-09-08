-- StayMotion — 0002 pilot foundation
-- Adds what the pilot app needs on top of 0001_core.sql without rewriting it:
--   * organizations.business_type + settings (confirmation requirements become configurable)
--   * incidents: transcript, equipment, attachments, owner_role, suggested_action, due_at,
--                confirmed_by_reporter, notes, plus the needs_attention status
--   * tasks: assigned_role, estimated_minutes, completed_by
--   * memberships: department_id, pending invitations (invited_name/email, nullable user_id)
--   * profiles.email
--   * write policies that 0001 lacked (audit insert, org/location/department/membership writes)
--   * employees only read incidents they reported (managers read the location)
--   * RPCs: create_organization_with_owner, invite_member, append_incident_note
--   * storage bucket + tenant-scoped policies for incident photos
-- Review notes on 0001: RLS was read-heavy and had no insert policy for audit_events, no way for a
-- freshly signed-up user to create an organization (chicken-and-egg with memberships), and
-- employees could read every incident at their location. All addressed below.

alter type public.incident_status add value if not exists 'needs_attention';

alter table public.organizations
  add column if not exists business_type text not null default 'restaurant',
  add column if not exists settings jsonb not null default '{"requireConfirmationFor":["temperature","safety"],"locale":"nb"}'::jsonb;

alter table public.profiles add column if not exists email text;

alter table public.memberships
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists invited_name text,
  add column if not exists invited_email text,
  alter column user_id drop not null;
-- pending invitations have no auth user yet; they attach on first sign-in by email
create index if not exists memberships_invited_email_idx on public.memberships(invited_email) where user_id is null;

alter table public.tasks
  add column if not exists assigned_role public.membership_role,
  add column if not exists estimated_minutes int,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null;

alter table public.incidents
  add column if not exists equipment text,
  add column if not exists transcript text,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists owner_role public.membership_role not null default 'shift_lead',
  add column if not exists suggested_action text,
  add column if not exists due_at timestamptz,
  add column if not exists confirmed_by_reporter boolean not null default false,
  add column if not exists notes jsonb not null default '[]'::jsonb;
create index if not exists incidents_due_idx on public.incidents(status, due_at) where status in ('open','acknowledged','in_progress');

-- ---------- helper: role of the current user in an org ----------
create or replace function public.user_role_in_org(target_org uuid)
returns public.membership_role language sql stable security definer set search_path = public as $$
  select m.role from public.memberships m
  where m.user_id = auth.uid() and m.organization_id = target_org and m.active = true
  order by case m.role when 'owner' then 0 when 'hq' then 1 when 'regional_manager' then 2 when 'location_manager' then 3 when 'shift_lead' then 4 else 5 end
  limit 1;
$$;

create or replace function public.user_is_manager_at(target_location uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.locations l join public.memberships m on m.organization_id = l.organization_id
    where l.id = target_location and m.user_id = auth.uid() and m.active = true
      and m.role in ('owner','hq','regional_manager','location_manager','shift_lead')
      and (m.location_id is null or m.location_id = target_location)
  );
$$;

-- ---------- tighten incident reads: employees see only what they reported ----------
drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents for select using (
  public.user_can_access_location(location_id)
  and (public.user_is_manager_at(location_id) or reported_by = auth.uid())
);
-- inserts must be by the reporter themselves, at a location they belong to
drop policy if exists incidents_insert on public.incidents;
create policy incidents_insert on public.incidents for insert with check (
  public.user_can_access_location(location_id) and reported_by = auth.uid()
);
-- updates (acknowledge/resolve/assign) are manager-only
drop policy if exists incidents_update on public.incidents;
create policy incidents_update on public.incidents for update
  using (public.user_is_manager_at(location_id)) with check (public.user_is_manager_at(location_id));

-- audit + incident events: anyone in the org may append, nobody may edit/delete
create policy audit_insert on public.audit_events for insert with check (public.user_belongs_to_org(organization_id) and (actor_id is null or actor_id = auth.uid()));
-- ai_actions: append-only from the app
create policy ai_actions_insert on public.ai_actions for insert with check (organization_id is null or public.user_belongs_to_org(organization_id));

-- managers manage structure and people
create policy locations_write on public.locations for all using (public.user_role_in_org(organization_id) in ('owner','hq','regional_manager')) with check (public.user_role_in_org(organization_id) in ('owner','hq','regional_manager'));
create policy departments_write on public.departments for all using (public.user_is_manager_at(location_id)) with check (public.user_is_manager_at(location_id));
create policy memberships_write on public.memberships for all using (public.user_role_in_org(organization_id) in ('owner','hq','regional_manager','location_manager')) with check (public.user_role_in_org(organization_id) in ('owner','hq','regional_manager','location_manager'));
create policy tasks_delete on public.tasks for delete using (public.user_is_manager_at(location_id));

-- ---------- RPC: first-run onboarding (atomic, runs as definer, binds to auth.uid()) ----------
create or replace function public.create_organization_with_owner(
  p_name text, p_business_type text, p_location_name text, p_city text,
  p_departments text[], p_template_keys text[], p_employees jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_org public.organizations; v_loc public.locations; v_mem public.memberships; v_prof public.profiles;
  v_dep text; v_emp jsonb; v_dep_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.organizations(name, slug, business_type)
    values (p_name, lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6), coalesce(p_business_type, 'restaurant'))
    returning * into v_org;
  insert into public.locations(organization_id, name, city) values (v_org.id, p_location_name, p_city) returning * into v_loc;
  foreach v_dep in array coalesce(p_departments, array[]::text[]) loop
    insert into public.departments(location_id, name) values (v_loc.id, v_dep);
  end loop;
  insert into public.memberships(organization_id, user_id, role) values (v_org.id, v_uid, 'owner') returning * into v_mem;
  select * into v_prof from public.profiles where id = v_uid;
  for v_emp in select * from jsonb_array_elements(coalesce(p_employees, '[]'::jsonb)) loop
    select id into v_dep_id from public.departments where location_id = v_loc.id and name = v_emp->>'department' limit 1;
    insert into public.memberships(organization_id, user_id, role, location_id, department_id, invited_name, invited_email)
      values (v_org.id, null, coalesce((v_emp->>'role')::public.membership_role, 'employee'), v_loc.id, v_dep_id, v_emp->>'name', v_emp->>'email');
  end loop;
  -- starter tasks for today (routine templates live in the app; keys are stored for traceability)
  insert into public.tasks(organization_id, location_id, title, status, assigned_role, automation_key, due_at, created_by)
    select v_org.id, v_loc.id, k, 'open', 'employee', k, date_trunc('day', now()) + interval '10 hours', v_uid
    from unnest(coalesce(p_template_keys, array[]::text[])) as k
    where k not in ('delivery_check','equipment_report','bar_stock');
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action, after_data)
    values (v_org.id, v_uid, 'organization', v_org.id, 'created', jsonb_build_object('name', v_org.name, 'location', v_loc.name));
  return jsonb_build_object('organization', to_jsonb(v_org), 'location', to_jsonb(v_loc), 'owner', to_jsonb(v_prof), 'membership', to_jsonb(v_mem));
end $$;

-- ---------- RPC: invite/add a member (pending until they sign in) ----------
create or replace function public.invite_member(
  p_organization_id uuid, p_location_id uuid, p_department_id uuid, p_role public.membership_role,
  p_name text, p_email text, p_language text default 'nb'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_mem public.memberships;
begin
  if not public.user_is_manager_at(p_location_id) then raise exception 'not allowed'; end if;
  if p_role in ('owner','hq') and public.user_role_in_org(p_organization_id) not in ('owner','hq') then raise exception 'cannot grant that role'; end if;
  insert into public.memberships(organization_id, user_id, role, location_id, department_id, invited_name, invited_email)
    values (p_organization_id, null, p_role, p_location_id, p_department_id, p_name, p_email) returning * into v_mem;
  insert into public.audit_events(organization_id, location_id, actor_id, entity_type, entity_id, action, after_data)
    values (p_organization_id, p_location_id, auth.uid(), 'membership', v_mem.id, 'created', jsonb_build_object('name', p_name, 'role', p_role));
  return jsonb_build_object('profile', jsonb_build_object('id', v_mem.id, 'full_name', p_name, 'email', p_email, 'preferred_language', p_language, 'created_at', v_mem.created_at), 'membership', to_jsonb(v_mem));
end $$;

-- attach pending invitations when the invited email signs up
create or replace function public.attach_pending_memberships()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.memberships set user_id = new.id where user_id is null and invited_email is not null and lower(invited_email) = lower(new.email);
  update public.profiles set email = new.email, full_name = coalesce(full_name, new.raw_user_meta_data->>'full_name') where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_attach_memberships on auth.users;
create trigger on_auth_user_attach_memberships after insert on auth.users for each row execute function public.attach_pending_memberships();

-- ---------- RPC: append a note (managers only) ----------
create or replace function public.append_incident_note(p_incident_id uuid, p_note jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_loc uuid;
begin
  select location_id into v_loc from public.incidents where id = p_incident_id;
  if v_loc is null or not public.user_is_manager_at(v_loc) then raise exception 'not allowed'; end if;
  update public.incidents set notes = notes || jsonb_build_array(p_note), updated_at = now() where id = p_incident_id;
end $$;

-- ---------- storage: incident photos, scoped org/<org>/loc/<loc>/<user>/... ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('incident-photos', 'incident-photos', false, 6291456, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
  on conflict (id) do nothing;
create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = 'org'
  and public.user_belongs_to_org(((storage.foldername(name))[2])::uuid)
  and (storage.foldername(name))[5] = auth.uid()::text
);
create policy photos_read on storage.objects for select to authenticated using (
  bucket_id = 'incident-photos' and public.user_can_access_location(((storage.foldername(name))[4])::uuid)
);
