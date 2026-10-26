-- Wording change: "overnight beds" are now "overnight desks".
-- Run once in the Supabase SQL Editor AFTER 0001 to 0006.
-- Only the name of one field in the public settings answer changes
-- (overnight_beds -> overnight_desks). No data changes.

begin;

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

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon;
grant execute on function public.get_public_settings() to authenticated;

commit;
