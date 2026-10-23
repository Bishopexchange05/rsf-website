-- Phase 2, milestone M4: day workspace bookings (hour, half day, day).
-- Run once in the Supabase SQL Editor AFTER 0001 to 0004.
-- A second small file (0006) schedules the automatic expiry of unpaid holds;
-- run it after you switch on the pg_cron extension.
--
-- How overbooking is prevented:
--   * create_day_booking() locks the day workspace row (SELECT ... FOR UPDATE),
--     so two requests can never count and book the last desk at the same time.
--     The second one waits, then sees the desk is gone.
--   * Capacity is counted per hour slot. A slot counts a booking while it is
--     held (unpaid but not yet expired), claimed, confirmed or awaiting approval.
--     Expired holds never count, even before the clean-up job runs.
--   * Nobody writes to the booking tables directly: members call the functions
--     below, which re-check everything on the server.

begin;

-- ---------------------------------------------------------------------------
-- Settings: how many unpaid bookings one member may hold at once
-- ---------------------------------------------------------------------------
alter table public.settings
  add column if not exists max_unpaid_bookings integer not null default 3
  check (max_unpaid_bookings between 1 and 20);

-- ---------------------------------------------------------------------------
-- Booking tables
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status' and typnamespace = 'public'::regnamespace) then
    create type public.booking_status as enum (
      'pending_payment', 'payment_claimed', 'confirmed', 'rejected', 'cancelled',
      'expired', 'completed', 'no_show', 'pending_approval', 'approved'
    );
  end if;
end
$$;

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique check (reference ~ '^RSF-[A-Z2-9]{6}$'),
  user_id          uuid references public.profiles (id) on delete set null,
  space_id         uuid not null references public.spaces (id),
  kind             public.price_kind not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  seats            integer not null default 1 check (seats = 1),
  status           public.booking_status not null default 'pending_payment',
  -- Price copied at booking time (standard or student), so later price changes never alter it.
  amount_kobo      bigint not null check (amount_kobo > 0),
  is_student_price boolean not null default false,
  hold_expires_at  timestamptz,
  cancelled_at     timestamptz,
  cancelled_by     uuid,
  cancel_reason    text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);
create index if not exists bookings_status_idx on public.bookings (status, hold_expires_at);

-- One row per space per hour a booking occupies. Capacity is counted here.
create table if not exists public.booking_slots (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  space_id   uuid not null references public.spaces (id),
  slot_start timestamptz not null,
  primary key (booking_id, slot_start)
);

create index if not exists booking_slots_lookup_idx on public.booking_slots (space_id, slot_start);

alter table public.bookings enable row level security;
alter table public.booking_slots enable row level security;

revoke all on table public.bookings from public;
revoke all on table public.bookings from anon;
revoke all on table public.bookings from authenticated;
grant select on table public.bookings to authenticated;
grant all on table public.bookings to service_role;

revoke all on table public.booking_slots from public;
revoke all on table public.booking_slots from anon;
revoke all on table public.booking_slots from authenticated;
grant select on table public.booking_slots to authenticated;
grant all on table public.booking_slots to service_role;

-- Members see only their own bookings. Staff and Admin (two-step session) see all.
drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists bookings_select_staff on public.bookings;
create policy bookings_select_staff on public.bookings
  for select to authenticated
  using ((select private.current_user_role()) in ('staff', 'admin'));

-- Slot rows are internal; only Staff and Admin may read them.
drop policy if exists booking_slots_select_staff on public.booking_slots;
create policy booking_slots_select_staff on public.booking_slots
  for select to authenticated
  using ((select private.current_user_role()) in ('staff', 'admin'));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Does a booking in this state still occupy its desks right now?
create or replace function private.slot_is_held(p_status public.booking_status, p_hold timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status in ('payment_claimed', 'confirmed', 'pending_approval', 'approved')
      or (p_status = 'pending_payment' and p_hold is not null and p_hold > now());
$$;

revoke all on function private.slot_is_held(public.booking_status, timestamptz) from public;
revoke all on function private.slot_is_held(public.booking_status, timestamptz) from anon;
grant execute on function private.slot_is_held(public.booking_status, timestamptz) to authenticated;

-- A short reference the customer uses as the transfer narration, e.g. RSF-7K3Q9M.
create or replace function private.new_booking_reference()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_ref text;
begin
  loop
    v_ref := 'RSF-' || (
      select string_agg(substr(v_alphabet, 1 + floor(random() * 32)::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.bookings b where b.reference = v_ref);
  end loop;
  return v_ref;
end;
$$;

revoke all on function private.new_booking_reference() from public;
revoke all on function private.new_booking_reference() from anon;
revoke all on function private.new_booking_reference() from authenticated;

-- Turns overdue unpaid holds into "expired" (run every minute by pg_cron, file 0006).
create or replace function private.expire_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings b
  set status = 'expired', updated_at = now()
  where b.status = 'pending_payment' and b.hold_expires_at is not null and b.hold_expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.expire_holds() from public;
revoke all on function private.expire_holds() from anon;
revoke all on function private.expire_holds() from authenticated;

-- ---------------------------------------------------------------------------
-- What the booking page needs (signed-in members only; nothing while booking is off)
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

  -- Only options whose STANDARD price is set can be booked online. A student price
  -- is then the discount for people who tick "I am a student".
  for r in
    select p.kind::text as kind, p.amount_kobo as std,
           (select st.amount_kobo from public.prices st
             where st.space_id = p.space_id and st.kind = p.kind and st.audience = 'student') as stu
    from public.prices p
    where p.space_id = v_space and p.audience = 'standard' and p.amount_kobo is not null
      and p.kind in ('hour', 'half_day', 'day')
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
    'prices', v_prices
  );
end;
$$;

-- Hour slots for one day, with how many desks are left (counts only, no personal data).
create or replace function public.get_day_availability(p_date date)
returns table (slot_start timestamptz, slot_end timestamptz, remaining integer, open_for_booking boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_window integer;
  v_closed boolean;
  v_open time;
  v_close time;
  v_space uuid;
  v_cap integer;
  v_t timestamptz;
  v_end timestamptz;
  v_used integer;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  select st.booking_enabled, st.advance_booking_days into v_enabled, v_window from public.settings st limit 1;
  if not coalesce(v_enabled, false) then
    return;
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + v_window then
    return;
  end if;

  select h.is_closed, h.opens_at, h.closes_at into v_closed, v_open, v_close
  from public.opening_hours h where h.weekday = extract(isodow from p_date)::smallint;
  if v_closed is null or v_closed then
    return;
  end if;

  select sp.id, sp.capacity into v_space, v_cap from public.spaces sp where sp.slug = 'day';

  v_t := (p_date + v_open) at time zone 'Africa/Lagos';
  v_end := (p_date + v_close) at time zone 'Africa/Lagos';
  while v_t + interval '1 hour' <= v_end loop
    select count(*) into v_used
    from public.booking_slots bs
    join public.bookings b on b.id = bs.booking_id
    where bs.space_id = v_space and bs.slot_start = v_t
      and private.slot_is_held(b.status, b.hold_expires_at);

    slot_start := v_t;
    slot_end := v_t + interval '1 hour';
    remaining := greatest(v_cap - v_used, 0);
    open_for_booking := (v_t + interval '1 hour') > (now() + interval '30 minutes');
    return next;
    v_t := v_t + interval '1 hour';
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create a booking (all or nothing)
--   p_kind  'hour' | 'half_day' | 'day'
--   p_start 'HH:MM' start of the first hour (hour bookings only)
--   p_hours number of hours (hour bookings only)
--   p_half  'morning' | 'afternoon' (half-day bookings only)
-- ---------------------------------------------------------------------------
create or replace function public.create_day_booking(
  p_date date,
  p_kind text,
  p_start time,
  p_hours integer,
  p_half text,
  p_student boolean
)
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
  v_kind public.price_kind;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_closed boolean;
  v_open time;
  v_close time;
  v_space uuid;
  v_cap integer;
  v_bookable boolean;
  v_slots timestamptz[] := '{}';
  v_req timestamptz[];
  v_t timestamptz;
  v_end timestamptz;
  v_first timestamptz;
  v_idx integer;
  v_split timestamptz;
  v_std bigint;
  v_stu bigint;
  v_unit bigint;
  v_amount bigint;
  v_is_student boolean := false;
  v_unpaid integer;
  v_used integer;
  v_slot timestamptz;
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

  if p_kind is null or p_kind not in ('hour', 'half_day', 'day') then
    raise exception 'Invalid booking type.' using errcode = 'P0001';
  end if;
  v_kind := p_kind::public.price_kind;

  if p_date is null or p_date < v_today or p_date > v_today + s.advance_booking_days then
    raise exception 'That date is outside the booking window.' using errcode = 'P0001';
  end if;

  select h.is_closed, h.opens_at, h.closes_at into v_closed, v_open, v_close
  from public.opening_hours h where h.weekday = extract(isodow from p_date)::smallint;
  if v_closed is null or v_closed then
    raise exception 'We are closed on that day.' using errcode = 'P0001';
  end if;

  select sp.id, sp.capacity, sp.is_bookable into v_space, v_cap, v_bookable
  from public.spaces sp where sp.slug = 'day';
  if not v_bookable then
    raise exception 'Booking is not open yet.' using errcode = 'P0001';
  end if;

  -- All hour slots of that day, anchored to the opening time.
  v_t := (p_date + v_open) at time zone 'Africa/Lagos';
  v_end := (p_date + v_close) at time zone 'Africa/Lagos';
  while v_t + interval '1 hour' <= v_end loop
    v_slots := v_slots || v_t;
    v_t := v_t + interval '1 hour';
  end loop;
  if coalesce(array_length(v_slots, 1), 0) = 0 then
    raise exception 'We are closed on that day.' using errcode = 'P0001';
  end if;

  -- Which slots were asked for.
  if v_kind = 'hour' then
    if p_start is null or p_hours is null or p_hours < 1 or p_hours > s.max_hours_per_booking then
      raise exception 'Invalid number of hours.' using errcode = 'P0001';
    end if;
    v_first := (p_date + p_start) at time zone 'Africa/Lagos';
    v_idx := array_position(v_slots, v_first);
    if v_idx is null or v_idx + p_hours - 1 > array_length(v_slots, 1) then
      raise exception 'Invalid time for that day.' using errcode = 'P0001';
    end if;
    v_req := v_slots[v_idx : v_idx + p_hours - 1];
  elsif v_kind = 'half_day' then
    if p_half is null or p_half not in ('morning', 'afternoon') then
      raise exception 'Invalid half day.' using errcode = 'P0001';
    end if;
    v_split := (p_date + s.half_day_split) at time zone 'Africa/Lagos';
    select array_agg(x order by x) into v_req
    from unnest(v_slots) as x
    where (p_half = 'morning' and x < v_split) or (p_half = 'afternoon' and x >= v_split);
  else
    v_req := v_slots;
  end if;
  if coalesce(array_length(v_req, 1), 0) = 0 then
    raise exception 'Invalid time for that day.' using errcode = 'P0001';
  end if;

  -- Not too late: the first hour must still have at least 30 minutes to run.
  if v_req[1] + interval '1 hour' <= now() + interval '30 minutes' then
    raise exception 'That time is too soon or already past.' using errcode = 'P0001';
  end if;

  -- Price (copied into the booking). Only options with a STANDARD price can be booked online.
  select p.amount_kobo into v_std from public.prices p
  where p.space_id = v_space and p.kind = v_kind and p.audience = 'standard';
  if v_std is null then
    raise exception 'This option is not available online. Contact us for pricing.' using errcode = 'P0001';
  end if;
  if coalesce(p_student, false) then
    select p.amount_kobo into v_stu from public.prices p
    where p.space_id = v_space and p.kind = v_kind and p.audience = 'student';
  end if;
  if v_stu is not null then
    v_unit := least(v_stu, v_std);
    v_is_student := true;
  else
    v_unit := v_std;
  end if;
  v_amount := case when v_kind = 'hour' then v_unit * p_hours else v_unit end;

  -- ==== The lock: only one booking at a time can count and take desks. ====
  perform 1 from public.spaces sp where sp.id = v_space for update;

  -- This member's unpaid bookings.
  select count(*) into v_unpaid from public.bookings b
  where b.user_id = v_uid and b.status = 'pending_payment' and b.hold_expires_at > now();
  if v_unpaid >= s.max_unpaid_bookings then
    raise exception 'You already have the most unpaid bookings allowed. Pay or cancel one first.' using errcode = 'P0001';
  end if;

  -- The same person cannot hold two bookings for the same hour.
  if exists (
    select 1 from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where b.user_id = v_uid and bs.space_id = v_space and bs.slot_start = any (v_req)
      and private.slot_is_held(b.status, b.hold_expires_at)
  ) then
    raise exception 'You already have a booking at that time.' using errcode = 'P0001';
  end if;

  -- Desks left in every requested hour.
  foreach v_slot in array v_req loop
    select count(*) into v_used
    from public.booking_slots bs join public.bookings b on b.id = bs.booking_id
    where bs.space_id = v_space and bs.slot_start = v_slot
      and private.slot_is_held(b.status, b.hold_expires_at);
    if v_used + 1 > v_cap then
      raise exception 'Sorry, that time is no longer available.' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.bookings (
    id, reference, user_id, space_id, kind, starts_at, ends_at, status,
    amount_kobo, is_student_price, hold_expires_at
  ) values (
    v_id, private.new_booking_reference(), v_uid, v_space, v_kind,
    v_req[1], v_req[array_length(v_req, 1)] + interval '1 hour', 'pending_payment',
    v_amount, v_is_student, now() + make_interval(mins => s.hold_minutes)
  );

  insert into public.booking_slots (booking_id, space_id, slot_start)
  select v_id, v_space, x from unnest(v_req) as x;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel your own booking. Unpaid: any time. Confirmed: until the cutoff.
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
    if b.starts_at - make_interval(hours => s.cancellation_cutoff_hours) <= now() then
      raise exception 'It is too late to cancel online. Please contact us.' using errcode = 'P0001';
    end if;
  else
    raise exception 'This booking cannot be cancelled online. Please contact us.' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = 'Cancelled by the member', updated_at = now()
  where id = p_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- The pay screen: bank details, reference and amount, for the booking's owner only,
-- and only while the booking still needs payment.
-- ---------------------------------------------------------------------------
create or replace function public.get_payment_instructions(p_booking uuid)
returns table (
  reference text,
  amount_kobo bigint,
  hold_expires_at timestamptz,
  bank_name text,
  account_number text,
  account_name text,
  note text
)
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
  select b.reference, b.amount_kobo, b.hold_expires_at, bd.bank_name, bd.account_number, bd.account_name, bd.note
  from public.bookings b
  cross join public.bank_details bd
  where b.id = p_booking and b.user_id = v_uid
    and ((b.status = 'pending_payment' and b.hold_expires_at > now()) or b.status = 'payment_claimed');
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings changes that go with M4
-- ---------------------------------------------------------------------------
-- Booking rules now include the unpaid-bookings limit.
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
    require_verified_email = (p_rules ->> 'require_verified_email')::boolean,
    updated_by = (select auth.uid()),
    updated_at = now()
  where id;

  select to_jsonb(s) - 'id' - 'updated_by' - 'updated_at' - 'overnight_location_private' - 'overnight_rules_text'
  into v_after from public.settings s;

  perform private.write_audit('settings.rules', 'settings', 'settings', v_before, v_after, null);
end;
$$;

-- The public page shows a student price only next to a set standard price.
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
    'overnight_beds', (select capacity from public.spaces where slug = 'overnight'),
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
-- Who may call what
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.get_booking_config()',
    'public.get_day_availability(date)',
    'public.create_day_booking(date, text, time, integer, text, boolean)',
    'public.cancel_my_booking(uuid)',
    'public.get_payment_instructions(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;

revoke all on function public.save_booking_rules(jsonb) from public;
revoke all on function public.save_booking_rules(jsonb) from anon;
grant execute on function public.save_booking_rules(jsonb) to authenticated;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon;
grant execute on function public.get_public_settings() to authenticated;

commit;
