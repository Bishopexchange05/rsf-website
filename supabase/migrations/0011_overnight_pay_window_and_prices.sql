-- Phase 2, milestone M7 review changes.
-- Run once in the Supabase SQL Editor AFTER 0001 to 0010.
--
--   * A separate pay window for an approved overnight request (default 24 hours, editable
--     in Settings -> Booking rules), instead of the normal 2-hour hold. Someone who has just
--     met the team at the office needs longer than the 2 hours a quick online booking gets.
--   * The overnight monthly desk is not offered, so it can no longer have a price: any price
--     already stored for it is cleared, the database refuses a new one, and the public
--     settings never list it.
--   * The public settings say whether overnight requests are open, so the Tech & Space page
--     can send people to the right place.

begin;

-- ---------------------------------------------------------------------------
-- Overnight pay window
-- ---------------------------------------------------------------------------
alter table public.settings
  add column if not exists overnight_pay_hours integer not null default 24
  check (overnight_pay_hours between 1 and 168);

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
  set status = 'pending_payment', hold_expires_at = now() + make_interval(hours => s.overnight_pay_hours),
      approved_at = now(), approved_by = (select auth.uid()), updated_at = now()
  where id = p_booking;

  perform private.write_audit(
    'booking.approve', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'pending_payment'), b.reference
  );
end;
$$;

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
    overnight_pay_hours = (p_rules ->> 'overnight_pay_hours')::integer,
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
-- The overnight monthly desk is not offered, so it cannot have a price
-- ---------------------------------------------------------------------------
update public.prices p
set amount_kobo = null
from public.spaces sp
where sp.id = p.space_id and sp.slug = 'overnight' and p.kind = 'month' and p.amount_kobo is not null;

create or replace function private.guard_overnight_month_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'month' and new.amount_kobo is not null
     and exists (select 1 from public.spaces sp where sp.id = new.space_id and sp.slug = 'overnight') then
    raise exception 'The overnight monthly desk is not offered, so it cannot have a price.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_overnight_month_price() from public;
revoke all on function private.guard_overnight_month_price() from anon;
revoke all on function private.guard_overnight_month_price() from authenticated;

drop trigger if exists prices_guard_overnight_month on public.prices;
create trigger prices_guard_overnight_month
  before insert or update on public.prices
  for each row execute function private.guard_overnight_month_price();

-- ---------------------------------------------------------------------------
-- Public settings: no overnight monthly line, and whether overnight requests are open
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
        and not (sp.slug = 'overnight' and p.kind = 'month')
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
    'public.staff_approve_request(uuid)',
    'public.save_booking_rules(jsonb)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon;
grant execute on function public.get_public_settings() to authenticated;

commit;
