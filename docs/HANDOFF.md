# Handoff for a fresh session (written 30 October 2026, branch `phase-2`)

Read `CLAUDE.md` first, then this file. Detail lives in `docs/PHASE2-PLAN.md` (decisions log at the end),
`docs/OPERATIONS-PLAN.md`, `docs/LEGAL-DEFAULTS.md`, `docs/SITE-AUDIT.md`, `docs/PERFORMANCE-REPORT.md`,
`docs/CONTENT-PLAN.md`, `docs/RESTORE.md`.

## 1. Current state
- **Done, tested and approved by the owner:** M1 to M7 (accounts, 2FA, settings, day bookings, bank-transfer
  flow, monthly pass, overnight workspace). Migrations 0001 to 0015 are run on the DEV Supabase project.
- **M8 (approved to start, in groups).** Group 1 (NDPA: "I am 18 or over" tick at registration, Download my
  data, Delete my account, 12-month retention job, 24-month dormant-account deletion with a warning email) was
  built, tested and approved. Tests: `supabase/tests/ndpa.js` 31/31,
  `dormant.js` 15/15, `launch-checklist.js` 11/11. Owner's test steps were (Vercel preview): check the pg_cron job with
  `select jobname, schedule from cron.job;` (expect `rsf-retention` at `15 2 * * *`); register form shows the 18+
  box and refuses without it; register a real test account; Download my data (own data only, no password);
  Delete is refused while a booking is open, works after cancelling (email "Your RSF account has been
  deleted"); Admin, Audit log shows `account.export` and `account.delete`; switch booking off afterwards.
- **Group 1 (NDPA), Group 2 (reminders, email retry, backup-age alert; migration 0015; test 22/22), Group 3 (SEO), Group 4
  (images: measured, no change needed): all APPROVED by the owner (31 October 2026).**
- **Group 5 (launch readiness): pack written, WAITING FOR APPROVAL:** `docs/PRODUCTION-LAUNCH.md` (production setup, first-Admin
  runbook, staged launch, clean-up, restore rehearsal, final checklist) plus `supabase/ops/first-admin.sql`,
  `unlock-admin-two-step.sql` and the idle `keep-alive-prod.yml` / `backup-prod.yml`. After approval: the owner decides when to
  do each step; the merge to `main` needs a separate explicit yes. M9 content manager is not started.
- **On `main` (owner-approved):** banner removed (7ab35a2); `.github/workflows/` keep-alive (04:17 and 16:47 UTC),
  backup (02:43 and 14:23 UTC, script `ops/backup.sh`), heartbeat (1st and 15th). Nothing else from Phase 2 is on
  `main`. GitHub runs scheduled jobs 4 to 6 hours late; all runs so far green. Healthchecks grace widened to 12 h by
  the owner. Backups are GPG-encrypted into the private repo `rsf-backups` (14 daily + 12 monthly); restore
  steps in `docs/RESTORE.md` (a full rehearsal into a new Supabase project has NOT been done yet).

## 2. Rules (never break)
- `phase-2` only. Check `git branch --show-current` before every commit. **Nothing to `main` without the owner's
  explicit approval** (past approvals: banner hotfix, workflow files; each was one-off).
- **No secrets in chat or git** (keys, tokens, connection strings, passphrases, `.env.local`). Tell the owner
  where a secret goes (password manager, GitHub secrets, Vercel env, `.env.local`); they only say "done".
- **No ID documents** stored or uploaded anywhere. **Bank transfer only**, no payment gateway.
- **Launch gates are advisory.** Only an Admin can change `booking_enabled`; the only refusal is "no bank details".
- **Migrations: the owner runs them in DEV** (copies the file into the Supabase SQL Editor, says "ran cleanly").
  Then you run the automated test. Never apply SQL yourself. Tell the owner when to run each file.
- **One approval per group**, with plain test instructions; build and self-test first (lint, `tsc`, builds with
  `NEXT_PUBLIC_ACCOUNTS_ENABLED` true and false, automated tests, browser check).
- Keep CLAUDE.md rules (copy in `/content/*.ts`, brand colours, no prices on site, address from `site.ts`).

## 3. Open items and decisions
- **Staged launch:** (1) merge `phase-2` to `main` with accounts and booking OFF in production (account paths 404,
  legal pages keep original text); (2) Resend domain switch by config when DNS access returns; (3) booking on
  when the owner decides. Needs the owner's approval and a CLAUDE.md update at merge time.
- **Production Supabase project and first-Admin runbook: not created yet.** Write and send the runbook at Group 5
  (new project in the nearest region to Nigeria; run migrations 0001 to latest in order; switch on pg_cron;
  Authentication settings, SMTP, email templates (`docs/supabase-email-templates.md`), 2FA; sign up the first
  user, then promote to admin in the SQL Editor and enrol 2FA; Vercel production variables from `.env.example`;
  `backup_reader` role from `supabase/ops/backup-role.sql`; add PROD GitHub secrets). Set the Vercel function region
  to match Supabase.
- **Group 2 needs from the owner:** a long random `CRON_SECRET` in Vercel env (and `.env.local`), and a
  Healthchecks.io **read-only API key** (`HEALTHCHECKS_READ_KEY`) so the site can email if the last backup is
  older than 36 hours. Vercel only runs crons on the production deployment.
- **Plans:** Vercel Hobby and Supabase Free until real customers book and pay; upgrade triggers in
  `docs/OPERATIONS-PLAN.md` section 2. cron-job.org second keep-alive was skipped for now.
- **Lawyer:** the owner sent the pack. Defaults for refunds, house rules, liability, under-18 and NDPA are in ONE
  file, `src/content/legal-defaults.ts` (regenerate `docs/LEGAL-DEFAULTS.md` with
  `node ops/render-legal-defaults.js`); marked "(draft wording)", shown only when accounts are on. **The owner
  presses "Mark lawyer review as done" (Admin, Settings) themself; never press it.**
- **DNS and Resend:** the owner has no DNS access yet and does not know when. Emails go via the Gmail bridge
  (dev only). Reply-To was tested. The email-domain item is an advisory warning, not a lock.
- **Content manager (M9):** all four pieces approved in scope (banner, posts, images, testimonials/counters);
  Staff and Admin edit, only Admin deletes, audited; banner and posts first; not started; plan in
  `docs/CONTENT-PLAN.md`. Own switch so the staged launch looks unchanged.
- **Other pending:** the SEO and content gaps in `docs/SITE-AUDIT.md` (newsletter form placement, scholarship form,
  impact numbers, etc.); monthly overnight desk not built (off for launch); a full restore rehearsal;
  the owner's registration form has no age field beyond the 18+ tick (by design).

## 4. Practical notes
- Windows + Git Bash: heredocs with quotes often fail (write files with the Write tool, run node scripts from the
  scratchpad); line endings are CRLF in the working copy; pass `MSYS_NO_PATHCONV=1` for paths starting `/`.
- `npm run dev` is slow and can crash this PC (use `npm run build` + `next start` for real checks). Avast blocks
  local SMTP, so test emails on the Vercel preview (`https://rsf-website-git-phase-2-bishop15.vercel.app`).
  Booking is switched on in DEV; remind the owner to switch it off after tests.
- Test harness: `supabase/tests/*.js` (service key from `.env.local`; temporary users, real TOTP, cleanup).

## 5. How the owner works
The owner is not a technical expert. Give **plain, short, one-step instructions with exact clicks, and wait for
"done"** before the next step. Never ask them to paste a secret. Explain results in plain words, list exactly
what they must test, and ask for ONE approval per group. Keep answers clear and honest, including what was not
verified.
