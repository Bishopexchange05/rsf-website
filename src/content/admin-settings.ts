// Wording for the admin settings pages and the public hours-and-prices block (M3).

export const settingsHub = {
  title: "Settings",
  heading: "Settings",
  text: "Change hours, prices, desks and rules here. Every change is saved straight away and recorded in the audit log.",
  switchHeading: "Booking switch",
  switchOffText: "Booking is OFF. The public site shows no hours or prices from here, and nobody can book.",
  switchOnText: "Booking is ON. The public site shows opening hours, desks and the prices you have set.",
  turnOn: "Turn booking on",
  turnOnAnyway: "Turn booking on anyway",
  turnOff: "Turn booking off",
  turnOnHelp: "You need to enter the bank details first.",
  sections: [
    { href: "/admin/settings/hours", label: "Opening hours", text: "Opening and closing time for each weekday, and closed days." },
    { href: "/admin/settings/capacity", label: "Desks", text: "How many day desks and overnight desks there are." },
    { href: "/admin/settings/pricing", label: "Prices", text: "Standard and student prices. A blank price shows as Contact us for pricing." },
    { href: "/admin/settings/rules", label: "Booking rules", text: "How long a booking is held, how far ahead people can book, monthly pass rules." },
    { href: "/admin/settings/overnight", label: "Overnight details", text: "Check-in times, house rules and the private location." },
    { href: "/admin/settings/bank", label: "Bank details", text: "Where customers send their transfer." },
  ],
  back: { label: "Back to Settings", href: "/admin/settings" },
};

export const notices: Record<string, string> = {
  saved: "Saved.",
  "booking-on": "Booking is now ON.",
  "booking-off": "Booking is now OFF.",
  "legal-marked": "Lawyer review marked as done.",
  "legal-unmarked": "Lawyer review mark removed.",
};

export const errors: Record<string, string> = {
  forbidden: "You are not allowed to do that.",
  invalid: "Please check the values and try again.",
  price: "A price must be a whole number of naira, for example 1500, or left blank.",
  "student-higher": "A student price cannot be higher than the standard price for the same option.",
  time: "Enter times like 08:00. Each open day needs an opening time earlier than its closing time.",
  number: "One of the numbers is empty, not a whole number, or outside its allowed range.",
  "cap-too-high": "The monthly pass desk cap cannot be more than the number of day desks.",
  "desks-below-cap": "Day desks cannot be fewer than the monthly pass desk cap. Lower the cap first.",
  "account-number": "The account number must be exactly 10 digits.",
  "bank-first": "Enter the bank details before turning booking on.",
  failed: "That did not work. Please try again.",
};

export const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const hoursPage = {
  title: "Opening hours",
  heading: "Opening hours",
  text: "Times are Nigerian time. Tick Closed for days the workspace does not open.",
  closed: "Closed",
  opens: "Opens",
  closes: "Closes",
  save: "Save hours",
};

export const capacityPage = {
  title: "Desks",
  heading: "Desks",
  text: "These numbers set how many people can book at the same time.",
  dayLabel: "Day desks",
  dayHelp: "Desks available in each hour.",
  overnightLabel: "Overnight desks",
  overnightHelp: "People who can stay at the same time.",
  bookable: "Open for booking",
  lowerWarning: "Lowering a number never cancels bookings people already have. It only limits new ones.",
  save: "Save",
};

export const pricingPage = {
  title: "Prices",
  heading: "Prices",
  text: "Whole naira only. Leave a price blank if it is not decided.",
  rulesHeading: "What blank means",
  rules: [
    "A blank hour, day or month price (and a blank overnight night price) shows Contact us for pricing and cannot be booked online.",
    "A blank half-day price hides that option completely.",
    "A blank student price means there is no student rate for that option.",
    "A student price can never be higher than the standard price. Students pay by bank transfer like everyone else, and staff check student status in person on arrival.",
    "A student price is used and shown only when the matching standard price is set. With the standard price blank, nobody can book that option online.",
  ],
  groups: [
    {
      heading: "Day workspace",
      rows: [
        { space: "day", kind: "hour", audience: "standard", label: "Per hour" },
        { space: "day", kind: "half_day", audience: "standard", label: "Half day (optional)" },
        { space: "day", kind: "day", audience: "standard", label: "Per day" },
        { space: "day", kind: "month", audience: "standard", label: "Per month (30 calendar days)" },
      ],
    },
    {
      heading: "Day workspace, student prices",
      rows: [
        { space: "day", kind: "hour", audience: "student", label: "Student, per hour" },
        { space: "day", kind: "day", audience: "student", label: "Student, per day" },
        { space: "day", kind: "month", audience: "student", label: "Student, per month" },
      ],
    },
    {
      heading: "Overnight workspace",
      rows: [
        { space: "overnight", kind: "night", audience: "standard", label: "Per night" },
      ],
    },
  ],
  currency: "₦",
  save: "Save prices",
};

export const rulesPage = {
  title: "Booking rules",
  heading: "Booking rules",
  text: "How bookings behave. The defaults are sensible; change them when you need to.",
  fields: [
    { name: "hold_minutes", label: "Hold time (minutes)", help: "How long an unpaid booking keeps its desks. 15 to 1440.", min: 15, max: 1440 },
    { name: "claimed_review_hours", label: "Review reminder (hours)", help: "How long a booking marked paid can wait before it is flagged as overdue for review.", min: 1, max: 720 },
    { name: "advance_booking_days", label: "Book up to this many days ahead", help: "1 to 365.", min: 1, max: 365 },
    { name: "max_hours_per_booking", label: "Longest single booking (hours)", help: "1 to 14.", min: 1, max: 14 },
    { name: "max_unpaid_bookings", label: "Most unpaid bookings one person can hold at once", help: "Stops one person tying up desks without paying. 1 to 20.", min: 1, max: 20 },
    { name: "cancellation_cutoff_hours", label: "Self-cancel until this many hours before", help: "For hourly, half-day and day bookings. 0 to 720.", min: 0, max: 720 },
    { name: "monthly_pass_days", label: "Monthly pass length (calendar days)", help: "Closed days such as Sundays still count. 7 to 366.", min: 7, max: 366 },
    { name: "monthly_pass_max_desks", label: "Most desks monthly passes can hold at once", help: "So hourly and daily customers always have desks. Cannot be more than the day desks.", min: 0, max: 1000 },
    { name: "monthly_start_window_days", label: "Monthly pass can start up to this many days ahead", help: "0 to 90.", min: 0, max: 90 },
    { name: "monthly_self_cancel_cutoff_hours", label: "Cancel a monthly pass until this many hours before its start", help: "0 to 720.", min: 0, max: 720 },
    { name: "overnight_max_nights", label: "Longest single overnight booking (nights)", help: "1 to 60.", min: 1, max: 60 },
    { name: "overnight_pay_hours", label: "After an overnight request is approved, the person has this many hours to pay", help: "Longer than the normal hold, because they have just visited the office. 1 to 168.", min: 1, max: 168 },
    { name: "overnight_request_expiry_days", label: "Overnight requests wait this many days for the team", help: "If nobody answers in this time, the request expires and its desks are released. 1 to 30.", min: 1, max: 30 },
  ],
  monthlyHeading: "Monthly pass",
  monthlyExplain: (days: number, maxDesks: number) =>
    `A monthly pass reserves one desk for one person for ${days} days in a row, starting on a date they choose. They pay once. Sundays and other closed days still count towards the ${days} days. Monthly passes can use at most ${maxDesks} desks at the same time, so hourly and daily visitors always have desks.`,
  overnightHeading: "Overnight",
  halfDayLabel: "Half day splits at",
  halfDayHelp: "Morning is opening time to this time. Afternoon is this time to closing.",
  verifiedEmailLabel: "People must verify their email before booking",
  verifiedEmailHelp: "Turn this off only in an emergency (for example if email stops working). Staff then confirm by phone or WhatsApp.",
  save: "Save rules",
};

export const overnightPage = {
  title: "Overnight details",
  heading: "Overnight details",
  text: "Private. The address and house rules are never shown on the public website. They are shown only to a member whose overnight booking is confirmed (approved and payment confirmed), on their booking page and in their confirmation email.",
  checkin: "Check-in time",
  checkout: "Check-out time",
  location: "Location (private)",
  locationHelp: "Address and directions. Up to 500 characters.",
  rules: "House rules",
  rulesHelp: "Shown only to a member whose overnight booking is confirmed. Up to 2000 characters.",
  save: "Save overnight details",
};

export const bankPage = {
  title: "Bank details",
  heading: "Bank details",
  text: "Customers see these only after they make a booking. Changing them emails you a notice, so a hijacked account cannot quietly redirect payments.",
  bankName: "Bank name",
  accountNumber: "Account number (10 digits)",
  accountName: "Account name",
  note: "Note for customers (optional)",
  save: "Save bank details",
  emailSubject: "Bank details changed on the Rafael Support Foundation website",
  emailBody: (who: string, when: string) =>
    `The bank details shown to customers were changed by ${who} at ${when} (Nigerian time).\n\nIf you did not expect this, sign in to the admin area, check the Audit log, and change the details back. If you do not recognise the change, reset the Admin's password and two-step verification straight away.\n\nThe new account number is not included in this email.`,
};

// Public block on the Tech & Space page (only when booking is switched on).
export const publicInfo = {
  heading: "Hours and prices",
  hoursHeading: "Opening hours",
  closed: "Closed",
  desksText: (n: number) => `${n} day desks.`,
  pricesHeading: "Prices",
  contactForPricing: "Contact us for pricing",
  contactLink: { label: "Contact us", href: "/contact" },
  perHour: "Per hour",
  halfDay: "Half day",
  perDay: "Per day",
  perMonth: (days: number) => `Monthly pass (${days} calendar days from your start date)`,
  monthNote: (days: number) => `A monthly pass runs for ${days} calendar days from your start date. Sundays and other closed days still count.`,
  student: "Student price",
  studentNote: "Students pay the student price and show their student ID to our team when they arrive.",
  perNight: "Overnight, per night",
  overnightNote: "Overnight stays are for people 18 or over and are approved in person first.",
  book: { label: "Book a desk", href: "/book" },
  halfDayNote: (split: string) => `Half day: morning until ${split}, or afternoon from ${split}.`,
};

// The launch checklist: advice only, never a lock. The Admin decides when booking goes live.
export const readiness = {
  heading: "Before you switch booking on",
  intro:
    "A reminder, not a lock. You decide when booking goes live, and you can switch it on at any time. The only thing that stops it is missing bank details.",
  allGood: "Everything on the checklist looks ready.",
  ready: "Ready",
  notReady: "Not ready",
  items: {
    email: {
      label: "Emails come from your own domain",
      ok: "Emails are sent through Resend from your own domain.",
      warn: "Emails still go out through the temporary Gmail connection. Gmail-sent emails can land in spam at Yahoo and Outlook, so some people may not see them. To fix it, verify your domain with Resend and switch the email setting. (This check sees how the site is set up, not whether your domain records have been verified.)",
    },
    legal: {
      label: "Lawyer review done",
      ok: (date: string) => `Marked as done on ${date}.`,
      warn: "The lawyer's review of the privacy, terms and booking wording is not marked as done.",
      mark: "Mark lawyer review as done",
      unmark: "Remove the mark",
    },
    production: {
      label: "This is the live production site",
      ok: "This is the production site.",
      warn: "This looks like a test copy of the site (a preview or your own computer), so it may not be using your production Supabase project. Real customers should use the production site and its own database. (The site can only guess this from where it is running.)",
    },
  },
};
