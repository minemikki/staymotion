-- StayMotion — 0008 SECURITY DEFINER execute lockdown
-- Public/anon must never be able to invoke privileged RPCs or trigger helpers.
-- Authenticated users retain execute only for intentionally exposed StayMotion RPCs.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.attach_pending_memberships() from public, anon, authenticated;
revoke all on function public.enforce_incident_integrity() from public, anon, authenticated;

revoke all on function public.append_incident_note(uuid, jsonb) from public, anon;
grant execute on function public.append_incident_note(uuid, jsonb) to authenticated;

revoke all on function public.create_organization_with_owner(text, text, text, text, text[], text[], jsonb) from public, anon;
grant execute on function public.create_organization_with_owner(text, text, text, text, text[], text[], jsonb) to authenticated;

revoke all on function public.claim_pending_invitations() from public, anon;
grant execute on function public.claim_pending_invitations() to authenticated;

revoke all on function public.get_my_session_context() from public, anon;
grant execute on function public.get_my_session_context() to authenticated;

revoke all on function public.consume_ai_quota(text, integer, text, numeric) from public, anon;
grant execute on function public.consume_ai_quota(text, integer, text, numeric) to authenticated;

revoke all on function public.finalize_ai_request(uuid, text, text, integer, integer, integer, numeric, boolean, jsonb) from public, anon;
grant execute on function public.finalize_ai_request(uuid, text, text, integer, integer, integer, numeric, boolean, jsonb) to authenticated;

revoke all on function public.invite_member(uuid, uuid, uuid, public.membership_role, text, text, text) from public, anon;
grant execute on function public.invite_member(uuid, uuid, uuid, public.membership_role, text, text, text) to authenticated;

revoke all on function public.set_task_completion(uuid, boolean) from public, anon;
grant execute on function public.set_task_completion(uuid, boolean) to authenticated;

-- RLS helper functions are intentionally callable only by authenticated users.
-- They still validate auth.uid() and do not expose rows by themselves.
revoke all on function public.user_belongs_to_org(uuid) from public, anon;
grant execute on function public.user_belongs_to_org(uuid) to authenticated;
revoke all on function public.user_can_access_location(uuid) from public, anon;
grant execute on function public.user_can_access_location(uuid) to authenticated;
revoke all on function public.user_is_manager_at(uuid) from public, anon;
grant execute on function public.user_is_manager_at(uuid) to authenticated;
revoke all on function public.user_role_in_org(uuid) from public, anon;
grant execute on function public.user_role_in_org(uuid) to authenticated;
revoke all on function public.user_can_view_profile(uuid) from public, anon;
grant execute on function public.user_can_view_profile(uuid) to authenticated;
