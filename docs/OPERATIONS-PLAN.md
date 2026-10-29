# Operations plan: plans and limits, keep-alive, backups, and a faster workflow

Written 28 October 2026 on the `phase-2` branch. Sections 1, 2 and 7 are facts and plans. **Status of
sections 3 to 5 (29 October 2026):** the setup in section 5 is done (all seven GitHub secrets, the backup user,
the encryption keys, the monitor). The keep-alive, the nightly backup and the monthly heartbeat are built
(`.github/workflows/`, `ops/backup.sh`) and **tested from `phase-2`** by a push trigger: the keep-alive and
the heartbeat passed, and the backup passed end to end (dump, restore test in a throwaway database,
encryption, storage in the private repository, monitor ping). **The schedules were switched on on
29 October 2026** by the owner-approved, workflow-only change to `main` (commit 8e65617: only the three
workflow files and `ops/backup.sh`, with the test triggers removed). Times (UTC): backup 02:43 daily,
keep-alive 04:17 daily, heartbeat 05:11 on the 1st of each month. GitHub may delay a scheduled run by up to
an hour or so.

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

**Decision (owner, 28 October 2026): stay on the Supabase Free plan for now.** No real paying users use the
system yet. Upgrade the production project to Pro when there are real paying users, or earlier if any
trigger in section 2 fires. This is exactly why the keep-alive (section 3) and the backups (section 4) matter:
on Free, nothing else stops the project pausing or saves the data if something goes wrong.

### 1.2 Vercel Hobby plan (decided: stay on Hobby until real customers pay through the site)

| Item | Hobby | Source |
| --- | --- | --- |
| Use | "Non-commercial, personal use only." | [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) |
| What counts as commercial | Any deployment used for the financial gain of anyone involved in producing it, including "any method of requesting or processing payment from visitors of the site". **Asking for donations does not count.** | same page |
| Cron jobs | Once a day at most, timing only accurate to the hour; run only on the production deployment | [Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing) |
| Usage included | 100 GB data transfer, 1,000,000 function calls a month | [Hobby plan](https://vercel.com/docs/plans/hobby) |
| Pro | $20 per user a month; unlimited projects; cron every minute | Hobby plan page |

**Decision (owner, 28 October 2026): stay on the Vercel Hobby plan for now.** Nothing is paid for through the
website yet: clients pay by transfer at the office. The Hobby terms are non-commercial, and "requesting payment
from visitors of the site" is their own example of commercial use. So **the day real customers start booking
and paying through the site, Vercel must already be on Pro ($20 a month)**. That makes "Vercel on Pro" one of
the gates for turning booking on (with the verified email domain, the lawyer review and the production
Supabase project). Asking for donations does not count as commercial use.

## 2. Upgrade triggers (when to pay for more)

**Decision (owner):** stay on Free for now on both services, and upgrade when we have real paying users, or
earlier if a trigger fires.

Upgrade the Supabase **production** project to Pro when **any** of these happens:
- **Real paying users** start using the system (the first real booking paid through the site).
- The database reaches about **350 MB** (70% of the 500 MB limit), or data out passes 3.5 GB in a month.
- About **50 registered members**.
- A scheduled **backup or keep-alive fails twice in a row** and cannot be fixed the same day.
- You need **point-in-time recovery** or **support** (for example after a payment dispute).
- Supabase warns you about limits or an upcoming pause.

Move **Vercel to Pro** when real customers start booking and paying through the website (before booking opens
to the public), or earlier if Vercel sends a usage or terms warning.

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

### 3.1 Making sure the keep-alive and the backup can never stop silently

**The risk.** GitHub switches off scheduled jobs in a public repository after 60 days with no "repository
activity". GitHub does not say exactly what counts, and reports say the switch-off can be silent (no
email). A job can also fail, be delayed, or be dropped. So I do not rely on one safeguard. There are five
layers, all free:

1. **GitHub emails you when a run fails** (its default for the person who owns the schedule). This catches
   "the job ran and failed". It does **not** catch "the job stopped running", which is why layer 2 exists.
2. **A "dead man's switch" (the one that really protects you).** Each job, when it **succeeds**, sends one
   tiny ping to a free monitoring service (Healthchecks.io; its free plan lists 20 monitored jobs). The
   service expects a ping every day. **If no ping arrives for about 26 hours, it emails you.** That catches
   every way of stopping: a switched-off schedule, a failed run, a deleted workflow, a GitHub outage.
   The alert reaches you within a day, so the 7-day Supabase pause is never close. It holds only the time
   of the ping, no data. The ping addresses are stored as GitHub secrets.
3. **The job keeps its own schedule alive.** At the end of every run it asks GitHub to enable the workflow
   again (a one-line call that needs no extra key). Because the keep-alive runs daily, this happens daily.
   I cannot prove from the documentation that this restarts the 60-day clock, so it is a helper, not the
   guarantee: layer 2 is the guarantee.
4. **A real commit once a month.** A small scheduled job writes one line (the date) to a file on a separate
   branch called `ops-heartbeat` (never `main`, so the live site is never redeployed; the commit message
   asks Vercel to skip building). A commit is the activity most often reported to reset the clock. If
   layers 2 and 3 are working, this is belt and braces.
5. **Your own habits and Supabase's warning.** Your normal pushes to this repository count as activity.
   Supabase also emails you about a week before it would pause a project. Put a monthly reminder in your
   calendar: "open GitHub, Actions tab, check both workflows are green".

**What an alert means and what to do.** An email from Healthchecks.io saying "keep-alive is DOWN" or "backup is
DOWN": open the repository, **Actions** tab, click the workflow named in the email, and if a banner says it is
disabled, press **Enable workflow**; then press **Run workflow** to test it. The monitor turns green again by
itself. Later (in M8, once there is a production site) I will also add a daily check inside the website
itself that emails you if the last backup or keep-alive is older than 36 hours.

## 4. Backups (encrypted, private, and proven to restore)

**Retention in one plain sentence (decided by the owner):** we keep a backup for every one of the last 14
days, plus one backup for each of the last 12 months, so that if a mistake is noticed late you can go back
about two weeks day by day, and about a year month by month.

**Design.**
1. A GitHub Actions workflow runs every night.
2. It connects with a **read-only database role** that exists only for backups (section 5), through
   Supabase's session pooler (GitHub's servers cannot use the direct address, which is IPv6 only).
3. It takes two dumps: the whole `public` schema (all booking, profile, settings, payment and audit data,
   plus the security rules and functions) and the data of the login tables (`auth.users`, identities and
   two-step factors) so accounts can be restored.
4. It **proves each backup restores**: it restores the `public` dump into a throwaway Postgres database
   inside the job and checks table and row counts against the source. A backup that cannot restore fails
   the job and raises an alert. This is the "real restore into a scratch location" and it never touches the
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

## 5. Setup walk-through (one step at a time, with the assistant)

I will not build the parts that need secrets until every step here is done. **You never paste any key,
connection string, token, passphrase or private key into chat.** Each step says where the value goes and
you only tell me "done". Each secret step ends with a way to check it is right without showing it.

The steps, in order:
- **A.** A private GitHub repository named `rsf-backups`.
- **B.** The encryption key pair on your computer (private key and passphrase go to your password manager and
  a USB stick).
- **C.** A read-only backup user in the DEVELOPMENT Supabase project, and its connection string.
- **D.** A GitHub access token that can write only to `rsf-backups`.
- **E.** The development Supabase project address and publishable key.
- **F.** A free Healthchecks.io account with two checks, one for the keep-alive and one for the backup
  (section 3.1, layer 2).
- **G.** Adding everything as GitHub secrets, with these exact names:
  `BACKUP_GPG_PUBLIC_KEY`, `BACKUP_REPO_TOKEN`, `DEV_DB_BACKUP_URL`, `DEV_SUPABASE_URL`,
  `DEV_SUPABASE_PUBLISHABLE_KEY`, `HC_KEEPALIVE_URL`, `HC_BACKUP_URL`.
  Later, for production: `PROD_DB_BACKUP_URL`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_PUBLISHABLE_KEY`.

Decisions already made by the owner: retention 14 daily and 12 monthly (section 4); the schedules go to
`main` only by a separate workflow-only change that the owner approves (section 6).

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
