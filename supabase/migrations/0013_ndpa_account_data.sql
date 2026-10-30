-- Phase 2, milestone M8, group 1: personal-data rights (NDPA).
-- Run once in the Supabase SQL Editor AFTER 0001 to 0012.
--
--   * "I am 18 or over" at registration: only THAT it was confirmed and WHEN is stored
--     (profiles.adult_confirmed_at). No date of birth, no age.
--   * Download my data: export_my_data() returns everything held about the signed-in person,
--     and only about them.
--   * Delete my account: anonymise_user_data() is run by the website (server key only) BEFORE the
--     login is deleted. It unlinks and scrubs the person's bookings, keeps the accounting figures
--     (amounts, dates, references), and refuses while a booking or refund is still open.
--   * Retention: run_retention() anonymises bookings 12 months after the person's last activity,
--     deletes the email log after 12 months and old rate-limit rows after 7 days. The audit log and
--     the accounting figures are never deleted. A daily pg_cron job runs it (if pg_cron is on).
--
-- Same rules as before: explicit grants, no direct writes, the audit log records what happened.

begin;

-- ---------------------------------------------------------------------------
-- 18+ confirmation at registration
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists adult_confirmed_at timestamptz;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role, terms_accepted_at, adult_confirmed_at)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'member',
    case when (new.raw_user_meta_data ->> 'terms_accepted') = 'true' then now() end,
    case when (new.raw_user_meta_data ->> 'adult_confirmed') = 'true' then now() end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Download my data
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'about_this_file', 'Everything RSF holds about you through the website. Amounts are in naira. Times are UTC.',
    'exported_at', now(),
    'account', (
      select jsonb_build_object(
        'name', p.full_name, 'phone', p.phone, 'email', u.email, 'account_type', p.role,
        'student', p.is_student, 'terms_accepted_at', p.terms_accepted_at,
        'confirmed_18_or_over_at', p.adult_confirmed_at, 'created_at', p.created_at
      )
      from public.profiles p join auth.users u on u.id = p.id
      where p.id = v_uid
    ),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reference', b.reference, 'type', b.kind, 'status', b.status,
        'starts_at', b.starts_at, 'ends_at', b.ends_at, 'amount_naira', b.amount_kobo / 100.0,
        'student_price', b.is_student_price, 'created_at', b.created_at,
        'cancelled_at', b.cancelled_at, 'cancel_reason', b.cancel_reason,
        'refund_owed', b.refund_owed, 'refund_done_at', b.refund_done_at,
        'confirmed_18_or_over_at', b.age_confirmed_at, 'approved_at', b.approved_at
      ) order by b.created_at)
      from public.bookings b where b.user_id = v_uid
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'booking_reference', b.reference, 'status', pay.status,
        'amount_expected_naira', pay.expected_kobo / 100.0,
        'what_you_told_us', pay.customer_reference, 'marked_paid_at', pay.claimed_at,
        'amount_received_naira', pay.received_kobo / 100.0, 'decided_at', pay.confirmed_at,
        'reason_if_not_accepted', pay.rejected_reason
      ) order by pay.claimed_at)
      from public.payments pay join public.bookings b on b.id = pay.booking_id
      where b.user_id = v_uid
    ), '[]'::jsonb),
    'what_happened_to_your_bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'booking_reference', b.reference, 'became', e.to_status, 'note', e.note, 'at', e.created_at
      ) order by e.created_at)
      from public.booking_events e join public.bookings b on b.id = e.booking_id
      where b.user_id = v_uid
    ), '[]'::jsonb),
    'emails_we_sent_you', coalesce((
      select jsonb_agg(jsonb_build_object('type', l.template, 'result', l.status, 'at', l.created_at) order by l.created_at)
      from public.email_log l where l.to_user_id = v_uid
    ), '[]'::jsonb)
  ) into v_result;

  perform private.write_audit('account.export', 'account', v_uid::text, null, null, null);
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete my account: the data part (the website then deletes the login)
-- ---------------------------------------------------------------------------
create or replace function public.anonymise_user_data(p_user uuid)
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

  -- Not while something is still open: an unpaid hold, a payment being checked, a request waiting,
  -- a booking that has not ended, or a refund we still owe.
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
          jsonb_build_object('bookings_unlinked', v_bookings), 'Account deleted by its owner; bookings anonymised.');

  return jsonb_build_object('bookings_unlinked', v_bookings);
end;
$$;

-- ---------------------------------------------------------------------------
-- Retention (12 months), run daily
-- ---------------------------------------------------------------------------
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
begin
  -- People whose last activity (sign-in, or the last change to any of their bookings) is over 12 months ago.
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

  -- Anonymise their OLD finished bookings: unlink the person and clear what they typed.
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

  -- The audit log and the accounting figures are never deleted.
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, after, detail)
  values (null, null, 'retention.run', 'system', 'retention',
          jsonb_build_object('bookings_anonymised', v_bookings, 'email_log_deleted', v_emails, 'rate_events_deleted', v_rate),
          'Daily retention job.');

  return jsonb_build_object('bookings_anonymised', v_bookings, 'email_log_deleted', v_emails, 'rate_events_deleted', v_rate);
end;
$$;

-- A service-role entry point, so the job can also be run and tested by hand.
create or replace function public.run_retention()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.run_retention();
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
revoke all on function public.export_my_data() from public;
revoke all on function public.export_my_data() from anon;
grant execute on function public.export_my_data() to authenticated;

revoke all on function public.anonymise_user_data(uuid) from public;
revoke all on function public.anonymise_user_data(uuid) from anon;
revoke all on function public.anonymise_user_data(uuid) from authenticated;
grant execute on function public.anonymise_user_data(uuid) to service_role;

revoke all on function private.run_retention() from public;
revoke all on function private.run_retention() from anon;
revoke all on function private.run_retention() from authenticated;

revoke all on function public.run_retention() from public;
revoke all on function public.run_retention() from anon;
revoke all on function public.run_retention() from authenticated;
grant execute on function public.run_retention() to service_role;

-- ---------------------------------------------------------------------------
-- Schedule it every day at 02:15 (needs the pg_cron extension, already on in development)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('rsf-retention') where exists (select 1 from cron.job where jobname = 'rsf-retention');
    perform cron.schedule('rsf-retention', '15 2 * * *', 'select private.run_retention();');
  else
    raise notice 'pg_cron is off, so the daily retention job was NOT scheduled. Switch it on (Database, Extensions) and run this file again.';
  end if;
end
$$;

commit;
