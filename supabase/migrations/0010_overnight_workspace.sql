-- Phase 2, milestone M7: the overnight workspace.
-- Run once in the Supabase SQL Editor AFTER 0001 to 0009.
--
-- How it works:
--   * A member (who ticks "I am 18 or over", stored with the time) REQUESTS some nights.
--     The request is a booking of kind 'night' with status 'pending_approval'. It holds a
--     desk for each night straight away (so the room cannot be oversold) but only for
--     overnight_request_expiry_days (default 3). After that it expires and frees the desks.
--   * The team meets the person in the office and checks ID IN PERSON. The website never
--     has an upload field and never stores any ID data.
--   * Staff or Admin press Approve (the booking becomes 'pending_payment' with the normal
--     hold, and the usual bank-transfer steps follow) or Reject (with a reason).
--   * The private address and house rules are returned ONLY by get_overnight_details(),
--     and only to the owner of a CONFIRMED overnight booking. The settings table stays
--     readable by Admins only. No other function returns them.
--   * Capacity is counted per night. Nothing here is a student price, and the optional
--     overnight monthly desk is not built (it is off for launch).
--
-- Same rules as before: explicit grants, row level security, no direct writes, every
-- staff action re-checks the role and the two-step session and writes the audit log.

begin;

-- ---------------------------------------------------------------------------
-- New fields
-- ---------------------------------------------------------------------------
alter table public.settings
  add column if not exists overnight_request_expiry_days integer not null default 3
  check (overnight_request_expiry_days between 1 and 30);

alter table public.bookings
  add column if not exists age_confirmed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid;

-- ---------------------------------------------------------------------------
-- A request only holds desks until its expiry time (kept in hold_expires_at)
-- ---------------------------------------------------------------------------
create or replace function private.slot_is_held(p_status public.booking_status, p_hold timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status in ('payment_claimed', 'confirmed', 'approved')
      or (p_status in ('pending_payment', 'pending_approval') and p_hold is not null and p_hold > now());
$$;

-- Tidies the status of overdue unpaid holds and unanswered requests (pg_cron, file 0006).
create or replace function private.expire_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('rsf.event_note', 'Time ran out', true);
  update public.bookings b
  set status = 'expired', updated_at = now()
  where b.status in ('pending_payment', 'pending_approval')
    and b.hold_expires_at is not null and b.hold_expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- The check-in moment of every night: p_nights moments, one per night.
create or replace function private.night_slots(p_checkin date, p_nights integer, p_time time)
returns timestamptz[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(((p_checkin + n.n) + p_time) at time zone 'Africa/Lagos' order by n.n), '{}'::timestamptz[])
  from generate_series(0, greatest(p_nights, 1) - 1) as n(n)
  where p_nights > 0;
$$;

revoke all on function private.night_slots(date, integer, time) from public;
revoke all on function private.night_slots(date, integer, time) from anon;
revoke all on function private.night_slots(date, integer, time) from authenticated;

-- ---------------------------------------------------------------------------
-- What the booking page needs: now includes the overnight options (never the location)
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
  v_night jsonb := jsonb_build_object('enabled', false);
  v_on_bookable boolean;
  v_on_price bigint;
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

  select sp.is_bookable into v_on_bookable from public.spaces sp where sp.slug = 'overnight';
  if coalesce(v_on_bookable, false) and s.overnight_checkin is not null and s.overnight_checkout is not null then
    select p.amount_kobo into v_on_price from public.prices p
    join public.spaces sp on sp.id = p.space_id
    where sp.slug = 'overnight' and p.kind = 'night' and p.audience = 'standard';
    v_night := jsonb_build_object(
      'enabled', true,
      'max_nights', s.overnight_max_nights,
      'night_price', v_on_price,
      'checkin', to_char(s.overnight_checkin, 'HH24:MI'),
      'checkout', to_char(s.overnight_checkout, 'HH24:MI'),
      'request_expiry_days', s.overnight_request_expiry_days
    );
  end if;

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
    'overnight', v_night,
    'prices', v_prices
  );
end;
$$;

-- Is there a desk on every one of these nights? (Counts only, no personal data.)
create or replace function public.get_overnight_availability(p_checkin date, p_nights integer)
returns table (available boolean, reason text, full_night date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.settings;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_space uuid;
  v_cap integer;
  v_bookable boolean;
  v_slots timestamptz[];
  v_slot timestamptz;
  v_used integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  select * into s from public.settings limit 1;
  if s.id is null or not s.booking_enabled then
    return;
  end if;
  select sp.id, sp.capacity, sp.is_bookable into v_space, v_cap, v_bookable from public.spaces sp where sp.slug = 'overnight';
  if not coalesce(v_bookable, false) or s.overnight_checkin is null or s.overnight_checkout is null then
    return query select false, 'closed'::text, null::date;
    return;
  end if;
  if p_nights is null or p_nights < 1 or p_nights > s.overnight_max_nights then
    return query select false, 'nights'::text, null::date;
    return;
  end if;
  if p_checkin is null or p_checkin < v_today or p_checkin > v_today + s.advance_booking_days then
    return query select false, 'window'::text, null::date;
    return;
  end if;

  v_slots := private.night_slots(p_checkin, p_nights, s.overnight_checkin);
  foreach v_slot in array v_slots loop
    select count(*) into v_used
    from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where bs.space_id = v_space and bs.slot_start = v_slot and private.slot_is_held(b.status, b.hold_expires_at);
    if v_used >= v_cap then
      return query select false, 'full'::text, (v_slot at time zone 'Africa/Lagos')::date;
      return;
    end if;
  end loop;
  return query select true, null::text, null::date;
end;
$$;

-- ---------------------------------------------------------------------------
-- Request some nights (all or nothing)
-- ---------------------------------------------------------------------------
create or replace function public.create_night_request(p_checkin date, p_nights integer, p_age_confirmed boolean)
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
  v_cap integer;
  v_bookable boolean;
  v_price bigint;
  v_slots timestamptz[];
  v_slot timestamptz;
  v_used integer;
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

  if not coalesce(p_age_confirmed, false) then
    raise exception 'You must be 18 or over to request an overnight desk.' using errcode = 'P0001';
  end if;

  select sp.id, sp.capacity, sp.is_bookable into v_space, v_cap, v_bookable from public.spaces sp where sp.slug = 'overnight';
  if not coalesce(v_bookable, false) or s.overnight_checkin is null or s.overnight_checkout is null then
    raise exception 'Booking is not open yet.' using errcode = 'P0001';
  end if;

  if p_nights is null or p_nights < 1 or p_nights > s.overnight_max_nights then
    raise exception 'You can request up to % nights at a time.', s.overnight_max_nights using errcode = 'P0001';
  end if;
  if p_checkin is null or p_checkin < v_today or p_checkin > v_today + s.advance_booking_days then
    raise exception 'That date is outside the booking window.' using errcode = 'P0001';
  end if;

  v_slots := private.night_slots(p_checkin, p_nights, s.overnight_checkin);
  if v_slots[1] <= now() then
    raise exception 'That time is too soon or already past.' using errcode = 'P0001';
  end if;

  select p.amount_kobo into v_price from public.prices p
  where p.space_id = v_space and p.kind = 'night' and p.audience = 'standard';
  if v_price is null then
    raise exception 'This option is not available online. Contact us for pricing.' using errcode = 'P0001';
  end if;

  -- ==== The lock: only one request at a time can count and take desks. ====
  perform 1 from public.spaces sp where sp.id = v_space for update;

  if exists (
    select 1 from public.bookings b
    where b.user_id = v_uid and b.kind = 'night' and b.status = 'pending_approval' and b.hold_expires_at > now()
  ) then
    raise exception 'You already have a request waiting for approval.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where b.user_id = v_uid and bs.space_id = v_space and bs.slot_start = any (v_slots)
      and private.slot_is_held(b.status, b.hold_expires_at)
  ) then
    raise exception 'You already have a booking at that time.' using errcode = 'P0001';
  end if;

  foreach v_slot in array v_slots loop
    select count(*) into v_used
    from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where bs.space_id = v_space and bs.slot_start = v_slot and private.slot_is_held(b.status, b.hold_expires_at);
    if v_used + 1 > v_cap then
      raise exception 'Sorry, that time is no longer available.' using errcode = 'P0001';
    end if;
  end loop;

  perform set_config('rsf.event_note', 'Request received (18 or over confirmed)', true);
  insert into public.bookings (
    id, reference, user_id, space_id, kind, starts_at, ends_at, status,
    amount_kobo, is_student_price, hold_expires_at, age_confirmed_at
  ) values (
    v_id, private.new_booking_reference(), v_uid, v_space, 'night',
    v_slots[1], (((p_checkin + p_nights) + s.overnight_checkout) at time zone 'Africa/Lagos'),
    'pending_approval', v_price * p_nights, false,
    now() + make_interval(days => s.overnight_request_expiry_days), now()
  );

  insert into public.booking_slots (booking_id, space_id, slot_start)
  select v_id, v_space, x from unnest(v_slots) as x;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff and Admin: approve or reject a request
-- ---------------------------------------------------------------------------
create or replace function public.staff_approve_request(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  s public.settings;
begin
  perform private.assert_staff();
  select * into s from public.settings limit 1;
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found or b.kind <> 'night' then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'pending_approval' then
    raise exception 'Only a request waiting for approval can be approved.' using errcode = 'P0001';
  end if;
  if b.hold_expires_at is null or b.hold_expires_at <= now() then
    raise exception 'This request has expired. Ask the person to make a new request.' using errcode = 'P0001';
  end if;
  if b.ends_at <= now() then
    raise exception 'That booking time has already passed.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Approved after meeting in person', true);
  update public.bookings
  set status = 'pending_payment', hold_expires_at = now() + make_interval(mins => s.hold_minutes),
      approved_at = now(), approved_by = (select auth.uid()), updated_at = now()
  where id = p_booking;

  perform private.write_audit(
    'booking.approve', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'pending_payment'), b.reference
  );
end;
$$;

create or replace function public.staff_reject_request(p_booking uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_reason text := btrim(regexp_replace(coalesce(p_reason, ''), '[[:cntrl:]]', ' ', 'g'));
begin
  perform private.assert_staff();
  if char_length(v_reason) < 3 or char_length(v_reason) > 300 then
    raise exception 'Please give a reason (3 to 300 characters).' using errcode = 'P0001';
  end if;
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found or b.kind <> 'night' then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'pending_approval' then
    raise exception 'Only a request waiting for approval can be rejected.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Request not approved: ' || v_reason, true);
  update public.bookings
  set status = 'rejected', cancel_reason = v_reason, updated_at = now()
  where id = p_booking;

  perform private.write_audit(
    'booking.reject_request', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'rejected'), b.reference || ': ' || v_reason
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The private address and house rules: ONLY the owner of a CONFIRMED overnight
-- booking that has not yet ended. Nobody else, no other state, no other function.
-- ---------------------------------------------------------------------------
create or replace function public.get_overnight_details(p_booking uuid)
returns table (location text, rules text, checkin time, checkout time)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  return query
  select s.overnight_location_private, s.overnight_rules_text, s.overnight_checkin, s.overnight_checkout
  from public.bookings b cross join public.settings s
  where b.id = p_booking and b.user_id = v_uid and b.kind = 'night'
    and b.status = 'confirmed' and b.ends_at > now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Member cancel: a request waiting for approval can be withdrawn any time
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

  if b.status in ('pending_payment', 'pending_approval') then
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
-- Re-open: a request that was never approved can never be re-opened to payment
-- ---------------------------------------------------------------------------
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
  if b.kind = 'night' and b.approved_at is null then
    raise exception 'A request that was not approved cannot be re-opened. Ask the person to make a new request.' using errcode = 'P0001';
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

-- ---------------------------------------------------------------------------
-- Booking rules: now include how long a request waits for the team
-- ---------------------------------------------------------------------------
create or replace function public.save_booking_rules(p_rules jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_day_capacity integer;
  v_max_desks integer;
begin
  perform private.assert_admin();
  if jsonb_typeof(p_rules) is distinct from 'object' then
    raise exception 'Invalid rules.' using errcode = 'P0001';
  end if;

  select to_jsonb(s) - 'id' - 'updated_by' - 'updated_at' - 'overnight_location_private' - 'overnight_rules_text'
  into v_before from public.settings s;

  v_max_desks := (p_rules ->> 'monthly_pass_max_desks')::integer;
  select capacity into v_day_capacity from public.spaces where slug = 'day';
  if v_max_desks > v_day_capacity then
    raise exception 'The monthly pass desk cap cannot be more than the number of day desks.' using errcode = 'P0001';
  end if;

  update public.settings set
    hold_minutes = (p_rules ->> 'hold_minutes')::integer,
    claimed_review_hours = (p_rules ->> 'claimed_review_hours')::integer,
    advance_booking_days = (p_rules ->> 'advance_booking_days')::integer,
    max_hours_per_booking = (p_rules ->> 'max_hours_per_booking')::integer,
    max_unpaid_bookings = (p_rules ->> 'max_unpaid_bookings')::integer,
    cancellation_cutoff_hours = (p_rules ->> 'cancellation_cutoff_hours')::integer,
    half_day_split = (p_rules ->> 'half_day_split')::time,
    monthly_pass_days = (p_rules ->> 'monthly_pass_days')::integer,
    monthly_pass_max_desks = v_max_desks,
    monthly_start_window_days = (p_rules ->> 'monthly_start_window_days')::integer,
    monthly_self_cancel_cutoff_hours = (p_rules ->> 'monthly_self_cancel_cutoff_hours')::integer,
    overnight_max_nights = (p_rules ->> 'overnight_max_nights')::integer,
    overnight_request_expiry_days = (p_rules ->> 'overnight_request_expiry_days')::integer,
    require_verified_email = (p_rules ->> 'require_verified_email')::boolean,
    updated_by = (select auth.uid()),
    updated_at = now()
  where id;

  select to_jsonb(s) - 'id' - 'updated_by' - 'updated_at' - 'overnight_location_private' - 'overnight_rules_text'
  into v_after from public.settings s;

  perform private.write_audit('settings.rules', 'settings', 'settings', v_before, v_after, null);
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
    'public.get_booking_config()',
    'public.get_overnight_availability(date, integer)',
    'public.create_night_request(date, integer, boolean)',
    'public.staff_approve_request(uuid)',
    'public.staff_reject_request(uuid, text)',
    'public.get_overnight_details(uuid)',
    'public.cancel_my_booking(uuid)',
    'public.staff_reopen_booking(uuid)',
    'public.save_booking_rules(jsonb)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;

commit;
