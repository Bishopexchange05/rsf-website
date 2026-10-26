-- Phase 2, milestone M5: the bank-transfer flow.
-- Run once in the Supabase SQL Editor AFTER 0001 to 0007.
--
-- What this adds:
--   * payments: one record per booking (the customer's "I've paid" and the staff decision)
--   * booking_events: a timeline of every status change, written by a database trigger
--   * refund fields on bookings (a cancelled, already-confirmed booking is "refund owed";
--     the refund itself is a bank transfer you make by hand, nothing about the
--     customer's bank account is stored)
--   * functions for the customer ("I've paid"), for Staff and Admin (confirm, reject,
--     cancel, no-show, re-open) and for Admin only (mark a refund as done)
--   * Staff can read the name and phone of people who have a booking (and nothing else
--     about other people)
--
-- Same rules as before: explicit grants, row level security, no direct writes. Every
-- staff action re-checks the role and the two-step session inside the database and
-- writes the audit log in the same transaction.

begin;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.assert_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) not in ('staff', 'admin') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.assert_staff() from public;
revoke all on function private.assert_staff() from anon;
revoke all on function private.assert_staff() from authenticated;

-- ---------------------------------------------------------------------------
-- Refund fields on bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists refund_owed boolean not null default false,
  add column if not exists refund_done_at timestamptz,
  add column if not exists refund_note text check (refund_note is null or char_length(refund_note) <= 200);

create index if not exists bookings_refund_idx on public.bookings (created_at desc)
  where refund_owed and refund_done_at is null;

-- ---------------------------------------------------------------------------
-- Payments (one per booking)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  booking_id         uuid primary key references public.bookings (id) on delete cascade,
  method             text not null default 'bank_transfer' check (method = 'bank_transfer'),
  expected_kobo      bigint not null check (expected_kobo > 0),
  -- What the customer typed: a transfer reference or the sender's name. Never bank account details.
  customer_reference text check (customer_reference is null or char_length(customer_reference) <= 120),
  claimed_at         timestamptz not null default now(),
  status             text not null check (status in ('claimed', 'confirmed', 'rejected')),
  confirmed_by       uuid,
  confirmed_at       timestamptz,
  received_kobo      bigint check (received_kobo is null or received_kobo > 0),
  rejected_reason    text check (rejected_reason is null or char_length(rejected_reason) <= 300),
  updated_at         timestamptz not null default now()
);

alter table public.payments enable row level security;
revoke all on table public.payments from public;
revoke all on table public.payments from anon;
revoke all on table public.payments from authenticated;
grant select on table public.payments to authenticated;
grant all on table public.payments to service_role;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = payments.booking_id and b.user_id = (select auth.uid())
  ));

drop policy if exists payments_select_staff on public.payments;
create policy payments_select_staff on public.payments
  for select to authenticated
  using ((select private.current_user_role()) in ('staff', 'admin'));

-- ---------------------------------------------------------------------------
-- Booking timeline, written by a trigger so no code path can forget it
-- ---------------------------------------------------------------------------
create table if not exists public.booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  actor_id    uuid,
  actor_role  public.user_role,
  from_status public.booking_status,
  to_status   public.booking_status not null,
  note        text check (note is null or char_length(note) <= 400),
  created_at  timestamptz not null default now()
);

create index if not exists booking_events_booking_idx on public.booking_events (booking_id, created_at);

alter table public.booking_events enable row level security;
revoke all on table public.booking_events from public;
revoke all on table public.booking_events from anon;
revoke all on table public.booking_events from authenticated;
grant select on table public.booking_events to authenticated;
grant all on table public.booking_events to service_role;

drop policy if exists booking_events_select_staff on public.booking_events;
create policy booking_events_select_staff on public.booking_events
  for select to authenticated
  using ((select private.current_user_role()) in ('staff', 'admin'));

create or replace function private.log_booking_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_note text := nullif(current_setting('rsf.event_note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, actor_id, actor_role, from_status, to_status, note)
    values (
      new.id, v_actor, (select p.role from public.profiles p where p.id = v_actor),
      null, new.status, coalesce(v_note, 'Booking created')
    );
  elsif new.status is distinct from old.status then
    insert into public.booking_events (booking_id, actor_id, actor_role, from_status, to_status, note)
    values (
      new.id, v_actor, (select p.role from public.profiles p where p.id = v_actor),
      old.status, new.status, v_note
    );
  end if;
  return null;
end;
$$;

revoke all on function private.log_booking_event() from public;
revoke all on function private.log_booking_event() from anon;
revoke all on function private.log_booking_event() from authenticated;

drop trigger if exists bookings_log_insert on public.bookings;
create trigger bookings_log_insert
  after insert on public.bookings
  for each row execute function private.log_booking_event();

drop trigger if exists bookings_log_status on public.bookings;
create trigger bookings_log_status
  after update of status on public.bookings
  for each row when (old.status is distinct from new.status)
  execute function private.log_booking_event();

-- ---------------------------------------------------------------------------
-- Staff may read the name and phone of people who have a booking
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_staff_customers on public.profiles;
create policy profiles_select_staff_customers on public.profiles
  for select to authenticated
  using (
    (select private.current_user_role()) in ('staff', 'admin')
    and exists (select 1 from public.bookings b where b.user_id = profiles.id)
  );

-- ---------------------------------------------------------------------------
-- The customer: "I've paid"
-- ---------------------------------------------------------------------------
create or replace function public.claim_payment(p_booking uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  b public.bookings;
  v_ref text := nullif(btrim(regexp_replace(coalesce(p_reference, ''), '[[:cntrl:]]', '', 'g')), '');
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '42501';
  end if;
  if v_ref is not null and char_length(v_ref) > 120 then
    raise exception 'That reference is too long (120 characters at most).' using errcode = 'P0001';
  end if;

  select * into b from public.bookings x where x.id = p_booking and x.user_id = v_uid for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;

  -- Pressing the button twice changes nothing.
  if b.status = 'payment_claimed' then
    return;
  end if;
  if b.status <> 'pending_payment' or b.hold_expires_at is null or b.hold_expires_at <= now() then
    raise exception 'This booking can no longer be marked as paid. Please contact us.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Customer says they have paid', true);
  update public.bookings
  set status = 'payment_claimed', hold_expires_at = null, updated_at = now()
  where id = p_booking;

  insert into public.payments (booking_id, expected_kobo, customer_reference, status)
  values (p_booking, b.amount_kobo, v_ref, 'claimed')
  on conflict (booking_id) do update
    set customer_reference = excluded.customer_reference, status = 'claimed', claimed_at = now(),
        rejected_reason = null, confirmed_by = null, confirmed_at = null, received_kobo = null, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff and Admin: confirm, reject, cancel, no-show, re-open
-- ---------------------------------------------------------------------------
create or replace function public.staff_confirm_payment(p_booking uuid, p_received_kobo bigint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
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

  perform set_config('rsf.event_note', 'Payment confirmed', true);
  update public.bookings set status = 'confirmed', updated_at = now() where id = p_booking;
  update public.payments
  set status = 'confirmed', confirmed_by = (select auth.uid()), confirmed_at = now(),
      received_kobo = coalesce(p_received_kobo, b.amount_kobo), updated_at = now()
  where booking_id = p_booking;

  perform private.write_audit(
    'booking.confirm', 'booking', p_booking::text,
    jsonb_build_object('status', b.status),
    jsonb_build_object('status', 'confirmed', 'expected_kobo', b.amount_kobo, 'received_kobo', coalesce(p_received_kobo, b.amount_kobo)),
    b.reference
  );
end;
$$;

create or replace function public.staff_reject_payment(p_booking uuid, p_reason text)
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
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'payment_claimed' then
    raise exception 'Only a booking marked as paid can be rejected.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Payment not accepted: ' || v_reason, true);
  update public.bookings set status = 'rejected', updated_at = now() where id = p_booking;
  update public.payments
  set status = 'rejected', rejected_reason = v_reason, confirmed_by = (select auth.uid()), confirmed_at = now(), updated_at = now()
  where booking_id = p_booking;

  perform private.write_audit(
    'booking.reject', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'rejected'), b.reference || ': ' || v_reason
  );
end;
$$;

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

  -- Money was already accepted for a confirmed booking, so a refund is owed.
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

create or replace function public.staff_mark_no_show(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  perform private.assert_staff();
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'Only a confirmed booking can be marked as not attended.' using errcode = 'P0001';
  end if;
  if b.starts_at > now() then
    raise exception 'That booking has not started yet.' using errcode = 'P0001';
  end if;

  perform set_config('rsf.event_note', 'Did not attend', true);
  update public.bookings set status = 'no_show', updated_at = now() where id = p_booking;

  perform private.write_audit(
    'booking.no_show', 'booking', p_booking::text,
    jsonb_build_object('status', b.status), jsonb_build_object('status', 'no_show'), b.reference
  );
end;
$$;

-- A customer paid after the hold ended. If the desks are still free the booking goes back
-- to "payment being checked" so Staff can confirm it the normal way.
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

  -- The same lock as booking: nobody can take the desks while we check them.
  select sp.capacity into v_cap from public.spaces sp where sp.id = b.space_id for update;

  for v_slot in select bs.slot_start from public.booking_slots bs where bs.booking_id = p_booking loop
    select count(*) into v_used
    from public.booking_slots bs join public.bookings o on o.id = bs.booking_id
    where bs.space_id = b.space_id and bs.slot_start = v_slot and o.id <> p_booking
      and private.slot_is_held(o.status, o.hold_expires_at);
    if v_used + 1 > v_cap then
      raise exception 'Sorry, the desks for that time are no longer available.' using errcode = 'P0001';
    end if;
  end loop;

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

-- Admin only: record that a refund was paid. The note is for YOUR transfer reference.
-- Never put a customer's bank account number in it.
create or replace function public.admin_mark_refunded(p_booking uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_note text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), '');
begin
  perform private.assert_admin();
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'That note is too long (200 characters at most).' using errcode = 'P0001';
  end if;
  select * into b from public.bookings x where x.id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if not b.refund_owed or b.refund_done_at is not null then
    raise exception 'No refund is owed on this booking.' using errcode = 'P0001';
  end if;

  update public.bookings set refund_done_at = now(), refund_note = v_note, updated_at = now() where id = p_booking;

  perform private.write_audit(
    'booking.refund_done', 'booking', p_booking::text,
    jsonb_build_object('refund_owed', true), jsonb_build_object('refund_done', true), b.reference
  );
end;
$$;

-- Member cancel, now marking a refund as owed when a CONFIRMED booking is cancelled.
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
    if b.starts_at - make_interval(hours => s.cancellation_cutoff_hours) <= now() then
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
-- Who may call what
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.claim_payment(uuid, text)',
    'public.staff_confirm_payment(uuid, bigint)',
    'public.staff_reject_payment(uuid, text)',
    'public.staff_cancel_booking(uuid, text)',
    'public.staff_mark_no_show(uuid)',
    'public.staff_reopen_booking(uuid)',
    'public.admin_mark_refunded(uuid, text)',
    'public.cancel_my_booking(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;


-- Staff cannot read the Settings table, but they need the 'waiting too long' limit to flag
-- payments that have been waiting too long. This returns just that one number.
create or replace function public.get_review_hours()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select claimed_review_hours from public.settings limit 1;
$$;

revoke all on function public.get_review_hours() from public;
revoke all on function public.get_review_hours() from anon;
grant execute on function public.get_review_hours() to authenticated;

commit;
