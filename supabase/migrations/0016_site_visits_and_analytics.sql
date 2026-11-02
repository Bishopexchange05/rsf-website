-- 0016: a simple, cookie-free visit counter and the Admin analytics summary.
--
-- site_visits keeps ONE row per day and page, with two numbers: page views, and visits (the first
-- page someone opens in a browser tab). Nothing else: no IP address, no browser details, no cookie,
-- no account. It cannot identify anyone. Only the website's server (secret key) writes to it, and
-- only an Admin who has passed two-step login can read the totals through admin_analytics().
--
-- Additive only: no existing table or function changes.

begin;

create table if not exists public.site_visits (
  day    date not null,
  path   text not null check (char_length(path) between 1 and 100 and path like '/%'),
  views  integer not null default 0 check (views >= 0),
  visits integer not null default 0 check (visits >= 0),
  primary key (day, path)
);

alter table public.site_visits enable row level security;
revoke all on table public.site_visits from public;
revoke all on table public.site_visits from anon;
revoke all on table public.site_visits from authenticated;
grant all on table public.site_visits to service_role;

-- Count one page view (and a visit when it is the first page in the tab). Called by the website's
-- server only, after it has checked the address and dropped robots.
create or replace function public.record_site_visit(p_path text, p_new_visit boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.site_visits (day, path, views, visits)
  values ((now() at time zone 'Africa/Lagos')::date, p_path, 1, case when p_new_visit then 1 else 0 end)
  on conflict (day, path) do update
    set views  = public.site_visits.views + 1,
        visits = public.site_visits.visits + excluded.visits;
$$;

revoke all on function public.record_site_visit(text, boolean) from public;
revoke all on function public.record_site_visit(text, boolean) from anon;
revoke all on function public.record_site_visit(text, boolean) from authenticated;
grant execute on function public.record_site_visit(text, boolean) to service_role;

-- The analytics summary for the Admin dashboard, for the days p_from to p_to (Nigerian dates,
-- both included). Returns one JSON object:
--   days:      one entry per day: d, views, visits, members (new accounts), bookings (made that day),
--              revenue (kobo confirmed that day)
--   kinds:     bookings made in the range, by kind
--   weekdays:  going-ahead bookings that START in the range, by weekday (1 = Monday ... 7 = Sunday)
--   hours:     the same, by starting hour (hour, half-day and full-day desks only)
--   pages:     the most viewed pages in the range
--   now:       totals as they are today: members, money waiting to be checked, refunds owed
create or replace function public.admin_analytics(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to   timestamptz;
  v      jsonb;
begin
  perform private.assert_admin();
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Bad date range' using errcode = '22023';
  end if;
  v_from := (p_from::timestamp at time zone 'Africa/Lagos');
  v_to   := ((p_to + 1)::timestamp at time zone 'Africa/Lagos');

  select jsonb_build_object(
    'days', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'd', g.d,
               'views', coalesce(sv.views, 0),
               'visits', coalesce(sv.visits, 0),
               'members', coalesce(m.n, 0),
               'bookings', coalesce(bk.n, 0),
               'revenue', coalesce(r.kobo, 0)
             ) order by g.d), '[]'::jsonb)
      from (select generate_series(p_from, p_to, interval '1 day')::date as d) g
      left join (select day, sum(views) as views, sum(visits) as visits from public.site_visits
                 where day between p_from and p_to group by day) sv on sv.day = g.d
      left join (select (created_at at time zone 'Africa/Lagos')::date as day, count(*) as n from public.profiles
                 where created_at >= v_from and created_at < v_to group by 1) m on m.day = g.d
      left join (select (created_at at time zone 'Africa/Lagos')::date as day, count(*) as n from public.bookings
                 where created_at >= v_from and created_at < v_to group by 1) bk on bk.day = g.d
      left join (select (confirmed_at at time zone 'Africa/Lagos')::date as day, sum(coalesce(received_kobo, expected_kobo)) as kobo
                 from public.payments where status = 'confirmed' and confirmed_at >= v_from and confirmed_at < v_to group by 1) r on r.day = g.d
    ),
    'kinds', (
      select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
      from (select kind::text as kind, count(*) as n from public.bookings
            where created_at >= v_from and created_at < v_to group by 1) k
    ),
    'weekdays', (
      select coalesce(jsonb_object_agg(wd, n), '{}'::jsonb)
      from (select extract(isodow from starts_at at time zone 'Africa/Lagos')::int as wd, count(*) as n from public.bookings
            where starts_at >= v_from and starts_at < v_to
              and status::text in ('confirmed', 'completed', 'payment_claimed')
            group by 1) w
    ),
    'hours', (
      select coalesce(jsonb_object_agg(h, n), '{}'::jsonb)
      from (select extract(hour from starts_at at time zone 'Africa/Lagos')::int as h, count(*) as n from public.bookings
            where starts_at >= v_from and starts_at < v_to
              and kind::text in ('hour', 'half_day', 'day')
              and status::text in ('confirmed', 'completed', 'payment_claimed')
            group by 1) hh
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc), '[]'::jsonb)
      from (select path, sum(views) as views from public.site_visits
            where day between p_from and p_to group by path order by 2 desc limit 8) p
    ),
    'now', jsonb_build_object(
      'members', (select count(*) from public.profiles where role = 'member' and is_active),
      'waiting_kobo', (select coalesce(sum(expected_kobo), 0) from public.payments where status = 'claimed'),
      'refunds_kobo', (select coalesce(sum(coalesce(refund_amount_kobo, 0)), 0) from public.bookings where refund_owed and refund_done_at is null)
    )
  ) into v;
  return v;
end;
$$;

revoke all on function public.admin_analytics(date, date) from public;
revoke all on function public.admin_analytics(date, date) from anon;
grant execute on function public.admin_analytics(date, date) to authenticated;

commit;
