-- StayMotion — 0010 RLS policy performance hardening
-- Scope policies explicitly to authenticated users and avoid per-row auth.uid()
-- re-evaluation. Split ALL write policies so they do not duplicate SELECT work.

-- Profiles
drop policy if exists profile_self_update on public.profiles;
create policy profile_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Messages
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.user_belongs_to_org(organization_id)
    and sender_id = (select auth.uid())
    and (location_id is null or public.user_can_access_location(location_id))
  );

-- Incidents
drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents
  for select to authenticated
  using (
    public.user_can_access_location(location_id)
    and (
      public.user_is_manager_at(location_id)
      or reported_by = (select auth.uid())
    )
  );

drop policy if exists incidents_insert on public.incidents;
create policy incidents_insert on public.incidents
  for insert to authenticated
  with check (
    public.user_can_access_location(location_id)
    and reported_by = (select auth.uid())
  );

-- Audit
drop policy if exists audit_insert on public.audit_events;
create policy audit_insert on public.audit_events
  for insert to authenticated
  with check (
    public.user_belongs_to_org(organization_id)
    and (actor_id is null or actor_id = (select auth.uid()))
  );

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or public.user_role_in_org(organization_id) = any(array['owner','hq','regional_manager']::public.membership_role[])
    or (location_id is not null and public.user_is_manager_at(location_id))
  );

-- Incident events
drop policy if exists incident_events_read on public.incident_events;
create policy incident_events_read on public.incident_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.incidents i
      where i.id = incident_events.incident_id
        and (
          public.user_is_manager_at(i.location_id)
          or i.reported_by = (select auth.uid())
        )
    )
  );

-- Memberships
drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.user_role_in_org(organization_id) = any(array['owner','hq','regional_manager']::public.membership_role[])
    or (location_id is not null and public.user_is_manager_at(location_id))
  );

-- Tasks
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
  for select to authenticated
  using (
    public.user_is_manager_at(location_id)
    or (
      public.user_can_access_location(location_id)
      and (
        assigned_to = (select auth.uid())
        or (assigned_to is null and assigned_role = 'employee'::public.membership_role)
      )
    )
  );

-- Locations: separate read and write commands; no ALL policy that also applies to SELECT.
drop policy if exists locations_read on public.locations;
drop policy if exists locations_write on public.locations;
create policy locations_read on public.locations
  for select to authenticated
  using (public.user_can_access_location(id));
create policy locations_insert on public.locations
  for insert to authenticated
  with check (public.user_role_in_org(organization_id) = any(array['owner','hq','regional_manager']::public.membership_role[]));
create policy locations_update on public.locations
  for update to authenticated
  using (public.user_role_in_org(organization_id) = any(array['owner','hq','regional_manager']::public.membership_role[]))
  with check (public.user_role_in_org(organization_id) = any(array['owner','hq','regional_manager']::public.membership_role[]));
create policy locations_delete on public.locations
  for delete to authenticated
  using (public.user_role_in_org(organization_id) = any(array['owner','hq','regional_manager']::public.membership_role[]));

-- Departments: same split to avoid duplicate permissive SELECT policies.
drop policy if exists departments_read on public.departments;
drop policy if exists departments_write on public.departments;
create policy departments_read on public.departments
  for select to authenticated
  using (public.user_can_access_location(location_id));
create policy departments_insert on public.departments
  for insert to authenticated
  with check (public.user_is_manager_at(location_id));
create policy departments_update on public.departments
  for update to authenticated
  using (public.user_is_manager_at(location_id))
  with check (public.user_is_manager_at(location_id));
create policy departments_delete on public.departments
  for delete to authenticated
  using (public.user_is_manager_at(location_id));
