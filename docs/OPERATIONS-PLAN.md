# Operations plan: plans and limits, keep-alive, backups, and a faster workflow

Written 28 October 2026 on the `phase-2` branch. This is a plan plus the facts it rests on. Nothing in
sections 3 to 6 has been built yet: the owner must do the setup steps in section 5 first.

## 1. What the free plans really allow (checked against the current documents)

### 1.1 Supabase Free plan

| Item | Free plan | Source |
| --- | --- | --- |
| Database size | 500 MB per project | [supabase.com/pricing](https://supabase.com/pricing) |
| Monthly active users | 50,000 | pricing page; [billing guide](https://supabase.com/docs/guides/platform/billing-on-supabase) |
| Egress (data out) | 5 GB, plus 5 GB cached | pricing page |
| File storage | 1 GB | pricing page; billing guide |
| Projects | 2 active projects, counted across every organisation you own or administer. Paused projects do not count. | pricing page; billing guide |
| Inactivity pausing | Paused when there is low activity over a 7-day period. A warning email comes about a week before, and another after. | [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) |
| What counts as activity | "A few user requests to the database each day" is enough. Visiting the project in the dashboard also counts. | same page |
| Restoring a paused project | One button ("Resume project") in the dashboard, within 1 year of the pause. After that you can still download the backup and storage files and restore them into a new project. | same page; [upgrading guide](https://supabase.com/docs/guides/platform/upgrading) |
| Backups | **Not included.** Daily backups (kept 7 days) start on Pro; point-in-time recovery is a paid add-on. | pricing page; [backups guide](https://supabase.com/docs/guides/platform/backups) |
| Support | Community only | pricing page |
| Commercial use | The pricing page does not restrict it, and the Terms of Service I read do not limit the Free plan to non-commercial use. There is **no service-level promise** (uptime guarantee) on Free. | [Terms](https://supabase.com/terms) |

One conflict to know about: some search results mention a 90-day restore window. The current official
page says 1 year. The dashboard shows the real deadline on a paused project, so trust that.

**Pro plan** is from $25 a month: 8 GB database, 100,000 monthly active users, 250 GB egress, daily
backups kept 7 days, no inactivity pausing, email support.

**Does development plus production fit the free limit?** Yes, exactly: 2 active projects. It leaves **no
spare slot** for a scratch project, so a restore rehearsal needs either a paused dev project, a local
database, or the automated rehearsal described in section 4.

**Can we launch on Free until about 200 daily active users?** On size and users, yes by a wide margin:
our data is tiny (bookings, profiles, audit rows) and 200 daily users is far below 50,000 monthly. The
real limits are not size. They are: no automatic backups, pausing, and no support or uptime promise.

**What Free lacks that matters before the first real paid booking:**
1. Automatic backups (we add our own encrypted ones, section 4, but there is no point-in-time recovery).
2. A guarantee the project will not pause (we add a keep-alive, section 3, but it is our workaround).
3. Support if something breaks on a day with real money moving.

**My recommendation:** build the keep-alive and backups on Free now, and upgrade the **production**
project to Pro before booking is opened to the public. At $25 a month it buys daily backups, no pausing
and support. Keep the development project on Free.

### 1.2 Vercel Hobby plan (decision needed before launch)

| Item | Hobby | Source |
| --- | --- | --- |
| Use | "Non-commercial, personal use only." | [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) |
| What counts as commercial | Any deployment used for the financial gain of anyone involved in producing it, including "any method of requesting or processing payment from visitors of the site". **Asking for donations does not count.** | same page |
| Cron jobs | Once a day at most, timing only accurate to the hour; run only on the production deployment | [Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing) |
| Usage included | 100 GB data transfer, 1,000,000 function calls a month | [Hobby plan](https://vercel.com/docs/plans/hobby) |
| Pro | $20 per user a month; unlimited projects; cron every minute | Hobby plan page |

**The decision:** the booking system shows bank details and asks visitors to pay for desks. That looks like
"requesting payment from visitors", which the Hobby terms call commercial use, even though the money
goes to a charity. I cannot give a legal answer. You have two options: (a) move the Vercel team to Pro
($20 a month) before booking opens, or (b) ask Vercel support in writing whether a charity taking
bank-transfer bookings is acceptable on Hobby, and keep the answer. My recommendation is (a), because
a suspension on a day with paying customers is worse than $20.

## 2. Upgrade triggers (when to pay for more)

Upgrade the Supabase **production** project to Pro when **any** of these happens:
- Before booking opens to the public (my recommendation, see above).
- Database size reaches 350 MB (70% of 500 MB), or egress passes 3.5 GB in a month.
- About 50 registered members (the point where losing data would hurt real people).
- A scheduled backup or keep-alive fails twice in a row and cannot be fixed the same day.
- You need point-in-time recovery, or support, for example after a payment dispute.
- Supabase asks for it (an email warning about limits or pausing).

Move Vercel to Pro **before booking opens** (see 1.2), or earlier if usage emails arrive.

## 3. Keep-alive (so a free project does not pause)

**Design.** A GitHub Actions workflow runs once a day. It sends one small, authenticated request to
each Supabase project: a call to the existing public database function `get_public_settings` using the
project's publishable key. That is a real database query, so it counts as activity under the pausing
rule, and it needs no new endpoint on the website. There is therefore no open endpoint to protect and no
`CRON_SECRET` is needed for this. The workflow prints only the status code, never a key.
It checks the answer, and fails (GitHub emails you) if the project does not respond. The daily backup
(section 4) also touches the database, so the two support each other.

**Why GitHub Actions and not Vercel cron.** Vercel cron on Hobby runs only on the production
deployment, only once a day, and puts the Hobby commercial-use question on the keep-alive too. GitHub
Actions is free and independent of the website.

**Things I must tell you (from GitHub's documentation):**
- Scheduled workflows run **only from the default branch (`main`)**. They never run from `phase-2`.
- **Manual "Run workflow" also needs the file on `main`.** (My earlier idea of testing it manually from
  the branch is wrong. What does work: a `push` trigger runs a workflow from any branch, so I test on
  `phase-2` that way, then remove that trigger.)
- In a **public repository** (ours is public), scheduled workflows are switched off after 60 days with no
  repository activity. While we are building there is plenty of activity. After launch, set a monthly
  calendar reminder to check the Actions tab, or tell me and I will add a small monthly self-reminder.
- Scheduled runs can be delayed or, rarely, dropped under load. A daily run against a 7-day pause rule
  has a wide safety margin.

**If a project does get paused:** open the Supabase dashboard, choose the organisation, choose the project,
press **Resume project**. The data and settings return as they were. Restore is possible within 1 year of
the pause. Note a paused project does not answer logins or bookings until it is resumed.

## 4. Backups (encrypted, private, and proven to restore)

**Design.**
1. A GitHub Actions workflow runs every night.
2. It connects with a **read-only database role** that exists only for backups (section 5, step 3), through
   Supabase's session pooler (GitHub's servers cannot use the direct address, which is IPv6 only).
3. It takes two dumps: the whole `public` schema (all booking, profile, settings, payment and audit data,
   plus the security rules and functions) and the data of the login tables (`auth.users`, identities and
   two-step factors) so accounts can be restored.
4. It **proves each backup restores**: it restores the `public` dump into a throwaway Postgres database
   inside the job and checks table and row counts against the source. A backup that cannot restore fails
   the job and emails you. This is the "real restore into a scratch location" and it never touches the
   live data.
5. It encrypts the dumps with your **public** key (GPG). Only your private key can decrypt them. The
   private key is never in GitHub.
6. It stores the encrypted files in a **separate private GitHub repository** (`rsf-backups`). **Never in
   this repository, which is public.**
7. It deletes old files: keep the last 14 daily backups and 12 monthly ones.

**What is not in a database dump** (so it has its own copies): the website code (GitHub), the Supabase
settings (login, email templates, two-step, SMTP: see `docs/supabase-email-templates.md` and the setup
notes in `docs/PHASE2-PLAN.md`), and the Vercel environment variables (listed in `.env.example`, values
only in Vercel and your password manager).

**How you restore (step by step; a longer copy will live in `docs/RESTORE.md` when built):**
1. Open the private `rsf-backups` repository and download the newest `.gpg` files for the date you want.
2. On your computer, decrypt each: `gpg --output public.dump --decrypt public-YYYY-MM-DD.dump.gpg`
   (it asks for your private-key passphrase).
3. Get an empty database to restore into. **Never restore over the live project.** Options: a new
   Supabase project (the free limit is 2 active projects, so pause or delete the development project
   first), or a local Postgres.
4. Restore the data: `pg_restore --no-owner --no-privileges --dbname "<the new database's connection
   string>" public.dump`
5. Restore the login accounts the same way from `auth-data.dump` (data only), into the new project.
6. In the new project, set the login, email and two-step settings again from the notes above, point the
   website's Vercel variables at the new project, and test a login and a booking.
7. Only when everything works, point the live site at the new project.
I will test steps 3 to 5 for real before calling backups finished, on a throwaway database.

**Where a paused or deleted project's data lives:** nowhere else. That is why the backups matter.

## 5. What you must do before I build (setup steps, in order)

I will not build the parts that need secrets until you tell me these are done. **Never paste any of these
values into chat.** Put each one only where the step says.

**Step 1. A private repository for the backups.**
GitHub, top right "+", **New repository**. Name: `rsf-backups`. Choose **Private**. Create it (no files
needed).

**Step 2. An encryption key pair (on your computer, in Git Bash).**
Run: `gpg --quick-generate-key "RSF Backups" rsa4096 encr 5y`
It asks you to choose a passphrase: use a long one and save it in your password manager. Then:
`gpg --armor --export "RSF Backups" > rsf-backups-public.asc` and
`gpg --armor --export-secret-keys "RSF Backups" > rsf-backups-PRIVATE.asc`.
Save **rsf-backups-PRIVATE.asc** and its passphrase in your password manager and on one USB stick kept
somewhere safe. If you lose them, the backups are unreadable. Do not put the private file in GitHub or
in the project folder. Open `rsf-backups-public.asc` in a text editor: its contents go in step 6.

**Step 3. A read-only backup user in each Supabase project.**
In the Supabase dashboard, **SQL Editor**, new query, open the file `supabase/ops/backup-role.sql` once I
have added it, replace the one placeholder with a long random password you generate in your password
manager, and run it. (The file only creates a user that can read data. It cannot change anything.)
Then **Connect** (top of the project page), choose **Session pooler**, and copy the connection string.
Replace `[YOUR-PASSWORD]` with that password and the user name with `backup_reader.<your project ref>`.
Keep this string for step 6.

**Step 4. A token that lets the workflow write only into `rsf-backups`.**
GitHub, your profile picture, **Settings**, **Developer settings**, **Personal access tokens**,
**Fine-grained tokens**, **Generate new token**. Name: `rsf-backup-writer`. Expiration: 1 year (put a
reminder in your calendar). **Repository access: Only select repositories: `rsf-backups`.**
Permissions: **Contents: Read and write**. Nothing else. Generate and copy it for step 6.

**Step 5. Keep-alive values.** In each Supabase project: **Project Settings**, **API Keys**: copy the
project URL and the **publishable** key (the one that is safe for browsers).

**Step 6. Store them as GitHub secrets.** In the **rsf-website** repository: **Settings**, **Secrets and
variables**, **Actions**, **New repository secret**. Create these (names exactly):
- `BACKUP_GPG_PUBLIC_KEY` (the contents of `rsf-backups-public.asc`)
- `BACKUP_REPO_TOKEN` (the token from step 4)
- `DEV_DB_BACKUP_URL` (the string from step 3 for the development project)
- `DEV_SUPABASE_URL` and `DEV_SUPABASE_PUBLISHABLE_KEY` (step 5)
Later, when the production project exists, add `PROD_DB_BACKUP_URL`, `PROD_SUPABASE_URL` and
`PROD_SUPABASE_PUBLISHABLE_KEY`.

**Step 7. Tell me two decisions:** (a) retention: keep 14 daily and 12 monthly backups, yes or no; (b) may I
make a **workflow-only** change to `main` (see below)?

## 6. Getting the schedules switched on

The keep-alive and backup schedules only run from `main`. Two ways to get them there:

- **Option 1 (recommended): a separate small "workflow-only" change to `main`**, like the banner
  hotfix. It would add only the files in `.github/workflows/` (and the small `ops` scripts they call). No
  website code, no accounts, no pages. You approve it separately. The advantage is that the
  keep-alive and the backups start protecting the **development** project now, and the production
  project the day it exists, instead of waiting for the full launch merge.
- **Option 2:** wait for the staged-launch merge of `phase-2` into `main`.

I recommend option 1. I will not touch `main` for this without your separate approval.

## 7. A faster, safer workflow (plan only, nothing built)

**7.1 Checks on every push (GitHub Actions).** Lint, type check, build (with accounts off, as the live site
runs, and on), and the automated tests in `supabase/tests`. The database tests create temporary users in
the development project, so they would run on a nightly schedule and on request, not on every push, and
never for pull requests from forks (those cannot read secrets). *Saves:* me finding a broken build after
you have already tried it. *Does not:* test email delivery, a real phone, or anything with real money.

**7.2 Lighthouse on every push, with budgets.** Mobile performance, SEO, accessibility and best practice
scores for the public pages, failing the push if a score drops below the budget. A CI machine is noisier
than a phone, so I would set the budget just under today's measured score and treat 99 on performance as
the target that I verify on a production build, not as a hard CI gate. *Saves:* silent speed regressions.
*Does not:* replace a test on your Samsung over Airtel 5G.

**7.3 Screenshots at phone, tablet and laptop widths.** Playwright takes screenshots of the public pages
and the main account pages at 375, 768 and 1280 pixels on every push, and flags horizontal scrolling.
They are saved as workflow files (public pages only, because this repository is public). *Saves:* you
reporting layout slips one by one. *Does not:* judge design taste.

**7.4 Letting me apply migrations to the development project.** A development-only database connection
kept in `.env.local` (never committed). Safe setup:
- A dedicated database user for **development only**, not the main `postgres` password.
- A small script that applies only the numbered migration files from this repository, in order, and
  **refuses to run** unless the connection's project reference equals the hard-coded development
  reference. The production reference is never stored on this computer or in the repository.
- Production migrations stay manual (you run them in the SQL Editor) or go through a GitHub workflow
  that waits for your approval click.
- Risks: a database password sits in a file on this computer (so keep `.env.local` out of Git, which is
  already enforced, and never share it); a bad migration could damage the development data (it is test
  data, and the nightly backup covers it); a mistake in the guard could point at production (so the guard
  compares the reference, and production credentials never exist on this machine).
*Saves:* you copying SQL into the editor and telling me it ran, each milestone.

**7.5 Fewer, bigger steps.** Each group of work: I build and self-test first (lint, type check, both
builds, automated tests, Lighthouse), then ask for your approval once per group, with a single test list
that covers the whole group.
