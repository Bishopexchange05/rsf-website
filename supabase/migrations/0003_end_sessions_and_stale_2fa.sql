-- Phase 2, milestone M2 follow-up: end sessions, and stop a stale session from
-- keeping Staff or Admin access after the authenticator is removed.
-- Run once in the Supabase SQL Editor AFTER 0001 and 0002.
--
-- Problem found in testing: after an Admin reset someone's two-step verification
-- (or a recovery code removed it), that person's already-open session kept
-- working, because the database only looked at the "aal2" claim inside their
-- login token, which stays valid for up to an hour.
--
-- Two fixes, both here:
--   1. A function the server calls to end a person's sessions.
--   2. The database's role check now ALSO requires that the person still has a
--      verified authenticator and that their session still exists. A stale
--      token therefore loses Staff/Admin power immediately, even before it expires.

begin;

-- ---------------------------------------------------------------------------
-- 1. End a person's sessions (service role only).
--    p_except_session lets the recovery-code flow keep the session that is
--    being used to set up a new authenticator.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_user_sessions(
  p_target uuid,
  p_except_session uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from auth.sessions s
  where s.user_id = p_target
    and (p_except_session is null or s.id <> p_except_session);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid, uuid) from public;
revoke all on function public.revoke_user_sessions(uuid, uuid) from anon;
revoke all on function public.revoke_user_sessions(uuid, uuid) from authenticated;
grant execute on function public.revoke_user_sessions(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Role check that cannot be fooled by a stale token.
--    Staff and Admin only count as Staff/Admin when ALL of these are true:
--      * the token says aal2 (a code was entered in this session),
--      * the person still has a verified authenticator,
--      * the session named in the token still exists.
--    Otherwise they are treated as a plain Member.
-- ---------------------------------------------------------------------------
create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when p.role in ('staff', 'admin')
                and not (
                  coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
                  and exists (
                    select 1
                    from auth.mfa_factors f
                    where f.user_id = p.id
                      and f.factor_type::text = 'totp'
                      and f.status::text = 'verified'
                  )
                  and (
                    coalesce((select auth.jwt() ->> 'session_id'), '') = ''
                    or exists (
                      select 1
                      from auth.sessions s
                      where s.id = ((select auth.jwt() ->> 'session_id'))::uuid
                        and s.user_id = p.id
                    )
                  )
                )
             then 'member'::public.user_role
           else p.role
         end
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
    and p.deleted_at is null;
$$;

revoke all on function private.current_user_role() from public;
revoke all on function private.current_user_role() from anon;
grant execute on function private.current_user_role() to authenticated;

commit;
