-- Keep an invited membership visibly pending until the invited user actually signs in.
-- Supabase admin invite may create auth.users immediately; the app bootstrap calls this
-- RPC after a real session exists, which finalizes the membership and clears invite state.

create or replace function public.claim_pending_invitations()
returns integer
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return 0; end if;

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

  update public.profiles
  set email = coalesce(email, v_email), updated_at = now()
  where id = v_uid;

  return v_count;
end;
$function$;

revoke all on function public.claim_pending_invitations() from public, anon;
grant execute on function public.claim_pending_invitations() to authenticated;
