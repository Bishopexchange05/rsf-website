# Legal review pack: privacy, terms, NDPR statement and safeguarding

**For:** the Foundation's lawyer. **From:** Rafael Support Foundation (RSF). **Status:** for review before
online booking opens to the public. Nothing in this pack is legal advice; it is the Foundation's current
text plus drafts of what the new booking features need.

**Update, 30 October 2026.** At the lawyer's request, defaults were set for everything left blank in Parts B and C. They are all in one file, **`docs/LEGAL-DEFAULTS.md`**, with a plain note of what each one is and why, a list of the ones that most need a lawyer's eyes, and a default answer to each of the ten questions below. The lawyer-review mark on the website has not been pressed.

**How to use this pack.** Part A says what changed with the booking system. Part B lists the questions
we need answered. Part C is the proposed new booking wording (drafts, not yet on the website). Part D
is the exact text that is on the website today (Privacy Policy, Terms of Service, Safeguarding Policy and
Data Protection / NDPR Statement), generated from the website's own content file so it cannot drift.

---

## Part A. What the booking system adds (facts for the lawyer)

The website has so far only collected request forms by email. The booking system (Phase 2) adds the
following. None of it is live to the public yet: booking stays switched off until the
Foundation decides to open it. This review is one item on the Foundation's own launch checklist.

**Accounts.** A person can register with name, phone number, email address and a password (the password
is stored hashed by our database provider, never in readable form). They must accept the Terms and
Privacy Policy (the time of acceptance is stored) and verify their email address. A person can say they
are a student to get a lower price; student status is checked in person at the office and no student ID
is ever uploaded or stored.

**Bookings and payments.** A signed-in person can book a day-workspace desk (by the hour, half day or
day), a monthly desk pass, or request an overnight desk. Payment is by **bank transfer only**: the person
transfers money to the Foundation's bank account using a booking reference, then presses "I've paid", and
a team member checks the bank account and confirms. We do not take card payments and do not hold card
details. We store the booking, its amount, the reference or sender name the person types (optional), and
the staff decision. Refunds, where owed, are paid by hand by bank transfer; the person's bank account
details are collected by phone or WhatsApp and are **not** stored on the website.

**Overnight desk.** Only for people aged 18 or over. The person ticks "I am 18 or over" (stored with the
time). The team meets them at the office and checks ID **in person**; the website never has an upload
field and never stores ID data. After approval and payment, the private address and house rules are shown
only to that person.

**Staff and administrators.** Team members have role-based access, protected by an authenticator-app
second step. Their actions on bookings, payments, refunds and settings are recorded in an audit log.

**Emails.** The website sends emails about accounts and bookings (verification, booking held, payment
being checked, confirmed, rejected, cancelled, overnight approval). They are sent through Gmail until the
Foundation's own domain is verified with an email service (Resend). Each email is logged
(which account it was for, the type of email, whether it was sent or failed, and any error from the
provider; not the message text and not the email address).

**Service providers (processors).** Supabase (database, login, hosted outside Nigeria), Vercel (website
hosting), Google (Gmail mailbox and sending, until the domain switch), Resend (email delivery, once the
domain is verified). Cookies: a login session cookie set only when someone signs in, plus the existing
display-mode setting.

**Retention (decided by the Foundation).** Bookings and personal details are kept 12 months and then
anonymised. The email log is kept 12 months. Accounting amounts and the audit log are kept. A person will
be able to download their data and delete their account (planned for the final milestone).

---

## Part B. Questions for the lawyer

1. **NDPA registration and duties.** Does the Foundation need to register with the Nigeria Data Protection
   Commission as a data controller of major importance, appoint a Data Protection Officer, or file
   audits at its current scale? What should the statement say about this?
2. **Lawful basis.** Are "consent", "performance of a contract" and "legitimate interest" correctly
   assigned to accounts, bookings, payment checking, the audit log and security logging?
3. **Under 18s.** Day-workspace users may be under 18. Can a minor create an account and book? Do we need
   parent or guardian consent or a lower age limit? (The overnight desk is 18 and over only.) What
   safeguarding wording do we need for under-18s in the day space?
4. **International transfer.** Supabase, Vercel and Google store data outside Nigeria. Is the current
   wording enough, or do we need specific safeguards, a transfer notice or processor agreements?
5. **Retention.** Is 12 months then anonymise acceptable, with accounting amounts and the audit log kept
   (how long)? Is there a statutory period for payment records?
6. **Cancellation and refunds.** Please review the proposed policy in Part C (cancellation cut-off times,
   refund by bank transfer, no refund after a monthly pass has started unless the team agrees, no-shows).
7. **Overnight terms.** House rules, who is responsible for belongings, conduct, removal from the premises,
   liability, and what we may say about checking ID in person without storing it.
8. **Staff access.** Is it enough to say that authorised team members can view booking and contact details
   for the purpose of running the service?
9. **Right to delete / download.** How quickly must we respond to a request, and what may we keep (for
   example accounting amounts) after deletion?
10. **Governing law, complaints and contact details** for the Terms and the NDPR statement.

---

## Part C. Proposed new booking wording (drafts for review; not yet on the website)

*Placeholders in [square brackets] need the Foundation's or the lawyer's decision.*

### C1. Accounts
You need an account to book. You must give accurate details and keep your password private. You must
verify your email address before booking. We may close an account that is used to abuse the service.
You can ask us to delete your account at any time.

### C2. Bookings and payment
A desk is held for you for [2 hours] after you book (for an approved overnight request, [24 hours]).
You pay by bank transfer to the account shown on your booking, using your booking reference. Your booking
is confirmed only when our team has checked that the payment reached our account. If you do not pay in
time, the hold ends and the desk is released. We do not take card payments.

### C3. Student prices
A student price is available to people who can show a valid student ID when they arrive. We check it in
person and do not keep a copy. If you cannot show it, you may be asked to pay the difference or we may
decline entry.

### C4. Cancellation and refunds
You can cancel an unpaid booking at any time. You can cancel a paid hourly, half-day, day or overnight
booking until [24 hours] before it starts, and a monthly pass until [48 hours] before its start date.
Refunds are made by bank transfer within [number] working days; we will ask you for your account details
by phone or WhatsApp (not through the website). After a monthly pass has started, there is no automatic
refund; the team may agree a partial refund. If we have to cancel, you will receive a refund. If you do
not arrive, the booking is marked as not attended and [no refund is due].

### C5. Monthly desk pass
A monthly pass gives you one desk, not a named desk, for [30] calendar days in a row from your start date.
Sundays and other closed days still count towards the 30 days. A pass cannot be shared, transferred or
paused. If we close unexpectedly, we may extend your pass by the days we were closed. If we confirm your
payment after your start date, your pass starts on the day we confirm it.

### C6. Overnight desk (18 and over)
Overnight desks are only for people aged 18 or over. You must meet our team at the office, where we check
your ID in person. We do not collect, scan or store your ID on the website. When your payment is
confirmed we show you the address and house rules; please keep them private. [House rules, conduct,
belongings, liability and removal from the premises to be completed by the lawyer.]

### C7. What we keep and for how long
We keep your account and booking details for 12 months after your last activity and then anonymise them.
We keep accounting amounts and a record of staff actions for our legal and security needs. Our email
log is kept for 12 months.

### C8. Safeguarding in the workspace
[Wording for people under 18 using the day space, supervision and reporting to be completed with the
lawyer. The existing Safeguarding Policy below applies.]

---

## Part D. Text that is on the website (draft, with the booking system switched on)

The four pages below are what visitors see **when accounts are switched on**, generated from the website's own content file so it
cannot drift. Sections marked "(draft wording)" are the defaults described in `docs/LEGAL-DEFAULTS.md`. While accounts
are off, the live pages keep their original text.


---

# Privacy Policy

*Page address:* /privacy  
*Last updated shown on the page:* 30 October 2026

*Page summary:* How Rafael Support Foundation collects, uses and protects personal information through this website, and your rights.

> What we collect through this website, why, and what your rights are.

**Draft wording.** Sections marked "(draft wording)" are working text that has not yet had a final review by our lawyer. They are plain-language defaults, not legal advice, and they may change.

Rafael Support Foundation ("we", "us") is a charity that supports young people through education, career guidance and practical skills. This policy explains what personal information we collect through this website, why, and what your rights are. We follow the Nigeria Data Protection Act 2023.

## Who we are

Rafael Support Foundation, Dreamlink Concepts, Mile 50, Abakaliki. Questions about your information: +234 708 196 5663, or through our [Contact page](/contact).

## What we collect

We only collect what you choose to send us through our forms:

- **Request and enquiry forms** (workspace, media room, course interest, guidance, digital marketing, general contact): your name, phone number, and the details of your request, such as a preferred date, a course, your level of study, a topic or a message.
- **Event registration**: your name, phone number, whether you are a student, parent, young professional or other, and the number of guests.
- **Overnight workspace requests**: your name, phone number and preferred time to visit our office. We do not collect identification documents through this website. Identity checks, where needed, happen in person at our office.

We never ask for payment card details or identity documents through this website. Your account password is used only to sign you in. Please do not send sensitive information in your messages.

## Why we use it, and our legal basis

- To reply to your request and arrange what you asked for. Basis: your consent and taking steps at your request.
- To organise events and tell registered guests about them. Basis: your consent.
- To keep our services safe and prevent spam. Basis: our legitimate interest in running a secure website.
- To meet legal duties.

We do not sell your information. We do not use it for advertising.

## Young people under 18

Many of the people we support are young. If you are under 18, please make sure a parent or guardian knows you are contacting us. Each form asks you to confirm this. We keep information about young people to the minimum needed to respond, and we do not publish their personal details. See our [Safeguarding Policy](/safeguarding).

## Who receives your information

We use trusted services to run this website and handle your requests:

- Hosting and delivery of the website (Vercel).
- Sending your request to our team by email (Resend), received in a Google Gmail inbox that our authorised team members can access.

These providers process information for us and may store it outside Nigeria. We only use them to operate the website and receive requests, and we expect them to protect your information. We will share information with authorities only where the law requires it or to protect someone from harm.

## How long we keep it

We keep a request for up to 12 months after we have dealt with it, then delete it, unless the law or a safeguarding concern requires us to keep it longer.

## Accounts and bookings (draft wording)

If you create an account or book a desk, we also collect:

- **Your account:** your name, phone number, email address and a password (kept only in scrambled form, so we cannot read it). The time you accepted our Terms and Privacy Policy. Whether you say you are a student.
- **Your bookings:** what you booked, when, the price, your booking reference and its status (held, paid, confirmed, cancelled, refunded). For an overnight request, that you confirmed you are 18 or over, and the time you did.
- **Payments:** we do not take or keep card details. If you tell us a transfer reference or the name on the account you paid from, we keep it with the booking. We record the amount that reached our bank account and which team member confirmed it. If we owe you a refund, we collect your bank account details by phone or WhatsApp to pay it, and we do not store them on this website.
- **What our team does:** a record of what team members do with bookings, payments and settings (who, when and what), so the service stays accountable and secure.
- **Emails:** a log that an email was sent to your account (the type of email and whether it was sent), not its text.
- **Identity documents:** we never collect, upload, scan or store an identity document on this website. Overnight and student checks are done by looking at the document in person.

## Why we use it, accounts and bookings (draft wording)

- To create your account, take your booking, check your payment and look after you when you visit. Basis: taking steps at your request and carrying out the booking.
- To keep accounting records of money received and refunded. Basis: our legal duty to keep financial records.
- To keep the service secure, prevent fraud and spam, and keep our team accountable (the record of team actions and the email log). Basis: our legitimate interest in running a secure and trustworthy service.
- To email you about your account and bookings, such as verification, payment and reminders. Basis: carrying out the booking and our legitimate interest. We do not send marketing emails unless you ask for them.
- To keep people safe, including checking in person that overnight guests are adults. Basis: our legitimate interest and our duty of care.

## Who receives your information, accounts and bookings (draft wording)

- **Supabase:** our database and sign-in service. It stores account and booking information.
- **Vercel:** hosts the website.
- **Google (Gmail):** sends our emails until we send them from our own domain.
- **Resend:** delivers our emails once we send them from our own domain.
- **Our team:** authorised team members see the details they need to run bookings, such as your name, phone number and booking. Staff and administrators sign in with a second step (an authenticator app).

These providers may store and process information outside Nigeria. We share only what is needed, and we use providers that protect information. We do not sell your information.

## How long we keep it, accounts and bookings (draft wording)

- Account and booking details: while your account is active and for 12 months after your last activity. Then your name, phone number and email are removed from old bookings (they are anonymised), and only figures remain.
- The email log: 12 months.
- Accounting records of amounts, dates and references: 6 years, because we must keep financial records.
- The record of team actions: 6 years.
- We may keep something longer where the law or a safeguarding concern requires it.

## Under 18 and accounts (draft wording)

Accounts are for people aged 18 and over. If you are under 18, please ask a parent or guardian to book for you. See our [Safeguarding Policy](/safeguarding).

## Your information: ask us (draft wording)

You can ask us at any time for a copy of your information, to correct it, or to delete your account (+234 708 196 5663, or through our [Contact page](/contact)). We reply within 30 days. When your account is deleted your sign-in is removed and your bookings are anonymised. We keep accounting figures (amounts, dates, references) because the law requires financial records.

## Cookies and similar technologies

This website uses only what it needs to work:

- A small stored setting that remembers your light or dark display choice.
- A sign-in cookie, set only when you log in, that keeps you signed in. It is needed for your account to work.

We do not use advertising or tracking cookies. If we add website analytics in future, we will update this policy and ask for your consent where the law requires it.

## Your rights

You can ask us to: tell you what information we hold about you; correct it; delete it; stop using it; or give it back to you. You can also withdraw your consent at any time. Contact us through our [Contact page](/contact) or on +234 708 196 5663. If you are unhappy with how we handle your information, you have the right to complain to the Nigeria Data Protection Commission.

## Security

We limit who can see requests, use secure connections, and protect forms against spam and abuse. No online service is completely risk-free, so please share only what is needed.

## Changes

We will update this page when our practices change and show the date at the top.


---

# Terms of Service

*Page address:* /terms  
*Last updated shown on the page:* 30 October 2026

*Page summary:* The terms for using the Rafael Support Foundation website.

> The terms for using this website.

**Draft wording.** Sections marked "(draft wording)" are working text that has not yet had a final review by our lawyer. They are plain-language defaults, not legal advice, and they may change.

By using this website you agree to these terms. If you do not agree, please do not use it.

## About us

This website is run by Rafael Support Foundation, a charity based at Dreamlink Concepts, Mile 50, Abakaliki. RSF Tech & Space is one of our programmes.

## Using this website

You may use this website for lawful, personal and non-commercial purposes. Please do not try to disrupt it, send false or harmful content through its forms, or use automated tools to submit forms.

## Requests and bookings

Sending a request form is not a confirmed booking, registration or place on a course. We will contact you to confirm. A desk booked through your account is confirmed only when our team has checked your payment (see "Booking and paying" below). Media room, course and consulting requests depend on availability.

## Fees

This website does not take card payments. Workspace bookings are paid by bank transfer, as explained below. If any other service has a fee, we will tell you the fee before you commit to it.

## Guidance and support

Our career, school and course guidance, scholarship information, study-abroad information and visa guidance are given to help you make your own decisions. We do not guarantee any admission, scholarship, visa, job or other outcome. You are responsible for your own decisions and applications.

## Events

Attendance at our events is free unless we say otherwise. We may take photographs and video at events for our work and our social media. If you do not want to appear in them, tell a member of our team at the event. We will take extra care with young people. See our [Safeguarding Policy](/safeguarding).

## Accounts (draft wording)

You need an account to book a desk. By creating one you confirm that you are 18 or over, that the details you give are true, and that you accept these Terms and our [Privacy Policy](/privacy). Keep your password private: you are responsible for what is done with your account. We may suspend or close an account that is used to abuse the service, harass others or make false bookings. You can ask us to delete your account at any time.

If you are under 18, please ask a parent or guardian to make the booking for you. See our [Safeguarding Policy](/safeguarding).

## Booking and paying (draft wording)

- When you book, we hold your desk for 2 hours. If you have not paid by then, the hold ends and the desk is released. For an overnight request that we have approved, the hold is 24 hours.
- You pay by **bank transfer only**, to the account shown on your booking page, using your booking reference as the transfer description. We do not take card payments and we never ask for card details.
- After you transfer, press "I've paid". Your booking is **confirmed only when our team has checked that the payment reached our bank account**. This can take some time. We will email you.
- If a payment does not match (wrong amount, or no matching transfer) we may not confirm it, and we will tell you why. If your money reached us but your desk is no longer free, we will refund it in full.
- The price is shown on the booking page before you book, and that is the price you pay for that booking.

## Student prices (draft wording)

A student price is for people who are students. Bring a valid student ID: our team checks it in person when you arrive. We do not take or keep a copy. If you cannot show it, you may be asked to pay the difference before you stay, or we may decline entry for that booking.

## Cancellations and refunds (draft wording)

- **Unpaid bookings:** you can cancel at any time. Nothing is owed.
- **Paid hourly, half-day, day and overnight bookings:** you can cancel online up to 24 hours before the start time and receive a full refund. After that, no refund is due unless we agree otherwise.
- **Monthly passes:** you can cancel online up to 48 hours before the start date and receive a full refund. Once a pass has started there is no automatic refund. In a genuine case our team may agree a partial refund, at its own discretion.
- **If we cancel** (for example because we must close), you receive a full refund, or we move your booking to a time that suits you. If we close unexpectedly during a monthly pass, we may extend the pass by the days we were closed.
- **If you do not come,** the booking is marked as not attended and no refund is due.
- **How refunds are paid:** by bank transfer, within 7 working days after the cancellation is accepted, to a bank account in the name of the person who booked. We will ask for the account details by phone or WhatsApp. **We never ask you to enter bank details on this website.** We do not refund bank charges on your side.

## Monthly desk pass (draft wording)

- A monthly pass gives you one desk for 30 calendar days in a row from your start date. Sundays and other closed days still count towards the 30 days.
- It is a desk, not a named desk. Sit at any free desk when you arrive. Our team finds your pass by your name or booking reference.
- A pass is personal. It cannot be shared, sold, transferred or paused.
- If we confirm your payment after your chosen start date, your pass starts on the day we confirm it and keeps its full length.
- You can renew before a pass ends. A renewal is not guaranteed unless it is booked and paid before someone else takes the place.

## Overnight desk (draft wording)

- The overnight desk is for people aged **18 or over only**. You must tick a box to confirm this when you request it.
- Every overnight request is approved **in person** at our office first, where our team looks at your identity document. **We never ask you to upload an ID document to this website, and we do not scan, copy or keep it.**
- A request holds a desk for 3 days. If we have not met you in that time, the request ends and the desk is released.
- After we approve your request and your payment is confirmed, we show you the address and the house rules in your account and by email. Please keep the address to yourself.
- Check-in and check-out times are shown on your booking. Late arrival or late departure needs our agreement.
- We may refuse, end or cancel an overnight stay straight away if the house rules are broken or if it is not safe. In that case no refund is due for the part of the stay not used, unless we decide otherwise.

## House rules for our spaces (draft wording)

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

## Our responsibility to you (draft wording)

We provide RSF Tech & Space as part of our charity work and take reasonable care to keep it safe, clean and available. However:

- Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit.
- You use the space, equipment and WiFi at your own risk. We do not promise that power, internet or any equipment will always be available.
- We are not responsible for lost, stolen or damaged belongings, or for lost work or data.
- Apart from the points above, our total responsibility to you for any one booking is limited to the amount you paid for that booking.
- We are not responsible for losses we could not reasonably have foreseen.

## Our content

The text, logo, photographs and design of this website belong to Rafael Support Foundation or are used with permission. You may share links to our pages. Please do not copy or reuse our content, or our name and logo, without our written permission. Course materials, when offered, are for the enrolled learner's own use and may not be redistributed.

## Links to other websites

This website may link to other websites. We are not responsible for their content or privacy practices.

## Limits of our responsibility

We work to keep this website accurate and available, but we do not promise it will always be error-free or uninterrupted. To the extent the law allows, we are not responsible for losses that come from using this website or relying on its information.

## Changes

We may update these terms and will show the date at the top. Continued use of the website means you accept the updated terms.

## Governing law

These terms are governed by the laws of the Federal Republic of Nigeria.

## Disputes (draft wording)

If you have a complaint about a booking, contact us first (+234 708 196 5663, or through our [Contact page](/contact)). We will try to settle it within 30 days. If it cannot be settled, the courts of Ebonyi State, Nigeria can decide it, under the laws of the Federal Republic of Nigeria.

## Contact

+234 708 196 5663 · [Contact page](/contact)


---

# Safeguarding Policy

*Page address:* /safeguarding  
*Last updated shown on the page:* 30 October 2026

*Page summary:* How Rafael Support Foundation keeps children and young people safe, and what to do if you are worried about someone.

> How we keep children and young people safe.

**Draft wording.** Sections marked "(draft wording)" are working text that has not yet had a final review by our lawyer. They are plain-language defaults, not legal advice, and they may change.

## Our commitment

Rafael Support Foundation works with children and young people. Everyone we work with has the right to be safe, respected and protected from harm, abuse and exploitation. Safeguarding is the responsibility of everyone who works or volunteers with us.

## Who this applies to

This policy applies to all trustees, staff, volunteers, trainers, campus representatives, contractors and partners acting for Rafael Support Foundation, at RSF Tech & Space, at events and online. A "child" is anyone under 18.

## Our principles

- The welfare of children and young people comes first.
- Everyone has the right to protection, whatever their background.
- Concerns are taken seriously and acted on quickly.
- We share information about concerns only with those who need to know.

## How we keep young people safe

- **Safer recruitment.** People who work or volunteer with young people are selected carefully, with references checked, and are briefed on this policy before they start.
- **Code of conduct.** Adults must treat young people with respect, must not harm, humiliate or exploit them, and must not form inappropriate relationships with them. Adults should avoid being alone with a young person in a closed or private space. Guidance and counselling sessions take place where others can see, or with a second adult nearby.
- **Our spaces.** The overnight workspace is for adults aged 18 and over only. Young people at RSF Tech & Space during the day are expected to follow its rules and may be asked to confirm that a parent or guardian knows they are there.
- **Photographs and video.** We get permission before taking or publishing images of young people. For anyone under 18, we need a parent's or guardian's permission. We do not publish a young person's full name, school, home address or other identifying details with an image.
- **Online safety.** Staff and volunteers use only official Rafael Support Foundation accounts to contact young people about our programmes, and do not share young people's private details. Requests made on our website are handled only by authorised team members.
- **Information.** Information about young people is kept private and only as long as needed. See our [Privacy Policy](/privacy).

## Young people and the booking system (draft wording)

- Online accounts and bookings are for people aged 18 or over. A young person under 18 can use the day workspace when a parent or guardian has booked for them, or knows and agrees that they are coming. We may ask to confirm this.
- The overnight desk is for adults aged 18 and over only. We check this in person, and nobody under 18 stays overnight.
- We do not leave a young person alone in a private space with one adult. Our team follows the code of conduct above in the workspace.
- Adults who use the day space are not responsible for supervising other people's children, and must not be left to do so.
- We do not publish photographs or video of anyone under 18 without a parent's or guardian's written permission, and never with their full name, school or address.
- If you are worried about a young person in our space, tell our team or our safeguarding contact straight away.
- We may refuse entry or end a booking where we believe a young person's safety is at risk.

## If you are worried about someone

Tell us straight away. You can contact our safeguarding contact at +234 708 196 5663, or through our [Contact page](/contact). If a child is in immediate danger, contact the police or emergency services first.

## How we respond to a concern

1. Listen calmly and take it seriously. Do not promise to keep it secret.
2. Write down what was said or seen, as soon as possible, using the person's own words.
3. Report it to our safeguarding contact the same day. Do not investigate it yourself or confront the person involved.
4. Our safeguarding contact decides what to do, which may include protecting the young person, informing the parent or guardian where it is safe to do so, and reporting to the police or the state's child welfare authorities.
5. We support the young person and keep records securely.

Concerns about the conduct of a member of our team, or about our safeguarding practice, can be reported to the same contact, or in writing to the leadership of Rafael Support Foundation.

## Review

We review this policy every year, and after any serious concern.


---

# Data Protection Statement

*Page address:* /data-protection  
*Last updated shown on the page:* 30 October 2026

*Page summary:* How Rafael Support Foundation handles personal information under the Nigeria Data Protection Act 2023, and your rights.

> How we handle personal information, and your rights.

**Draft wording.** Sections marked "(draft wording)" are working text that has not yet had a final review by our lawyer. They are plain-language defaults, not legal advice, and they may change.

Rafael Support Foundation respects your privacy and handles personal information in line with the Nigeria Data Protection Act 2023.

## Our commitments

- We collect only the information we need, and tell you why.
- We use it only for the purposes we explained.
- We keep it accurate, secure and only for as long as needed.
- We do not sell it or use it for advertising.
- We take extra care with information about young people.
- We tell you your rights and make them easy to use.

## Your rights

You can ask to see, correct or delete your information, object to its use, or withdraw your consent. Contact us through our [Contact page](/contact) or on +234 708 196 5663 and we will respond as soon as we can.

## Who is responsible (draft wording)

Rafael Support Foundation decides how the personal information described in our [Privacy Policy](/privacy) is used (the "data controller"). For data protection questions contact +234 708 196 5663, or through our [Contact page](/contact).

## How quickly we reply (draft wording)

We reply to a request about your information within 30 days.

## If something goes wrong (draft wording)

If there is a breach of personal information that could harm people, we will tell the Nigeria Data Protection Commission within 72 hours of becoming aware of it where the law requires, and we will tell the people affected if they are at risk.

## Our team and security (draft wording)

Only authorised team members can see booking and contact details. Staff and administrators sign in with a second step, and what they do with bookings, payments and settings is recorded.

## Registration and our duties (draft wording)

We keep our practices under review. We will register with the Nigeria Data Protection Commission, appoint the person the law requires and meet any other duty the Act places on us when it applies to us.

## Complaints

If you are not satisfied, contact us first. You also have the right to complain to the Nigeria Data Protection Commission (NDPC).

## More information

Read our [Privacy Policy](/privacy) for details of what we collect, who receives it and how long we keep it.
