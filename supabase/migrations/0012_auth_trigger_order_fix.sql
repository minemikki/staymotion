-- StayMotion — make auth user trigger order safe.
-- memberships.user_id references public.profiles(id), so profile creation must
-- be guaranteed before a pending membership is attached. PostgreSQL executes
-- same-event triggers alphabetically, therefore both trigger functions are
-- made idempotent and order-independent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email),
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

create or replace function public.attach_pending_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email),
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();

  update public.memberships
     set user_id = new.id
   where user_id is null
     and invited_email is not null
     and lower(invited_email) = lower(new.email);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.attach_pending_memberships() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.attach_pending_memberships() to supabase_auth_admin;
