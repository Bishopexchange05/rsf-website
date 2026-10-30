# Legal defaults (draft wording, not legal advice)

**What this is.** Every default I chose for the parts of the legal pages that were still blank: refunds, house
rules, liability, under-18 and safeguarding wording, data protection under the Nigeria Data Protection Act 2023
(NDPA), and the answers to the ten questions in `docs/LEGAL-REVIEW.md`. They are conservative, plain-language
defaults for a small Nigerian workspace that takes bank-transfer bookings. They have **not** had a final legal
review. On the website they are marked "(draft wording)".

**Status.** The owner's lawyer has seen the review pack and asked for sensible defaults to be set, to be edited
later if needed. The lawyer-review mark in Admin, Settings has **not** been pressed. The owner presses it
after the lawyer has seen the final text.

**How to change a default.** Edit `src/content/legal-defaults.ts` (the numbers are in `values`, the sentences are
below them), then run `node ops/render-legal-defaults.js` to refresh this file. The website pages and this document
come from that one file.

**Keep in step with Settings.** The hold time, the cancellation cut-offs, the pass length and the overnight request
wait are also editable in Admin, Settings, Booking rules. If an Admin changes them, change the matching number here.

**Shown on the site only when accounts are on.** While accounts are off, the legal pages keep their original text,
which describes a site with no accounts or bookings.

---

## 1. Every default

| # | Topic | Default chosen | Why | Lawyer's eyes | Where on the site |
| --- | --- | --- | --- | --- | --- |
| A1 | Who can have an account | People aged 18 or over. By creating an account you confirm this, and accept the Terms and Privacy Policy (the time is stored). | The NDPA treats children's data with extra care and expects a parent or guardian's consent. The simplest safe rule is adult accounts only. There is no separate age box at sign-up: accepting the Terms is the confirmation. | **High** | Terms, Privacy |
| A2 | Under 18 in the day workspace | A parent or guardian books for them or knows and agrees. We may ask to confirm. | Young people are part of our mission, but online bookings are for adults, so a guardian stands behind the booking. | **High** | Terms, Safeguarding |
| A3 | Overnight desk | 18 or over only, a tick in the request, approved in person with ID checked at the office, no ID uploaded, scanned or kept. | As decided by the owner. Nobody under 18 stays overnight. | **Medium** | Terms, Safeguarding, Privacy |
| A4 | Overnight request waits | 3 days, then the request ends and the desk is released. After approval the person has 24 hours to pay. | Matches Settings (decided by the owner). | **Low** | Terms |
| B1 | Hold before payment | 2 hours. | Matches Settings. Stops unpaid bookings tying up desks. | **Low** | Terms |
| B2 | When a booking is confirmed | Only after our team has checked that the payment reached our bank account. Card payments are never taken. | This is how the system works (bank transfer only). | **Low** | Terms |
| B3 | Wrong or missing payment | We may refuse to confirm it and say why. If money arrived but the desk is gone, we refund in full. | Fair to the customer and clear to staff. | **Medium** | Terms |
| C1 | Cancelling a paid hourly, half-day, day or overnight booking | Full refund if cancelled online at least 24 hours before the start. After that, no refund unless we agree. | Matches Settings (24 hours). A clear cut-off protects the team's planning. | **Medium** | Terms |
| C2 | Cancelling a monthly pass | Full refund if cancelled online at least 48 hours before the start date. After it starts, no automatic refund; the team may agree a partial refund at its discretion. | Matches Settings (48 hours) and the Admin partial-refund tool. | **Medium** | Terms |
| C3 | If we cancel or close | Full refund, or the booking is moved. A monthly pass may be extended by the days we were closed. | The customer should not lose out because of our closure. | **Low** | Terms |
| C4 | No-shows | Marked as not attended. No refund. | The desk was held for them and cannot be resold. | **Medium** | Terms |
| C5 | Refund timing and method | Within 7 working days after the cancellation is accepted, by bank transfer, to an account in the name of the person who booked. Details are collected by phone or WhatsApp and never entered on the website. We do not refund bank charges. | Seven working days is a realistic promise for a small team. Paying only to the booker's own account reduces fraud. This is how the Admin refund screen works. | **High** | Terms |
| C6 | Student price | ID checked in person, no copy kept. If no ID, pay the difference or entry may be declined. | As built. Avoids storing ID. | **Low** | Terms |
| C7 | Monthly pass rules | 30 calendar days, Sundays and closed days count, a desk not a named desk, personal and not transferable or pausable, starts when we confirm if confirmed late. | As built and as decided by the owner. | **Low** | Terms |
| C8 | Ending an overnight stay for breaking the rules | We may refuse or end it at once. No refund for the unused part unless we decide otherwise. | Safety of other guests and the team comes first. | **High** | Terms |
| D1 | House rules (all spaces) | Respect others; nothing illegal; no weapons, alcohol, illegal drugs, smoking or vaping; low noise; look after equipment and pay for damage you cause; keep belongings secure; fair use of power, WiFi and printers; visitors only if booked or agreed, none overnight; follow staff instructions; we may ask people to leave. | Typical, conservative rules for a shared workspace, written in plain words. | **Medium** | Terms |
| D2 | Overnight house rules (private) | A starter text is in the section "Overnight house rules starter text" below. You paste it into Admin, Settings, Overnight details. It is shown only to a confirmed overnight member, never on the public site. | The rules are private to guests, so they are entered in Settings, not on a public page. | **Medium** | Settings (private) |
| E1 | Liability | We do not limit liability for death or personal injury caused by our negligence, fraud, or anything the law does not allow. Use of the space, equipment and WiFi is at your own risk; no promise of power or internet; not responsible for lost, stolen or damaged belongings or lost work; our total responsibility for one booking is limited to the amount you paid for that booking; not responsible for unforeseeable losses. | A conservative, balanced clause for a charity-run space. The first point is there because the law does not allow some limits. | **High** | Terms |
| E2 | Governing law and disputes | Laws of the Federal Republic of Nigeria; complain to us first and we try to settle within 30 days; courts of Ebonyi State, Nigeria. | The Terms already say Nigerian law. The court named is our local state. | **High** | Terms |
| F1 | What personal information the booking system holds | Account (name, phone, email, scrambled password, terms time, student flag); bookings and statuses; payment notes the person types, amounts and who confirmed; the 18+ confirmation and its time; a record of team actions; an email log (type and sent or failed, not the text). No ID, no card details, no stored bank account details. | This is exactly what the system stores, so the policy is accurate. | **Medium** | Privacy |
| F2 | Lawful bases | Carrying out the booking; legal duty for financial records; legitimate interest for security, the audit record and the email log; legitimate interest and duty of care for overnight safety; no marketing emails unless asked. | A reasonable mapping under the NDPA. Consent is used only where we ask for it. | **High** | Privacy |
| F3 | Processors and transfers abroad | Supabase (database and sign-in), Vercel (hosting), Google (email, until our own domain), Resend (email). Information may be stored outside Nigeria; we share only what is needed. | These are the real providers. Information is stored outside Nigeria, which the NDPA regulates. | **High** | Privacy |
| F4 | How long we keep personal information | Accounts and bookings: while active plus 12 months, then anonymised. Email log: 12 months. Accounting records: 6 years. Record of team actions: 6 years. | The first two are the owner's decisions. Six years for accounting and the team record is a cautious guess because company-style record rules often use six years. | **High** | Privacy |
| F5 | Asking for, or deleting, your information | We reply within 30 days. Deleting an account removes the sign-in and anonymises bookings; accounting figures stay. | Thirty days is a reasonable, firm promise. The financial records are kept because the law requires them. | **Medium** | Privacy, Data Protection |
| F6 | Data breach | Tell the Nigeria Data Protection Commission within 72 hours of becoming aware where the law requires, and tell affected people if they are at risk. | Seventy-two hours is the usual breach-reporting window and is a safe promise. | **High** | Data Protection |
| F7 | Registration with the NDPC and a data protection officer | The statement says we will register, appoint the person the law requires and meet any other duty when it applies to us. A contact person is named by phone and the Contact page. | I do not know whether the Foundation's size triggers registration or an officer today, so the wording promises compliance without claiming either. | **High** | Data Protection |
| F8 | Cookies | A sign-in cookie, only when logged in, and the light or dark display setting. No advertising or tracking cookies. The old note about the announcement bar was removed because that bar is gone. | This is what the site really sets. | **Low** | Privacy |
| F9 | Staff access | Authorised team members see what they need to run bookings. Staff and administrators use a second sign-in step and their actions are recorded. | As built. | **Low** | Privacy, Data Protection |
| G1 | Photos and video of young people | Written permission from a parent or guardian for anyone under 18, and never with a full name, school or address. | Builds on the existing Safeguarding Policy and adds that the permission is written. | **Medium** | Safeguarding |
| G2 | Adults and other people's children | Adults in the day space are not responsible for supervising other people's children, and we never leave a young person alone in a private space with one adult. | Protects young people and adults alike. | **Medium** | Safeguarding |
| G3 | Refusing entry for safety | We may refuse entry or end a booking where a young person's safety is at risk. | Safety overrides a booking. | **Medium** | Safeguarding |

## 2. The ones that most need your lawyer's eyes ("High")

- **A1. Who can have an account.** People aged 18 or over. By creating an account you confirm this, and accept the Terms and Privacy Policy (the time is stored).
- **A2. Under 18 in the day workspace.** A parent or guardian books for them or knows and agrees. We may ask to confirm.
- **C5. Refund timing and method.** Within 7 working days after the cancellation is accepted, by bank transfer, to an account in the name of the person who booked. Details are collected by phone or WhatsApp and never entered on the website. We do not refund bank charges.
- **C8. Ending an overnight stay for breaking the rules.** We may refuse or end it at once. No refund for the unused part unless we decide otherwise.
- **E1. Liability.** We do not limit liability for death or personal injury caused by our negligence, fraud, or anything the law does not allow. Use of the space, equipment and WiFi is at your own risk; no promise of power or internet; not responsible for lost, stolen or damaged belongings or lost work; our total responsibility for one booking is limited to the amount you paid for that booking; not responsible for unforeseeable losses.
- **E2. Governing law and disputes.** Laws of the Federal Republic of Nigeria; complain to us first and we try to settle within 30 days; courts of Ebonyi State, Nigeria.
- **F2. Lawful bases.** Carrying out the booking; legal duty for financial records; legitimate interest for security, the audit record and the email log; legitimate interest and duty of care for overnight safety; no marketing emails unless asked.
- **F3. Processors and transfers abroad.** Supabase (database and sign-in), Vercel (hosting), Google (email, until our own domain), Resend (email). Information may be stored outside Nigeria; we share only what is needed.
- **F4. How long we keep personal information.** Accounts and bookings: while active plus 12 months, then anonymised. Email log: 12 months. Accounting records: 6 years. Record of team actions: 6 years.
- **F6. Data breach.** Tell the Nigeria Data Protection Commission within 72 hours of becoming aware where the law requires, and tell affected people if they are at risk.
- **F7. Registration with the NDPC and a data protection officer.** The statement says we will register, appoint the person the law requires and meet any other duty when it applies to us. A contact person is named by phone and the Contact page.

## 3. The ten questions, with the default answer used

| # | Question | Default answer |
| --- | --- | --- |
| 1 | NDPA registration and duties | The statement promises to register, appoint the required person and meet any duty when it applies (entry F7). Please tell us whether it applies now. |
| 2 | Lawful basis for each use | Booking: carrying out the booking. Accounting: legal duty. Security, audit record, email log: legitimate interest. Overnight safety: legitimate interest and duty of care (entry F2). |
| 3 | Under 18s | Accounts are for 18 and over. Under 18s may use the day space when a parent or guardian books or agrees. Overnight is 18+ only (entries A1 to A3, G1 to G3). |
| 4 | Transfers outside Nigeria | The real providers are named, only what is needed is shared, and we say information may be stored abroad (entry F3). Please advise whether more is needed, such as consent or provider agreements. |
| 5 | Retention | 12 months then anonymise; email log 12 months; accounting records 6 years; team-action record 6 years (entry F4). Please confirm the statutory period. |
| 6 | Cancellation and refunds | 24 hours for desks, 48 hours for monthly passes, 7 working days to refund, no refund for no-shows or after a pass starts unless we agree (entries C1 to C5). |
| 7 | Overnight terms | 18+, in-person approval, no ID kept, we may end a stay that breaks the rules without refunding the unused part, private house rules (entries A3, C8, D2). |
| 8 | Staff access | Only authorised team members, second sign-in step for staff, actions recorded (entry F9). |
| 9 | Download and delete | We reply within 30 days. Deleting an account removes the sign-in and anonymises bookings; accounting figures stay (entry F5). The self-service download and delete buttons are not built yet; for now people ask us. |
| 10 | Governing law, complaints and contact | Nigerian law; complain to us first, we try to settle within 30 days; courts of Ebonyi State, Nigeria; people can also complain to the NDPC (entries E2, F5). |

## 4. The numbers

| Number | Value | Also set in Admin, Settings? |
| --- | --- | --- |
| Minimum age for an account and the overnight desk | 18 | no (rule, not a setting) |
| Hold before payment (hours) | 2 | yes, Booking rules: Hold time |
| Pay window after an overnight approval (hours) | 24 | yes, Booking rules |
| Overnight request waits (days) | 3 | yes, Booking rules |
| Cancel a desk booking until (hours before) | 24 | yes, Booking rules |
| Cancel a monthly pass until (hours before the start) | 48 | yes, Booking rules |
| Monthly pass length (days) | 30 | yes, Booking rules |
| Refund paid within (working days) | 7 | no |
| Reply to a data request within (days) | 30 | no |
| Tell the data commission of a breach within (hours) | 72 | no |
| Keep accounts and bookings after last activity (months) | 12 | no (owner's decision) |
| Keep the email log (months) | 12 | no (owner's decision) |
| Keep accounting records (years) | 6 | no |
| Keep the record of team actions (years) | 6 | no |
| Liability limit for one booking | the amount you paid for that booking | no |
| Courts | Ebonyi State, Nigeria | no |

## 5. Overnight house rules: starter text

This text is **private**. It is not on any public page. Paste it into Admin, Settings, Overnight details, in the
"House rules" box. It is then shown only to a member whose overnight booking is confirmed. Change it freely.

- You must be 18 or over, and you must be the person who was approved at our office.
- Arrive from the check-in time and leave by the check-out time shown on your booking.
- No visitors overnight. One approved guest per desk.
- Keep noise low, especially at night. Use headphones.
- No alcohol, illegal drugs, smoking, vaping, weapons or cooking in the space.
- Keep your belongings with you and secure. We are not responsible for lost or stolen items.
- Look after the equipment and the building. Tell us at once about any damage, fault or safety problem.
- Do not share the address, the door arrangements or any access details with anyone.
- Follow our team's instructions, including in an emergency. Know where the exits are.
- We may ask you to leave at once if these rules are broken or if it is not safe. No refund is due for the part of the stay not used.
- If you feel unsafe or worried about anyone, tell our team or call the police.

## 6. The wording that appears on the website (when accounts are on)

### Terms of Service

#### Requests and bookings

Sending a request form is not a confirmed booking, registration or place on a course. We will contact you to confirm. A desk booked through your account is confirmed only when our team has checked your payment (see "Booking and paying" below). Media room, course and consulting requests depend on availability.


#### Fees

This website does not take card payments. Workspace bookings are paid by bank transfer, as explained below. If any other service has a fee, we will tell you the fee before you commit to it.


#### Accounts (draft wording)

You need an account to book a desk. By creating one you confirm that you are 18 or over, that the details you give are true, and that you accept these Terms and our [Privacy Policy](/privacy). Keep your password private: you are responsible for what is done with your account. We may suspend or close an account that is used to abuse the service, harass others or make false bookings. You can ask us to delete your account at any time.

If you are under 18, please ask a parent or guardian to make the booking for you. See our [Safeguarding Policy](/safeguarding).


#### Booking and paying (draft wording)

- When you book, we hold your desk for 2 hours. If you have not paid by then, the hold ends and the desk is released. For an overnight request that we have approved, the hold is 24 hours.
- You pay by **bank transfer only**, to the account shown on your booking page, using your booking reference as the transfer description. We do not take card payments and we never ask for card details.
- After you transfer, press "I've paid". Your booking is **confirmed only when our team has checked that the payment reached our bank account**. This can take some time. We will email you.
- If a payment does not match (wrong amount, or no matching transfer) we may not confirm it, and we will tell you why. If your money reached us but your desk is no longer free, we will refund it in full.
- The price is shown on the booking page before you book, and that is the price you pay for that booking.


#### Student prices (draft wording)

A student price is for people who are students. Bring a valid student ID: our team checks it in person when you arrive. We do not take or keep a copy. If you cannot show it, you may be asked to pay the difference before you stay, or we may decline entry for that booking.


#### Cancellations and refunds (draft wording)

- **Unpaid bookings:** you can cancel at any time. Nothing is owed.
- **Paid hourly, half-day, day and overnight bookings:** you can cancel online up to 24 hours before the start time and receive a full refund. After that, no refund is due unless we agree otherwise.
- **Monthly passes:** you can cancel online up to 48 hours before the start date and receive a full refund. Once a pass has started there is no automatic refund. In a genuine case our team may agree a partial refund, at its own discretion.
- **If we cancel** (for example because we must close), you receive a full refund, or we move your booking to a time that suits you. If we close unexpectedly during a monthly pass, we may extend the pass by the days we were closed.
- **If you do not come,** the booking is marked as not attended and no refund is due.
- **How refunds are paid:** by bank transfer, within 7 working days after the cancellation is accepted, to a bank account in the name of the person who booked. We will ask for the account details by phone or WhatsApp. **We never ask you to enter bank details on this website.** We do not refund bank charges on your side.


#### Monthly desk pass (draft wording)

- A monthly pass gives you one desk for 30 calendar days in a row from your start date. Sundays and other closed days still count towards the 30 days.
- It is a desk, not a named desk. Sit at any free desk when you arrive. Our team finds your pass by your name or booking reference.
- A pass is personal. It cannot be shared, sold, transferred or paused.
- If we confirm your payment after your chosen start date, your pass starts on the day we confirm it and keeps its full length.
- You can renew before a pass ends. A renewal is not guaranteed unless it is booked and paid before someone else takes the place.


#### Overnight desk (draft wording)

- The overnight desk is for people aged **18 or over only**. You must tick a box to confirm this when you request it.
- Every overnight request is approved **in person** at our office first, where our team looks at your identity document. **We never ask you to upload an ID document to this website, and we do not scan, copy or keep it.**
- A request holds a desk for 3 days. If we have not met you in that time, the request ends and the desk is released.
- After we approve your request and your payment is confirmed, we show you the address and the house rules in your account and by email. Please keep the address to yourself.
- Check-in and check-out times are shown on your booking. Late arrival or late departure needs our agreement.
- We may refuse, end or cancel an overnight stay straight away if the house rules are broken or if it is not safe. In that case no refund is due for the part of the stay not used, unless we decide otherwise.


#### House rules for our spaces (draft wording)

These apply to everyone at RSF Tech & Space, by day and by night:

- Treat everyone with respect. No harassment, bullying, discrimination or threatening behaviour.
- No illegal activity, no weapons, no alcohol, no illegal drugs, and no smoking or vaping inside.
- Keep noise low and use headphones for audio and video.
- Look after the equipment, furniture and building. You are responsible for damage you cause.
- Keep your belongings with you and secure.
- Use electricity, WiFi and printers fairly. We may limit use that affects others.
- Visitors are welcome in the day space only if they are also booked or we agree. No visitors overnight.
- Follow the instructions of our team, including in an emergency. Know where the exits are.
- Our team may ask anyone who breaks these rules to leave.


#### Our responsibility to you (draft wording)

We provide RSF Tech & Space as part of our charity work and take reasonable care to keep it safe, clean and available. However:

- Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit.
- You use the space, equipment and WiFi at your own risk. We do not promise that power, internet or any equipment will always be available.
- We are not responsible for lost, stolen or damaged belongings, or for lost work or data.
- Apart from the points above, our total responsibility to you for any one booking is limited to the amount you paid for that booking.
- We are not responsible for losses we could not reasonably have foreseen.


#### Disputes (draft wording)

If you have a complaint about a booking, contact us first (+234 708 196 5663, or through our [Contact page](/contact)). We will try to settle it within 30 days. If it cannot be settled, the courts of Ebonyi State, Nigeria can decide it, under the laws of the Federal Republic of Nigeria.

### Privacy Policy
We never ask for payment card details or identity documents through this website. Your account password is used only to sign you in. Please do not send sensitive information in your messages.


#### Accounts and bookings (draft wording)

If you create an account or book a desk, we also collect:

- **Your account:** your name, phone number, email address and a password (kept only in scrambled form, so we cannot read it). The time you accepted our Terms and Privacy Policy. Whether you say you are a student.
- **Your bookings:** what you booked, when, the price, your booking reference and its status (held, paid, confirmed, cancelled, refunded). For an overnight request, that you confirmed you are 18 or over, and the time you did.
- **Payments:** we do not take or keep card details. If you tell us a transfer reference or the name on the account you paid from, we keep it with the booking. We record the amount that reached our bank account and which team member confirmed it. If we owe you a refund, we collect your bank account details by phone or WhatsApp to pay it, and we do not store them on this website.
- **What our team does:** a record of what team members do with bookings, payments and settings (who, when and what), so the service stays accountable and secure.
- **Emails:** a log that an email was sent to your account (the type of email and whether it was sent), not its text.
- **Identity documents:** we never collect, upload, scan or store an identity document on this website. Overnight and student checks are done by looking at the document in person.


#### Why we use it, accounts and bookings (draft wording)

- To create your account, take your booking, check your payment and look after you when you visit. Basis: taking steps at your request and carrying out the booking.
- To keep accounting records of money received and refunded. Basis: our legal duty to keep financial records.
- To keep the service secure, prevent fraud and spam, and keep our team accountable (the record of team actions and the email log). Basis: our legitimate interest in running a secure and trustworthy service.
- To email you about your account and bookings, such as verification, payment and reminders. Basis: carrying out the booking and our legitimate interest. We do not send marketing emails unless you ask for them.
- To keep people safe, including checking in person that overnight guests are adults. Basis: our legitimate interest and our duty of care.


#### Who receives your information, accounts and bookings (draft wording)

- **Supabase:** our database and sign-in service. It stores account and booking information.
- **Vercel:** hosts the website.
- **Google (Gmail):** sends our emails until we send them from our own domain.
- **Resend:** delivers our emails once we send them from our own domain.
- **Our team:** authorised team members see the details they need to run bookings, such as your name, phone number and booking. Staff and administrators sign in with a second step (an authenticator app).

These providers may store and process information outside Nigeria. We share only what is needed, and we use providers that protect information. We do not sell your information.


#### How long we keep it, accounts and bookings (draft wording)

- Account and booking details: while your account is active and for 12 months after your last activity. Then your name, phone number and email are removed from old bookings (they are anonymised), and only figures remain.
- The email log: 12 months.
- Accounting records of amounts, dates and references: 6 years, because we must keep financial records.
- The record of team actions: 6 years.
- We may keep something longer where the law or a safeguarding concern requires it.


#### Under 18 and accounts (draft wording)

Accounts are for people aged 18 and over. If you are under 18, please ask a parent or guardian to book for you. See our [Safeguarding Policy](/safeguarding).


#### Your information: ask us (draft wording)

You can download a copy of your information and delete your account yourself from your account page, or ask us (+234 708 196 5663, or through our [Contact page](/contact)). We reply to requests within 30 days. When your account is deleted your sign-in is removed and your bookings are anonymised. We keep accounting figures (amounts, dates, references) because the law requires financial records.

- (cookie list) A sign-in cookie, set only when you log in, that keeps you signed in. It is needed for your account to work.

### Safeguarding Policy

#### Young people and the booking system (draft wording)

- Online accounts and bookings are for people aged 18 or over. A young person under 18 can use the day workspace when a parent or guardian has booked for them, or knows and agrees that they are coming. We may ask to confirm this.
- The overnight desk is for adults aged 18 and over only. We check this in person, and nobody under 18 stays overnight.
- We do not leave a young person alone in a private space with one adult. Our team follows the code of conduct above in the workspace.
- Adults who use the day space are not responsible for supervising other people's children, and must not be left to do so.
- We do not publish photographs or video of anyone under 18 without a parent's or guardian's written permission, and never with their full name, school or address.
- If you are worried about a young person in our space, tell our team or our safeguarding contact straight away.
- We may refuse entry or end a booking where we believe a young person's safety is at risk.

### Data Protection Statement

#### Who is responsible (draft wording)

Rafael Support Foundation decides how the personal information described in our [Privacy Policy](/privacy) is used (the "data controller"). For data protection questions contact +234 708 196 5663, or through our [Contact page](/contact).


#### How quickly we reply (draft wording)

We reply to a request about your information within 30 days.


#### If something goes wrong (draft wording)

If there is a breach of personal information that could harm people, we will tell the Nigeria Data Protection Commission within 72 hours of becoming aware of it where the law requires, and we will tell the people affected if they are at risk.


#### Our team and security (draft wording)

Only authorised team members can see booking and contact details. Staff and administrators sign in with a second step, and what they do with bookings, payments and settings is recorded.


#### Registration and our duties (draft wording)

We keep our practices under review. We will register with the Nigeria Data Protection Commission, appoint the person the law requires and meet any other duty the Act places on us when it applies to us.
