# Going live: the production launch pack (M8, group 5)

Written 31 October 2026 on `phase-2`. For the owner. Plain words, one step at a time.
**Nothing here has been done yet, and nothing has been merged to `main`.** This is the plan, the exact steps and
the checks. You approve the pack once; after that I still stop and ask before every step that touches `main` or
production.

**Three rules that never change in this pack**
- You never paste a key, password, connection string, token, passphrase or recovery code into chat. I tell you
  where each one goes. You say "done".
- No real email address is ever saved in Git. The SQL files in the repository keep a placeholder; you type your
  address into the Supabase editor yourself.
- You decide when booking goes live. Everything below that looks like a "gate" is advice.

---

## A. The plan on one page

The order matters. Each step has its own part below.

| # | What | Who | Part |
| --- | --- | --- | --- |
| 1 | **Stage 1:** merge `phase-2` into `main` with accounts and booking OFF in production. The public site looks the same as today. | I do it, only after you say yes | D |
| 2 | Create the production database `rsf-website-prod`, run the 15 files in order, set the sign-in options. | You, with me | B |
| 3 | Production keep-alive and backup, each with its own secrets and its own monitor. | You, with me | C |
| 4 | Give the live site its settings (Vercel), and choose the server region. | You, with me | D |
| 5 | **First Admin:** a short private window with accounts on. Register, verify, one line of SQL, two-step login, save recovery codes, check. | You, with me | E |
| 6 | Enter the real bank details, address, house rules and hours. Booking stays OFF. | You | F |
| 7 | Restore rehearsal (prove a backup really brings the site back). | You, with me | J |
| 8 | **Stage 2:** your domain's email (DNS) and Resend, when you get DNS access. | You, with me | G |
| 9 | **Stage 3:** you press "Turn booking on" when you decide. | You | H |

Test data, and the final list of checks: parts I and K.

**The one thing to understand before you start.** The first Admin has to sign in, and signing in needs accounts
switched on. With accounts off (stage 1) the sign-in pages do not exist (they show "page not found"). So step 5
means switching accounts on in production for a short while, even though booking is still off. Part E explains how
to do that quietly and why a stranger still cannot become Admin.

---

## B. Create the production database (about 30 minutes)

**B1. The project.** Supabase dashboard, **New project**.
- Organisation: the one you already use.
- **Name: `rsf-website-prod`.**
- **Database password:** press the generator button, **copy it straight into your password manager** (name it
  "Supabase prod database password"). Do not type it anywhere else. If the password is lost you can reset it
  in the dashboard (Project settings, Database).
- **Region: West Europe (London), `eu-west-2`.** I checked Supabase's list today: it has **no region in Africa or
  the Middle East**. The nearest ones are all in Europe (London, Paris, Frankfurt, Zurich, Ireland). London is my
  recommendation: it is one of the shortest sea-cable routes from West Africa to a data centre. **I have not
  measured the speed from Abakaliki**, so this is geography, not a test. **The region cannot be changed later**
  (you would have to build a new project and restore into it), so choose it now.
- The free plan allows 2 active projects, and development plus production uses both. That is fine.

**B2. Switch on pg_cron.** Database, Extensions, search `pg_cron`, turn it on. (Do this before file 6.)

**B3. Run the 15 files in order.** For each file in `supabase/migrations`, from `0001_profiles.sql` to
`0015_reminders_and_email_retry.sql`: open the file, copy all of it, paste it in the production **SQL Editor**,
press **Run**, and see "Success". **One at a time, in number order, none skipped.** If one shows an error, stop
and tell me the error text (never any secret).
After `0015`, run this check on its own: `select jobname, schedule from cron.job;`. The list must include
`rsf-retention` with `15 2 * * *`, and the job that releases unpaid holds (from file 6).

**B4. The sign-in options** (Authentication in the dashboard). I cannot see your dashboard, so please read each
setting aloud to me if unsure.
- **URL Configuration:** Site URL `https://rafaelsupportfoundation.org`. Redirect URLs: add
  `https://rafaelsupportfoundation.org/**`. Add nothing else: no `vercel.app` addresses, no `localhost`.
  (Development keeps its own, longer list.)
- **Sign In / Providers, Email:** "Confirm email" **on**; minimum password length **10** (the website also
  insists on 10). Leave every other provider off.
- **Multi-factor:** the authenticator-app (TOTP) option on. It is on by default.
- **Email templates:** paste the two templates from `docs/supabase-email-templates.md` (Confirm signup, Reset
  password). Their links point at the website's own `/auth/confirm` page, so the live address must be on the
  allow-list above.
- **Emails sent by Supabase (SMTP).** For the **first Admin only**, Supabase's built-in sender can work: as far
  as I know it is limited to a couple of emails an hour and, on a new project, may only deliver to people in your
  Supabase team (that includes you). If your verification email does not arrive, tell me and we use the same
  Gmail bridge as development (its settings go only in the Supabase form, never in chat). Real members need proper
  sending (part G).

**B5. Check it is empty.** `select count(*) from public.profiles;` must say `0`. If not, stop and tell me.

---

## C. Production keep-alive and backup (own secrets, own monitors)

The development ones keep running untouched. I added two new workflow files, `keep-alive-prod.yml` and
`backup-prod.yml`. They **do nothing at all until the production secrets exist** (no failure, no email), then
start by themselves. They run only after the merge in part D, because GitHub only runs schedules from `main`.

**C1. Backup user (production).** In the production SQL Editor run `supabase/ops/backup-role.sql` exactly as
for development: a 40-letter-and-digit password from your password manager, pasted over the placeholder in the
editor only. Run the check query at the bottom: `backup_reader`, `true`, `true`.

**C2. The backup address.** Production project, **Connect**, **Session pooler**, copy the address, put the
backup password in it (still in your password manager, not in a file). This is the secret `PROD_DB_BACKUP_URL`.

**C3. A second private backup repository.** On GitHub create a **private** repository `rsf-backups-prod`
(empty). Then create a **fine-grained access token** that can write **only** to `rsf-backups-prod` (Contents:
Read and write). This is the secret `BACKUP_REPO_TOKEN_PROD`. The same encryption public key as development is
used, so the same private key (and passphrase) opens both. **Keep the private key and passphrase safe: without
them no backup can be opened.**

**C4. Two new monitors** at healthchecks.io, same settings as your first two (period 1 day, **grace 12 hours**):
`RSF prod keep-alive` and `RSF prod backup`. Copy each one's ping address; they become the secrets
`HC_KEEPALIVE_PROD_URL` and `HC_BACKUP_PROD_URL`.

**C5. Add the secrets in GitHub** (Settings, Secrets and variables, Actions, **New repository secret**), exact
names: `PROD_SUPABASE_URL`, `PROD_SUPABASE_PUBLISHABLE_KEY`, `PROD_DB_BACKUP_URL`, `BACKUP_REPO_TOKEN_PROD`,
`HC_KEEPALIVE_PROD_URL`, `HC_BACKUP_PROD_URL`. (`BACKUP_GPG_PUBLIC_KEY` already exists and is reused.) You say
"done" after each.

**C6. Prove them.** GitHub, Actions tab, **Keep-alive (production)**, **Run workflow**; then **Backup
(production)**, **Run workflow**. Both must go green, and both monitors turn green. (Manual "Run workflow" works
only once the files are on `main`, so this step comes after part D's merge.) The backup will be almost empty; that is
fine, it proves the whole chain.

**C7. The in-site backup alert** (Group 2) needs to look at the **production** backup monitor, not the
development one. In the Vercel Production settings, `HEALTHCHECKS_CHECK_NAME` must be exactly `RSF prod backup`.
Without it the site would pick the first monitor with "backup" in its name, which could be the development one.

---

## D. The live site's settings and the merge

### D1. Stage 1: the merge (I do it, after your yes)
What I will do, in this order, only when you say so in chat:
1. Update `CLAUDE.md` so it describes the merged state (accounts exist but are OFF in production).
2. Check, on Vercel, that **Production has no `NEXT_PUBLIC_ACCOUNTS_ENABLED` set to true** (you check, see D2).
3. Merge `phase-2` into `main` and let Vercel build the live site.
4. Check the live site: all 10 public pages, `/robots.txt`, `/sitemap.xml`; `/login`, `/register`, `/book`,
   `/account` and `/admin` must each answer "page not found" (a true 404).

**What changes for visitors: nothing visible.** The booking buttons keep the request forms, the legal pages keep
their present text (the new draft wording shows only when accounts are on), and the new search and sharing
details are added. **Rollback:** Vercel keeps the previous live version; "Promote to Production" on it brings it
back in about a minute, no code needed.
Two side effects to know: the daily job in `vercel.json` will answer "not found" every day while accounts are off
(harmless, it only appears in Vercel's cron log), and the two production workflows arrive on `main` but stay idle.

### D2. Vercel settings (Project settings, Environment Variables)
Vercel has three "environments": **Production** (the live site), **Preview** (every test copy) and Development.
**Rule: Preview keeps pointing at the DEVELOPMENT database. Production points at `rsf-website-prod`.** Never mix
them. Set each variable for **Production only** (untick Preview and Development), and mark the secret ones
**Sensitive**. The names are in `.env.example`.

| Variable | Value | When |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://rafaelsupportfoundation.org` | now |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from the **production** project (Settings, API) | before part E |
| `SUPABASE_SERVICE_ROLE_KEY` | production secret key, Sensitive | before part E |
| `CRON_SECRET` | a new long random string from your password manager, Sensitive | before part E |
| `HEALTHCHECKS_READ_KEY` | a **read-only** key from healthchecks.io, Sensitive | before part E |
| `HEALTHCHECKS_CHECK_NAME` | `RSF prod backup` | before part E |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `REPLY_TO_EMAIL`, and the SMTP or Resend key | as you decide in part G (Gmail bridge until then) | before part E |
| `EMAIL_DAILY_CAP` | the Gmail daily limit you want a warning at | optional |
| `NEXT_PUBLIC_ACCOUNTS_ENABLED` | **leave unset (off)** until part E, then `true` | part E |
| Phase 1 form settings (`RESEND_API_KEY`, `FORMS_*`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`) | already set for the live site; do not change | - |

After changing any variable, **Redeploy** the Production deployment, or it does not take effect.
`EMAIL_PROVIDER=log` must never be set in Production (the site refuses it there anyway).

### D3. Server region
Vercel project, **Settings, Functions, Function Region**: choose **London, `lhr1`** to sit next to the London
database. The free plan allows **one** region. (Page files are served from Vercel's worldwide network
regardless; the region matters for the pages that ask the database something: sign-in, booking, account.) This
is a setting in the dashboard, not a code change. Before the change, the booking page spent most of its time
waiting for the database, so this is the single biggest speed gain still available; I will measure it before
and after.

---

## E. The first Admin in production (the exact runbook)

**When:** after parts B and D2 are done and the merge has happened. **How long:** about 20 minutes, in one sitting.
**Why a "quiet window":** accounts must be on for you to sign in. While they are on, anyone who finds
`/register` can create an ordinary member account. They cannot see or do anything else (booking is still
off), the sign-in pages are marked "do not list" so search engines skip them, and Supabase's built-in email
limit means strangers' verification emails mostly will not be sent. Do it when you have the time to finish, and
tell nobody the address.

1. **Accounts on.** Vercel, Production, set `NEXT_PUBLIC_ACCOUNTS_ENABLED` = `true`, **Redeploy**. Open
   `https://rafaelsupportfoundation.org/register` and `/login`; they must now open.
2. **Register yourself first.** Use the address you want as the owner login (it must be one you can read now),
   tick "I am 18 or over", choose a long password from your password manager.
3. **Verify the email.** Open the email, press **Verify my email**. (No email after 5 minutes? Check spam; then
   tell me, see B4.)
4. **Run the SQL.** Production **SQL Editor**, paste `supabase/ops/first-admin.sql`, replace
   `PUT-THE-ADMIN-EMAIL-HERE` with your address (keep the quotes), **Run**. The result must be **one row** with
   `role = admin`. Zero rows means the email is wrong or not verified yet; nothing changed; fix and run again.
5. **Two-step login.** Go to `/admin`. The site sends you to set up two-step login: scan the QR code with an
   authenticator app, enter the 6-digit code.
6. **Save the recovery codes.** The next screen shows 10 one-time codes. **Download the file and put it in your
   password manager now, and keep a printed copy somewhere safe.** You see them once.
7. **The check that it worked.** (a) `/admin` opens and shows the Admin menu. (b) Sign out, sign in again: it asks
   for a code from the app, then lets you in. (c) In the SQL Editor run
   `select p.full_name, p.role from public.profiles p where p.role in ('admin','staff');` : **only you**.
   (d) Admin, Audit log shows your sign-in. (e) Admin, Settings shows the launch checklist and booking is OFF.
8. **Add a second Admin as soon as you trust someone** (a colleague registers and verifies, then in Admin, People,
   you give them the Admin role; they set up their own two-step login). With two Admins, either can reset the
   other's two-step login from the website, and you can never lock yourselves out.
9. **Decide about accounts.** Either leave accounts on (sign-in is live, booking still off; the bank-transfer
   booking buttons stay as request forms until you turn booking on), or set the variable back to off and
   redeploy (all data stays, Admin is just unreachable until you turn it on again). I recommend leaving them on
   once part G (real sending) is done, and keeping the window short before that.

### What stops a stranger from becoming Admin
- Every new account is created as an ordinary member, **whatever the sign-up form sends**; the database ignores
  any "role" a visitor tries to supply.
- A member has no permission to change the role column at all (they can edit only their own name and phone). This
  was tested in milestone 1: "permission denied".
- The only ways to become Admin are (a) another Admin giving the role, which needs that Admin's two-step login,
  and (b) a person who is signed in to **your Supabase dashboard** running SQL. So protect these accounts: your
  Supabase, GitHub and Vercel logins must have **two-step login switched on** and strong passwords.
- Even a person with the Admin role gets no powers until the two-step code is entered: the database treats a
  password-only Admin or Staff as an ordinary member.
- The server-side secret key never reaches a browser, and every Admin action is written to the audit log in the
  same step as the change.
- What can still go wrong: someone stealing your email account (they could reset your password but would still
  need your authenticator app), or your phone **and** recovery codes together. Keep the codes apart from the phone.

### If you lock yourself out before a second Admin exists
Work through these, easiest first. None of them needs me to touch production.
1. **Forgot the password:** `/forgot-password`, use the email link. (Two-step still applies afterwards.)
2. **Lost the phone but have recovery codes:** sign in with your password, on the code page choose "Lost your
   phone? Use a recovery code", enter one code, set up the authenticator again, save the new codes. Each code works
   once.
3. **Lost the phone and the codes, and you are the only Admin:** open the production SQL Editor, paste
   `supabase/ops/unlock-admin-two-step.sql`, put your address in (twice), **Run**, then sign in and set up
   two-step login again. This is the "last resort" in the plan; it is not in the website's audit log, so note the
   date and reason. Anyone who can do this already controls your Supabase account, which is why that account needs
   its own two-step login.
4. **Lost the Supabase login too:** use Supabase's own account recovery. Keep the recovery email of that account
   current.

---

## F. Re-enter the real settings (Admin, Settings; booking stays OFF)

Development's settings do not travel to production (a new, empty database). In Admin, Settings, enter:
- **Bank details** (account name, number, bank). Changing them emails the owner. Booking cannot be turned on
  without them (the one hard refusal).
- **Hours** for each day; **desks** (day and overnight capacity); **prices**. Leave a price blank until the
  real fee is confirmed: that option then shows "Contact us for pricing" and cannot be booked online.
- **Booking rules** (hold time, how far ahead, cancellation window, pass rules, overnight pay window).
- **Overnight details:** the private address, check-in times and house rules (the starter text is in
  `src/content/legal-defaults.ts`; edit it into your own words). These are shown only to a member whose overnight
  booking is confirmed.
- Look at the **launch checklist** at the top of Settings. It is advice. The "lawyer review" line turns green only
  when **you** press "Mark lawyer review as done" after the lawyer has seen the final text. I never press it.

Then run the entry check: Admin, Settings shows no red "bank details" refusal, and booking is still OFF.

---

## G. Stage 2: your domain's email and Resend (when DNS access arrives)

Not possible today because you do not have DNS access, and nothing blocks you from going on without it.
When access arrives: (1) In Resend, add the domain `rafaelsupportfoundation.org`; Resend shows a few DNS records
(SPF, DKIM, optionally DMARC); whoever controls the DNS adds them; Resend shows "Verified". (2) In Vercel
Production set `EMAIL_PROVIDER=resend`, `EMAIL_FROM` to an address on the domain, `RESEND_API_KEY` (Sensitive,
never in chat), keep `REPLY_TO_EMAIL`; Redeploy. (3) In Supabase production, Authentication, SMTP, point the
sign-in emails at Resend too (its form, not chat). (4) Send yourself a test: register a second test account;
check the verification email lands in the inbox, not spam. The Settings checklist line "email domain" then turns
green by itself. All of it is configuration: no code change.

## H. Stage 3: booking on (your decision, any day you choose)

Before you press it, the advice list (each item is yours to accept or skip): the lawyer's final wording is in and
you pressed the mark; real sending works (part G); the restore rehearsal passed (part J); Vercel is on **Pro**
if you want to be within Vercel's terms for a site that takes payment requests (their free plan says
non-commercial); Supabase on **Pro** if you want automatic daily backups kept 7 days plus support (we have our own
encrypted backups meanwhile). Then: Admin, Settings, **Turn booking on** (a button that warns about any open
advice but never blocks you). Watch the first booking all the way through (held, transfer, "I've paid", you
confirm, the reminder the day before). Switch it off the same way if anything looks wrong; bookings already made stay.

---

## I. Clean-up of test data before you announce anything

**The development database is never merged into production**, so none of its test accounts or test bookings can
reach the live site. The clean-up is about three other things.
1. **Development:** in Admin, Settings switch booking OFF; leave the test accounts there (they are harmless and
   useful for later tests). 
2. **Production before announcing:** test only what you must. Do the full practice booking on the preview
   (development database). In production do one small practice at the end of part H's list, using your own
   account only, and cancel it. Then run, in the production SQL Editor, these read-only counts:
   `select count(*) from public.profiles;` (expect your Admin accounts plus anyone you invited) and
   `select reference, status from public.bookings;` (expect nothing, or only your practice booking marked
   cancelled).
3. **What cannot be deleted, on purpose:** the audit log, accounting figures and the email log are kept (for
   accountability and the law), so your practice booking leaves a few rows there. That is normal and harmless.
   Remove a practice account the way members do: in Account, **Delete my account** (it anonymises the bookings,
   keeps the accounting figures, removes the login).
4. **Never run in production:** the test scripts in `supabase/tests`. They are for development only; they read
   `.env.local`, which points at development, and they must stay that way.

---

## J. Full restore rehearsal plan (proving a backup really brings the site back)

**Why:** the nightly job proves the data loads into a throwaway Postgres. What nobody has proved is the whole
route into a real, new Supabase project with the login accounts, followed by an actual sign-in. That is the part that
saves you on the day something goes wrong.

**The free plan has no spare project** (development + production = 2 active). So use the pause trick:
1. Pick a quiet day. Dashboard: **pause `rsf-website-dev`**. (Paused projects do not count. Expect the
   development monitors to email "DOWN" until you resume it; that is expected, nothing is lost.)
2. Create a project `rsf-restore-test` in the **same region** as production (London).
3. Follow `docs/RESTORE.md` steps 1 to 9 with the **newest development backup** (it has realistic data). I stay
   with you for each step; you paste nothing into chat.
4. **Pass marks:** (a) the row counts in `manifest.txt` match for `profiles`, `bookings`, `payments`, `audit_log`;
   (b) a development test account can sign in with its old password on a copy of the site pointed at the
   restored project (a Vercel preview with the restore project's settings); (c) My bookings shows the old
   bookings; (d) the time it took, written down. Typical target: under an hour.
5. **Then:** delete `rsf-restore-test`; **resume `rsf-website-dev`**; run its keep-alive and backup once by hand;
   both monitors go green.
6. Record the result and the minutes taken in `docs/RESTORE.md`, replacing its "honest status" note.
7. Repeat once a year, and after any big change to the database. Add a calendar reminder.
Do it **before** booking goes on, and again with a real production backup once production holds data.

---

## K. Final verification list (tick each; I run the checks I can, you run the rest)

**Before the merge**
- [ ] Lint, type check, both builds (accounts on and off) pass; automated tests: M6 43/43, M7 49/49, NDPA 31/31, dormant 15/15, Group 2 22/22, launch checklist 11/11. *(I run.)*
- [ ] Vercel Production has no accounts variable set to true. *(You.)*
- [ ] You have read and approved this pack, and the lawyer pack is with the lawyer. *(You.)*

**After the merge (accounts off)**
- [ ] The 10 public pages load; `/robots.txt` and `/sitemap.xml` right; each page's canonical points at the live address. *(I run.)*
- [ ] `/login`, `/register`, `/book`, `/account`, `/admin`, `/book/overnight` answer "page not found". *(I run.)*
- [ ] The Phase 1 forms still send their emails (send one test from Contact). *(You.)*
- [ ] Lighthouse on the live home page is still in the 90s on a phone. *(I run.)*

**Production database and Admin**
- [ ] 15 files ran; `cron.job` has `rsf-retention`; `profiles` was empty before the first Admin. *(You.)*
- [ ] Only you hold the Admin role; two-step login works; recovery codes are in the password manager and on paper. *(You.)*
- [ ] Sign out and in again, code asked; a wrong code is refused. *(You.)*
- [ ] A second Admin exists, or you have decided when to add one. *(You.)*
- [ ] Your Supabase, GitHub, Vercel and healthchecks.io logins all have two-step login on. *(You.)*

**Operations**
- [ ] Production keep-alive and production backup ran green by hand, and both monitors are green. *(You.)*
- [ ] A production backup file exists in `rsf-backups-prod`, and `manifest.txt` shows the table counts. *(You.)*
- [ ] `HEALTHCHECKS_CHECK_NAME` is `RSF prod backup`. In Vercel, Settings, Cron Jobs, press **Run** next to
      `/api/cron/daily`: the log shows status 200 (the secret is used by Vercel itself; you never read it out).
      *(You; I read the result from your description.)*
- [ ] Vercel function region is London; booking page timing measured before and after. *(Both.)*
- [ ] Restore rehearsal passed (part J). *(You, with me.)*

**Before booking goes on**
- [ ] Bank details, hours, desks, rules, house rules entered; prices as decided. *(You.)*
- [ ] Real email sending works from the domain (part G), or you accept the Gmail bridge limit knowingly. *(You.)*
- [ ] Legal pages show the lawyer-reviewed text, and you pressed the review mark. *(You.)*
- [ ] One practice booking on the preview, end to end, with its reminder email. *(You.)*
- [ ] You know how to switch booking off again (Admin, Settings). *(You.)*

---

## L. What is not done, and honest limits

- **Nothing in this pack has been run.** It is written from the code, the earlier plans and the documents of
  Supabase and Vercel, and checked only by reading and by building the site.
- The region choice (London) is by distance, not by a speed test, and Supabase has no African region.
- I have not seen your Supabase, Vercel or healthchecks.io dashboards. Where a setting name may differ, tell me
  what you see and I adjust.
- The two production workflow files are syntactically checked but untested until the production secrets exist.
- The "hold ending soon" reminder will rarely fire on Vercel's free plan (once-a-day job).
- The data-protection wording about data held outside Nigeria (Supabase in London) is in the lawyer pack; the
  lawyer decides if more is needed.
