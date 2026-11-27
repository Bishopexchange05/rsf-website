-- 0017: a monthly price for the overnight workspace (in addition to the nightly rate).
-- Run once in the Supabase SQL Editor AFTER 0001 to 0016. Change of design from the client.
--
-- What changes
--   * The rule that refused any price on the overnight "month" row (0011) is removed, so an Admin
--     can set one in Settings. It stays empty (not offered) until an Admin enters a price.
--   * A monthly overnight stay is ONE block of 30 consecutive nights from a start date the member
--     picks. It never renews by itself: staying longer means making a new booking.
--   * It is requested with create_night_month_request(). It is the same kind of booking as a
--     nightly request (kind 'night', 18+ tick, in-person approval and ID check at the office,
--     the overnight pay window, bank transfer, address and house rules only after payment is
--     confirmed). A flag, is_month_stay, marks it. The nightly rules are NOT touched: a nightly
--     request of more than overnight_max_nights (7 by default) is still refused.
--   * Refunds follow the monthly desk pass: the member can cancel and get a full refund until
--     monthly_self_cancel_cutoff_hours (48 by default) before the first night. After that there
--     is no automatic refund; an Admin decides by hand with "cancel with a refund amount".
--   * The first night cannot start before an Admin or Staff member has approved the request.
--
-- Additive only: one new column with a default, one new function, and re-stated functions that
-- keep all their earlier rules. No data is changed.

begin;

-- ---------------------------------------------------------------------------
-- 1. Allow a price on the overnight month row
-- ---------------------------------------------------------------------------
drop trigger if exists prices_guard_overnight_month on public.prices;
drop function if exists private.guard_overnight_month_price();

-- ---------------------------------------------------------------------------
-- 2. Marks a booking as a 30-night monthly overnight stay
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists is_month_stay boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. The booking page: now also says whether the monthly overnight option exists
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
  v_on_month bigint;
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
    select p.amount_kobo into v_on_month from public.prices p
    join public.spaces sp on sp.id = p.space_id
    where sp.slug = 'overnight' and p.kind = 'month' and p.audience = 'standard';
    v_night := jsonb_build_object(
      'enabled', true,
      'max_nights', s.overnight_max_nights,
      'night_price', v_on_price,
      'month_price', v_on_month,
      'month_nights', 30,
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

-- ---------------------------------------------------------------------------
-- 4. Public settings: the overnight monthly price is shown once it is set
-- ---------------------------------------------------------------------------
create or replace function public.get_public_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.settings;
begin
  select * into s from public.settings limit 1;
  if s.id is null or not s.booking_enabled then
    return jsonb_build_object('booking_enabled', false);
  end if;

  return jsonb_build_object(
    'booking_enabled', true,
    'hours', (
      select jsonb_agg(jsonb_build_object(
        'weekday', h.weekday, 'is_closed', h.is_closed,
        'opens_at', to_char(h.opens_at, 'HH24:MI'), 'closes_at', to_char(h.closes_at, 'HH24:MI')
      ) order by h.weekday)
      from public.opening_hours h
    ),
    'day_desks', (select capacity from public.spaces where slug = 'day'),
    'overnight_desks', (select capacity from public.spaces where slug = 'overnight'),
    'overnight_open', (
      coalesce((select sp.is_bookable from public.spaces sp where sp.slug = 'overnight'), false)
      and s.overnight_checkin is not null and s.overnight_checkout is not null
    ),
    'half_day_split', to_char(s.half_day_split, 'HH24:MI'),
    'monthly_pass_days', s.monthly_pass_days,
    'prices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'space', sp.slug, 'kind', p.kind, 'audience', p.audience, 'amount_kobo', p.amount_kobo
      ))
      from public.prices p join public.spaces sp on sp.id = p.space_id
      where p.amount_kobo is not null
        and (
          p.audience = 'standard'
          or exists (
            select 1 from public.prices sd
            where sd.space_id = p.space_id and sd.kind = p.kind
              and sd.audience = 'standard' and sd.amount_kobo is not null
          )
        )
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Request a monthly overnight stay: 30 consecutive nights, all or nothing
--    (a copy of create_night_request with a fixed length, the monthly price and the flag)
-- ---------------------------------------------------------------------------
create or replace function public.create_night_month_request(p_checkin date, p_age_confirmed boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_nights constant integer := 30;
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

  if p_checkin is null or p_checkin < v_today or p_checkin > v_today + s.advance_booking_days then
    raise exception 'That date is outside the booking window.' using errcode = 'P0001';
  end if;

  v_slots := private.night_slots(p_checkin, c_nights, s.overnight_checkin);
  if v_slots[1] <= now() then
    raise exception 'That time is too soon or already past.' using errcode = 'P0001';
  end if;

  select p.amount_kobo into v_price from public.prices p
  where p.space_id = v_space and p.kind = 'month' and p.audience = 'standard';
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

  perform set_config('rsf.event_note', 'Monthly overnight request received (18 or over confirmed)', true);
  insert into public.bookings (
    id, reference, user_id, space_id, kind, starts_at, ends_at, status,
    amount_kobo, is_student_price, hold_expires_at, age_confirmed_at, is_month_stay
  ) values (
    v_id, private.new_booking_reference(), v_uid, v_space, 'night',
    v_slots[1], (((p_checkin + c_nights) + s.overnight_checkout) at time zone 'Africa/Lagos'),
    'pending_approval', v_price, false,
    now() + make_interval(days => s.overnight_request_expiry_days), now(), true
  );

  insert into public.booking_slots (booking_id, space_id, slot_start)
  select v_id, v_space, x from unnest(v_slots) as x;

  return v_id;
end;
$$;

revoke all on function public.create_night_month_request(date, boolean) from public;
revoke all on function public.create_night_month_request(date, boolean) from anon;
grant execute on function public.create_night_month_request(date, boolean) to authenticated;

-- Is there a desk on every one of the 30 nights? (Counts only, no personal data.)
-- The nightly check refuses more than overnight_max_nights, so the monthly stay has its own.
create or replace function public.get_overnight_month_availability(p_checkin date)
returns table (available boolean, reason text, full_night date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_nights constant integer := 30;
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
  if p_checkin is null or p_checkin < v_today or p_checkin > v_today + s.advance_booking_days then
    return query select false, 'window'::text, null::date;
    return;
  end if;

  v_slots := private.night_slots(p_checkin, c_nights, s.overnight_checkin);
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

revoke all on function public.get_overnight_month_availability(date) from public;
revoke all on function public.get_overnight_month_availability(date) from anon;
grant execute on function public.get_overnight_month_availability(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Approval: the first night of a monthly stay cannot have started already
--    (a copy of the 0011 function plus one rule)
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
  if b.is_month_stay and b.starts_at <= now() then
    raise exception 'This request has expired. The first night has already started, so ask the person to make a new request.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Approved after meeting in person', true);
  update public.bookings
  set status = 'pending_payment', hold_expires_at = now() + make_interval(hours => s.overnight_pay_hours),
      approved_at = now(), approved_by = (select auth.uid()), updated_at = now()
  where id = p_booking;

  perform private.write_audit(
    'booking.approve', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'pending_payment'), b.reference
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Member cancel: a monthly overnight stay follows the monthly desk pass rule
--    (a copy of the 0010 function plus one branch)
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
    if b.kind = 'month' or b.is_month_stay then
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
  set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()), cancel_reason = 'Cancelled by the member',
      refund_owed = v_refund, updated_at = now()
  where id = p_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. After the start date an Admin decides the refund by hand, as for a desk pass
--    (a copy of the 0009 function that also accepts a confirmed monthly overnight stay)
-- ---------------------------------------------------------------------------
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
  if not (b.kind = 'month' or b.is_month_stay) or b.status <> 'confirmed' then
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

commit;
