-- Phase 2, milestone M3: settings the Admin controls (hours, capacity, prices,
-- student prices, booking rules, overnight details, bank details).
-- Run once in the Supabase SQL Editor AFTER 0001, 0002 and 0003.
--
-- Rules, as before: explicit GRANTs only, Row Level Security on every table,
-- helper functions in the private schema, fixed search_path.
--   * Only Admins (with a two-step session) can READ these tables.
--   * Nobody writes to them directly. Every change goes through one of the
--     functions below, which re-check the Admin role, validate the values and
--     write the audit log in the same transaction.
--   * The public (and members) can read only get_public_settings(), which
--     returns nothing but "booking is off" while booking is switched off.
--   * Money is stored in kobo (1 naira = 100 kobo).

begin;

-- ---------------------------------------------------------------------------
-- Helper: stop unless the caller is an Admin who has passed two-step.
-- ---------------------------------------------------------------------------
create or replace function private.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) is distinct from 'admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.assert_admin() from public;
revoke all on function private.assert_admin() from anon;
revoke all on function private.assert_admin() from authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'price_kind' and typnamespace = 'public'::regnamespace) then
    create type public.price_kind as enum ('hour', 'half_day', 'day', 'month', 'night');
  end if;
end
$$;

create table if not exists public.spaces (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name              text not null,
  capacity          integer not null check (capacity between 0 and 1000),
  is_bookable       boolean not null default false,
  requires_approval boolean not null default false,
  min_age           integer check (min_age is null or min_age between 0 and 120),
  updated_by        uuid,
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- 1 = Monday ... 7 = Sunday
create table if not exists public.opening_hours (
  weekday    smallint primary key check (weekday between 1 and 7),
  is_closed  boolean not null default false,
  opens_at   time,
  closes_at  time,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  check (is_closed or (opens_at is not null and closes_at is not null and closes_at > opens_at))
);

create table if not exists public.prices (
  space_id    uuid not null references public.spaces (id) on delete cascade,
  kind        public.price_kind not null,
  audience    text not null check (audience in ('standard', 'student')),
  -- null = not set. Standard hour/day/month/night: the site shows "Contact us for
  -- pricing". Half day and overnight month: the option stays hidden. Student
  -- prices: no student rate for that option.
  amount_kobo bigint check (amount_kobo is null or (amount_kobo > 0 and amount_kobo <= 1000000000)),
  updated_by  uuid,
  updated_at  timestamptz not null default now(),
  primary key (space_id, kind, audience),
  -- Student rates exist only for hour, day and month.
  check (audience = 'standard' or kind in ('hour', 'day', 'month'))
);

-- One row of business rules.
create table if not exists public.settings (
  id                               boolean primary key default true check (id),
  booking_enabled                  boolean not null default false,
  hold_minutes                     integer not null default 120 check (hold_minutes between 15 and 1440),
  claimed_review_hours             integer not null default 48 check (claimed_review_hours between 1 and 720),
  advance_booking_days             integer not null default 30 check (advance_booking_days between 1 and 365),
  max_hours_per_booking            integer not null default 10 check (max_hours_per_booking between 1 and 14),
  cancellation_cutoff_hours        integer not null default 24 check (cancellation_cutoff_hours between 0 and 720),
  -- Half day: morning = opening time to this time, afternoon = this time to closing.
  half_day_split                   time not null default '13:00',
  monthly_pass_days                integer not null default 30 check (monthly_pass_days between 7 and 366),
  monthly_pass_max_desks           integer not null default 10 check (monthly_pass_max_desks between 0 and 1000),
  monthly_start_window_days        integer not null default 14 check (monthly_start_window_days between 0 and 90),
  monthly_self_cancel_cutoff_hours integer not null default 48 check (monthly_self_cancel_cutoff_hours between 0 and 720),
  overnight_max_nights             integer not null default 7 check (overnight_max_nights between 1 and 60),
  overnight_checkin                time,
  overnight_checkout               time,
  -- Private: only Admins can read these two. Never shown before approval.
  overnight_location_private       text check (overnight_location_private is null or char_length(overnight_location_private) <= 500),
  overnight_rules_text             text check (overnight_rules_text is null or char_length(overnight_rules_text) <= 2000),
  require_verified_email           boolean not null default true,
  updated_by                       uuid,
  updated_at                       timestamptz not null default now()
);

create table if not exists public.bank_details (
  id             boolean primary key default true check (id),
  bank_name      text check (bank_name is null or char_length(bank_name) between 2 and 80),
  account_number text check (account_number is null or account_number ~ '^[0-9]{10}$'),
  account_name   text check (account_name is null or char_length(account_name) between 2 and 120),
  note           text check (note is null or char_length(note) <= 300),
  updated_by     uuid,
  updated_at     timestamptz not null default now()
);

-- Read-only for Admins; nothing is written directly.
do $$
declare
  t text;
begin
  foreach t in array array['spaces', 'opening_hours', 'prices', 'settings', 'bank_details'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_admin', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.current_user_role()) = ''admin'')',
      t || '_select_admin', t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Starting values (decided by the owner). Prices start blank, except the
-- student day price of 1,000 naira.
-- ---------------------------------------------------------------------------
insert into public.spaces (slug, name, capacity, is_bookable, requires_approval, min_age)
values
  ('day', 'Day workspace', 30, false, false, null),
  ('overnight', 'Overnight workspace', 6, false, true, 18)
on conflict (slug) do nothing;

insert into public.opening_hours (weekday, is_closed, opens_at, closes_at)
values
  (1, false, '08:00', '18:00'),
  (2, false, '08:00', '18:00'),
  (3, false, '08:00', '18:00'),
  (4, false, '08:00', '18:00'),
  (5, false, '08:00', '18:00'),
  (6, false, '08:00', '18:00'),
  (7, true, null, null)
on conflict (weekday) do nothing;

insert into public.prices (space_id, kind, audience, amount_kobo)
select s.id, v.kind::public.price_kind, v.audience, v.amount
from public.spaces s
join (values
  ('day', 'hour',     'standard', null::bigint),
  ('day', 'half_day', 'standard', null),
  ('day', 'day',      'standard', null),
  ('day', 'month',    'standard', null),
  ('day', 'hour',     'student',  null),
  ('day', 'day',      'student',  100000),
  ('day', 'month',    'student',  null),
  ('overnight', 'night', 'standard', null),
  ('overnight', 'month', 'standard', null)
) as v (slug, kind, audience, amount) on v.slug = s.slug
on conflict (space_id, kind, audience) do nothing;

insert into public.settings (id) values (true) on conflict (id) do nothing;
insert into public.bank_details (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Write functions (Admin + two-step only; validated; audited)
-- ---------------------------------------------------------------------------

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

  select jsonb_agg(to_jsonb(h) - 'updated_by' - 'updated_at' order by h.weekday) into v_after from public.opening_hours h;
  perform private.write_audit('settings.hours', 'settings', 'opening_hours', v_before, v_after, null);
end;
$$;

create or replace function public.save_capacity(p_slug text, p_capacity integer, p_bookable boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
begin
  perform private.assert_admin();
  if p_capacity is null or p_capacity < 0 or p_capacity > 1000 then
    raise exception 'Capacity must be between 0 and 1000.' using errcode = 'P0001';
  end if;

  select jsonb_build_object('capacity', s.capacity, 'is_bookable', s.is_bookable) into v_before
  from public.spaces s where s.slug = p_slug for update;
  if v_before is null then
    raise exception 'Unknown space.' using errcode = 'P0001';
  end if;

  -- The monthly-pass desk cap can never be bigger than the number of day desks.
  if p_slug = 'day' and p_capacity < (select st.monthly_pass_max_desks from public.settings st) then
    raise exception 'Day desks cannot be fewer than the monthly pass desk cap. Lower the cap first.' using errcode = 'P0001';
  end if;

  update public.spaces
  set capacity = p_capacity, is_bookable = coalesce(p_bookable, is_bookable),
      updated_by = (select auth.uid()), updated_at = now()
  where slug = p_slug;

  perform private.write_audit(
    'settings.capacity', 'settings', p_slug, v_before,
    jsonb_build_object('capacity', p_capacity, 'is_bookable', p_bookable), null
  );
end;
$$;

-- p_prices: [{ "space": "day", "kind": "hour", "audience": "standard", "amount_kobo": 150000 | null }, ...]
create or replace function public.save_prices(p_prices jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  el jsonb;
  v_slug text;
  v_kind public.price_kind;
  v_aud text;
  v_amount bigint;
begin
  perform private.assert_admin();
  if jsonb_typeof(p_prices) is distinct from 'array' then
    raise exception 'Invalid prices.' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_object_agg(sp.slug || '.' || p.kind::text || '.' || p.audience, p.amount_kobo), '{}'::jsonb)
  into v_before
  from public.prices p join public.spaces sp on sp.id = p.space_id;

  for el in select * from jsonb_array_elements(p_prices) loop
    v_slug := el ->> 'space';
    v_kind := (el ->> 'kind')::public.price_kind;
    v_aud := el ->> 'audience';
    v_amount := case when el -> 'amount_kobo' = 'null'::jsonb or el ->> 'amount_kobo' is null
                     then null else (el ->> 'amount_kobo')::bigint end;

    update public.prices p
    set amount_kobo = v_amount, updated_by = (select auth.uid()), updated_at = now()
    from public.spaces sp
    where sp.id = p.space_id and sp.slug = v_slug and p.kind = v_kind and p.audience = v_aud;
    if not found then
      raise exception 'That price option does not exist.' using errcode = 'P0001';
    end if;
  end loop;

  -- A student price may never be higher than the standard price for the same option.
  if exists (
    select 1
    from public.prices st
    join public.prices sd on sd.space_id = st.space_id and sd.kind = st.kind and sd.audience = 'standard'
    where st.audience = 'student' and st.amount_kobo is not null and sd.amount_kobo is not null
      and st.amount_kobo > sd.amount_kobo
  ) then
    raise exception 'A student price cannot be higher than the standard price.' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_object_agg(sp.slug || '.' || p.kind::text || '.' || p.audience, p.amount_kobo), '{}'::jsonb)
  into v_after
  from public.prices p join public.spaces sp on sp.id = p.space_id;

  perform private.write_audit('settings.prices', 'settings', 'prices', v_before, v_after, null);
end;
$$;

-- p_rules: object with the booking-rule fields (see below)
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

  -- Column CHECK constraints reject out-of-range numbers.
  update public.settings set
    hold_minutes = (p_rules ->> 'hold_minutes')::integer,
    claimed_review_hours = (p_rules ->> 'claimed_review_hours')::integer,
    advance_booking_days = (p_rules ->> 'advance_booking_days')::integer,
    max_hours_per_booking = (p_rules ->> 'max_hours_per_booking')::integer,
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

-- The private overnight details. The audit log records only WHAT changed, never
-- the location text itself.
create or replace function public.save_overnight_details(
  p_location text,
  p_rules text,
  p_checkin time,
  p_checkout time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
begin
  perform private.assert_admin();

  select jsonb_build_object(
    'location_set', (s.overnight_location_private is not null),
    'rules_set', (s.overnight_rules_text is not null),
    'checkin', s.overnight_checkin, 'checkout', s.overnight_checkout
  ) into v_before from public.settings s;

  update public.settings set
    overnight_location_private = nullif(btrim(p_location), ''),
    overnight_rules_text = nullif(btrim(p_rules), ''),
    overnight_checkin = p_checkin,
    overnight_checkout = p_checkout,
    updated_by = (select auth.uid()),
    updated_at = now()
  where id;

  perform private.write_audit(
    'settings.overnight', 'settings', 'overnight', v_before,
    jsonb_build_object(
      'location_set', (nullif(btrim(p_location), '') is not null),
      'rules_set', (nullif(btrim(p_rules), '') is not null),
      'checkin', p_checkin, 'checkout', p_checkout
    ),
    'Location and rules text are not recorded here.'
  );
end;
$$;

-- Bank details. The audit log keeps only the last 4 digits of the account number.
create or replace function public.save_bank_details(
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_number text := nullif(btrim(p_account_number), '');
begin
  perform private.assert_admin();
  if v_number is not null and v_number !~ '^[0-9]{10}$' then
    raise exception 'The account number must be exactly 10 digits.' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'bank_name', b.bank_name,
    'account_number', case when b.account_number is null then null else '******' || right(b.account_number, 4) end,
    'account_name', b.account_name,
    'note_set', (b.note is not null)
  ) into v_before from public.bank_details b;

  update public.bank_details set
    bank_name = nullif(btrim(p_bank_name), ''),
    account_number = v_number,
    account_name = nullif(btrim(p_account_name), ''),
    note = nullif(btrim(p_note), ''),
    updated_by = (select auth.uid()),
    updated_at = now()
  where id;

  perform private.write_audit(
    'settings.bank', 'settings', 'bank_details', v_before,
    jsonb_build_object(
      'bank_name', nullif(btrim(p_bank_name), ''),
      'account_number', case when v_number is null then null else '******' || right(v_number, 4) end,
      'account_name', nullif(btrim(p_account_name), ''),
      'note_set', (nullif(btrim(p_note), '') is not null)
    ),
    null
  );
end;
$$;

-- The master switch for booking and for the public hours and prices.
create or replace function public.set_booking_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before boolean;
begin
  perform private.assert_admin();
  select booking_enabled into v_before from public.settings;

  if p_enabled and not exists (
    select 1 from public.bank_details b
    where b.bank_name is not null and b.account_number is not null and b.account_name is not null
  ) then
    raise exception 'Enter the bank details before turning booking on.' using errcode = 'P0001';
  end if;

  update public.settings
  set booking_enabled = p_enabled, updated_by = (select auth.uid()), updated_at = now()
  where id;

  perform private.write_audit(
    'settings.booking_switch', 'settings', 'booking_enabled',
    jsonb_build_object('booking_enabled', v_before), jsonb_build_object('booking_enabled', p_enabled), null
  );
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.save_opening_hours(jsonb)',
    'public.save_capacity(text, integer, boolean)',
    'public.save_prices(jsonb)',
    'public.save_booking_rules(jsonb)',
    'public.save_overnight_details(text, text, time, time)',
    'public.save_bank_details(text, text, text, text)',
    'public.set_booking_enabled(boolean)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- What the public website may see. While booking is off it returns only
-- {"booking_enabled": false}, so no hours, desks or prices can leak early.
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
    'overnight_beds', (select capacity from public.spaces where slug = 'overnight'),
    'half_day_split', to_char(s.half_day_split, 'HH24:MI'),
    'monthly_pass_days', s.monthly_pass_days,
    'prices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'space', sp.slug, 'kind', p.kind, 'audience', p.audience, 'amount_kobo', p.amount_kobo
      ))
      from public.prices p join public.spaces sp on sp.id = p.space_id
      where p.amount_kobo is not null
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon;
grant execute on function public.get_public_settings() to authenticated;

commit;
