-- Phase 2, milestone M8, group 2: reminder emails and a retry queue for failed emails.
-- Run once in the Supabase SQL Editor AFTER 0001 to 0014.
--
-- Reminders (the website's daily job sends them; the database only says WHO is due and remembers who
-- was already reminded, so nobody gets the same reminder twice):
--   day_before    a confirmed day, half-day, hourly or overnight booking that starts TOMORROW (Lagos date)
--   pass_starts   a confirmed monthly pass that starts TOMORROW
--   pass_ends     a confirmed monthly pass whose last day is 5 days from today, with no renewal yet
--   hold_expiring a booking still waiting for payment whose hold ends within the next 45 minutes
-- Failed emails: when an email to a signed-in member fails, the website keeps it in a small queue and the
-- daily job tries again (up to 3 tries). The queue holds the subject and text, so it is deleted as soon as
-- the email is sent, after the third failure, after 3 days at the latest, and with the member's account.
-- Only the website's server key can use any of this.

begin;

-- ---------------------------------------------------------------------------
-- 1. Which reminders were sent
-- ---------------------------------------------------------------------------
create table if not exists public.booking_reminders (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  reminder   text not null check (reminder in ('day_before', 'pass_starts', 'pass_ends', 'hold_expiring')),
  sent_at    timestamptz not null default now(),
  primary key (booking_id, reminder)
);

alter table public.booking_reminders enable row level security;
revoke all on table public.booking_reminders from public;
revoke all on table public.booking_reminders from anon;
revoke all on table public.booking_reminders from authenticated;
grant select, insert on table public.booking_reminders to service_role;

-- ---------------------------------------------------------------------------
-- 2. Who is due a reminder now
-- ---------------------------------------------------------------------------
create or replace function public.reminders_due(p_now timestamptz default now())
returns table (booking_id uuid, user_id uuid, reminder text, reference text, kind text, starts_at timestamptz, ends_at timestamptz, hold_expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select (p_now at time zone 'Africa/Lagos')::date as today)
  select b.id, b.user_id, r.reminder, b.reference, b.kind::text, b.starts_at, b.ends_at, b.hold_expires_at
  from public.bookings b
  cross join t
  cross join lateral (
    select case
      when b.status = 'confirmed' and b.kind::text in ('hour', 'half_day', 'day', 'night')
           and (b.starts_at at time zone 'Africa/Lagos')::date = t.today + 1 then 'day_before'
      when b.status = 'confirmed' and b.kind::text = 'month'
           and (b.starts_at at time zone 'Africa/Lagos')::date = t.today + 1 then 'pass_starts'
      when b.status = 'confirmed' and b.kind::text = 'month'
           and ((b.ends_at - interval '1 hour') at time zone 'Africa/Lagos')::date = t.today + 5
           and not exists (
             select 1 from public.bookings n
             where n.user_id = b.user_id and n.kind::text = 'month' and n.id <> b.id
               and n.status in ('pending_payment', 'payment_claimed', 'confirmed')
               and n.starts_at >= b.ends_at - interval '1 day'
           ) then 'pass_ends'
      when b.status = 'pending_payment' and b.hold_expires_at is not null
           and b.hold_expires_at > p_now and b.hold_expires_at <= p_now + interval '45 minutes' then 'hold_expiring'
      else null
    end as reminder
  ) r
  where b.user_id is not null
    and r.reminder is not null
    and not exists (select 1 from public.booking_reminders x where x.booking_id = b.id and x.reminder = r.reminder)
  order by b.starts_at
  limit 200;
$$;

create or replace function public.mark_reminder_sent(p_booking uuid, p_reminder text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.booking_reminders (booking_id, reminder) values (p_booking, p_reminder)
  on conflict do nothing;
$$;

revoke all on function public.reminders_due(timestamptz) from public;
revoke all on function public.reminders_due(timestamptz) from anon;
revoke all on function public.reminders_due(timestamptz) from authenticated;
grant execute on function public.reminders_due(timestamptz) to service_role;

revoke all on function public.mark_reminder_sent(uuid, text) from public;
revoke all on function public.mark_reminder_sent(uuid, text) from anon;
revoke all on function public.mark_reminder_sent(uuid, text) from authenticated;
grant execute on function public.mark_reminder_sent(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Retry queue for failed emails
-- ---------------------------------------------------------------------------
create table if not exists public.email_retry (
  id          uuid primary key default gen_random_uuid(),
  to_user_id  uuid not null references auth.users (id) on delete cascade,
  template    text not null check (char_length(template) between 1 and 80),
  subject     text not null check (char_length(subject) <= 300),
  body        text not null check (char_length(body) <= 20000),
  attempts    integer not null default 0 check (attempts between 0 and 10),
  created_at  timestamptz not null default now()
);

create index if not exists email_retry_created_idx on public.email_retry (created_at);

alter table public.email_retry enable row level security;
revoke all on table public.email_retry from public;
revoke all on table public.email_retry from anon;
revoke all on table public.email_retry from authenticated;
grant select, insert, update, delete on table public.email_retry to service_role;

-- The daily clean-up also removes anything left in the queue for more than 3 days.
create or replace function public.purge_old_email_retry()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  delete from public.email_retry where created_at < now() - interval '3 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_old_email_retry() from public;
revoke all on function public.purge_old_email_retry() from anon;
revoke all on function public.purge_old_email_retry() from authenticated;
grant execute on function public.purge_old_email_retry() to service_role;

commit;
