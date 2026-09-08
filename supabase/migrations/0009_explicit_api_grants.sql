-- StayMotion — 0009 explicit Data API grants
-- The reused Supabase project had its public schema recreated. PostgreSQL table
-- privileges are therefore intentionally rebuilt from scratch instead of relying
-- on project-era defaults. RLS remains the row-level authorization boundary.

-- Nothing in the StayMotion public schema is anonymously readable/writable.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Signed-in users: grant only operations the browser app actually needs.
grant select on public.organizations to authenticated;

grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.departments to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, preferred_language, email, updated_at) on public.profiles to authenticated;

grant select on public.memberships to authenticated;

-- Asset writes still require an RLS policy; currently only reads are allowed.
grant select, insert, update, delete on public.assets to authenticated;

grant select, insert, delete on public.tasks to authenticated;
-- Keep task mutation column-scoped; employees mutate completion through the RPC.
grant update (status, completed_at, completed_by, updated_at) on public.tasks to authenticated;

grant select, insert on public.incidents to authenticated;
-- Managers may change workflow fields only; report/evidence fields stay immutable.
grant update (
  status,
  acknowledged_by,
  acknowledged_at,
  resolved_by,
  resolved_at,
  owner_role,
  updated_at
) on public.incidents to authenticated;

grant select, insert on public.incident_events to authenticated;
grant select, insert on public.handovers to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.ai_actions to authenticated;
grant select, insert on public.audit_events to authenticated;
grant select on public.ai_request_events to authenticated;

grant usage, select on sequence public.audit_events_id_seq to authenticated;

-- Server-side administrative code may use a Supabase secret/service role later.
-- It is never shipped to the browser and bypasses RLS by design.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- New objects must be opt-in. A later migration has to grant its own API surface.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
