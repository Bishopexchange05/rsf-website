-- LAST RESORT: you are the only Admin, you lost your phone AND your recovery codes, and no other Admin can
-- reset your two-step login. This removes your authenticator and your old recovery codes, so that the next
-- time you sign in with your password the website sends you to set up two-step login again.
--
-- It does not change your password, your role or any booking. It is not recorded in the website's audit
-- log (it happens in the database), so write down the date and why in your own notes.
--
-- HOW TO USE (docs/PRODUCTION-LAUNCH.md, part E):
--   1. Supabase dashboard -> the production project -> SQL Editor -> New query. Paste this file.
--   2. Replace PUT-THE-ADMIN-EMAIL-HERE (twice, inside the quotes) with your own email. NEVER save a real
--      address in this file or in Git.
--   3. Press Run. Then sign in on the website and set up two-step login again; SAVE THE NEW RECOVERY CODES.
--   4. If you also forgot your password, use "Forgot password" first.

delete from auth.mfa_factors
where user_id = (select id from auth.users where email = 'PUT-THE-ADMIN-EMAIL-HERE');

delete from public.recovery_codes
where user_id = (select id from auth.users where email = 'PUT-THE-ADMIN-EMAIL-HERE');

-- CHECK: both numbers must be 0.
-- select (select count(*) from auth.mfa_factors f join auth.users u on u.id = f.user_id where u.email = 'PUT-THE-ADMIN-EMAIL-HERE') as factors_left,
--        (select count(*) from public.recovery_codes c join auth.users u on u.id = c.user_id where u.email = 'PUT-THE-ADMIN-EMAIL-HERE') as codes_left;
