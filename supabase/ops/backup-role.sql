-- A read-only database user that exists only so the nightly backup can read the data.
-- It cannot change, add or delete anything.
--
-- HOW TO USE (development project first, production later):
--   1. In your password manager, generate a password of 40 characters using ONLY letters and
--      digits (no symbols, so it never needs special encoding in the connection string).
--   2. Supabase dashboard, SQL Editor, new query. Paste this whole file.
--   3. Replace the one placeholder PASTE_THE_PASSWORD_HERE (inside the quotes) with that password.
--      NEVER save a real password in this file or in Git. This file in the repository must keep the placeholder.
--   4. Press Run. It should say Success.
--   5. Run the check query at the bottom. It should show backup_reader with true, true.

create role backup_reader login password 'PASTE_THE_PASSWORD_HERE';

-- Read every table (all schemas), write nothing.
grant pg_read_all_data to backup_reader;

-- Our tables use row level security. A backup must see every row, so this user bypasses it.
-- (It only reads. It has no write rights at all.)
alter role backup_reader bypassrls;

-- Safety limits: at most 3 connections at once, and a long backup may run up to 30 minutes.
alter role backup_reader connection limit 3;
alter role backup_reader set statement_timeout = '30min';

-- CHECK (run this on its own after the lines above succeed):
-- select rolname, rolcanlogin, rolbypassrls from pg_roles where rolname = 'backup_reader';
