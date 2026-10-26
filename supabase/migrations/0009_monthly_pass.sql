-- Phase 2, milestone M6: the monthly desk pass (day workspace).
-- Run once in the Supabase SQL Editor AFTER 0001 to 0008.
--
-- What this adds:
--   * a monthly pass is a booking of kind 'month' on the day space: one desk for
--     monthly_pass_days consecutive calendar days from a start date the member chooses
--     (closed days still count). It writes one slot row for every open hour of every
--     open day in its window, so the same capacity counting serves every booking type.
--   * two capacity tests, run under the same lock as day bookings:
--       1. a free desk in every hour (all booking types counted), and
--       2. fewer than monthly_pass_max_desks passes already covering each open day.
--   * get_monthly_availability(): says whether a start date is free and, if not,
--     the next start date that is.
--   * the member can cancel an unpaid pass at any time, and a confirmed pass until
--     monthly_self_cancel_cutoff_hours before its start date (a refund is then owed).
--   * confirming a pass AFTER its start date moves the start to the confirmation day,
--     unless an Admin keeps the original dates and gives a reason.
--   * Admin: extend a pass by a number of days (with a reason), cancel a pass that has
--     already started with a partial refund, see how many hours are over-booked.
--   * renew_my_pass(): a new pass that starts the day the old one ends.
--   * when opening hours are saved, the future slot rows of all passes are rebuilt.
--
-- Same rules as before: explicit grants, row level security, no direct writes, every
-- staff action re-checks the role and the two-step session and writes the audit log.

begin;

-- ---------------------------------------------------------------------------
-- New booking fields
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists extended_days integer not null default 0 check (extended_days between 0 and 366),
  -- null = the full amount; a smaller number is a partial refund agreed by an Admin
  add column if not exists refund_amount_kobo bigint check (refund_amount_kobo is null or refund_amount_kobo >= 0);

create index if not exists bookings_month_idx on public.bookings (ends_at) where kind = 'month';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Every hour slot of every OPEN day in a window of p_days days starting on p_start.
create or replace function private.pass_slots(p_start date, p_days integer)
returns timestamptz[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(x.t order by x.t), '{}'::timestamptz[])
  from (
    select ((p_start + n.n + h.opens_at) at time zone 'Africa/Lagos') + g.g * interval '1 hour' as t
    from generate_series(0, greatest(p_days, 1) - 1) as n(n)
    join public.opening_hours h
      on h.weekday = extract(isodow from (p_start + n.n))::smallint and not h.is_closed
    cross join generate_series(0, 23) as g(g)
    where p_days > 0
      and extract(epoch from h.opens_at) + (g.g + 1) * 3600 <= extract(epoch from h.closes_at)
  ) x;
$$;

revoke all on function private.pass_slots(date, integer) from public;
revoke all on function private.pass_slots(date, integer) from anon;
revoke all on function private.pass_slots(date, integer) from authenticated;

-- Would a pass over these days clash with capacity? null = no clash,
-- 'hours' = some hour has no free desk, 'cap' = the monthly pass cap is full on some day.
-- p_exclude leaves one booking out (the pass being moved or re-opened).
create or replace function private.pass_conflict(p_start date, p_days integer, p_exclude uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_space uuid;
  v_cap integer;
  v_max integer;
  v_slots timestamptz[];
begin
  select sp.id, sp.capacity into v_space, v_cap from public.spaces sp where sp.slug = 'day';
  select st.monthly_pass_max_desks into v_max from public.settings st limit 1;
  v_slots := private.pass_slots(p_start, p_days);

  if exists (
    select 1
    from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where bs.space_id = v_space and bs.slot_start = any (v_slots)
      and b.id is distinct from p_exclude
      and private.slot_is_held(b.status, b.hold_expires_at)
    group by bs.slot_start
    having count(*) >= v_cap
  ) then
    return 'hours';
  end if;

  if exists (
    select 1
    from generate_series(0, p_days - 1) as n(n)
    where exists (
        select 1 from public.opening_hours h
        where h.weekday = extract(isodow from (p_start + n.n))::smallint and not h.is_closed
      )
      and (
        select count(*) from public.bookings o
        where o.space_id = v_space and o.kind = 'month'
          and o.id is distinct from p_exclude
          and private.slot_is_held(o.status, o.hold_expires_at)
          and o.starts_at <= ((p_start + n.n)::timestamp at time zone 'Africa/Lagos')
          and o.ends_at > ((p_start + n.n)::timestamp at time zone 'Africa/Lagos')
      ) >= v_max
  ) then
    return 'cap';
  end if;

  return null;
end;
$$;

revoke all on function private.pass_conflict(date, integer, uuid) from public;
revoke all on function private.pass_conflict(date, integer, uuid) from anon;
revoke all on function private.pass_conflict(date, integer, uuid) from authenticated;

-- A day booking is never allowed on a day the member's own pass covers (backstop;
-- the website also checks before it calls the database).
create or replace function private.guard_pass_covers_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and new.kind in ('hour', 'half_day', 'day') then
    if exists (
      select 1 from public.bookings o
      where o.user_id = new.user_id and o.kind = 'month' and o.id <> new.id
        and private.slot_is_held(o.status, o.hold_expires_at)
        and o.starts_at <= new.starts_at and o.ends_at > new.starts_at
    ) then
      raise exception 'Your monthly pass covers this day.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_pass_covers_day() from public;
revoke all on function private.guard_pass_covers_day() from anon;
revoke all on function private.guard_pass_covers_day() from authenticated;

drop trigger if exists bookings_guard_pass on public.bookings;
create trigger bookings_guard_pass
  before insert on public.bookings
  for each row execute function private.guard_pass_covers_day();

-- Rebuild the FUTURE slot rows of every live pass (after opening hours change).
create or replace function private.rebuild_pass_slots()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_from date;
  v_end date;
begin
  for r in
    select b.id, b.space_id, b.starts_at, b.ends_at
    from public.bookings b
    where b.kind = 'month' and b.status in ('pending_payment', 'payment_claimed', 'confirmed') and b.ends_at > now()
  loop
    v_end := (r.ends_at at time zone 'Africa/Lagos')::date;
    v_from := greatest((r.starts_at at time zone 'Africa/Lagos')::date, v_today);
    delete from public.booking_slots bs
    where bs.booking_id = r.id and bs.slot_start >= (v_from::timestamp at time zone 'Africa/Lagos');
    insert into public.booking_slots (booking_id, space_id, slot_start)
    select r.id, r.space_id, x from unnest(private.pass_slots(v_from, v_end - v_from)) as x
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function private.rebuild_pass_slots() from public;
revoke all on function private.rebuild_pass_slots() from anon;
revoke all on function private.rebuild_pass_slots() from authenticated;

-- Hours with more held bookings than desks, from now on (Staff and Admin).
create or replace function public.get_overfilled_hours()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_space uuid;
  v_cap integer;
  v_n integer;
begin
  perform private.assert_staff();
  select sp.id, sp.capacity into v_space, v_cap from public.spaces sp where sp.slug = 'day';
  select count(*) into v_n from (
    select bs.slot_start
    from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where bs.space_id = v_space and bs.slot_start > now() and private.slot_is_held(b.status, b.hold_expires_at)
    group by bs.slot_start
    having count(*) > v_cap
  ) x;
  return v_n;
end;
$$;

-- The pass cap, for the Monthly passes page (Staff cannot read the Settings table).
create or replace function public.get_pass_cap()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cap integer;
begin
  perform private.assert_staff();
  select st.monthly_pass_max_desks into v_cap from public.settings st limit 1;
  return v_cap;
end;
$$;

-- Saving opening hours now also rebuilds the passes (same as 0004 plus the rebuild).
create or replace function public.save_opening_hours(p_hours jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  el jsonb;
  v_closed boolean;
  v_open time;
  v_close time;
  v_over integer;
begin
  perform private.assert_admin();
  if jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours) <> 7 then
    raise exception 'Opening hours must cover all 7 days.' using errcode = 'P0001';
  end if;

  select jsonb_agg(to_jsonb(h) - 'updated_by' - 'updated_at' order by h.weekday) into v_before from public.opening_hours h;

  for el in select * from jsonb_array_elements(p_hours) loop
    v_closed := coalesce((el ->> 'is_closed')::boolean, false);
    v_open := nullif(el ->> 'opens_at', '')::time;
    v_close := nullif(el ->> 'closes_at', '')::time;
    if not v_closed and (v_open is null or v_close is null or v_close <= v_open) then
      raise exception 'Each open day needs an opening time earlier than its closing time.' using errcode = 'P0001';
    end if;
    update public.opening_hours
    set is_closed = v_closed,
        opens_at = case when v_closed then null else v_open end,
        closes_at = case when v_closed then null else v_close end,
        updated_by = (select auth.uid()),
        updated_at = now()
    where weekday = (el ->> 'weekday')::smallint;
    if not found then
      raise exception 'Unknown weekday.' using errcode = 'P0001';
    end if;
  end loop;

  -- Passes follow the new hours.
  perform private.rebuild_pass_slots();
  select count(*) into v_over from (
    select bs.slot_start
    from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where bs.space_id = (select sp.id from public.spaces sp where sp.slug = 'day')
      and bs.slot_start > now() and private.slot_is_held(b.status, b.hold_expires_at)
    group by bs.slot_start
    having count(*) > (select sp.capacity from public.spaces sp where sp.slug = 'day')
  ) x;

  select jsonb_agg(to_jsonb(h) - 'updated_by' - 'updated_at' order by h.weekday) into v_after from public.opening_hours h;
  perform private.write_audit(
    'settings.hours', 'settings', 'opening_hours', v_before, v_after,
    case when v_over > 0 then v_over || ' hour(s) now have more bookings than desks' else null end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- What the booking page needs: now includes the monthly pass price and rules
-- ---------------------------------------------------------------------------
create or replace function public.get_booking_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.settings;
  v_space uuid;
  v_prices jsonb := '{}'::jsonb;
  r record;
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  select * into s from public.settings limit 1;
  if s.id is null or not s.booking_enabled then
    return jsonb_build_object('booking_enabled', false);
  end if;
  select id into v_space from public.spaces where slug = 'day';

  for r in
    select p.kind::text as kind, p.amount_kobo as std,
           (select st.amount_kobo from public.prices st
             where st.space_id = p.space_id and st.kind = p.kind and st.audience = 'student') as stu
    from public.prices p
    where p.space_id = v_space and p.audience = 'standard' and p.amount_kobo is not null
      and p.kind in ('hour', 'half_day', 'day', 'month')
  loop
    v_prices := v_prices || jsonb_build_object(
      r.kind, jsonb_build_object('standard', r.std, 'student', r.stu)
    );
  end loop;

  return jsonb_build_object(
    'booking_enabled', true,
    'advance_booking_days', s.advance_booking_days,
    'max_hours_per_booking', s.max_hours_per_booking,
    'max_unpaid_bookings', s.max_unpaid_bookings,
    'hold_minutes', s.hold_minutes,
    'half_day_split', to_char(s.half_day_split, 'HH24:MI'),
    'monthly_pass_days', s.monthly_pass_days,
    'monthly_start_window_days', s.monthly_start_window_days,
    'monthly_self_cancel_cutoff_hours', s.monthly_self_cancel_cutoff_hours,
    'prices', v_prices
  );
end;
$$;

-- Is a pass free from this start date? If not, which start date is the next that is free.
create or replace function public.get_monthly_availability(p_start date)
returns table (available boolean, reason text, next_start date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.settings;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_c text;
  d date;
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  select * into s from public.settings limit 1;
  if s.id is null or not s.booking_enabled then
    return;
  end if;
  if p_start is null or p_start < v_today or p_start > v_today + s.monthly_start_window_days then
    return query select false, 'window'::text, null::date;
    return;
  end if;

  v_c := private.pass_conflict(p_start, s.monthly_pass_days, null);
  if v_c is null then
    return query select true, null::text, null::date;
    return;
  end if;

  d := p_start + 1;
  while d <= v_today + s.monthly_start_window_days loop
    if private.pass_conflict(d, s.monthly_pass_days, null) is null then
      return query select false, v_c, d;
      return;
    end if;
    d := d + 1;
  end loop;
  return query select false, v_c, null::date;
end;
$$;

-- ---------------------------------------------------------------------------
-- Book a pass (all or nothing)
-- ---------------------------------------------------------------------------
create or replace function public.create_month_booking(p_start date, p_student boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  s public.settings;
  v_verified boolean;
  v_active boolean;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_space uuid;
  v_bookable boolean;
  v_std bigint;
  v_stu bigint;
  v_amount bigint;
  v_is_student boolean := false;
  v_unpaid integer;
  v_slots timestamptz[];
  v_c text;
  v_id uuid := gen_random_uuid();
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;

  select * into s from public.settings limit 1;
  if s.id is null or not s.booking_enabled then
    raise exception 'Booking is not open yet.' using errcode = 'P0001';
  end if;

  select (u.email_confirmed_at is not null), p.is_active into v_verified, v_active
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = v_uid and p.deleted_at is null;
  if v_active is distinct from true then
    raise exception 'Your account cannot book.' using errcode = '42501';
  end if;
  if s.require_verified_email and not coalesce(v_verified, false) then
    raise exception 'Please verify your email first.' using errcode = 'P0001';
  end if;

  if p_start is null or p_start < v_today or p_start > v_today + s.monthly_start_window_days then
    raise exception 'That date is outside the booking window.' using errcode = 'P0001';
  end if;

  select sp.id, sp.is_bookable into v_space, v_bookable from public.spaces sp where sp.slug = 'day';
  if not v_bookable then
    raise exception 'Booking is not open yet.' using errcode = 'P0001';
  end if;

  select p.amount_kobo into v_std from public.prices p
  where p.space_id = v_space and p.kind = 'month' and p.audience = 'standard';
  if v_std is null then
    raise exception 'This option is not available online. Contact us for pricing.' using errcode = 'P0001';
  end if;
  if coalesce(p_student, false) then
    select p.amount_kobo into v_stu from public.prices p
    where p.space_id = v_space and p.kind = 'month' and p.audience = 'student';
  end if;
  if v_stu is not null then
    v_amount := least(v_stu, v_std);
    v_is_student := true;
  else
    v_amount := v_std;
  end if;

  -- ==== The lock: the same one the day bookings use. ====
  perform 1 from public.spaces sp where sp.id = v_space for update;

  select count(*) into v_unpaid from public.bookings b
  where b.user_id = v_uid and b.status = 'pending_payment' and b.hold_expires_at > now();
  if v_unpaid >= s.max_unpaid_bookings then
    raise exception 'You already have the most unpaid bookings allowed. Pay or cancel one first.' using errcode = 'P0001';
  end if;

  v_slots := private.pass_slots(p_start, s.monthly_pass_days);
  if coalesce(array_length(v_slots, 1), 0) = 0 then
    raise exception 'We are closed on all of those days.' using errcode = 'P0001';
  end if;

  -- The same person cannot hold a pass and another booking for the same hour.
  if exists (
    select 1 from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where b.user_id = v_uid and bs.space_id = v_space and bs.slot_start = any (v_slots)
      and private.slot_is_held(b.status, b.hold_expires_at)
  ) then
    raise exception 'You already have a booking during those dates.' using errcode = 'P0001';
  end if;

  v_c := private.pass_conflict(p_start, s.monthly_pass_days, null);
  if v_c = 'cap' then
    raise exception 'Monthly passes are fully booked for that start date.' using errcode = 'P0001';
  elsif v_c = 'hours' then
    raise exception 'The desks are not all free for those dates.' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    id, reference, user_id, space_id, kind, starts_at, ends_at, status,
    amount_kobo, is_student_price, hold_expires_at
  ) values (
    v_id, private.new_booking_reference(), v_uid, v_space, 'month',
    (p_start::timestamp at time zone 'Africa/Lagos'),
    ((p_start + s.monthly_pass_days)::timestamp at time zone 'Africa/Lagos'),
    'pending_payment', v_amount, v_is_student, now() + make_interval(mins => s.hold_minutes)
  );

  insert into public.booking_slots (booking_id, space_id, slot_start)
  select v_id, v_space, x from unnest(v_slots) as x;

  return v_id;
end;
$$;

-- Renew: a new pass that starts the day the current one ends (or today if it already ended).
create or replace function public.renew_my_pass(p_booking uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  b public.bookings;
  s public.settings;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_end date;
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  select * into s from public.settings limit 1;
  select * into b from public.bookings x where x.id = p_booking and x.user_id = v_uid;
  if not found or b.kind <> 'month' or b.status <> 'confirmed' then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  v_end := (b.ends_at at time zone 'Africa/Lagos')::date;
  if v_end > v_today + s.monthly_start_window_days then
    raise exception 'Renewal is not open yet.' using errcode = 'P0001';
  end if;
  return public.create_month_booking(greatest(v_end, v_today), b.is_student_price);
end;
$$;

-- ---------------------------------------------------------------------------
-- Member cancel: a confirmed pass uses the monthly cutoff
-- ---------------------------------------------------------------------------
create or replace function public.cancel_my_booking(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  b public.bookings;
  s public.settings;
  v_refund boolean := false;
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  select * into s from public.settings limit 1;

  select * into b from public.bookings x where x.id = p_booking and x.user_id = v_uid for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;

  if b.status = 'pending_payment' then
    null;
  elsif b.status = 'confirmed' then
    if b.kind = 'month' then
      if b.starts_at - make_interval(hours => s.monthly_self_cancel_cutoff_hours) <= now() then
        raise exception 'It is too late to cancel online. Please contact us.' using errcode = 'P0001';
      end if;
    elsif b.starts_at - make_interval(hours => s.cancellation_cutoff_hours) <= now() then
      raise exception 'It is too late to cancel online. Please contact us.' using errcode = 'P0001';
    end if;
    v_refund := true;
  else
    raise exception 'This booking cannot be cancelled online. Please contact us.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Cancelled by the customer', true);
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = 'Cancelled by the member',
      refund_owed = v_refund, updated_at = now()
  where id = p_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff and Admin
-- ---------------------------------------------------------------------------
-- Confirm. A pass confirmed after its start date moves its start to today, unless an
-- Admin keeps the original dates (p_keep_dates) and gives a reason.
drop function if exists public.staff_confirm_payment(uuid, bigint);

create or replace function public.staff_confirm_payment(
  p_booking uuid,
  p_received_kobo bigint default null,
  p_keep_dates boolean default false,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_start date;
  v_days integer;
  v_shift boolean := false;
  v_kept boolean := false;
  v_reason text := btrim(regexp_replace(coalesce(p_reason, ''), '[[:cntrl:]]', ' ', 'g'));
  v_note text := 'Payment confirmed';
begin
  perform private.assert_staff();
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'payment_claimed' then
    raise exception 'Only a booking marked as paid can be confirmed.' using errcode = 'P0001';
  end if;
  if p_received_kobo is not null and (p_received_kobo <= 0 or p_received_kobo > 1000000000) then
    raise exception 'The amount received is not valid.' using errcode = 'P0001';
  end if;

  if b.kind = 'month' then
    v_start := (b.starts_at at time zone 'Africa/Lagos')::date;
    v_days := (b.ends_at at time zone 'Africa/Lagos')::date - v_start;
    if v_start < v_today then
      if coalesce(p_keep_dates, false) then
        perform private.assert_admin();
        if char_length(v_reason) < 3 or char_length(v_reason) > 300 then
          raise exception 'Please give a reason (3 to 300 characters).' using errcode = 'P0001';
        end if;
        v_kept := true;
        v_note := 'Payment confirmed; original pass dates kept: ' || v_reason;
      else
        -- Same lock as booking, then check the moved dates (this pass left out).
        perform 1 from public.spaces sp where sp.id = b.space_id for update;
        if private.pass_conflict(v_today, v_days, p_booking) is not null then
          raise exception 'The desks are not free for the moved dates. An Admin can keep the original dates, or cancel and refund.' using errcode = 'P0001';
        end if;
        update public.bookings
        set starts_at = (v_today::timestamp at time zone 'Africa/Lagos'),
            ends_at = ((v_today + v_days)::timestamp at time zone 'Africa/Lagos')
        where id = p_booking;
        delete from public.booking_slots where booking_id = p_booking;
        insert into public.booking_slots (booking_id, space_id, slot_start)
        select p_booking, b.space_id, x from unnest(private.pass_slots(v_today, v_days)) as x;
        v_shift := true;
        v_note := 'Payment confirmed; pass start moved to ' || to_char(v_today, 'DD Mon YYYY');
      end if;
    end if;
  end if;

  perform set_config('rsf.event_note', v_note, true);
  update public.bookings set status = 'confirmed', updated_at = now() where id = p_booking;
  update public.payments
  set status = 'confirmed', confirmed_by = (select auth.uid()), confirmed_at = now(),
      received_kobo = coalesce(p_received_kobo, b.amount_kobo), updated_at = now()
  where booking_id = p_booking;

  perform private.write_audit(
    'booking.confirm', 'booking', p_booking::text,
    jsonb_build_object('status', b.status),
    jsonb_build_object('status', 'confirmed', 'expected_kobo', b.amount_kobo,
      'received_kobo', coalesce(p_received_kobo, b.amount_kobo), 'start_moved', v_shift, 'dates_kept', v_kept),
    case when v_kept then b.reference || ': ' || v_reason else b.reference end
  );
end;
$$;

-- Staff cancel: a pass that has already started is for an Admin (partial refund).
create or replace function public.staff_cancel_booking(p_booking uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_reason text := btrim(regexp_replace(coalesce(p_reason, ''), '[[:cntrl:]]', ' ', 'g'));
  v_refund boolean;
begin
  perform private.assert_staff();
  if char_length(v_reason) < 3 or char_length(v_reason) > 300 then
    raise exception 'Please give a reason (3 to 300 characters).' using errcode = 'P0001';
  end if;
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status not in ('pending_payment', 'payment_claimed', 'confirmed') then
    raise exception 'This booking cannot be cancelled.' using errcode = 'P0001';
  end if;
  if b.kind = 'month' and b.status = 'confirmed' and b.starts_at <= now() then
    raise exception 'This pass has started. Only an Admin can cancel it, with a partial refund.' using errcode = 'P0001';
  end if;

  v_refund := (b.status = 'confirmed');

  perform set_config('rsf.event_note', 'Cancelled by the team: ' || v_reason, true);
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()), cancel_reason = v_reason,
      refund_owed = v_refund, updated_at = now()
  where id = p_booking;

  perform private.write_audit(
    'booking.cancel', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'cancelled', 'refund_owed', v_refund),
    b.reference || ': ' || v_reason
  );
end;
$$;

-- Re-open: a pass also has to pass the pass cap, not just the hours.
create or replace function public.staff_reopen_booking(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_cap integer;
  v_slot timestamptz;
  v_used integer;
  v_start date;
begin
  perform private.assert_staff();
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'expired' then
    raise exception 'Only an expired booking can be re-opened.' using errcode = 'P0001';
  end if;
  if b.ends_at <= now() then
    raise exception 'That booking time has already passed.' using errcode = 'P0001';
  end if;

  select sp.capacity into v_cap from public.spaces sp where sp.id = b.space_id for update;

  if b.kind = 'month' then
    v_start := (b.starts_at at time zone 'Africa/Lagos')::date;
    if private.pass_conflict(v_start, (b.ends_at at time zone 'Africa/Lagos')::date - v_start, p_booking) is not null then
      raise exception 'Sorry, the desks for that time are no longer available.' using errcode = 'P0001';
    end if;
  else
    for v_slot in select bs.slot_start from public.booking_slots bs where bs.booking_id = p_booking loop
      select count(*) into v_used
      from public.booking_slots bs join public.bookings o on o.id = bs.booking_id
      where bs.space_id = b.space_id and bs.slot_start = v_slot and o.id <> p_booking
        and private.slot_is_held(o.status, o.hold_expires_at);
      if v_used + 1 > v_cap then
        raise exception 'Sorry, the desks for that time are no longer available.' using errcode = 'P0001';
      end if;
    end loop;
  end if;

  perform set_config('rsf.event_note', 'Re-opened by the team after the hold ended', true);
  update public.bookings set status = 'payment_claimed', hold_expires_at = null, updated_at = now() where id = p_booking;

  insert into public.payments (booking_id, expected_kobo, customer_reference, status)
  values (p_booking, b.amount_kobo, null, 'claimed')
  on conflict (booking_id) do update
    set status = 'claimed', claimed_at = now(), rejected_reason = null, confirmed_by = null,
        confirmed_at = null, received_kobo = null, updated_at = now();

  perform private.write_audit(
    'booking.reopen', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'payment_claimed'), b.reference
  );
end;
$$;

-- Admin: add days to a confirmed pass (for example after an unexpected closure).
-- It is not blocked by full desks: the pass holder is owed the days. The Monthly
-- passes page warns if any hour ends up with more bookings than desks.
create or replace function public.admin_extend_pass(p_booking uuid, p_days integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_reason text := btrim(regexp_replace(coalesce(p_reason, ''), '[[:cntrl:]]', ' ', 'g'));
  v_end date;
  v_new_end timestamptz;
begin
  perform private.assert_admin();
  if char_length(v_reason) < 3 or char_length(v_reason) > 300 then
    raise exception 'Please give a reason (3 to 300 characters).' using errcode = 'P0001';
  end if;
  if p_days is null or p_days < 1 or p_days > 60 then
    raise exception 'The number of days must be from 1 to 60.' using errcode = 'P0001';
  end if;
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.kind <> 'month' or b.status <> 'confirmed' then
    raise exception 'Only a confirmed monthly pass can be extended.' using errcode = 'P0001';
  end if;
  if b.ends_at <= now() then
    raise exception 'That booking time has already passed.' using errcode = 'P0001';
  end if;

  perform 1 from public.spaces sp where sp.id = b.space_id for update;
  v_end := (b.ends_at at time zone 'Africa/Lagos')::date;
  v_new_end := ((v_end + p_days)::timestamp at time zone 'Africa/Lagos');

  insert into public.booking_slots (booking_id, space_id, slot_start)
  select p_booking, b.space_id, x from unnest(private.pass_slots(v_end, p_days)) as x
  on conflict do nothing;

  update public.bookings
  set ends_at = v_new_end, extended_days = extended_days + p_days, updated_at = now()
  where id = p_booking;

  insert into public.booking_events (booking_id, actor_id, actor_role, from_status, to_status, note)
  values (
    p_booking, (select auth.uid()), (select p.role from public.profiles p where p.id = (select auth.uid())),
    'confirmed', 'confirmed', 'Pass extended by ' || p_days || ' day(s): ' || v_reason
  );

  perform private.write_audit(
    'booking.extend', 'booking', p_booking::text,
    jsonb_build_object('ends_at', b.ends_at), jsonb_build_object('ends_at', v_new_end, 'days_added', p_days),
    b.reference || ': ' || v_reason
  );
end;
$$;

-- Admin: cancel a confirmed pass (also one that has started) with a refund amount of
-- your choice, from nothing up to the full price. The amount and reason are recorded.
create or replace function public.admin_cancel_pass(p_booking uuid, p_reason text, p_refund_kobo bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_reason text := btrim(regexp_replace(coalesce(p_reason, ''), '[[:cntrl:]]', ' ', 'g'));
begin
  perform private.assert_admin();
  if char_length(v_reason) < 3 or char_length(v_reason) > 300 then
    raise exception 'Please give a reason (3 to 300 characters).' using errcode = 'P0001';
  end if;
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.kind <> 'month' or b.status <> 'confirmed' then
    raise exception 'Only a confirmed monthly pass can be cancelled this way.' using errcode = 'P0001';
  end if;
  if p_refund_kobo is null or p_refund_kobo < 0 or p_refund_kobo > b.amount_kobo then
    raise exception 'The refund amount is not valid.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Pass cancelled by an Admin: ' || v_reason, true);
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()), cancel_reason = v_reason,
      refund_owed = (p_refund_kobo > 0), refund_amount_kobo = p_refund_kobo, updated_at = now()
  where id = p_booking;

  perform private.write_audit(
    'booking.cancel_pass', 'booking', p_booking::text,
    jsonb_build_object('status', b.status),
    jsonb_build_object('status', 'cancelled', 'refund_kobo', p_refund_kobo, 'price_kobo', b.amount_kobo),
    b.reference || ': ' || v_reason
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.get_overfilled_hours()',
    'public.get_pass_cap()',
    'public.get_booking_config()',
    'public.get_monthly_availability(date)',
    'public.create_month_booking(date, boolean)',
    'public.renew_my_pass(uuid)',
    'public.cancel_my_booking(uuid)',
    'public.staff_confirm_payment(uuid, bigint, boolean, text)',
    'public.staff_cancel_booking(uuid, text)',
    'public.staff_reopen_booking(uuid)',
    'public.admin_extend_pass(uuid, integer, text)',
    'public.admin_cancel_pass(uuid, text, bigint)',
    'public.save_opening_hours(jsonb)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;

commit;
