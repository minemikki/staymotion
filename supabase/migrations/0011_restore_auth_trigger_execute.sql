-- StayMotion — allow Supabase Auth to run auth.users trigger functions.
-- Browser roles stay revoked; only Supabase's internal auth role gets EXECUTE.

grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.attach_pending_memberships() to supabase_auth_admin;
