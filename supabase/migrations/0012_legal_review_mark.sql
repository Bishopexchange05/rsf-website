-- Launch readiness, advisory only.
-- Run once in the Supabase SQL Editor AFTER 0001 to 0011.
--
-- The owner decides when booking goes live. The booking switch is Admin only and its only
-- safety rule is the existing one (it refuses to turn on while no bank details are entered).
-- The Settings page shows an advisory checklist (email domain, lawyer review, production site).
-- This file adds the one item the website cannot detect by itself: a mark saying the lawyer's
-- review is done. The mark never blocks anything.

begin;

alter table public.settings
  add column if not exists legal_review_done_at timestamptz,
  add column if not exists legal_review_marked_by uuid;

create or replace function public.set_legal_review_done(p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before timestamptz;
begin
  perform private.assert_admin();
  select legal_review_done_at into v_before from public.settings;

  update public.settings
  set legal_review_done_at = case when coalesce(p_done, false) then now() else null end,
      legal_review_marked_by = case when coalesce(p_done, false) then (select auth.uid()) else null end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id;

  perform private.write_audit(
    'settings.legal_review', 'settings', 'legal_review',
    jsonb_build_object('done', v_before is not null),
    jsonb_build_object('done', coalesce(p_done, false)),
    null
  );
end;
$$;

revoke all on function public.set_legal_review_done(boolean) from public;
revoke all on function public.set_legal_review_done(boolean) from anon;
grant execute on function public.set_legal_review_done(boolean) to authenticated;

commit;
