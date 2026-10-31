-- Make ONE person the first Admin. Run it in the PRODUCTION project's SQL Editor, ONCE, only AFTER that
-- person has registered on the website AND clicked the link in the verification email.
--
-- HOW TO USE (docs/PRODUCTION-LAUNCH.md, part E):
--   1. Supabase dashboard -> the production project (rsf-website-prod) -> SQL Editor -> New query.
--   2. Paste this file. Replace PUT-THE-ADMIN-EMAIL-HERE (inside the quotes, keep the quotes) with the email
--      address you registered with. NEVER save a real address in this file or in Git: the file in the
--      repository must keep the placeholder.
--   3. Press Run. The result table must show ONE row with role = admin. No rows means the email is wrong
--      or the email was not verified yet. Nothing has changed in that case.

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'PUT-THE-ADMIN-EMAIL-HERE' and email_confirmed_at is not null
)
returning id, full_name, role, is_active;

-- CHECK (run on its own afterwards): exactly the people you expect, and nobody else.
-- select p.full_name, p.role, p.is_active from public.profiles p where p.role in ('admin', 'staff');
