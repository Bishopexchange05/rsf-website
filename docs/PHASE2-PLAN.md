# RSF Website Phase 2: Plan (DRAFT for owner review)

Status: **APPROVED by the owner for M1 only** (draft v2 plus the answers in section 9). M2 onward need separate approval. Decided so far: closing 6:00 PM, hold 2 hours, overnight approve-then-pay, staff review of student-free bookings, day prices per hour / per day / per month (no weekly price, half-day optional), and email sent through a configurable provider because the Resend domain cannot be verified for about two months (section 3A). Remaining questions use the stated defaults unless you say otherwise. Anything marked **[FROM MEMORY: VERIFY]** is a figure or claim I wrote from general knowledge, not from a source checked today. Nothing in this plan has been built. No packages installed, no code written, no Supabase project created. Branch: `phase-2`. Phase 1 stays live on `main` (tag `phase-1-complete`) and is not touched until go-live is approved.

First build: the booking calendar for the Day workspace and the Overnight workspace at RSF Tech & Space, with the database, accounts and admin area it needs.

---

## 0. Decisions already fixed (from the owner)

- Bank transfer only. No Paystack, no cards. Bank details are stored in the database and edited in the admin panel, never hard-coded.
- Visitors must have a verified account to book. No guest booking.
- Flow: pending payment (slot held, auto-expires) -> customer taps "I've paid" (optional transfer reference) -> admin checks the bank account and confirms -> customer emailed -> confirmed. Admin can reject or cancel. Every booking has a unique reference used as the transfer narration.
- Overnight: 18+ (checkbox plus in-person check), team approval in person, never any ID document collected or stored, location shared only after approval.
- Everything operational is editable from the admin panel: hours (per weekday, closed days), day desks (30), day prices (per hour, per day, per month; half day optional and hidden when empty; no weekly price), optional student prices (per hour, per day, per month; the student day price starts at 1,000 naira), overnight price (per night, optional per month), overnight capacity, bank details, hold time. A price that is not set shows "Contact us for pricing".
- Roles: Admin (everything), Staff (view bookings, confirm/reject payments, nothing else), Member (book, see own bookings). Only an Admin creates or promotes staff.
- Emails go out through one configurable sender. Until the Resend domain is verified (about two months), the sender is a dedicated Gmail account over SMTP; switching to Resend later is a configuration change, not a code change (section 3A).
- NDPA 2023: collect only name, email, phone; keep records 12 months unless law requires longer; deletion of a user's data must be possible.
- Existing contact/request forms keep working until the booking system is live and tested. Site stays fast and dark mode keeps working.

---

## 1. Recommended stack

**Recommendation: confirm Supabase (Postgres + Auth + Row Level Security), keep Next.js on Vercel.**

Why it fits:
- Booking needs real transactions and constraints (no double-booking, seat counts). Postgres does this properly; a document store or spreadsheet does not.
- Auth (email verification, password reset, sessions, optional TOTP 2FA) is built in, so we do not write password handling ourselves.
- Row Level Security enforces "members only see their own bookings" inside the database, so a bug in a page cannot leak data.
- Scheduled jobs (`pg_cron`) can expire unpaid holds and run the 12-month retention clean-up without extra infrastructure.
- It matches what CLAUDE.md already names for Phase 2.

Alternatives considered:
- Neon/Postgres + Auth.js: also fine, but we would assemble auth, email verification, RLS-style protection and cron ourselves. More code, more risk.
- Firebase: weaker fit for relational booking rules and capacity counting.
Verdict: Supabase is the least code for the most safety.

**Challenges and limits to know about** (figures are from my knowledge of the free plan; re-check supabase.com/pricing before relying on them):
1. **Free projects pause after about a week of inactivity.** A paused database means nobody can log in or book. For a live booking system, plan on the paid Pro plan (about USD 25 per month) at launch, which also gives daily backups. Free tier is fine for building and testing.
2. **No automatic backups on free.** Another reason for Pro at launch; until then we export manually.
3. **Supabase's built-in auth email is not suitable for real customers** (confirmed in section 3A). We must connect our own SMTP for verification and reset emails. Because the Resend domain cannot be verified for about two months, section 3A plans a bridge (a dedicated Gmail account) and how to switch to Resend later.
4. Free limits (roughly 500 MB database, 50,000 monthly active users, 5 GB egress) are far above what one workspace needs. They will not be a problem.
5. **Region:** pick the closest available (Europe or South Africa if offered) for Nigerian users. Data will be stored outside Nigeria; the privacy policy must say so (it already does for other providers).
6. **Two Supabase projects:** one for development/preview, one for production. Free allows two; Pro is per project. Preview deployments of `phase-2` use the development project so test data never touches real customers.
7. **Vercel plan:** the Hobby plan is meant for non-commercial use and limits cron jobs to once a day. Because we take payments (even by transfer) check Vercel's terms; we avoid Vercel cron entirely by using `pg_cron` in the database.

**Other stack choices (all within CLAUDE.md):**
- `@supabase/supabase-js` and `@supabase/ssr` for server-side sessions via cookies.
- Next.js server components / route handlers for all writes. No Supabase service-role key in the browser, ever.
- Money stored as integer **kobo** (NGN x 100), never floats.
- Timezone: store `timestamptz` (UTC); all booking logic and display in `Africa/Lagos` (WAT, UTC+1, no daylight saving).
- Validation with the same server-side approach as Phase 1 forms (shared validators, sanitise, length limits).

---

## 2. Data model

Conventions: every table has `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`. RLS is enabled on every table. All money columns are `bigint` kobo. `nullable price = not set` (site shows "Contact us for pricing").

### 2.1 `profiles` (one row per account, linked to Supabase `auth.users`)
| field | type | notes |
|---|---|---|
| id | uuid PK, FK auth.users | same id as the login |
| full_name | text | required |
| phone | text | Nigerian format, normalised +234 |
| role | enum `member`/`staff`/`admin` | default `member`; only changeable by an Admin via a database function |
| is_student | boolean | self-declared; verified in person |
| is_active | boolean | admin can disable an account |
| terms_accepted_at | timestamptz | consent record |
| deleted_at | timestamptz | set when data deletion is processed |
| created_at, updated_at | timestamptz | |
Email lives in `auth.users` (not duplicated). Nothing else is collected (no date of birth, no address, no ID).

### 2.2 `spaces`
| field | type | notes |
|---|---|---|
| slug | text unique | `day`, `overnight` |
| name | text | |
| capacity | int | day: 30 desks per slot; overnight: people at once |
| is_bookable | boolean | master on/off switch per space |
| requires_approval | boolean | true for overnight |
| min_age | int | 18 for overnight, null for day |

### 2.3 `opening_hours` (per weekday, day space)
`weekday smallint (0-6)`, `is_closed boolean`, `opens_at time`, `closes_at time`. Seven rows. Opening default 08:00; closing is **not decided** (open question Q1). Optional later: `date_overrides` table for public holidays/special closures (listed in milestone 3 as optional).

### 2.4 `prices`
| field | type | notes |
|---|---|---|
| space_id | FK | |
| kind | enum `hour` / `half_day` / `day` / `month` / `night` | **There is no weekly kind.** Day space uses `hour`, `half_day`, `day`, `month`. Overnight uses `night` and optionally `month` |
| audience | text `standard` / `student` | **Student prices (decided 23 October 2026):** students are NOT free. They pay a lower, optional price. Student rows exist only for `hour`, `day` and `month`; blank means no student rate for that option |
| amount_kobo | bigint null | null = not set |
| updated_by, updated_at | | |

How an empty price behaves (one rule per kind, applied everywhere on the site and in the booking form):
- `hour`, `day`, `month` (day space) and `night` (overnight) are the core options. If empty, that option shows **"Contact us for pricing"** with a link to the contact page, and cannot be booked online. It never shows an empty or zero price.
- `half_day` (day space) and `month` (overnight) are **optional**. If empty, the option is **hidden entirely**: not on the pricing display, not in the booking form, nowhere in the page source.
- A price of exactly 0 is not allowed in this table. Nothing on the site is free. A student price can never be higher than the standard price for the same option, and the database enforces that.

### 2.5 `settings` (single row of business rules; typed columns, not free-form)
| field | type | notes |
|---|---|---|
| hold_minutes | int | how long an unpaid booking holds its seats (decided: 120) |
| claimed_review_hours | int | how long an "I've paid" booking can wait before it is flagged overdue for admin |
| advance_booking_days | int | how far ahead people can book (proposed 30) |
| max_hours_per_booking | int | proposed 10 |
| cancellation_cutoff_hours | int | self-cancel of single bookings allowed until this long before start (proposed 24) |
| half_day_definition | jsonb | e.g. morning = opening to 13:00, afternoon = 13:00 to closing (Q3); only used when a half-day price exists |
| monthly_pass_days | int | length of a monthly pass (proposed 30 consecutive calendar days) |
| monthly_pass_max_desks | int | most desks that monthly passes may hold at once (proposed 10 of the 30), so hourly and daily customers always have desks |
| monthly_start_window_days | int | how far ahead a pass start date may be chosen (proposed 14) |
| monthly_self_cancel_cutoff_hours | int | pass can be self-cancelled until this long before its start date (proposed 48) |
| overnight_max_nights | int | longest single overnight booking (proposed 7); longer stays use the monthly option or contact us |
| overnight_window | text/json | check-in and check-out times |
| overnight_location_private | text | the secret address text, only readable via the approval rule (section 5) |
| overnight_rules_text | text | house rules shown after approval |
| require_verified_email | boolean | default true. If false, a member can book with an unverified email provided a phone number is present and staff call or WhatsApp to confirm (emergency fallback, section 3A.6) |
| booking_enabled | boolean | global kill-switch; false keeps the site exactly like Phase 1 |

Not stored in the database: email provider credentials and the sender address. Those are environment variables (section 3A.4), because secrets must never sit in a table an admin page can display.

### 2.6 `bank_details` (single active row; editable by Admin only)
`bank_name`, `account_number`, `account_name`, `note` (optional text shown with the details), `updated_by`, `updated_at`.
Customers only see these after creating a booking (never on a public page).

### 2.7 `bookings`
| field | type | notes |
|---|---|---|
| reference | text unique | e.g. `RSF-7K3Q9M`: 6 characters from an alphabet without 0/O/1/I, generated server-side, retried on clash |
| user_id | FK profiles | owner |
| space_id | FK spaces | |
| kind | enum | `hour`, `half_day`, `day`, `month`, `night` (the price option chosen). `month` on the day space is the monthly desk pass; `month` on the overnight space is a monthly desk |
| starts_at, ends_at | timestamptz | hour/half_day/day: within one opening day; month: start date to start date + `monthly_pass_days`; overnight: nights as check-in/out |
| seats | int | 1 for now (one person per booking). Kept as a column so group bookings can come later |
| status | enum | see 3.1 |
| amount_kobo | bigint | price **snapshot** at booking time (the standard or the student price that applied), so later price changes never alter it |
| is_student_price | boolean | the member ticked "I am a student" and paid the student price. Student status is checked in person on arrival; no student ID is ever uploaded or stored |
| confirmed_18_plus | boolean + `confirmed_18_plus_at` | overnight checkbox record |
| hold_expires_at | timestamptz null | set while `pending_payment`; cleared once claimed |
| approved_by, approved_at | | overnight in-person approval |
| cancelled_by, cancelled_at, cancel_reason | | |
| created_at, updated_at | | |

### 2.8 `booking_slots` (what makes seat counting safe)
One row per space per hour-slot a booking occupies: `booking_id`, `space_id`, `slot_start timestamptz`. A slot is counted for capacity only while its booking's status is a **counting status** (3.1). Overnight uses one slot per night. A monthly pass writes one slot row for every open hour of every open day in its window (about 260 rows for a 30-day pass), so one counting rule serves every booking type. This table is what the capacity check counts and locks against.

### 2.9 `payments` (payment records, one per booking attempt)
| field | type | notes |
|---|---|---|
| booking_id | FK | |
| method | text | always `bank_transfer` |
| expected_kobo | bigint | copy of the booking amount |
| customer_reference | text null | what the customer typed (transfer reference / sender name) |
| claimed_at | timestamptz null | when they tapped "I've paid" |
| status | enum `awaiting`/`claimed`/`confirmed`/`rejected` | |
| confirmed_by, confirmed_at | | admin/staff who checked the bank account |
| rejected_reason | text null | shown to the customer |
| received_kobo | bigint null | admin can record what actually arrived (mismatch handling) |
No card or account numbers of customers are stored; we never see their bank details.

### 2.10 `audit_log` (append-only)
`actor_id`, `actor_role`, `action` (e.g. `booking.confirm`, `settings.price.update`, `role.promote`), `entity_type`, `entity_id`, `before jsonb`, `after jsonb`, `created_at`. No update or delete allowed for anyone (RLS plus revoked privileges). Admin can read it; Staff cannot.

### 2.11 `email_log`
`to_user_id`, `template`, `booking_id`, `status` (`sent`/`failed`), `provider_id`, `error` (no secrets), `created_at`. Lets us retry failures and prove what was sent.

### 2.12 `rate_events` (small table for limits that must survive serverless restarts)
`key` (e.g. user id or IP hash), `action`, `created_at`. Used for booking-attempt limits (the in-memory limiter used by Phase 1 forms resets on every serverless instance, so it is not enough here).

Retention: `pg_cron` job deletes or anonymises bookings, payments, email logs and rate events 12 months after the booking end date (see section 5.8 for the financial-records caveat).

---

## 3. Booking and bank-transfer flow

### 3.1 Booking statuses
`pending_payment` -> `payment_claimed` -> `confirmed` (happy path, day space)
`pending_approval` -> `approved` -> `pending_payment` -> ... (overnight, see 3.4)
Terminal: `rejected`, `cancelled`, `expired`, `completed`, `no_show`.

**Counting statuses** (they occupy seats): `pending_payment` (while `hold_expires_at` is in the future), `payment_claimed`, `confirmed`, and for overnight `pending_approval` and `approved`. Everything else frees the seats immediately.

### 3.2 Day workspace, step by step
1. **Account:** visitor registers, verifies email, logs in. Unverified accounts cannot book (database function checks `email_confirmed_at`), unless the owner has switched `require_verified_email` off as an emergency fallback (3A.6).
2. **Pick:** choose a date (open day, within `advance_booking_days`), then hourly slots, a full day, or a half day (offered only when a half-day price is set). Monthly passes are booked from a separate "Monthly pass" option (3.7). The page shows remaining desks per hour from a public, read-only availability function that returns **counts only**, never other people's data.
3. **Price:** shown from `prices`. If an hour, day or month price is not set, that button becomes "Contact us for pricing" and no booking is created. An unset half-day price hides the half-day option entirely. If a student price is set for the chosen option, the member can tick "I am a student" and pay the student price (3.5).
4. **Create booking** (one database function, all-or-nothing):
   - lock the space row (`SELECT ... FOR UPDATE`), so two people cannot book the last desk at the same time;
   - check the member is verified, active, within limits (max 3 open `pending_payment` bookings, max hours, cutoff, opening hours, closed days);
   - for every hour slot, count counting-status seats; reject with "No longer available" if any slot would exceed `capacity`;
   - insert the booking (price snapshot, unique reference, `hold_expires_at = now + hold_minutes`) and its `booking_slots`;
   - write an audit-style event; return the reference.
5. **Pay screen:** shows the bank details (from the database), the exact amount, the **reference to use as the transfer narration**, and a live countdown of the hold. Email sent with the same information.
6. **"I've paid":** customer taps the button, optionally types a transfer reference / sender name. Status -> `payment_claimed`, `hold_expires_at` cleared (their seats stay held for admin review; they are not auto-expired because they say they paid). Admin gets a notification email.
7. **Admin check:** admin/staff opens the payment queue, checks the bank account for the reference and amount, then **Confirm** (-> `confirmed`, customer emailed) or **Reject** with a reason (-> `rejected`, seats freed, customer emailed with the reason and what to do). Staff and Admin may both do this; every action is logged.
8. **Unpaid:** if the member never taps "I've paid" the hold lapses at `hold_expires_at`, the booking becomes `expired`, the seats are freed, and the member can rebook. A reminder email goes out shortly before expiry.
9. **Late payment:** if money arrives after expiry, admin finds the reference and either re-opens the booking (if seats still free) or tells the customer the slot is gone and arranges a refund by hand. Refunds are manual and outside the system (Q7).
10. **After:** a daily job marks past confirmed bookings `completed`.

### 3.3 Seat counting, holds and expiry (how overbooking is prevented)
- Capacity is **per hour slot**, taken from `spaces.capacity` (30 now). The check counts rows in `booking_slots` joined to counting-status bookings. The count and the insert happen inside the same transaction that holds the space-row lock, so concurrent requests queue instead of racing.
- **Expiry is enforced two ways:** (a) every capacity check ignores `pending_payment` holds whose `hold_expires_at` has passed, so an expired hold never blocks anyone even if the cleanup job is late; (b) a `pg_cron` job every minute flips overdue holds to `expired`.
- **Changing capacity downward** (e.g. 30 -> 20) never cancels existing bookings. It only limits new ones, and the admin settings page warns when existing bookings already exceed the new number for a future slot.

### 3.4 Overnight workspace (proposed order, Q4 asks you to confirm)
1. Member (18+ checkbox ticked, stored with timestamp) requests nights. Status `pending_approval`; seats are tentatively counted so the room cannot be oversold.
2. The team sees the request, invites the person to the office, and meets them. **ID is checked in person only; the website never has an upload field and never stores ID data.** Admin/Staff clicks **Approve** (-> `approved`) or **Reject**.
3. On approval the member gets an email and the booking moves to `pending_payment` with the normal hold and bank-transfer steps.
4. After payment is confirmed, the **location and house rules become visible to that member** on their booking page and in the confirmation email. Before that point the location text is not readable by anyone but Admin/Staff (section 5.5).
5. The overnight capacity counts people per night. Check-in/out times come from settings. A single booking may be up to `overnight_max_nights`. Longer stays use the optional monthly desk (3.8), which is hidden unless an overnight monthly price is set.
Why approve-before-pay: nobody pays and then gets refused in person. If you prefer pay-then-approve, only the order of two steps changes.

### 3.5 Student prices
- **Replaces the earlier "Free for students" idea (decided 23 October 2026).** Students pay a lower price by bank transfer, exactly like everyone else. Nothing is free.
- The Admin can enter a student price for each of per hour, per day and per month (all optional; blank means no student rate for that one). The starting value is **1,000 naira per day**. Everything is editable in Settings and every change is audited. A student price cannot be higher than the standard price for the same option.
- When booking, a member ticks "I am a student" to get the student price. **Student status is checked in person on arrival** (they show a student ID to staff; we never upload or store it). If someone cannot show proof, staff collect the difference or decline entry; the booking admin screen (M5) will have a note for that.
- Student rates exist only for the day workspace (hour, day, month). There is no student half-day price and no student rate for overnight.
- With no free bookings, the abuse risk is small (the most anyone gains is the price difference), so there is no per-day limit and no staff review step for student bookings.

### 3.6 Emails sent
Templates: verify email and password reset (sent by Supabase Auth through our SMTP, 3A), booking created (bank details, reference, hold deadline), hold expiring soon, "I've paid" received (customer), payment awaiting review (admin), confirmed, rejected (with reason), cancelled, expired, overnight approved (location only after payment is confirmed), reminder the day before, monthly pass starts tomorrow, monthly pass ends in 5 days (with a Renew link). Every email is also visible inside the member's account (My bookings), so a lost or filtered email never hides a booking. Failures are recorded in `email_log` and retried by a scheduled job; a failed email never blocks the booking. How the sender is configured is in 3A.

### 3.7 Monthly desk pass (day workspace)
**What it is.** One desk guaranteed for `monthly_pass_days` (decided: 30) **consecutive calendar days** from a start date the member chooses. The booking page, the pass description and the confirmation email must all state this plainly: "30 calendar days from your start date. Sundays and other closed days still count." It is "a desk", not a named desk: the member sits at any free desk on arrival, and staff look the pass up by name or reference. Closed days inside the window still count toward the 30 days (nothing is owed for a normal closed day). If the Foundation closes unexpectedly for several days, an Admin can **extend** the pass (audited).

**Capacity.** A pass occupies 1 desk in every hour slot of every open day in its window. At booking time the same locked check as 3.3 runs and must pass **both** tests for every day: (1) free desks in the slot (capacity 30, counting all booking types) and (2) fewer than `monthly_pass_max_desks` passes already cover that day. Test 2 is what stops monthly customers from taking all 30 desks and locking out hourly and daily users. When the cap is full, the page says monthly passes are fully booked for that start date and offers the next available start date. A pass holder cannot also book an hourly or daily slot on days the pass covers (the form says "Your monthly pass covers this day"), so desks are never double-counted. If opening hours change later, the pass automatically follows the new hours (future slot rows are regenerated and the admin sees a warning if this overfills any hour).

**Payment (bank transfer, confirmed by staff).** Exactly the 3.2 flow: choose start date -> booking created as `pending_payment` with the 2-hour hold and the month price copied into the booking -> member transfers using the reference -> taps "I've paid" -> staff checks the account and confirms -> the pass is `confirmed`. If staff confirm **after** the chosen start date, the start moves to the confirmation day by default (the customer should not pay for days they could not use); an Admin can override with a reason. An unpaid hold expires and releases the desk like any other booking.

**Cancellation and refunds.**
- Unpaid or "I've paid" but not yet confirmed: the member can cancel at any time, seats are freed.
- Confirmed, start date not yet reached: self-cancel until `monthly_self_cancel_cutoff_hours` (48 h) before the start date. The booking becomes `cancelled` and is flagged "refund owed". **Refunds are made by hand** by an Admin by bank transfer; staff collect the refund account details by phone or WhatsApp (never stored on the site), and record the refund reference in the audit log.
- After the start date: no self-cancel and no automatic refund. An Admin may cancel and approve a partial, discretionary refund; the amount and reason are recorded.
- Passes are not transferable between people and cannot be paused in version 1.

**Renewal.** A "Renew" button on an ending pass creates a new booking that starts the day after it ends. Desk availability is checked again at that moment (a renewal is not guaranteed unless it is paid before another member takes the desk). Reminder email 5 days before the end.

### 3.8 Overnight monthly desk (optional)
Only available when an overnight monthly price is set; otherwise hidden. A desk for 30 consecutive nights, counted against overnight capacity for every night in the window (capacity is people at once). It follows the same approve-first rule: the person is approved once in person, then pays by bank transfer, then the location is revealed. Cancellation and refund rules mirror 3.7. The per-night price is the standard option and is limited to `overnight_max_nights` per booking.

---

## 3A. Email delivery and verification until the Resend domain is verified

**Situation.** The Resend sending domain cannot be verified for about two months because DNS access at GoDaddy was removed. Until then Resend can only deliver to the account owner's own address, so it cannot send verification or booking emails to customers. The system needs a bridge, and a clean way to switch later.

### 3A.1 Is Supabase's built-in email sender suitable? **No.**
[FROM MEMORY: VERIFY on supabase.com/docs, Auth, "Send emails"] The default sender is a shared service meant for trying things out: it is rate-limited to a very small number of emails per hour, it has only delivered to addresses belonging to members of the Supabase project team (so it would not reach real customers at all), it uses a generic sender, and it comes with no delivery guarantee. Supabase's own guidance is that it is not for production. Confirmed unsuitable: we use custom SMTP from the first milestone.

### 3A.2 Option A: dedicated Gmail account as custom SMTP
Create a new Google account used only for sending (not anyone's personal inbox), turn on 2-Step Verification, create an **app password**, and enter smtp.gmail.com with that app password in two places: Supabase (Auth, SMTP settings) for verification and reset emails, and our app's environment for booking emails.

Honest limits **[FROM MEMORY: VERIFY each against Google's current Gmail and Workspace documentation]**:
- **Daily cap:** about 500 recipients per rolling 24 hours for a free Gmail account over SMTP (about 2,000 for Google Workspace). Going over can pause sending for up to about a day. Our expected volume (a few hundred emails a day at most) fits, but the cap is shared by verification, reset and booking emails.
- **Sender address:** Gmail sends as the authenticated account (a gmail.com address). The display name says "Rafael Support Foundation", and Reply-To is set separately through the `REPLY_TO_EMAIL` setting (3A.7). It cannot be `@rafaelsupportfoundation.org` until the domain route exists.
- **Spam-folder risk:** mail sent through Google's own servers passes SPF, DKIM and DMARC for gmail.com, so it usually reaches Gmail inboxes, which most Nigerian users have. It is more likely to land in spam with Yahoo and Outlook, with a brand-new account, with bursts of identical emails, and when the message links to a different domain than the sender. It also looks less official, and a sender that is a gmail.com address is less trusted by careful users.
- **Account risk:** Google can suspend an account that sends automated bulk-looking mail. That would stop all sending at once. Mitigations: low volume, plain transactional wording, a recovery phone and email on the account, and a monitor (3A.5).
- **App passwords** require 2-Step Verification and are not offered on some account types (for example Advanced Protection or accounts whose Workspace administrator disabled them).
- **Supabase side:** Supabase keeps its own hourly limit on auth emails even with custom SMTP (a low default that can be raised in Auth, Rate Limits) [FROM MEMORY: VERIFY].
- Cost: free.

### 3A.3 Option B: SMS one-time codes (phone verification)
**Supabase built-in phone providers [FROM MEMORY: VERIFY]:** Twilio, Twilio Verify, MessageBird, Vonage, Textlocal. **Nigerian providers** such as Termii or Africa's Talking are not built in; they are used through Supabase's "Send SMS" auth hook, a small server function we would write that forwards the code to their API. That is extra code and one more thing to maintain.

| Item | What I believe [FROM MEMORY: VERIFY every row] |
|---|---|
| Cost per SMS | Twilio to Nigerian numbers: roughly USD 0.05 to 0.12 per message. Termii and Africa's Talking: roughly NGN 4 to NGN 8 per message (low confidence, check current price lists). At 300 codes a month, about NGN 1,500 to 2,500 locally, or USD 15 to 35 with Twilio |
| Sender ID | Nigeria requires alphanumeric sender IDs to be registered through the SMS provider before messages are delivered reliably. Registration can take days to weeks and may carry a fee. Unregistered IDs can be replaced with a generic ID or blocked. Numeric long numbers are generally poor for Nigerian A2P SMS. Twilio in particular has been difficult for Nigerian alphanumeric delivery |
| Do Not Disturb (DND) numbers | Many Nigerian numbers are on the DND list. OTPs to them need a transactional or DND-bypass route, which costs more and must be enabled with the provider |
| Delivery reliability | Local aggregators with the right route are generally good on MTN, Airtel, Glo and 9mobile, but delays and occasional failures happen, especially at peak times. A "resend code" button and a fallback are needed |
| Running cost risk | Prepaid balance: if it runs out, nobody can sign up or log in with a code |
| NDPA 2023 | A phone number is personal data we already collect. SMS verification adds: an SMS provider as a data processor (cross-border for Twilio), a stored phone number in the login system, OTP logs (keep minimal and delete quickly), updated privacy text, and a written processor agreement. It also makes the phone number an identifier that must be kept accurate and removable when a user deletes their account |

### 3A.4 Option C: other routes considered
- **C1. A mailbox that already exists on rafaelsupportfoundation.org (for example info@ hosted by GoDaddy).** If you still know its login, we can send through that mailbox's SMTP server. It sends *as* @rafaelsupportfoundation.org with the mail host's own SPF and DKIM, so no DNS change is needed and it looks official. Daily caps are lower and vary by plan [FROM MEMORY: VERIFY]. **Only possible if you still have that mailbox's login.**
- **C2. Buy a small separate domain just for email** (about USD 10 to 15 a year [FROM MEMORY: VERIFY]) at a registrar you control, verify it in Resend in an hour or so, and send from, for example, `no-reply@<new-domain>` with Reply-To set to the real info@. This gives true Resend deliverability now. **Caveats:** Resend's free plan has a lower daily cap than Gmail (about 100 emails a day [FROM MEMORY: VERIFY]), the sender domain differs from the website domain, and it is one more domain to renew.
- **C3. WhatsApp click-to-chat from the admin panel (free, no integration).** A "Message on WhatsApp" button on each booking opens WhatsApp with a ready-written message (reference, amount, status). It needs no API and no cost. It is a **complement, not a replacement**, for sending verification links.
- **C4. Third-party mail services with a "single sender" check (for example Brevo) using a Gmail address as sender: not recommended.** Mail that claims to be from gmail.com but is sent from another company's servers fails Gmail's DMARC policy and is often rejected or junked [FROM MEMORY: VERIFY].
- **C5. Google Workspace for Nonprofits:** needs domain DNS access, so it does not help during the two-month gap.

### 3A.5 Recommendation: **Option A (Gmail SMTP) now, built so Resend is a configuration switch**
Why: it is free, can be working the same day, handles our volume, keeps verification by email (which also protects password resets), adds no SMS cost, no sender-ID registration, and no new personal-data processor beyond Google, which carries the same emails anyway. SMS is better kept as a possible later addition for the overnight service, not the sign-up gate. C1 replaces A if you still have the info@ mailbox login (more official sender). C2 is the upgrade if the Gmail deliverability test in M1 fails or volume grows. C3 is added regardless.

**How to make switching a configuration change (no code later):**
- All app emails go through one server function, `sendEmail()`, that reads environment variables: `EMAIL_PROVIDER` (`smtp` or `resend`), `EMAIL_FROM` (display name and address), `REPLY_TO_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and the existing `RESEND_API_KEY`. The existing `FORMS_FROM_EMAIL` stays as the Phase 1 forms sender and is not touched.
- Supabase's verification and reset emails use the SMTP fields in the Supabase dashboard (Auth settings). Switching means changing those fields; no deploy.
- **Switch-over checklist (about 30 minutes, whenever the domain is verified):** verify the domain in Resend; set `EMAIL_PROVIDER=resend` and `EMAIL_FROM=info@rafaelsupportfoundation.org` in Vercel; replace the SMTP fields in the Supabase dashboard with Resend's SMTP details; send a test verification, reset and booking email; retire the Gmail account.
- A small `nodemailer` dependency is needed for SMTP (to be installed only when M1 is approved).
- The admin **Email health** page (section 4) shows emails sent and failed per day and warns at 70% of `EMAIL_DAILY_CAP` (an environment value, proposed 450 for Gmail).
- Reduce spam risk: plain-text-friendly wording, one clear button or link, no images or attachments, a consistent display name, a "Didn't get the email? Check your spam folder or resend" panel with a 60-second resend cooldown, and a deliverability test to Gmail, Yahoo and Outlook inboxes before M1 is accepted.

### 3A.6 How much risk remains if email verification is lighter, and does it change the recommendation?
Staff confirm every booking only after seeing the money in the bank account, so **a fake or mistyped email cannot get anyone a confirmed booking**. That makes lighter verification much less risky than on a site that auto-confirms. What remains:
1. **Mistyped or someone else's email:** the customer never gets the hold or confirmation, so they may miss payment deadlines or no-show. Mitigation: everything is also shown in the account page, plus WhatsApp click-to-chat.
2. **Account takeover through password reset:** if the email on the account is not proven to belong to the person, whoever really owns that address could reset the password and see that person's bookings and phone number. This is the main reason **password reset must stay email-verified**.
3. **Using the system to send mail to strangers:** signup with a victim's address would send them an email. Rate limits on signup and a verification-only first email limit this.
4. **Desk hoarding with throwaway accounts:** limited by the 2-hour hold, the 3-unpaid-bookings cap and rate limits, and by staff only confirming paid bookings.
5. **False student claims:** the most anyone gains is the price difference, and the real check is the in-person student ID on arrival.
**Conclusion: the recommendation does not change.** Keep email verification required (Option A makes it affordable). The `require_verified_email` setting exists as an emergency fallback only: if Gmail is suspended or hits its cap, an Admin can switch it off and bookings continue, with staff confirming by phone or WhatsApp before approving, and password reset temporarily disabled for unverified accounts. Overnight always needs the in-person visit regardless.

### 3A.7 Sender, Reply-To and inboxes (decided by the owner)
No email address or password is written in this file or in any committed file. Addresses live only in `.env.local` and Vercel environment variables (and in the Supabase SMTP settings for auth emails).

| Role | Where it is set | Notes |
|---|---|---|
| **Sender** (the Gmail account that sends, display name "Rafael Support Foundation") | `SMTP_USER` and `EMAIL_FROM` in env; Supabase Auth SMTP settings | Gmail SMTP with an app password. `info@rafaelsupportfoundation.org` is **not** used for now |
| **App password** | `SMTP_PASS` in env; Supabase Auth SMTP password field | Known only to the owner. Never in chat, git, logs or docs |
| **Reply-To** (the requests inbox) | `REPLY_TO_EMAIL` in env | Changing it later (for example to info@) is an environment change in Vercel, no code or redeploy of logic |
| **Form submissions** (Phase 1 forms) | `FORMS_TO_EMAIL` (unchanged) | Keep going to the requests inbox exactly as today |

**Which emails carry the Reply-To**
- **The app's own emails** (booking created, "I've paid" received, confirmed, rejected, reminders): our `sendEmail()` sets the Reply-To header from `REPLY_TO_EMAIL` on every message. Tested in M1 with a test email.
- **Supabase auth emails (verify email, reset password): probably cannot carry a Reply-To.** I checked Supabase's custom SMTP documentation: it lists host, port, user, password, sender address and sender name, and mentions no Reply-To field or setting. The official page does not state it either way for the dashboard form, so **the owner should look at the SMTP form in the Supabase dashboard**: if there is no Reply-To box, the answer is no. [Dashboard layout may differ from the documentation; verify on screen.]
- **What a customer would see if it cannot:** they get the verification or reset email from "Rafael Support Foundation" at the sender Gmail address. If they press Reply, the reply goes to that sender inbox, not the requests inbox. **Does it matter?** Little, because these are automated, one-click messages and people rarely reply to them. The risk is a worried customer replying "I can't get in" to an inbox nobody reads.
- **Mitigations (any combination, no code needed):**
  1. In the Supabase email templates, end with a line such as "This is an automated message. Need help? Contact us at the Contact page on our website or on WhatsApp", with a link to the website's contact page and the WhatsApp number (no email address needed in the text). Template text is pasted into the Supabase dashboard; the repo copy uses a placeholder for any address.
  2. In the **sender** Gmail account, set up **forwarding** of incoming mail to the requests inbox (Gmail Settings, Forwarding; Google asks the requests inbox to confirm). Replies to verification emails then reach the team.
  3. Optionally turn on a short **auto-reply** (vacation responder) in the sender account pointing people to the Contact page.

### 3A.8 Measured deliverability and the launch requirement (decided by the owner)
**Measured in M1 testing (Gmail SMTP bridge):** the verification email reached Gmail inboxes, but on **Yahoo and Outlook it landed in spam, instantly, with the correct sender name**. This is the spam-folder risk named in 3A.2. It is acceptable while the system is being built and tested, but **it is not acceptable for real customers**, many of whom use Yahoo or Outlook addresses.

**LAUNCH REQUIREMENT:** before the booking system is opened to the public, a **verified sending domain** must be in place (Resend with `rafaelsupportfoundation.org`, SPF and DKIM passing, a DMARC record published), and the switch-over checklist in 3A.5 must be completed. **The Gmail bridge is for development and testing only and must not be the production sender.** If the main domain's DNS is still unavailable at that point, the fallback is option C2 (a small separate email-only domain verified in Resend) or option C1 (a mailbox on the main domain), never Gmail alone.

**Launch gate (all must pass, tested on Gmail, Yahoo and Outlook inboxes):**
1. Verification, password-reset and booking emails arrive in the **inbox** (not spam) on all three providers.
2. SPF, DKIM and DMARC show "pass" in the message headers.
3. The sender is the Foundation's own domain, and Reply-To works.
4. The Resend daily limit for the chosen plan covers expected volume (check the plan; the free plan's daily cap is low).

---

## 4. Admin panel pages

Lives under `/admin` (not in the public nav, not in the sitemap, `noindex`). Login required; role checked on the server for every page and every action.

| Page | Admin | Staff | What it does |
|---|---|---|---|
| Dashboard | yes | yes | Today's bookings, pending payment claims, overnight requests waiting, overdue reviews, desks used today |
| Bookings | yes | yes | Search by reference, name, phone; filter by status/date/space; open a booking to see its timeline; actions: confirm, reject (reason), cancel (reason), mark no-show, "Message on WhatsApp" (ready-written click-to-chat message) |
| Payment queue | yes | yes | Only `payment_claimed` bookings, oldest first, with expected amount, reference, customer note; one-click confirm / reject |
| Overnight requests | yes | yes (proposed, Q6) | Approve or reject after the in-person meeting; shows 18+ confirmation record, no ID fields |
| Today / calendar | yes | yes (read) | Hour-by-hour seat usage for a chosen day |
| Monthly passes | yes | yes (read; Admin may extend or cancel) | Active and upcoming passes, desks held by passes against `monthly_pass_max_desks`, passes ending soon, refund-owed list |
| Settings: Hours | yes | no | Per-weekday opening/closing, closed days |
| Settings: Capacity | yes | no | Day desks, overnight capacity, bookable on/off per space |
| Settings: Pricing | yes | no | Day space: per hour, per day, per month, optional half day. Overnight: per night, optional per month. Blank hour/day/month/night = "Contact us for pricing"; blank half day or overnight month = option hidden. No weekly price exists |
| Settings: Student prices | yes | no | Part of the Prices page: optional student price for per hour, per day, per month (starting value 1,000 naira per day) |
| Settings: Bank details | yes | no | Bank name, account number, account name, note |
| Settings: Booking rules | yes | no | Hold time, advance days, max hours, cancellation cutoff, half-day definition, monthly pass length, monthly pass desk cap, monthly start window and cancel cutoff, overnight max nights and window, overnight location and house rules, require verified email, global booking on/off |
| Users | yes | no | List members; create or promote **staff**; demote; deactivate; process a data-deletion request; student flag |
| Audit log | yes | no | Read-only list of every admin/staff action with before/after; filter by person, date, entity |
| Email health | yes | no | Emails sent and failed per day, failed-email retry, share of the daily sending cap used, and which provider is active (never shows passwords or keys) |
| My account | yes | yes | Change password, set up 2FA |

Every settings save: validated on the server, writes the audit log (old and new value), and the public site reads the new value on its next request (short cache with revalidation so changes appear within seconds, no redeploy).

Phase 1 pages stay as they are until go-live. A single `booking_enabled` flag (database) plus a build-time feature flag decide whether the Tech & Space page shows the booking calls to action or the existing request forms.

---

## 5. Security

### 5.1 Principles
- The **database is the last line of defence**: RLS is on for every table; the default is "no access", and access is granted per role.
- Role is read from `profiles.role` in the database, **never from anything the user can edit** (not from user metadata, not from the browser).
- Writes to bookings, payments and settings go **only** through server code and `SECURITY DEFINER` functions that re-check role and ownership. The browser cannot insert or update those tables directly.
- The Supabase **service-role key** exists only in Vercel server environment variables, only used by a small number of server routes (email retry, cron-like tasks, account deletion). Public (anon) key is the only key in client code.

### 5.2 Row Level Security rules (summary)
| Table | Member | Staff | Admin |
|---|---|---|---|
| profiles | read/update own (not `role`, `is_active`) | read members who have bookings | read/update all; change role only via `set_user_role()` |
| spaces, opening_hours, prices, public part of settings | read (via a view with no secrets) | read | read/write |
| settings (private fields: overnight location, rules) | none directly | read | read/write |
| bank_details | none directly; shown via a function only after they own a booking | read | read/write |
| bookings | read own; create only via `create_booking()` | read all; confirm/reject via functions | read all; all actions via functions |
| booking_slots | none | read | read |
| payments | read own | read; update via functions | read; update via functions |
| audit_log | none | none | read only; no one can update or delete |
| email_log, rate_events | none | none | read |
Tests for each row of this table are part of the milestone checklists (section 7).

### 5.3 Preventing double-booking and overbooking
Row lock on the space during capacity check and insert (3.3); unique reference; unique `(booking_id, slot_start)`; idempotent "I've paid" and confirm actions (pressing twice does nothing extra); a concurrency test that fires many simultaneous bookings at the last desk and proves only one succeeds is a launch requirement.

### 5.4 Validation, rate limiting, abuse
- Server-side validation and sanitisation of every input (same approach as Phase 1), plus database `CHECK` constraints (non-negative amounts, `ends_at > starts_at`, capacity > 0, valid enums).
- Limits kept in the database (`rate_events`): booking creation per user per hour, "I've paid" per booking, password-reset requests per email and IP, signup per IP. Supabase also rate-limits auth endpoints itself.
- Max 3 open unpaid bookings per member, so a person cannot hoard seats by repeatedly booking and not paying.
- Email verification required before booking (emergency fallback switch in 3A.6). Password reset is always email-verified. A CAPTCHA at signup is **not** planned (we removed Turnstile in Phase 1); we add one only if bot signups appear.
- Generic error messages for login and reset (do not reveal whether an email exists). Passwords: minimum 10 characters; Supabase hashes them.

### 5.5 Overnight privacy rules
- `overnight_location_private` and house rules are in a table column that no public or member query can read. A function `get_overnight_details(booking_id)` returns them only if the caller owns that booking **and** its status is paid and confirmed (or Admin/Staff). Never in page HTML for anyone else, never in emails before confirmation, never in any public API.
- No file upload fields anywhere in the booking or account flow, no storage bucket for IDs. This is checked in review and in the test checklist.

### 5.6 Admin protection
- Staff cannot reach settings, users, audit log or bank details: enforced in RLS and in server code, not only by hiding menu items.
- Only an Admin can call `set_user_role()`. An Admin cannot demote or deactivate the **last** remaining Admin (database check).
- 2FA (TOTP) required for Admin and Staff accounts from milestone 2 onward.
- Admin sessions time out after a period of inactivity; login attempts are rate-limited.

### 5.7 Audit trail
Every Admin/Staff mutation writes `audit_log` in the same transaction as the change (so a change cannot happen without a log row). Logged: login of privileged users, booking confirm/reject/cancel/approve, every settings change with before/after values, role changes, user deactivation, data deletion/export, bank-detail changes (flagged high-visibility, with an email to the owner whenever bank details change, to catch account takeover and payment-redirect fraud).

### 5.8 NDPA 2023 compliance and deletion
- **Collected:** name, email, phone, the student flag, consent timestamps, and the 18+ confirmation. Nothing else. No ID documents ever.
- **Right of access:** a "Download my data" button gives the member their profile and bookings as a file.
- **Right to deletion:** a "Delete my account" request. On processing: the login and profile are removed, and booking and payment rows are **anonymised** (name, phone, notes removed; amounts, dates and references kept) so accounting records stay intact. A purely deleted payment trail could cause problems for the Foundation's financial records.
- **Retention:** 12 months after the booking end date, a scheduled job anonymises or deletes the personal data. Whether financial records must be kept longer under Nigerian law is a question for the Foundation's accountant or lawyer (Q10); the job's period is a single setting so it can change without code.
- **Privacy policy and terms must be updated before launch** (Supabase becomes a data processor outside Nigeria, and Google carries our emails while the Gmail bridge is in use; account data and booking data are listed; cookies now include a login session cookie, which changes the current "only light/dark and announcement bar" cookie statement).
- Data breach procedure (72-hour notice to the Nigeria Data Protection Commission) is written into the launch checklist.

---

## 6. Milestones

Each milestone is built on `phase-2`, tested on a Vercel preview deployment of that branch pointing at the **development** Supabase project, and starts only after you approve it. Phase 1 pages and forms stay untouched until milestone 8.

### M1. Login and an empty admin area (with the email bridge)
- Create the Supabase development project (you do this, section 8); connect env vars locally and in Vercel preview.
- **Email bridge:** the single `sendEmail()` function and the environment settings from 3A.5; Gmail SMTP connected both in the Supabase dashboard (verification, reset) and in the app environment. Supabase's built-in sender is not used. The `nodemailer` package is installed at this point, not before.
- Database: `profiles` with `role`, RLS on, a trigger that creates the profile at signup; `set_user_role()` stub; first Admin created by you through a one-time SQL step (documented), never through the website.
- Pages: Register, Verify email (with "Didn't get it? Check spam or resend" and a 60-second cooldown), Login, Logout, Forgot/Reset password, `/account` (name, phone, change password), `/admin` (empty dashboard that says who you are and your role). Admin/Staff/Member route guards in server code. `noindex` on all of them.
- Header gets a Login / Account link only when the `accounts_enabled` flag is on, so the live look does not change.
- Verification and reset email text written in the Foundation's warm tone and stored in the repo docs (Supabase keeps the live copy in its dashboard).
- Privacy page: draft text for accounts and for Google as the email carrier, finalised at M8.

### M2. People and safety foundation
- Admin: Users page (list, create or promote Staff, demote, deactivate). Staff creation by Admin only. Last-Admin protection.
- `audit_log` table, written for every role change, plus the Audit log viewer.
- Required 2FA for Admin and Staff.
- Rate-limit table and helper.
- `email_log` table and the Email health page (sent/failed, daily-cap warning).

### M3. Settings (the admin control panel)
- Tables: `spaces`, `opening_hours`, `prices`, `settings`, `bank_details` with seed rows (day desks 30, opening 08:00, closing 18:00, Monday to Saturday open and Sunday closed, monthly pass desk cap 10, everything priced left blank until you decide).
- Admin Settings pages: Hours, Capacity, Pricing (hour, day, month, optional half day; overnight night and optional month; no weekly), Students, Bank details, Booking rules (including monthly pass rules and `require_verified_email`). Every save audited; bank-detail changes email the owner.
- Public read: a small component that shows opening hours, desk count and prices (or "Contact us for pricing", or nothing for the optional half-day and overnight-month options) and any student prices that are set, on Tech & Space. **Behind the `booking_enabled` flag, off by default**, so the live site does not change.

### M4. Day workspace booking: hour, half day, day (create, hold, expire)
- `bookings`, `booking_slots`, `create_booking()` with capacity locking, holds, price snapshot, reference.
- Member pages: choose date and slot, availability counts, My bookings (list and detail), self-cancel within the cutoff rule.
- `pg_cron` expiry; reminder email; "booking created" email with placeholders for bank details.
- Concurrency and double-booking tests.

### M5. Bank-transfer flow
- Pay screen with bank details from the database and the reference/amount/countdown. "I've paid" button with optional transfer reference.
- `payments` table; Admin/Staff Payment queue and Bookings page with confirm, reject (reason), cancel, no-show; "Message on WhatsApp" button; all emails; failed-email retry job.
- Student price path: the "I am a student" tick uses the student price; staff check student status in person on arrival.
- End-to-end test with real bank transfers of a small amount.

### M6. Monthly desk pass
- `month` option on the day space: start-date picker, the two capacity tests (free desks and the pass cap), generated slot rows, "Your pass covers this day" rule, start-date shift on late confirmation, Admin extend, cancellation and "refund owed" list, Monthly passes admin page, renewal button and reminders.
- Concurrency test specific to passes and the cap.

### M7. Overnight workspace
- 18+ checkbox, `pending_approval` -> approve/reject screen for staff, then payment, then private location reveal.
- Overnight capacity per night; `overnight_max_nights`; house rules text; optional monthly desk (only if its price is set).
- Explicit test that no page, API response or email leaks the location early, and that no upload field exists.

### M8. Hardening, NDPA and launch
- **Launch gate: email domain verification (3A.8).** Booking is not opened to the public until Resend (or the fallback in 3A.8) sends from a verified domain and the Gmail, Yahoo and Outlook inbox test passes.
- Download my data, delete my account, retention job, final privacy/terms/NDPR text (including Supabase and Google as processors, and the new login cookie), cookie statement update.
- Load and concurrency tests, accessibility check, dark mode check, PageSpeed check (target stays 99 mobile), Nigerian-network testing on a phone.
- Backups confirmed (Pro plan), production Supabase project, Vercel production env vars, owner sign-off, then your explicit approval to merge `phase-2` into `main` (CLAUDE.md currently forbids this, so it will be updated at that point). Booking calls to action replace the request forms only after the system has passed testing; the old forms remain as the fallback via the `booking_enabled` flag.
- **Resend switch-over (configuration only, any time after the domain is verified):** the checklist in 3A.5. It can happen before or after launch and needs no code change.

---

## 7. Test checklist per milestone

**M1**
- Register with a new email: verification email arrives at a real **customer-style inbox**: test Gmail, Yahoo and Outlook addresses, and record whether each landed in inbox or spam. The link logs in.
- Supabase's built-in sender is confirmed off (the verification mail arrives from the Gmail sender, and works for an address that is not a Supabase team member).
- Unverified account cannot reach `/account`, cannot book.
- Wrong password gives a generic error; reset-password email works end to end.
- A Member visiting `/admin` is refused. A signed-out visitor is redirected to login.
- A Member cannot change their own `role` (try through the browser console and the API).
- Sender switch check: change `EMAIL_FROM` in the environment and see the next booking-style test email use it; confirm no credential appears in the repo, page source or logs.
- Phase 1: all existing pages and every request form still work; Lighthouse mobile score unchanged (99); dark mode on the new pages.
- `.env.local` and all keys absent from git; build and lint pass.

**M2**
- Only an Admin sees the Users page; Staff cannot create or promote anyone (UI and direct API).
- Cannot demote or deactivate the last Admin.
- Every role change appears in the audit log with who, when, before and after; nobody can edit or delete a log row.
- Admin and Staff are forced to set up 2FA.
- Email health shows sent and failed counts correctly and warns when the daily cap share is exceeded (simulate with a low `EMAIL_DAILY_CAP`).

**M3**
- Admin edits each setting; the public page shows the new value within seconds with no deploy.
- Staff cannot read or change settings or bank details (try direct API calls).
- Blank hour, day, month or night price shows "Contact us for pricing" (never empty, never 0). Blank half-day price or blank overnight-month price hides that option completely (search page source).
- There is no weekly price field anywhere (admin, form, page source).
- Student prices: a blank student price shows no student rate for that option; a student price higher than the standard price is refused; the student day price starts at 1,000 naira and is editable and audited.
- Closed weekday and different weekday hours behave correctly; times are in Lagos time.
- Bank-detail change sends the owner an email and an audit row.

**M4**
- 30 members book the same hour: all succeed; the 31st sees "No longer available".
- Two people book the last desk at the exact same moment: only one succeeds (scripted concurrency test, repeated many times).
- Booking outside opening hours, on a closed day, in the past or beyond the advance window is refused (including by crafted requests).
- Half-day option appears only when its price is set.
- Hold expires after the configured time; seats free; late "I've paid" on an expired booking is handled as designed.
- A member cannot see or cancel another member's booking (RLS tested with two accounts).
- Price snapshot: change the price after booking; the existing booking keeps its old amount.
- A fourth open unpaid booking is refused.

**M5**
- Booking created email contains correct bank details, amount, reference, deadline.
- "I've paid" pressed twice changes nothing extra; admin receives one notification.
- Staff confirm and reject both work; customer gets the right email each time; rejected seats are freed.
- Wrong or missing reference path: admin can look up by name, phone, amount, date.
- Staff cannot reach bank detail editing; an Admin edit of the bank account shows up for customers immediately.
- Student price flow: the tick applies the student price only to hour, day and month options, never to half day or overnight; the booking records that the student price was used.
- "Message on WhatsApp" opens WhatsApp with the right reference and amount and no other personal data in the link beyond the number.
- Real small transfer tested end to end.

**M6**
- With `monthly_pass_max_desks` set to 2: two passes succeed for the same start date; the third is refused and the next available start date is offered.
- A pass and 28 hourly bookings fill all 30 desks in a slot; the next hourly booking is refused.
- Pass holder cannot create an hourly or daily booking on a covered day.
- A pass spans exactly 30 calendar days from the start date, in Lagos time, including closed days; an Admin extension is audited.
- Late confirmation after the start date moves the start to the confirmation day; an Admin override needs a reason and is audited.
- Cancellation rules: free before payment; self-cancel works until the 48-hour cutoff and flags "refund owed"; blocked after the cutoff and after the start.
- Changing opening hours after a pass is sold regenerates future slots and warns if any hour overfills.
- Renewal starts the day after the end and re-checks capacity. Concurrency test: simultaneous pass bookings for the last allowed pass slot, only one succeeds.
- The pass shows no price when `month` is blank ("Contact us for pricing").

**M7**
- No 18+ tick: cannot request overnight. No upload field anywhere (inspect page and network).
- Location text is absent from HTML, API responses and emails until payment is confirmed; a second member and a signed-out visitor never get it.
- Approval, rejection, and capacity per night all work; approving does not exceed capacity. Bookings longer than `overnight_max_nights` are refused.
- Overnight monthly desk is hidden when its price is blank and behaves like 3.8 when set. There is no student price for overnight.

**M8**
- Download-my-data returns only that member's data.
- Delete my account: login gone, bookings anonymised, accounting amounts intact, audit entry written.
- Retention job removes/anonymises test records older than the period.
- Restore from a backup is rehearsed once.
- Full flow on a real phone over a slow connection; PageSpeed mobile still high; dark mode everywhere.
- Rollback plan works: setting `booking_enabled` to false returns the site to the Phase 1 request forms.
- Emergency fallback rehearsed: switching `require_verified_email` off allows booking with staff phone confirmation; password reset for unverified accounts is blocked.
- Resend switch-over rehearsed on the development project with the checklist from 3A.5 (once the domain is available).

---

## 8. What I need from you

**Accounts and setup (you, not me):**
1. A **Supabase** account and two projects (development, production later). Share only the project URL and anon key through Vercel env vars; **never paste the service-role key or any app password into chat**.
2. **Done:** the dedicated sender Gmail account exists with 2-Step Verification, display name "Rafael Support Foundation", recovery phone and email, and an app password. The app password goes only into Supabase (Auth, SMTP settings) and into `.env.local` / Vercel as `SMTP_PASS`; you type it yourself, never in chat. Optional: in that account, forward incoming mail to the requests inbox (3A.7).
3. **Decided:** `info@rafaelsupportfoundation.org` is not used for now. Reply-To is the requests inbox, set by `REPLY_TO_EMAIL`. Changing Reply-To to info@ later is an environment change.
4. Optional: decide whether to **buy a small separate domain for email** (option C2) if Gmail testing in M1 shows poor deliverability.
5. Confirm your **Vercel** plan (Hobby vs Pro) given payments are involved.
6. **LAUNCH REQUIREMENT, Resend domain verification (deferred, about two months):** when GoDaddy DNS access is back, add Resend's DNS records (SPF, DKIM and a DMARC record), verify `rafaelsupportfoundation.org`, and create `info@`. **Booking does not go public until this is done**, because Yahoo and Outlook put the Gmail-sent emails in spam in testing (3A.8). Until then Resend stays as it is for the Phase 1 forms (which only email you). The switch-over steps are in 3A.5. If DNS access cannot be restored in time, tell me and we use option C2 or C1 instead.
7. The **admin email** that will be the first Admin, and an inbox for admin notifications (can reuse `FORMS_TO_EMAIL`).
8. Decide the **monthly desk cap** (how many of the 30 desks passes may hold) and an **admin WhatsApp number** for click-to-chat (already stored for the site WhatsApp link).

**Environment variables to add in Vercel (later, by you):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `EMAIL_PROVIDER` (`smtp` now, `resend` later), `EMAIL_FROM`, `REPLY_TO_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (server only), `EMAIL_DAILY_CAP`, `NEXT_PUBLIC_ACCOUNTS_ENABLED`. Production and Preview get different Supabase values. Existing `RESEND_API_KEY`, `FORMS_TO_EMAIL` (form submissions keep going to the requests inbox), `FORMS_FROM_EMAIL` keep their current role. Locally, the same values go in `.env.local` (git-ignored).

**Decisions needed** (recommended defaults in brackets, so you can answer "default" to any):
- Q1. Decided: opening 8:00 AM, closing 6:00 PM, **open Monday to Saturday, closed Sunday** (all editable in admin).
- Q2. Decided: 2-hour hold.
- Q3. **What "half day" means**, if you use a half-day price (default: morning = opening to 1:00 PM, afternoon = 1:00 PM to closing). Leaving the price blank hides the option.
- Q4. Decided: overnight team approves in person first, then the person pays.
- Q5. Superseded 23 October 2026: students are not free; they pay an optional student price (see 3.5). No staff review step for student bookings.
- Q6. **Can Staff approve overnight requests**, or only Admin (default: Staff can).
- Q7. **Cancellation and refund policy** in plain words (defaults: single bookings self-cancel until 24 hours before; monthly pass until 48 hours before its start; all refunds handled by hand).
- Q8. **Booking window** (default: 30 days ahead for single bookings, 14 for a monthly pass start) and **max hours per booking** (default: 10).
- Q9. **Overnight check-in and check-out times**, house rules text, and the **longest single overnight stay** (default: 7 nights).
- Q10. Whether the Foundation's accountant needs **financial records kept longer than 12 months** (default: 12 months, then anonymise).
- Q11. Wording for the **Terms of use** of booking (no-shows, behaviour, liability); I will draft, your lawyer should review.
- Q12. Decided: monthly pass = 30 consecutive calendar days from the start date (Sundays and other closed days still count, and the website must say so clearly). Pass desk cap = 10 of 30, editable by Admin. The student price (if set) also applies to the monthly pass.
- Q13. **Overnight monthly price:** offer a monthly desk at all? (default: not at launch; leave the price blank and it stays hidden).
- Q14. Decided: the main sender is a dedicated Gmail account (address only in environment variables) with display name "Rafael Support Foundation", over Gmail SMTP with an app password. Reply-To is the requests inbox via `REPLY_TO_EMAIL`. The info@rafaelsupportfoundation.org mailbox is not used for now. Form submissions keep going to the requests inbox via `FORMS_TO_EMAIL`.

Out of scope for this plan (listed in CLAUDE.md as Phase 2 but later): courses/LMS, quizzes and certificates, consulting payments, SMS. They reuse the same accounts and admin area, so nothing here blocks them. SMS one-time codes (option B) are not part of this plan.

---

*End of draft v2. No application code has been written and no packages installed.*

---

## 9. Owner decisions log

- Plan approved; M1 may start. M2 must not start until approved separately.
- Sender: a dedicated Gmail account (address only in environment variables, never in committed files), display name "Rafael Support Foundation", Gmail SMTP with an app password. Reply-To: the requests inbox, set by `REPLY_TO_EMAIL`. info@rafaelsupportfoundation.org is not used for now. Form submissions keep going to the requests inbox.
- Monthly pass: 30 calendar days, stated clearly on the website. Desk cap 10 of 30, editable by Admin.
- Opening hours default: 8:00 AM to 6:00 PM, Monday to Saturday, closed Sunday (editable by Admin).
- The phase-2 branch is pushed to origin (phase-2 only, never main).
- M1 test results (owner): login, logout and password reset pass; an unverified account is blocked from `/account`; a Member cannot change their own role (permission denied) and sees only their own profile row; `/admin` is a 404 for a Member and a login redirect when signed out; the Vercel preview registration works. Yahoo and Outlook verification emails land in spam (Gmail inbox).
- **Launch requirement added:** a verified email sending domain is required before booking opens to the public (3A.8, M8 launch gate, section 8 item 6).
- **M1 approved as finished by the owner (19 October 2026).** Accepted open items: the app-email Reply-To is untested until M5 (Avast blocks local SMTP), and real PageSpeed Insights for the account build is checked after the domain is public. M2 has not started and needs separate approval.
- **M2 approved to start (19 October 2026).** 2FA is authenticator-app codes (TOTP), required for Admin and Staff, enforced on the server and in the database (a Staff or Admin without a verified 2FA session is treated as a Member). Recovery: 10 one-time recovery codes (hashed; Supabase has none built in), another Admin can reset someone's 2FA (confirmed by typing their email, audited, emailed), and the Supabase dashboard is the last-resort backstop. The Supabase service-role key (server only) is introduced in M2 for resets, recovery codes, audit/email logging and the database rate limiter. TOTP on the Supabase Free plan: Supabase docs say the TOTP API is free and enabled on all projects.
- **M2 approved as finished by the owner (23 October 2026).** Tested: Staff and Admin two-step setup with recovery codes, login code, recovery-code use, Admin reset, People page, audit log and filters, email-failure logging, and ending sessions on reset and on recovery-code use. Two bugs found and fixed during testing: the recovery codes screen was lost after setup, and a stale session note sent people back to the code page after their authenticator was removed. Migrations run on the development database: 0001, 0002, 0003. Accepted open items: the 2FA notice emails fail on the owner's PC because Avast blocks local SMTP (test them on the Vercel preview); the app-email Reply-To stays untested until it can be sent from Vercel. M3 has not started and needs separate approval.
- **M3 started (23 October 2026) with these decisions:** overnight capacity 6 desks, editable in Settings; half-day price wanted, with the split at 1:00 PM (the Admin enters the price); no public-holiday list for now; no overnight monthly desk (blank and hidden); **students are not free, they pay an optional lower price (student day price starts at 1,000 naira, hour and month student prices optional)**; all other prices blank; the public hours-and-prices display stays hidden behind the booking switch. The CLAUDE.md rule "no prices on the site" is to be updated only when the owner confirms the real prices and says so.
- **M3 approved as finished by the owner (23 October 2026).** Tested: Settings pages (hours, desks (day and overnight), prices with student prices, booking rules, overnight details, bank details), the booking switch, audit entries, the public hours-and-prices block on Tech & Space when booking is on, and Staff being blocked from Settings. Migration run on the development database: 0004. The public display stays hidden behind the booking switch, and CLAUDE.md's no-prices rule is unchanged until the owner confirms real prices. M4 has not started and needs separate approval.
- **M4 started (23 October 2026) with these decisions:** a student price applies and shows only when the matching standard price is set (entry in any order is allowed; the 1,000 naira student day price stays as the starting value); hour slots on the hour; defaults confirmed (30 days ahead, 10 hours longest, cancel until 24 hours before, at most 3 unpaid bookings, all editable in Settings); pg_cron for hold expiry; reminder emails left for M8; a read-only pay screen is included in M4 (the I've-paid button and admin confirmation are M5).
- **M4 owner review changes (26 October 2026):** wording "overnight beds" became "overnight desks" everywhere (migration 0007); the hourly booking picker is now click-the-first-hour then click-the-last-hour with a live summary; the header shows Account (and Admin for Staff and Admin) after login using a small browser-side check so public pages are not slowed; the monthly pass settings gained a plain-language explanation; and the page-goes-blank-after-Save problem was fixed (cause: a redirect to the same page with a query string leaves Next.js showing an empty page while the server rebuilds it; forms now answer in place, buttons show a pending state, and loading skeletons plus a minimum height keep the footer still).
- **M4 approved as finished by the owner (26 October 2026).** Tested: day booking by hour, half day and full day; student price; unpaid holds, expiry and the countdown; cancel; the read-only pay screen; the click-the-first-and-last-hour picker; the header Account and Admin links; the monthly pass explanation; saves with no blank page; migration 0007. The concurrency test passed 14 of 14 (10 simultaneous requests for 5 desks gave exactly 5 bookings; the last desk went to exactly 1 person; a double-click gave exactly 1 booking; the limit of 3 unpaid bookings held). Migrations run on the development database: 0005, 0006 (hold expiry job), 0007. M5 (bank-transfer flow) has not started and needs separate approval.
- **M5 started (26 October 2026) with these decisions:** Staff and Admin confirm payments; Staff or Admin may re-open an expired booking if the desks are still free (it goes back to payment-to-check); refunds are owed on cancelled confirmed bookings, shown as a refund-owed list, paid by the Admin by bank transfer, with customer bank details collected by phone or WhatsApp and never stored; a rejection reason is written by staff in their own words with clickable quick-pick reasons that can be edited, and the customer sees it with a contact-us line; the confirmed and rejected emails and the Reply-To are tested on the Vercel preview; failed-email retry is deferred to M8 (it needs stored messages and a scheduled sender). Booking is switched off again after the real-money test.
- **M5 approved as finished by the owner (26 October 2026).** Tested: the "I've paid" flow, the payment queue with confirm and reject (quick reasons), bookings search and filters, booking timeline, refund-owed list, a real bank transfer on the Vercel preview, the confirmed, rejected and cancelled emails, Reply-To (replies reach the requests inbox) and Email health. The automated payment test passed 30 of 30. Migration run on the development database: 0008. Accepted deferral: failed-email retry moves to M8. M6 (monthly desk pass) has not started and needs separate approval.
- **M6 started (26 October 2026) with these decisions:** monthly and student monthly prices stay blank until the owner sets them in Settings; defaults kept (pass cap 10 of 30, start up to 14 days ahead, member can cancel a confirmed pass until 48 hours before its start); a pass confirmed after its start date starts on the confirmation day by default, and an Admin can keep the original dates with a reason; for an unexpected closure the Admin types the number of days to add, with a reason, and it is audited (an extension is not blocked by full desks, and the Monthly passes page warns if any hour ends up over-booked); a pass that has started can only be cancelled by an Admin, with a partial refund amount and reason recorded; a pass holder cannot book hour or day slots on days the pass covers; renewal books a new pass from the day the old one ends; saving opening hours rebuilds the future hours of all passes. Pass reminder emails stay in M8 with the other reminders.
- **M6 approved as finished by the owner (27 October 2026).** Tested locally and on the Vercel preview: the monthly pass card and start-date check, booking and paying for a pass, confirmation, "your pass covers this day", late-start handling, Admin extend, cancellation and refunds, renew, the Monthly passes page, and the created and confirmed emails. The automated pass test passed 43 of 43. Migration run on the development database: 0009. Accepted deferral: pass reminder emails move to M8 with the other reminders. M7 (overnight workspace) has not started and needs separate approval.
- **M7 started (27 October 2026) with these decisions:** approve-then-pay (the team meets the person and checks ID in person, then approves, then the person pays); the night price stays blank until the owner sets it (tests use a temporary figure and clear it); the optional overnight monthly desk is off for launch with its price blank, so it is not built in M7; the longest single stay is 7 nights and editable; check-in and check-out times are entered by the owner in Settings (tests use test values); a request nobody answers expires after 3 days (editable in Settings as "Overnight requests wait this many days") and frees its desks; the owner enters the private address and house rules in Settings, and they are returned only to the owner of a confirmed overnight booking, on their booking page and in the confirmed email; the "come and meet us" email gives the WhatsApp link and the office hours (read from the opening hours in Settings); a member can have one request waiting at a time; an approved request gets the normal hold (hold time in Settings) and an expired approved request can be re-opened by Staff, but a request that was never approved cannot. The CLAUDE.md line "the overnight location is never shown on the site, it is shared in person" is to be updated, only when the owner says so, to match this: it is shown only in a confirmed member's account and email.
- **M7 review changes (28 October 2026):** CLAUDE.md, the Tech & Space card text and the Overnight settings text now say the overnight address and house rules are shown only to a member whose overnight booking is payment-confirmed (checked: the terms, privacy text and emails never said otherwise); an approved overnight request gets its own pay window, 24 hours by default, editable in Booking rules (migration 0011); on Tech & Space, when booking is on the day button goes to /book and the overnight button goes to /book/overnight (only when overnight requests are open), and when booking is off the old request forms stay; the "Overnight, per month" public line is gone, the overnight monthly desk can no longer be given a price (removed from Prices, refused by the database, and any stored price is cleared); the Admin "Open" crash was investigated on a clean production build: every booking type and state opens normally, so it is the development server running out of resources on this computer (the dev log shows write EPIPE and compile times of 10 to 40 seconds).
- **M7 approved as finished by the owner (28 October 2026).** Tested locally and on the Vercel preview: requesting overnight nights with the 18 or over tick, in-person approval and rejection, the 24-hour pay window, payment and confirmation, the private address and house rules appearing only after confirmation, expiry of unanswered requests, the Tech & Space buttons in both states, and the removal of the overnight monthly price. The automated overnight test passed 49 of 49. Migrations run on the development database: 0010, 0011. Accepted deferral: the optional overnight monthly desk is not built (off for launch). M8 (hardening, NDPA and launch) has not started and needs separate approval.
