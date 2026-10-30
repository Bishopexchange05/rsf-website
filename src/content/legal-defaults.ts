import { CONTACT_EMAIL, orgName, SAFEGUARDING_CONTACT_LABEL, site, spaceName } from "./site";
import type { LegalBlock } from "./legal";

// ===========================================================================================
// LEGAL DEFAULTS: the ONE place for the booking-era wording and numbers.
//
// These are working defaults chosen on 30 October 2026 for a small Nigerian workspace that takes
// bank-transfer bookings, with the Nigeria Data Protection Act 2023 (NDPA) in mind. They are
// conservative, plain-language DRAFTS. They are not legal advice and have not had a final legal
// review. The owner marks the lawyer review as done in Admin, Settings, only after the lawyer has
// seen the final text.
//
// TO CHANGE ANYTHING: edit the numbers in \`values\`, or the sentences below, in THIS file only.
// legal.ts only slots these sections in. docs/LEGAL-DEFAULTS.md is generated from this file by
// \`node ops/render-legal-defaults.js\`, so the two cannot drift apart.
//
// KEEP IN STEP WITH SETTINGS: hold time, cancellation cut-offs, pass length and request expiry are
// also editable in Admin, Settings, Booking rules. If an Admin changes them, change them here too.
//
// SHOWN ONLY WHEN ACCOUNTS ARE ON: while accounts are off (the staged-launch state) the legal pages
// show their original text, which describes a site with no accounts or bookings.
// ===========================================================================================

export const ACCOUNTS_ON = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";

export const values = {
  accountMinAge: 18,
  holdHours: 2,
  overnightPayHours: 24,
  requestDays: 3,
  cancelHours: 24,
  passCancelHours: 48,
  passDays: 30,
  refundWorkingDays: 7,
  rightsReplyDays: 30,
  breachHours: 72,
  retentionMonths: 12,
  dormantMonths: 24,
  dormantWarnDays: 30,
  emailLogMonths: 12,
  accountingYears: 6,
  auditYears: 6,
  liabilityCap: "the amount you paid for that booking",
  courts: "Ebonyi State, Nigeria",
};

const v = values;
const h2 = (text: string): LegalBlock => ({ type: "h2", text });
const p = (text: string): LegalBlock => ({ type: "p", text });
const ul = (...items: string[]): LegalBlock => ({ type: "ul", items });

const DRAFT = "(draft wording)";
const hasEmail = CONTACT_EMAIL.length > 0;
const contact = hasEmail ? `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) or ${site.phone}` : `${site.phone}, or through our [Contact page](/contact)`;
const safeguardingContact = SAFEGUARDING_CONTACT_LABEL;

export const draftNotice: LegalBlock = p(
  "**Draft wording.** Sections marked \"(draft wording)\" are working text that has not yet had a final review by our lawyer. They are plain-language defaults, not legal advice, and they may change.",
);

// ------------------------------------------------------------------ Terms of Service

// Replaces "Requests are not bookings" and "Fees" when accounts are on.
export const termsRequestsAndFees: LegalBlock[] = [
  h2("Requests and bookings"),
  p(
    "Sending a request form is not a confirmed booking, registration or place on a course. We will contact you to confirm. A desk booked through your account is confirmed only when our team has checked your payment (see \"Booking and paying\" below). Media room, course and consulting requests depend on availability.",
  ),
  h2("Fees"),
  p(
    "This website does not take card payments. Workspace bookings are paid by bank transfer, as explained below. If any other service has a fee, we will tell you the fee before you commit to it.",
  ),
];

export const termsBooking: LegalBlock[] = [
  h2(`Accounts ${DRAFT}`),
  p(
    `You need an account to book a desk. By creating one you confirm that you are ${v.accountMinAge} or over, that the details you give are true, and that you accept these Terms and our [Privacy Policy](/privacy). Keep your password private: you are responsible for what is done with your account. We may suspend or close an account that is used to abuse the service, harass others or make false bookings. You can ask us to delete your account at any time.`,
  ),
  p(
    "If you are under 18, please ask a parent or guardian to make the booking for you. See our [Safeguarding Policy](/safeguarding).",
  ),

  h2(`Booking and paying ${DRAFT}`),
  ul(
    `When you book, we hold your desk for ${v.holdHours} hours. If you have not paid by then, the hold ends and the desk is released. For an overnight request that we have approved, the hold is ${v.overnightPayHours} hours.`,
    "You pay by **bank transfer only**, to the account shown on your booking page, using your booking reference as the transfer description. We do not take card payments and we never ask for card details.",
    "After you transfer, press \"I've paid\". Your booking is **confirmed only when our team has checked that the payment reached our bank account**. This can take some time. We will email you.",
    "If a payment does not match (wrong amount, or no matching transfer) we may not confirm it, and we will tell you why. If your money reached us but your desk is no longer free, we will refund it in full.",
    "The price is shown on the booking page before you book, and that is the price you pay for that booking.",
  ),

  h2(`Student prices ${DRAFT}`),
  p(
    "A student price is for people who are students. Bring a valid student ID: our team checks it in person when you arrive. We do not take or keep a copy. If you cannot show it, you may be asked to pay the difference before you stay, or we may decline entry for that booking.",
  ),

  h2(`Cancellations and refunds ${DRAFT}`),
  ul(
    "**Unpaid bookings:** you can cancel at any time. Nothing is owed.",
    `**Paid hourly, half-day, day and overnight bookings:** you can cancel online up to ${v.cancelHours} hours before the start time and receive a full refund. After that, no refund is due unless we agree otherwise.`,
    `**Monthly passes:** you can cancel online up to ${v.passCancelHours} hours before the start date and receive a full refund. Once a pass has started there is no automatic refund. In a genuine case our team may agree a partial refund, at its own discretion.`,
    "**If we cancel** (for example because we must close), you receive a full refund, or we move your booking to a time that suits you. If we close unexpectedly during a monthly pass, we may extend the pass by the days we were closed.",
    "**If you do not come,** the booking is marked as not attended and no refund is due.",
    `**How refunds are paid:** by bank transfer, within ${v.refundWorkingDays} working days after the cancellation is accepted, to a bank account in the name of the person who booked. We will ask for the account details by phone or WhatsApp. **We never ask you to enter bank details on this website.** We do not refund bank charges on your side.`,
  ),

  h2(`Monthly desk pass ${DRAFT}`),
  ul(
    `A monthly pass gives you one desk for ${v.passDays} calendar days in a row from your start date. Sundays and other closed days still count towards the ${v.passDays} days.`,
    "It is a desk, not a named desk. Sit at any free desk when you arrive. Our team finds your pass by your name or booking reference.",
    "A pass is personal. It cannot be shared, sold, transferred or paused.",
    "If we confirm your payment after your chosen start date, your pass starts on the day we confirm it and keeps its full length.",
    "You can renew before a pass ends. A renewal is not guaranteed unless it is booked and paid before someone else takes the place.",
  ),

  h2(`Overnight desk ${DRAFT}`),
  ul(
    `The overnight desk is for people aged **${v.accountMinAge} or over only**. You must tick a box to confirm this when you request it.`,
    "Every overnight request is approved **in person** at our office first, where our team looks at your identity document. **We never ask you to upload an ID document to this website, and we do not scan, copy or keep it.**",
    `A request holds a desk for ${v.requestDays} days. If we have not met you in that time, the request ends and the desk is released.`,
    "After we approve your request and your payment is confirmed, we show you the address and the house rules in your account and by email. Please keep the address to yourself.",
    "Check-in and check-out times are shown on your booking. Late arrival or late departure needs our agreement.",
    "We may refuse, end or cancel an overnight stay straight away if the house rules are broken or if it is not safe. In that case no refund is due for the part of the stay not used, unless we decide otherwise.",
  ),

  h2(`House rules for our spaces ${DRAFT}`),
  p(`These apply to everyone at ${spaceName}, by day and by night:`),
  ul(
    "Treat everyone with respect. No harassment, bullying, discrimination or threatening behaviour.",
    "No illegal activity, no weapons, no alcohol, no illegal drugs, and no smoking or vaping inside.",
    "Keep noise low and use headphones for audio and video.",
    "Look after the equipment, furniture and building. You are responsible for damage you cause.",
    "Keep your belongings with you and secure.",
    "Use electricity, WiFi and printers fairly. We may limit use that affects others.",
    "Visitors are welcome in the day space only if they are also booked or we agree. No visitors overnight.",
    "Follow the instructions of our team, including in an emergency. Know where the exits are.",
    "Our team may ask anyone who breaks these rules to leave.",
  ),

  h2(`Our responsibility to you ${DRAFT}`),
  p(
    `We provide ${spaceName} as part of our charity work and take reasonable care to keep it safe, clean and available. However:`,
  ),
  ul(
    "Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit.",
    "You use the space, equipment and WiFi at your own risk. We do not promise that power, internet or any equipment will always be available.",
    "We are not responsible for lost, stolen or damaged belongings, or for lost work or data.",
    `Apart from the points above, our total responsibility to you for any one booking is limited to ${v.liabilityCap}.`,
    "We are not responsible for losses we could not reasonably have foreseen.",
  ),

];

// Goes after "Governing law".
export const termsDisputes: LegalBlock[] = [
  h2(`Disputes ${DRAFT}`),
  p(
    `If you have a complaint about a booking, contact us first (${contact}). We will try to settle it within ${v.rightsReplyDays} days. If it cannot be settled, the courts of ${v.courts} can decide it, under the laws of the Federal Republic of Nigeria.`,
  ),
];

// ------------------------------------------------------------------ Privacy Policy

// Replaces the sentence about passwords, payment cards and sensitive information.
export const privacyNoSensitive =
  "We never ask for payment card details or identity documents through this website. Your account password is used only to sign you in. Please do not send sensitive information in your messages.";

export const privacyAccounts: LegalBlock[] = [
  h2(`Accounts and bookings ${DRAFT}`),
  p("If you create an account or book a desk, we also collect:"),
  ul(
    "**Your account:** your name, phone number, email address and a password (kept only in scrambled form, so we cannot read it). The time you accepted our Terms and Privacy Policy. Whether you say you are a student.",
    "**Your bookings:** what you booked, when, the price, your booking reference and its status (held, paid, confirmed, cancelled, refunded). For an overnight request, that you confirmed you are 18 or over, and the time you did.",
    "**Payments:** we do not take or keep card details. If you tell us a transfer reference or the name on the account you paid from, we keep it with the booking. We record the amount that reached our bank account and which team member confirmed it. If we owe you a refund, we collect your bank account details by phone or WhatsApp to pay it, and we do not store them on this website.",
    "**What our team does:** a record of what team members do with bookings, payments and settings (who, when and what), so the service stays accountable and secure.",
    "**Emails:** a log that an email was sent to your account (the type of email and whether it was sent), not its text.",
    "**Identity documents:** we never collect, upload, scan or store an identity document on this website. Overnight and student checks are done by looking at the document in person.",
  ),

  h2(`Why we use it, accounts and bookings ${DRAFT}`),
  ul(
    "To create your account, take your booking, check your payment and look after you when you visit. Basis: taking steps at your request and carrying out the booking.",
    "To keep accounting records of money received and refunded. Basis: our legal duty to keep financial records.",
    "To keep the service secure, prevent fraud and spam, and keep our team accountable (the record of team actions and the email log). Basis: our legitimate interest in running a secure and trustworthy service.",
    "To email you about your account and bookings, such as verification, payment and reminders. Basis: carrying out the booking and our legitimate interest. We do not send marketing emails unless you ask for them.",
    "To keep people safe, including checking in person that overnight guests are adults. Basis: our legitimate interest and our duty of care.",
  ),

  h2(`Who receives your information, accounts and bookings ${DRAFT}`),
  ul(
    "**Supabase:** our database and sign-in service. It stores account and booking information.",
    "**Vercel:** hosts the website.",
    "**Google (Gmail):** sends our emails until we send them from our own domain.",
    "**Resend:** delivers our emails once we send them from our own domain.",
    "**Our team:** authorised team members see the details they need to run bookings, such as your name, phone number and booking. Staff and administrators sign in with a second step (an authenticator app).",
  ),
  p(
    "These providers may store and process information outside Nigeria. We share only what is needed, and we use providers that protect information. We do not sell your information.",
  ),

  h2(`How long we keep it, accounts and bookings ${DRAFT}`),
  ul(
    `Account and booking details: while your account is active and for ${v.retentionMonths} months after your last activity. Then your name, phone number and email are removed from old bookings (they are anonymised), and only figures remain.`,
    `Accounts that are not used for ${v.dormantMonths} months are deleted. We email you a warning ${v.dormantWarnDays} days before, and signing in once keeps the account.`,
    `The email log: ${v.emailLogMonths} months.`,
    `Accounting records of amounts, dates and references: ${v.accountingYears} years, because we must keep financial records.`,
    `The record of team actions: ${v.auditYears} years.`,
    "We may keep something longer where the law or a safeguarding concern requires it.",
  ),

  h2(`Under 18 and accounts ${DRAFT}`),
  p(
    "Accounts are for people aged 18 and over. If you are under 18, please ask a parent or guardian to book for you. See our [Safeguarding Policy](/safeguarding).",
  ),

  h2(`Your information: ask us ${DRAFT}`),
  p(
    `You can download a copy of your information and delete your account yourself from your account page, or ask us (${contact}). We reply to requests within ${v.rightsReplyDays} days. When your account is deleted your sign-in is removed and your bookings are anonymised. We keep accounting figures (amounts, dates, references) because the law requires financial records.`,
  ),
];

export const privacyLoginCookie =
  "A sign-in cookie, set only when you log in, that keeps you signed in. It is needed for your account to work.";

// ------------------------------------------------------------------ Safeguarding Policy

export const safeguardingYoung: LegalBlock[] = [
  h2(`Young people and the booking system ${DRAFT}`),
  ul(
    "Online accounts and bookings are for people aged 18 or over. A young person under 18 can use the day workspace when a parent or guardian has booked for them, or knows and agrees that they are coming. We may ask to confirm this.",
    "The overnight desk is for adults aged 18 and over only. We check this in person, and nobody under 18 stays overnight.",
    "We do not leave a young person alone in a private space with one adult. Our team follows the code of conduct above in the workspace.",
    "Adults who use the day space are not responsible for supervising other people's children, and must not be left to do so.",
    "We do not publish photographs or video of anyone under 18 without a parent's or guardian's written permission, and never with their full name, school or address.",
    `If you are worried about a young person in our space, tell our team or ${safeguardingContact} straight away.`,
    "We may refuse entry or end a booking where we believe a young person's safety is at risk.",
  ),
];

// ------------------------------------------------------------------ Data Protection Statement

export const dataProtectionExtra: LegalBlock[] = [
  h2(`Who is responsible ${DRAFT}`),
  p(
    `${orgName} decides how the personal information described in our [Privacy Policy](/privacy) is used (the "data controller"). For data protection questions contact ${contact}.`,
  ),
  h2(`How quickly we reply ${DRAFT}`),
  p(`We reply to a request about your information within ${v.rightsReplyDays} days.`),
  h2(`If something goes wrong ${DRAFT}`),
  p(
    `If there is a breach of personal information that could harm people, we will tell the Nigeria Data Protection Commission within ${v.breachHours} hours of becoming aware of it where the law requires, and we will tell the people affected if they are at risk.`,
  ),
  h2(`Our team and security ${DRAFT}`),
  p(
    "Only authorised team members can see booking and contact details. Staff and administrators sign in with a second step, and what they do with bookings, payments and settings is recorded.",
  ),
  h2(`Registration and our duties ${DRAFT}`),
  p(
    "We keep our practices under review. We will register with the Nigeria Data Protection Commission, appoint the person the law requires and meet any other duty the Act places on us when it applies to us.",
  ),
];

// ===========================================================================================
// THE REGISTRY: every default, in plain words. docs/LEGAL-DEFAULTS.md is generated from this.
// "lawyer": High = please look at this first; Medium = worth checking; Low = routine.
// ===========================================================================================

export type DefaultEntry = {
  id: string;
  topic: string;
  value: string;
  why: string;
  lawyer: "High" | "Medium" | "Low";
  where: string;
};

export const defaultsList: DefaultEntry[] = [
  { id: "A1", topic: "Who can have an account", value: `People aged ${v.accountMinAge} or over. By creating an account you confirm this, and accept the Terms and Privacy Policy (the time is stored).`, why: "The NDPA treats children's data with extra care and expects a parent or guardian's consent. The simplest safe rule is adult accounts only. There is no separate age box at sign-up: accepting the Terms is the confirmation.", lawyer: "High", where: "Terms, Privacy" },
  { id: "A2", topic: "Under 18 in the day workspace", value: "A parent or guardian books for them or knows and agrees. We may ask to confirm.", why: "Young people are part of our mission, but online bookings are for adults, so a guardian stands behind the booking.", lawyer: "High", where: "Terms, Safeguarding" },
  { id: "A3", topic: "Overnight desk", value: `${v.accountMinAge} or over only, a tick in the request, approved in person with ID checked at the office, no ID uploaded, scanned or kept.`, why: "As decided by the owner. Nobody under 18 stays overnight.", lawyer: "Medium", where: "Terms, Safeguarding, Privacy" },
  { id: "A4", topic: "Overnight request waits", value: `${v.requestDays} days, then the request ends and the desk is released. After approval the person has ${v.overnightPayHours} hours to pay.`, why: "Matches Settings (decided by the owner).", lawyer: "Low", where: "Terms" },
  { id: "B1", topic: "Hold before payment", value: `${v.holdHours} hours.`, why: "Matches Settings. Stops unpaid bookings tying up desks.", lawyer: "Low", where: "Terms" },
  { id: "B2", topic: "When a booking is confirmed", value: "Only after our team has checked that the payment reached our bank account. Card payments are never taken.", why: "This is how the system works (bank transfer only).", lawyer: "Low", where: "Terms" },
  { id: "B3", topic: "Wrong or missing payment", value: "We may refuse to confirm it and say why. If money arrived but the desk is gone, we refund in full.", why: "Fair to the customer and clear to staff.", lawyer: "Medium", where: "Terms" },
  { id: "C1", topic: "Cancelling a paid hourly, half-day, day or overnight booking", value: `Full refund if cancelled online at least ${v.cancelHours} hours before the start. After that, no refund unless we agree.`, why: "Matches Settings (24 hours). A clear cut-off protects the team's planning.", lawyer: "Medium", where: "Terms" },
  { id: "C2", topic: "Cancelling a monthly pass", value: `Full refund if cancelled online at least ${v.passCancelHours} hours before the start date. After it starts, no automatic refund; the team may agree a partial refund at its discretion.`, why: "Matches Settings (48 hours) and the Admin partial-refund tool.", lawyer: "Medium", where: "Terms" },
  { id: "C3", topic: "If we cancel or close", value: "Full refund, or the booking is moved. A monthly pass may be extended by the days we were closed.", why: "The customer should not lose out because of our closure.", lawyer: "Low", where: "Terms" },
  { id: "C4", topic: "No-shows", value: "Marked as not attended. No refund.", why: "The desk was held for them and cannot be resold.", lawyer: "Medium", where: "Terms" },
  { id: "C5", topic: "Refund timing and method", value: `Within ${v.refundWorkingDays} working days after the cancellation is accepted, by bank transfer, to an account in the name of the person who booked. Details are collected by phone or WhatsApp and never entered on the website. We do not refund bank charges.`, why: "Seven working days is a realistic promise for a small team. Paying only to the booker's own account reduces fraud. This is how the Admin refund screen works.", lawyer: "High", where: "Terms" },
  { id: "C6", topic: "Student price", value: "ID checked in person, no copy kept. If no ID, pay the difference or entry may be declined.", why: "As built. Avoids storing ID.", lawyer: "Low", where: "Terms" },
  { id: "C7", topic: "Monthly pass rules", value: `${v.passDays} calendar days, Sundays and closed days count, a desk not a named desk, personal and not transferable or pausable, starts when we confirm if confirmed late.`, why: "As built and as decided by the owner.", lawyer: "Low", where: "Terms" },
  { id: "C8", topic: "Ending an overnight stay for breaking the rules", value: "We may refuse or end it at once. No refund for the unused part unless we decide otherwise.", why: "Safety of other guests and the team comes first.", lawyer: "High", where: "Terms" },
  { id: "D1", topic: "House rules (all spaces)", value: "Respect others; nothing illegal; no weapons, alcohol, illegal drugs, smoking or vaping; low noise; look after equipment and pay for damage you cause; keep belongings secure; fair use of power, WiFi and printers; visitors only if booked or agreed, none overnight; follow staff instructions; we may ask people to leave.", why: "Typical, conservative rules for a shared workspace, written in plain words.", lawyer: "Medium", where: "Terms" },
  { id: "D2", topic: "Overnight house rules (private)", value: "A starter text is in the section \"Overnight house rules starter text\" below. You paste it into Admin, Settings, Overnight details. It is shown only to a confirmed overnight member, never on the public site.", why: "The rules are private to guests, so they are entered in Settings, not on a public page.", lawyer: "Medium", where: "Settings (private)" },
  { id: "E1", topic: "Liability", value: `We do not limit liability for death or personal injury caused by our negligence, fraud, or anything the law does not allow. Use of the space, equipment and WiFi is at your own risk; no promise of power or internet; not responsible for lost, stolen or damaged belongings or lost work; our total responsibility for one booking is limited to ${v.liabilityCap}; not responsible for unforeseeable losses.`, why: "A conservative, balanced clause for a charity-run space. The first point is there because the law does not allow some limits.", lawyer: "High", where: "Terms" },
  { id: "E2", topic: "Governing law and disputes", value: `Laws of the Federal Republic of Nigeria; complain to us first and we try to settle within ${v.rightsReplyDays} days; courts of ${v.courts}.`, why: "The Terms already say Nigerian law. The court named is our local state.", lawyer: "High", where: "Terms" },
  { id: "F1", topic: "What personal information the booking system holds", value: "Account (name, phone, email, scrambled password, terms time, student flag); bookings and statuses; payment notes the person types, amounts and who confirmed; the 18+ confirmation and its time; a record of team actions; an email log (type and sent or failed, not the text). No ID, no card details, no stored bank account details.", why: "This is exactly what the system stores, so the policy is accurate.", lawyer: "Medium", where: "Privacy" },
  { id: "F2", topic: "Lawful bases", value: "Carrying out the booking; legal duty for financial records; legitimate interest for security, the audit record and the email log; legitimate interest and duty of care for overnight safety; no marketing emails unless asked.", why: "A reasonable mapping under the NDPA. Consent is used only where we ask for it.", lawyer: "High", where: "Privacy" },
  { id: "F3", topic: "Processors and transfers abroad", value: "Supabase (database and sign-in), Vercel (hosting), Google (email, until our own domain), Resend (email). Information may be stored outside Nigeria; we share only what is needed.", why: "These are the real providers. Information is stored outside Nigeria, which the NDPA regulates.", lawyer: "High", where: "Privacy" },
  { id: "F4", topic: "How long we keep personal information", value: `Accounts and bookings: while active plus ${v.retentionMonths} months, then anonymised. Email log: ${v.emailLogMonths} months. Accounting records: ${v.accountingYears} years. Record of team actions: ${v.auditYears} years.`, why: "The first two are the owner's decisions. Six years for accounting and the team record is a cautious guess because company-style record rules often use six years.", lawyer: "High", where: "Privacy" },
  { id: "F4b", topic: "Accounts nobody uses", value: `A member account with no activity for ${v.dormantMonths} months is deleted, after a warning email ${v.dormantWarnDays} days before. Signing in once keeps it. Staff and Admin accounts are never deleted this way.`, why: "The owner asked for this. Keeping personal information longer than needed is a risk under the NDPA, and a warning email gives people a fair chance to keep their account.", lawyer: "Medium", where: "Privacy" },
  { id: "F5", topic: "Asking for, or deleting, your information", value: `We reply within ${v.rightsReplyDays} days. Deleting an account removes the sign-in and anonymises bookings; accounting figures stay.`, why: "Thirty days is a reasonable, firm promise. The financial records are kept because the law requires them.", lawyer: "Medium", where: "Privacy, Data Protection" },
  { id: "F6", topic: "Data breach", value: `Tell the Nigeria Data Protection Commission within ${v.breachHours} hours of becoming aware where the law requires, and tell affected people if they are at risk.`, why: "Seventy-two hours is the usual breach-reporting window and is a safe promise.", lawyer: "High", where: "Data Protection" },
  { id: "F7", topic: "Registration with the NDPC and a data protection officer", value: "The statement says we will register, appoint the person the law requires and meet any other duty when it applies to us. A contact person is named by phone and the Contact page.", why: "I do not know whether the Foundation's size triggers registration or an officer today, so the wording promises compliance without claiming either.", lawyer: "High", where: "Data Protection" },
  { id: "F8", topic: "Cookies", value: "A sign-in cookie, only when logged in, and the light or dark display setting. No advertising or tracking cookies. The old note about the announcement bar was removed because that bar is gone.", why: "This is what the site really sets.", lawyer: "Low", where: "Privacy" },
  { id: "F9", topic: "Staff access", value: "Authorised team members see what they need to run bookings. Staff and administrators use a second sign-in step and their actions are recorded.", why: "As built.", lawyer: "Low", where: "Privacy, Data Protection" },
  { id: "G1", topic: "Photos and video of young people", value: "Written permission from a parent or guardian for anyone under 18, and never with a full name, school or address.", why: "Builds on the existing Safeguarding Policy and adds that the permission is written.", lawyer: "Medium", where: "Safeguarding" },
  { id: "G2", topic: "Adults and other people's children", value: "Adults in the day space are not responsible for supervising other people's children, and we never leave a young person alone in a private space with one adult.", why: "Protects young people and adults alike.", lawyer: "Medium", where: "Safeguarding" },
  { id: "G3", topic: "Refusing entry for safety", value: "We may refuse entry or end a booking where a young person's safety is at risk.", why: "Safety overrides a booking.", lawyer: "Medium", where: "Safeguarding" },
];

export const questionAnswers: { n: number; question: string; answer: string }[] = [
  { n: 1, question: "NDPA registration and duties", answer: "The statement promises to register, appoint the required person and meet any duty when it applies (entry F7). Please tell us whether it applies now." },
  { n: 2, question: "Lawful basis for each use", answer: "Booking: carrying out the booking. Accounting: legal duty. Security, audit record, email log: legitimate interest. Overnight safety: legitimate interest and duty of care (entry F2)." },
  { n: 3, question: "Under 18s", answer: `Accounts are for ${v.accountMinAge} and over. Under 18s may use the day space when a parent or guardian books or agrees. Overnight is ${v.accountMinAge}+ only (entries A1 to A3, G1 to G3).` },
  { n: 4, question: "Transfers outside Nigeria", answer: "The real providers are named, only what is needed is shared, and we say information may be stored abroad (entry F3). Please advise whether more is needed, such as consent or provider agreements." },
  { n: 5, question: "Retention", answer: `12 months then anonymise; email log 12 months; accounting records ${v.accountingYears} years; team-action record ${v.auditYears} years (entry F4). Please confirm the statutory period.` },
  { n: 6, question: "Cancellation and refunds", answer: `24 hours for desks, 48 hours for monthly passes, ${v.refundWorkingDays} working days to refund, no refund for no-shows or after a pass starts unless we agree (entries C1 to C5).` },
  { n: 7, question: "Overnight terms", answer: "18+, in-person approval, no ID kept, we may end a stay that breaks the rules without refunding the unused part, private house rules (entries A3, C8, D2)." },
  { n: 8, question: "Staff access", answer: "Only authorised team members, second sign-in step for staff, actions recorded (entry F9)." },
  { n: 9, question: "Download and delete", answer: `We reply within ${v.rightsReplyDays} days. Deleting an account removes the sign-in and anonymises bookings; accounting figures stay (entry F5). The self-service download and delete buttons are not built yet; for now people ask us.` },
  { n: 10, question: "Governing law, complaints and contact", answer: `Nigerian law; complain to us first, we try to settle within ${v.rightsReplyDays} days; courts of ${v.courts}; people can also complain to the NDPC (entries E2, F5).` },
];

export const overnightHouseRulesStarter = [
  "You must be 18 or over, and you must be the person who was approved at our office.",
  "Arrive from the check-in time and leave by the check-out time shown on your booking.",
  "No visitors overnight. One approved guest per desk.",
  "Keep noise low, especially at night. Use headphones.",
  "No alcohol, illegal drugs, smoking, vaping, weapons or cooking in the space.",
  "Keep your belongings with you and secure. We are not responsible for lost or stolen items.",
  "Look after the equipment and the building. Tell us at once about any damage, fault or safety problem.",
  "Do not share the address, the door arrangements or any access details with anyone.",
  "Follow our team's instructions, including in an emergency. Know where the exits are.",
  "We may ask you to leave at once if these rules are broken or if it is not safe. No refund is due for the part of the stay not used.",
  "If you feel unsafe or worried about anyone, tell our team or call the police.",
];
