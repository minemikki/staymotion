-- StayMotion — 0007 membership write lockdown
-- Membership rows define authorization. They must not be directly editable from
-- an authenticated browser, because a row-level policy cannot safely express
-- every old-role -> new-role escalation rule.
--
-- New members are created through invite_member(); onboarding ownership is
-- created through create_organization_with_owner(); pending memberships are
-- attached by security-definer functions/triggers. Future role edits should get
-- their own explicit RPC with hierarchy checks rather than reopening table writes.

drop policy if exists memberships_write on public.memberships;

revoke insert, update, delete on public.memberships from authenticated;
