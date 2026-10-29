# How to restore from a backup

For the person who has the private encryption key (the owner). Plain words, one step at a time.
**Never type a key, password or connection string into a chat or into a file in this project.**

> **Honest status.** The nightly backup is proven in two ways every night: the job loads the backup into a
> throwaway database and compares row counts, and it fails (and emails you) if that does not match. What has
> **not** yet been done is a full rehearsal into a brand-new Supabase project. That rehearsal is part of
> M8 and needs a free project slot. Until it has been done once, treat steps 4 to 9 as the plan, not as
> something proven end to end.

## When to use this
- The Supabase project was deleted or damaged, or data was wrongly changed or deleted.
- **If the project is only paused**, do not restore. Open the Supabase dashboard, choose the project, press
  **Resume project**. Everything comes back as it was.

## What you need
- The private key file `rsf-backups-PRIVATE.asc` and its passphrase (password manager, or the USB stick).
- **Git Bash** (you have it) and the **Postgres command-line tools** (`pg_restore`). If `pg_restore --version`
  does not work in Git Bash, install "PostgreSQL" from postgresql.org and choose **only** "Command Line
  Tools" in the installer, then reopen Git Bash.
- A new, empty Supabase project. The free plan allows 2 active projects; pause or delete the development
  project first if both slots are used.

## Steps

**1. Pick the backup.** Open the private `rsf-backups` repository on GitHub. Folders: `daily/YYYY-MM-DD` (last
14 days) and `monthly/YYYY-MM` (last 12 months). Open the one you want. Each has `public.dump.gpg`,
`auth-data.dump.gpg` and `manifest.txt` (table names and row counts). Download the two `.gpg` files (open
the file, then **Download raw file**) into a folder, for example `C:\Users\HP\rsf-restore`.

**2. Make the new project ready (the structure).** In the new project's **SQL Editor**, run the files in
`supabase/migrations`, **in number order**, one at a time (`0001` to the newest). Before `0006`, switch on
the `pg_cron` extension (Database, Extensions). Also run `supabase/ops/backup-role.sql` (with a new
password) so backups can continue. Then set again, by hand, what a database backup does not contain:
Authentication settings (email confirmation, password length, custom SMTP), the email templates
(`docs/supabase-email-templates.md`), and two-step login. Put the new project's address and keys into the
Vercel environment variables (list in `.env.example`).

**3. Decrypt the files.** In Git Bash:

```bash
cd /c/Users/HP/rsf-restore
gpg --output public.dump --decrypt public.dump.gpg
gpg --output auth-data.dump --decrypt auth-data.dump.gpg
```

The first time, you need your private key in GnuPG: `gpg --import /path/to/rsf-backups-PRIVATE.asc` (it asks
for the passphrase). Check it worked: `head -c 5 public.dump` must print `PGDMP`.

**4. Give Git Bash the new database address, without showing it.** In the new project press **Connect**,
choose **Session pooler**, copy the address, put your database password in it, and then in Git Bash type
(replace the part in the quotes by pasting from your password manager):

```bash
export NEWDB='paste-the-connection-string-here'
```

**5. Load the login accounts first** (people can then sign in with their old passwords):

```bash
PGOPTIONS='-c session_replication_role=replica' pg_restore --data-only --no-owner -d "$NEWDB" auth-data.dump
```

**6. Load the application data:**

```bash
PGOPTIONS='-c session_replication_role=replica' pg_restore --data-only --no-owner -d "$NEWDB" public.dump
```

(The setting `session_replication_role=replica` stops database triggers from firing during the load, so
nothing is created twice.)

**7. Check the counts.** In the new project's SQL Editor run, for example,
`select count(*) from public.bookings;` and compare with the same table in `manifest.txt`. Do this for
`profiles`, `bookings`, `payments` and `audit_log`. They should match the manifest.

**8. Point the website at the new project and test.** Change the Vercel variables to the new project, redeploy,
then log in, open My bookings, and make one test booking.

**9. Tidy up.** Delete the decrypted files from the folder (`rm public.dump auth-data.dump`), keep the `.gpg`
files if you want, and close Git Bash (this forgets `NEWDB`).

## If something goes wrong
Do not delete the old project or the backups. Tell the assistant the **error message text** (never the
connection string or passphrase) and which step you were on.
