-- StayMotion core data model
-- Multi-tenant from day one: organization -> location -> department -> employee

create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner','hq','regional_manager','location_manager','shift_lead','employee');
create type public.task_status as enum ('open','in_progress','done','skipped');
create type public.incident_status as enum ('open','acknowledged','in_progress','resolved','closed');
create type public.incident_severity as enum ('low','medium','high','critical');
create type public.ai_action_status as enum ('suggested','confirmed','executed','failed','cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text,
  timezone text not null default 'Europe/Oslo',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index locations_org_idx on public.locations(organization_id);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index departments_location_idx on public.departments(location_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_language text not null default 'nb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  region_key text,
  location_id uuid references public.locations(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, location_id, role)
);
create index memberships_user_idx on public.memberships(user_id);
create index memberships_org_idx on public.memberships(organization_id);
create index memberships_location_idx on public.memberships(location_id);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  category text,
  qr_code text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index assets_location_idx on public.assets(location_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status public.task_status not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  automation_key text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_location_status_idx on public.tasks(location_id, status);
create index tasks_assignee_idx on public.tasks(assigned_to, status);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  reported_by uuid references public.profiles(id) on delete set null,
  title text not null,
  category text not null,
  severity public.incident_severity not null default 'medium',
  status public.incident_status not null default 'open',
  source text not null default 'manual',
  measurement jsonb not null default '{}'::jsonb,
  ai_extraction jsonb not null default '{}'::jsonb,
  requires_human_confirmation boolean not null default false,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index incidents_location_status_idx on public.incidents(location_id, status);
create index incidents_org_category_idx on public.incidents(organization_id, category, created_at desc);
create index incidents_asset_idx on public.incidents(asset_id, created_at desc);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index incident_events_incident_idx on public.incident_events(incident_id, created_at);

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  raw_text text,
  structured_summary jsonb not null default '{}'::jsonb,
  shift_started_at timestamptz,
  shift_ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index handovers_location_idx on public.handovers(location_id, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  channel_key text not null,
  body text not null,
  source_language text,
  translations jsonb not null default '{}'::jsonb,
  ai_signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_channel_idx on public.messages(organization_id, channel_key, created_at desc);

create table public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  action_type text not null,
  model_route text,
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  status public.ai_action_status not null default 'suggested',
  cost_estimate_nok numeric(12,4),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index ai_actions_org_idx on public.ai_actions(organization_id, created_at desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_org_idx on public.audit_events(organization_id, created_at desc);

create or replace function public.user_belongs_to_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.organization_id = target_org
      and m.active = true
  );
$$;

create or replace function public.user_can_access_location(target_location uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.locations l
    join public.memberships m on m.organization_id = l.organization_id
    where l.id = target_location
      and m.user_id = auth.uid()
      and m.active = true
      and (
        m.role in ('owner','hq','regional_manager')
        or m.location_id is null
        or m.location_id = target_location
      )
  );
$$;

alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.assets enable row level security;
alter table public.tasks enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_events enable row level security;
alter table public.handovers enable row level security;
alter table public.messages enable row level security;
alter table public.ai_actions enable row level security;
alter table public.audit_events enable row level security;

create policy org_read on public.organizations for select using (public.user_belongs_to_org(id));
create policy locations_read on public.locations for select using (public.user_can_access_location(id));
create policy departments_read on public.departments for select using (public.user_can_access_location(location_id));
create policy profile_self_read on public.profiles for select using (id = auth.uid());
create policy profile_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy memberships_read on public.memberships for select using (user_id = auth.uid() or public.user_belongs_to_org(organization_id));
create policy assets_read on public.assets for select using (public.user_can_access_location(location_id));
create policy tasks_read on public.tasks for select using (public.user_can_access_location(location_id));
create policy tasks_insert on public.tasks for insert with check (public.user_can_access_location(location_id));
create policy tasks_update on public.tasks for update using (public.user_can_access_location(location_id)) with check (public.user_can_access_location(location_id));
create policy incidents_read on public.incidents for select using (public.user_can_access_location(location_id));
create policy incidents_insert on public.incidents for insert with check (public.user_can_access_location(location_id));
create policy incidents_update on public.incidents for update using (public.user_can_access_location(location_id)) with check (public.user_can_access_location(location_id));
create policy incident_events_read on public.incident_events for select using (exists (select 1 from public.incidents i where i.id = incident_id and public.user_can_access_location(i.location_id)));
create policy incident_events_insert on public.incident_events for insert with check (exists (select 1 from public.incidents i where i.id = incident_id and public.user_can_access_location(i.location_id)));
create policy handovers_read on public.handovers for select using (public.user_can_access_location(location_id));
create policy handovers_insert on public.handovers for insert with check (public.user_can_access_location(location_id));
create policy messages_read on public.messages for select using (public.user_belongs_to_org(organization_id) and (location_id is null or public.user_can_access_location(location_id)));
create policy messages_insert on public.messages for insert with check (public.user_belongs_to_org(organization_id) and sender_id = auth.uid() and (location_id is null or public.user_can_access_location(location_id)));
create policy ai_actions_read on public.ai_actions for select using (public.user_belongs_to_org(organization_id));
create policy audit_read on public.audit_events for select using (public.user_belongs_to_org(organization_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
