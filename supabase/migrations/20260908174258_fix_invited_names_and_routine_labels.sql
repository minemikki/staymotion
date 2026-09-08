-- Preserve the manager-provided invite name when the invited employee claims
-- their membership. The auth trigger may initially create a profile using the
-- email address when passwordless sign-in has no full_name metadata.
create or replace function public.claim_pending_invitations()
returns integer
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invited_name text;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return 0; end if;

  select nullif(btrim(m.invited_name), '')
    into v_invited_name
  from public.memberships m
  where m.active = true
    and m.invited_name is not null
    and (
      m.user_id = v_uid
      or (
        m.user_id is null
        and m.invited_email is not null
        and lower(m.invited_email) = lower(v_email)
      )
    )
  order by m.created_at
  limit 1;

  update public.profiles
  set full_name = case
        when v_invited_name is not null
          and (full_name is null or btrim(full_name) = '' or lower(full_name) = lower(v_email))
          then v_invited_name
        else full_name
      end,
      email = coalesce(email, v_email),
      updated_at = now()
  where id = v_uid;

  update public.memberships
  set user_id = v_uid,
      invited_email = null,
      invited_name = null
  where active = true
    and (
      user_id = v_uid
      or (
        user_id is null
        and invited_email is not null
        and lower(invited_email) = lower(v_email)
      )
    );
  get diagnostics v_count = row_count;

  return v_count;
end;
$function$;

revoke all on function public.claim_pending_invitations() from public, anon;
grant execute on function public.claim_pending_invitations() to authenticated;

-- Existing pilot rows were created with the automation key as their visible
-- title. Repair every known starter routine without changing completion state.
update public.tasks t
set title = r.title,
    description = r.description,
    estimated_minutes = r.estimated_minutes,
    updated_at = now()
from (values
  ('open_routine', 'Åpningsrutine', 'Lys, kasse, bord og hygienesjekk før første gjest.', 10),
  ('temp_check', 'Sjekk kjøletemperatur', 'Les av kjøl og frys. Meld fra hvis temperaturen avviker.', 2),
  ('allergen_check', 'Kontroller allergenlisten', 'Stemmer allergenlisten med dagens meny?', 1),
  ('hygiene_round', 'Renholdsrunde', 'Kontroller overflater, gulv, toaletter og søppel.', 8),
  ('close_routine', 'Stengerutine', 'Kontroller kjøl, avtrekk, søppel, kasse og dører før stenging.', 10)
) as r(key, title, description, estimated_minutes)
where t.automation_key = r.key
  and t.title = t.automation_key;

-- Future onboarding stores human-facing Norwegian content while retaining the
-- stable automation key separately for rules and reporting.
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
  insert into public.tasks(
    organization_id, location_id, title, description, status, assigned_role,
    automation_key, due_at, estimated_minutes, created_by
  )
    select v_org.id, v_loc.id, r.title, r.description, 'open', 'employee',
           r.key, date_trunc('day', now()) + interval '10 hours', r.estimated_minutes, v_uid
    from unnest(coalesce(p_template_keys, array[]::text[])) as selected(key)
    join (values
      ('open_routine', 'Åpningsrutine', 'Lys, kasse, bord og hygienesjekk før første gjest.', 10),
      ('temp_check', 'Sjekk kjøletemperatur', 'Les av kjøl og frys. Meld fra hvis temperaturen avviker.', 2),
      ('allergen_check', 'Kontroller allergenlisten', 'Stemmer allergenlisten med dagens meny?', 1),
      ('hygiene_round', 'Renholdsrunde', 'Kontroller overflater, gulv, toaletter og søppel.', 8),
      ('close_routine', 'Stengerutine', 'Kontroller kjøl, avtrekk, søppel, kasse og dører før stenging.', 10)
    ) as r(key, title, description, estimated_minutes) using (key);
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action, after_data)
    values (v_org.id, v_uid, 'organization', v_org.id, 'created', jsonb_build_object('name', v_org.name, 'location', v_loc.name));
  return jsonb_build_object('organization', to_jsonb(v_org), 'location', to_jsonb(v_loc), 'owner', to_jsonb(v_prof), 'membership', to_jsonb(v_mem));
end $$;

revoke all on function public.create_organization_with_owner(text, text, text, text, text[], text[], jsonb) from public, anon;
grant execute on function public.create_organization_with_owner(text, text, text, text, text[], text[], jsonb) to authenticated;
