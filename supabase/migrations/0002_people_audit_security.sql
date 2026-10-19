-- Phase 2, milestone M2: people management, audit log, 2FA enforcement,
-- recovery codes, email log and a database-backed rate limiter.
-- Run once in the Supabase SQL Editor (development project first) AFTER 0001.
--
-- Same rules as 0001: explicit GRANTs only, explicit RLS policies, helper
-- functions in the private schema, fixed search_path, nothing executable by
-- PUBLIC unless intended.

begin;

-- ---------------------------------------------------------------------------
-- 1. Staff and Admin powers need a two-factor (aal2) session.
--    A Staff/Admin who has only logged in with a password is treated as a
--    plain Member by every database rule that asks for their role.
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
                and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2'
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

-- ---------------------------------------------------------------------------
-- 2. Audit log: append-only
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  -- No foreign key on purpose: deleting a login must never edit an audit row.
  actor_id    uuid,
  actor_role  public.user_role,
  action      text not null check (char_length(action) between 3 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id   text,
  before      jsonb,
  after       jsonb,
  detail      text check (detail is null or char_length(detail) <= 500),
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_action_idx on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from public;
revoke all on table public.audit_log from anon;
revoke all on table public.audit_log from authenticated;
revoke all on table public.audit_log from service_role;
grant select on table public.audit_log to authenticated;     -- RLS: admins only
grant select, insert on table public.audit_log to service_role;

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using ((select private.current_user_role()) = 'admin');

-- Nobody, not even the table owner, can change or remove an audit row.
create or replace function private.audit_log_is_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

revoke all on function private.audit_log_is_append_only() from public;
revoke all on function private.audit_log_is_append_only() from anon;
revoke all on function private.audit_log_is_append_only() from authenticated;

drop trigger if exists audit_log_no_change on public.audit_log;
create trigger audit_log_no_change
  before update or delete on public.audit_log
  for each row execute function private.audit_log_is_append_only();

drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_is_append_only();

-- Writes an audit row for the signed-in caller. Used inside the functions
-- below so the log entry is part of the same transaction as the change.
create or replace function private.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb,
  p_after jsonb,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, before, after, detail)
  values (
    (select auth.uid()),
    (select p.role from public.profiles p where p.id = (select auth.uid())),
    p_action, p_entity_type, p_entity_id, p_before, p_after, p_detail
  );
end;
$$;

revoke all on function private.write_audit(text, text, text, jsonb, jsonb, text) from public;
revoke all on function private.write_audit(text, text, text, jsonb, jsonb, text) from anon;
revoke all on function private.write_audit(text, text, text, jsonb, jsonb, text) from authenticated;

-- For actions the app server performs with the service role (2FA resets,
-- recovery-code use). Only the service role may call it.
create or replace function public.write_audit_log(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb,
  p_after jsonb,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, before, after, detail)
  values (
    p_actor_id,
    (select p.role from public.profiles p where p.id = p_actor_id),
    p_action, p_entity_type, p_entity_id, p_before, p_after, p_detail
  );
end;
$$;

revoke all on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb, text) from public;
revoke all on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb, text) from anon;
revoke all on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb, text) from authenticated;
grant execute on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Email log (app-sent emails; the Email health page reads it)
-- ---------------------------------------------------------------------------
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  to_user_id  uuid,
  template    text not null check (char_length(template) between 1 and 80),
  status      text not null check (status in ('sent', 'failed')),
  provider    text,
  provider_id text,
  error       text check (error is null or char_length(error) <= 500),
  created_at  timestamptz not null default now()
);

create index if not exists email_log_created_at_idx on public.email_log (created_at desc);

alter table public.email_log enable row level security;
revoke all on table public.email_log from public;
revoke all on table public.email_log from anon;
revoke all on table public.email_log from authenticated;
grant select on table public.email_log to authenticated;     -- RLS: admins only
grant select, insert on table public.email_log to service_role;

drop policy if exists email_log_select_admin on public.email_log;
create policy email_log_select_admin
  on public.email_log
  for select
  to authenticated
  using ((select private.current_user_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- 4. Recovery codes (only hashes are stored; only the service role can touch them)
-- ---------------------------------------------------------------------------
create table if not exists public.recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, code_hash)
);

create index if not exists recovery_codes_user_idx on public.recovery_codes (user_id);

alter table public.recovery_codes enable row level security;
revoke all on table public.recovery_codes from public;
revoke all on table public.recovery_codes from anon;
revoke all on table public.recovery_codes from authenticated;
grant select, insert, update, delete on table public.recovery_codes to service_role;
-- No policy for anon or authenticated: they can never read or write this table.

-- ---------------------------------------------------------------------------
-- 5. Database-backed rate limiter (survives serverless restarts)
--    Only the service role (our server code) may call it, so a visitor cannot
--    use it to burn someone else's allowance.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_events (
  id         bigint generated always as identity primary key,
  key        text not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_events_lookup_idx on public.rate_events (key, action, created_at desc);

alter table public.rate_events enable row level security;
revoke all on table public.rate_events from public;
revoke all on table public.rate_events from anon;
revoke all on table public.rate_events from authenticated;
grant select, insert, delete on table public.rate_events to service_role;

-- Returns true when the caller is OVER the limit (and records nothing then).
create or replace function public.check_rate_limit(
  p_key text,
  p_action text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit settings';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_key || '|' || p_action, 0));

  select count(*) into v_count
  from public.rate_events
  where key = p_key
    and action = p_action
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return true;
  end if;

  insert into public.rate_events (key, action) values (p_key, p_action);

  -- Tidy up old rows now and then.
  if random() < 0.02 then
    delete from public.rate_events where created_at < now() - interval '1 day';
  end if;
  return false;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Admin functions (run as the signed-in Admin; each one re-checks the role
--    and the two-factor level inside the database, and writes the audit log)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  is_active boolean,
  email_confirmed boolean,
  mfa_enrolled boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if (select private.current_user_role()) is distinct from 'admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.phone,
    p.role,
    p.is_active,
    (u.email_confirmed_at is not null),
    exists (
      select 1 from auth.mfa_factors f
      where f.user_id = p.id
        and f.factor_type::text = 'totp'
        and f.status::text = 'verified'
    ),
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and (
      coalesce(p_search, '') = ''
      or position(lower(p_search) in lower(coalesce(u.email, ''))) > 0
      or position(lower(p_search) in lower(p.full_name)) > 0
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

revoke all on function public.admin_list_users(text, integer, integer) from public;
revoke all on function public.admin_list_users(text, integer, integer) from anon;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

create or replace function public.set_user_role(p_target uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.user_role;
begin
  if (select private.current_user_role()) is distinct from 'admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_target = (select auth.uid()) then
    raise exception 'You cannot change your own role.' using errcode = 'P0001';
  end if;

  select p.role into v_before
  from public.profiles p
  where p.id = p_target and p.deleted_at is null
  for update;
  if not found then
    raise exception 'That person was not found.' using errcode = 'P0001';
  end if;
  if v_before = p_role then
    return;
  end if;

  if v_before = 'admin' and p_role <> 'admin' and not exists (
    select 1 from public.profiles p
    where p.role = 'admin' and p.is_active and p.deleted_at is null and p.id <> p_target
  ) then
    raise exception 'The last Admin cannot be removed.' using errcode = 'P0001';
  end if;

  update public.profiles set role = p_role where id = p_target;

  perform private.write_audit(
    'role.change', 'profile', p_target::text,
    jsonb_build_object('role', v_before), jsonb_build_object('role', p_role), null
  );
end;
$$;

revoke all on function public.set_user_role(uuid, public.user_role) from public;
revoke all on function public.set_user_role(uuid, public.user_role) from anon;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;

create or replace function public.set_user_active(p_target uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before boolean;
  v_role public.user_role;
begin
  if (select private.current_user_role()) is distinct from 'admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_target = (select auth.uid()) then
    raise exception 'You cannot deactivate your own account.' using errcode = 'P0001';
  end if;

  select p.is_active, p.role into v_before, v_role
  from public.profiles p
  where p.id = p_target and p.deleted_at is null
  for update;
  if not found then
    raise exception 'That person was not found.' using errcode = 'P0001';
  end if;
  if v_before = p_active then
    return;
  end if;

  if not p_active and v_role = 'admin' and not exists (
    select 1 from public.profiles p
    where p.role = 'admin' and p.is_active and p.deleted_at is null and p.id <> p_target
  ) then
    raise exception 'The last Admin cannot be deactivated.' using errcode = 'P0001';
  end if;

  update public.profiles set is_active = p_active where id = p_target;

  perform private.write_audit(
    case when p_active then 'user.reactivate' else 'user.deactivate' end,
    'profile', p_target::text,
    jsonb_build_object('is_active', v_before), jsonb_build_object('is_active', p_active), null
  );
end;
$$;

revoke all on function public.set_user_active(uuid, boolean) from public;
revoke all on function public.set_user_active(uuid, boolean) from anon;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;

-- Checks that the caller may reset someone's two-factor, and returns the
-- details the app needs. The app then does the reset with the service role.
create or replace function public.admin_mfa_reset_precheck(p_target uuid)
returns table (email text, role public.user_role, full_name text)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if (select private.current_user_role()) is distinct from 'admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_target = (select auth.uid()) then
    raise exception 'Use a recovery code to reset your own two-factor.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_target and p.deleted_at is null and p.role in ('staff', 'admin')
  ) then
    raise exception 'Only Staff and Admin accounts have two-factor to reset.' using errcode = 'P0001';
  end if;
  return query
  select u.email::text, p.role, p.full_name
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_target and p.deleted_at is null;
end;
$$;

revoke all on function public.admin_mfa_reset_precheck(uuid) from public;
revoke all on function public.admin_mfa_reset_precheck(uuid) from anon;
grant execute on function public.admin_mfa_reset_precheck(uuid) to authenticated;

commit;
