-- Phase 2, milestone M4: run the expiry of unpaid holds every minute.
-- BEFORE running this file, switch on the pg_cron extension:
--   Supabase dashboard -> Database -> Extensions -> search "pg_cron" -> turn on.
-- Then run this file once in the SQL Editor (after 0005).
--
-- Expiry is also enforced WITHOUT this job: every capacity check ignores unpaid
-- holds whose time has run out. The job only tidies the status so lists show
-- "Expired".

select cron.unschedule('expire-booking-holds')
where exists (select 1 from cron.job where jobname = 'expire-booking-holds');

select cron.schedule(
  'expire-booking-holds',
  '* * * * *',
  $$ select private.expire_holds(); $$
);
