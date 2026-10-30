-- Phase 2, milestone M8, group 1 (addition): delete dormant accounts after 24 months, with a warning first.
-- Run once in the Supabase SQL Editor AFTER 0001 to 0013.
--
-- A MEMBER account is "dormant" when its last activity is more than 24 months ago. Last activity is the
-- latest of: the last sign-in, when the account was created, and the last change to any of its bookings.
--   * At 23 months of inactivity the website emails a warning (the database only says WHO to warn).
--   * 30 days after that warning, if the person has still not come back, the account is deleted by
--     the same steps as "Delete my account": bookings anonymised, accounting figures kept, login removed.
--   * If the person signs in (or does anything) after the warning, the warning is cleared automatically.
-- Staff and Admin accounts are never touched. Only the website's server key can call these functions.

begin;

alter table public.profiles add column if not exists dormant_warned_at timestamptz;

create or replace function private.account_last_activity(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    (select u.last_sign_in_at from auth.users u where u.id = p_user),
    (select p.created_at from public.profiles p where p.id = p_user),
    (select max(b.updated_at) from public.bookings b where b.user_id = p_user)
  );
$$;

revoke all on function private.account_last_activity(uuid) from public;
revoke all on function private.account_last_activity(uuid) from anon;
revoke all on function private.account_last_activity(uuid) from authenticated;

-- Who should get the warning email now (at most 50 a day).
create or replace function public.dormant_accounts_to_warn()
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.role = 'member' and p.is_active and p.deleted_at is null
    and p.dormant_warned_at is null
    and private.account_last_activity(p.id) < now() - interval '23 months'
  order by p.created_at
  limit 50;
$$;

-- Who should be deleted now: warned at least 30 days ago and still dormant (at most 50 a day).
create or replace function public.dormant_accounts_to_delete()
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.role = 'member' and p.deleted_at is null
    and p.dormant_warned_at is not null
    and p.dormant_warned_at < now() - interval '30 days'
    and private.account_last_activity(p.id) < now() - interval '24 months'
  order by p.dormant_warned_at
  limit 50;
$$;

create or replace function public.mark_dormant_warned(p_users uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.profiles set dormant_warned_at = now()
  where id = any (coalesce(p_users, '{}')) and role = 'member';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- "Delete my account" now also records WHY (the owner asked, or 24 months of inactivity).
drop function if exists public.anonymise_user_data(uuid);

create or replace function public.anonymise_user_data(p_user uuid, p_reason text default 'owner')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_bookings integer;
begin
  if p_user is null then
    raise exception 'No account given.' using errcode = 'P0001';
  end if;

  select p.role into v_role from public.profiles p where p.id = p_user;
  if v_role in ('staff', 'admin') then
    raise exception 'Staff and Admin accounts must be changed to Member by an Admin first.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.user_id = p_user
      and (
        (b.status = 'pending_payment' and b.hold_expires_at > now())
        or b.status in ('payment_claimed', 'pending_approval')
        or (b.status = 'confirmed' and b.ends_at > now())
        or (b.refund_owed and b.refund_done_at is null)
      )
  ) then
    raise exception 'You still have a booking or a refund that is not finished.' using errcode = 'P0001';
  end if;

  update public.payments set customer_reference = null, updated_at = now()
  where booking_id in (select id from public.bookings where user_id = p_user);

  update public.booking_events set actor_id = null where actor_id = p_user;

  update public.bookings
  set user_id = null,
      cancelled_by = case when cancelled_by = p_user then null else cancelled_by end,
      approved_by = case when approved_by = p_user then null else approved_by end,
      updated_at = now()
  where user_id = p_user or cancelled_by = p_user or approved_by = p_user;
  get diagnostics v_bookings = row_count;

  update public.email_log set to_user_id = null where to_user_id = p_user;

  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, after, detail)
  values (null, null, 'account.delete', 'account', p_user::text,
          jsonb_build_object('bookings_unlinked', v_bookings, 'reason', case when p_reason = 'dormant' then 'dormant' else 'owner' end),
          case when p_reason = 'dormant'
               then 'Account deleted after 24 months of inactivity (warned 30 days before); bookings anonymised.'
               else 'Account deleted by its owner; bookings anonymised.' end);

  return jsonb_build_object('bookings_unlinked', v_bookings);
end;
$$;

-- The daily retention job also clears a dormancy warning when the person has come back.
create or replace function private.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cut timestamptz := now() - interval '12 months';
  v_users uuid[];
  v_bookings integer := 0;
  v_emails integer := 0;
  v_rate integer := 0;
  v_cleared integer := 0;
begin
  select coalesce(array_agg(x.uid), '{}') into v_users
  from (
    select b.user_id as uid
    from public.bookings b
    where b.user_id is not null
    group by b.user_id
    having greatest(
      (select u.last_sign_in_at from auth.users u where u.id = b.user_id),
      max(b.updated_at)
    ) < v_cut
  ) x;

  with old_b as (
    select b.id from public.bookings b
    where b.user_id = any (v_users)
      and b.ends_at < v_cut
      and b.status in ('cancelled', 'expired', 'rejected', 'completed', 'no_show', 'confirmed')
      and not (b.refund_owed and b.refund_done_at is null)
  ), p as (
    update public.payments set customer_reference = null, updated_at = now()
    where booking_id in (select id from old_b) returning 1
  ), e as (
    update public.booking_events set actor_id = null
    where booking_id in (select id from old_b) and actor_id = any (v_users) returning 1
  ), u as (
    update public.bookings set user_id = null, cancelled_by = null, approved_by = null, updated_at = now()
    where id in (select id from old_b) returning 1
  )
  select count(*) into v_bookings from u;

  delete from public.email_log where created_at < v_cut;
  get diagnostics v_emails = row_count;

  delete from public.rate_events where created_at < now() - interval '7 days';
  get diagnostics v_rate = row_count;

  -- Someone warned for inactivity who has since come back: clear the warning.
  update public.profiles set dormant_warned_at = null
  where dormant_warned_at is not null and private.account_last_activity(id) > dormant_warned_at;
  get diagnostics v_cleared = row_count;

  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, after, detail)
  values (null, null, 'retention.run', 'system', 'retention',
          jsonb_build_object('bookings_anonymised', v_bookings, 'email_log_deleted', v_emails,
                             'rate_events_deleted', v_rate, 'dormancy_warnings_cleared', v_cleared),
          'Daily retention job.');

  return jsonb_build_object('bookings_anonymised', v_bookings, 'email_log_deleted', v_emails,
                            'rate_events_deleted', v_rate, 'dormancy_warnings_cleared', v_cleared);
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what (the website's server key only)
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.dormant_accounts_to_warn()',
    'public.dormant_accounts_to_delete()',
    'public.mark_dormant_warned(uuid[])',
    'public.anonymise_user_data(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('revoke all on function %s from authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$$;

commit;
