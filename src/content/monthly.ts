// All wording for the monthly desk pass (M6): the member's booking card, the pass on
// the booking page, and the Admin and Staff screens. No copy in components.

// ---------------------------------------------------------------- member

export const pass = {
  heading: "Monthly pass",
  intro: (days: number) =>
    `One desk for ${days} calendar days in a row, from the start date you choose. Sundays and other closed days still count towards the ${days} days.`,
  anyDesk: "It is a desk, not a named desk. Sit at any free desk when you arrive. Our team finds your pass by your name or reference.",
  priceLine: (price: string) => `${price} for the whole pass`,
  studentLine: (price: string) => `Student: ${price} for the whole pass`,
  startLabel: "Start date",
  startButton: "Check this date",
  runs: (range: string) => `Your pass would run: ${range}.`,
  available: "A pass is available from this date.",
  fullCap: "Monthly passes are fully booked for this start date.",
  fullHours: "The desks are not all free for the whole pass from this date.",
  outside: "Please choose a start date within the days you can book.",
  next: (date: string) => `The next start date you can book is ${date}.`,
  nextLink: "Choose that date",
  none: "No other start date is free in the days you can book. Please check again later, or contact us.",
  book: "Book this pass",
  coversDay: "Your monthly pass covers this day, so there is nothing more to book for it. Your desk is waiting for you.",
  contact: "Contact us for pricing",
  contactHref: "/contact",
};

export const passBooking = {
  kind: "Monthly pass",
  dates: "Pass dates",
  length: (days: number) => `${days} calendar days. Sundays and other closed days still count.`,
  anyDesk: "Sit at any free desk when you arrive. Our team finds your pass by your name or reference.",
  extended: (days: number) => `Extended by ${days} day${days === 1 ? "" : "s"}.`,
  moved: "If we confirm your payment after your start date, your pass starts on the day we confirm it, so you do not pay for days you could not use.",
  cancelConfirmed: (hours: number | null) =>
    hours === null
      ? "You can cancel a confirmed pass until shortly before it starts. Refunds are handled by our team."
      : `You can cancel a confirmed pass until ${hours} hours before its start date. Refunds are handled by our team. After the start date, please contact us.`,
  renew: {
    heading: "Renew your pass",
    text: "Your pass ends soon. Renewing books a new pass that starts the day this one ends. Desks are checked again when you renew, so please renew before someone else takes the place.",
    button: "Renew this pass",
    pending: "Renewing…",
  },
  notices: { renewed: "Your new pass is held. Pay before the timer ends to keep it." } as Record<string, string>,
  errors: {
    "renew-early": "Renewal is not open yet. Please try again nearer the end of your pass.",
  } as Record<string, string>,
};

export const passEmailNote = (days: number) =>
  `This is a monthly pass: ${days} calendar days from the start date. Sundays and other closed days still count. Sit at any free desk when you arrive. Our team finds your pass by your name or reference.`;

// ------------------------------------------------------- Staff and Admin

export const passesAdmin = {
  title: "Monthly passes",
  heading: "Monthly passes",
  text: "Active and upcoming passes, how many desks they hold, and passes that end soon.",
  desksToday: (n: number, cap: number) => `Desks held by passes today: ${n} of ${cap} allowed`,
  desksBusiest: (n: number, cap: number, day: string) => `Busiest day in the next 14 days: ${n} of ${cap} (${day})`,
  overfill: (n: number) =>
    `${n} hour${n === 1 ? "" : "s"} from now on ${n === 1 ? "has" : "have"} more bookings than desks. This can happen after a pass is extended or the opening hours change. Please check the Bookings page and contact the people affected.`,
  groups: {
    active: "Active now",
    soon: "Starting soon",
    waiting: "Waiting for payment or a payment check",
  },
  empty: "No passes in this group.",
  endsIn: (days: number) => (days <= 0 ? "Ends today" : days === 1 ? "Ends tomorrow" : `Ends in ${days} days`),
  endingSoon: "Ending soon",
  extended: (n: number) => `Extended by ${n} day${n === 1 ? "" : "s"}`,
  open: "Open",
  refunds: "Refunds owed",
  card: { label: "Monthly passes", href: "/admin/passes", text: "Active and upcoming passes, the desks they hold, and passes ending soon." },
};

export const passAdminDetail = {
  late: (oldStart: string, newStart: string) =>
    `This pass was meant to start on ${oldStart}. If you confirm now, it starts on ${newStart} (today) and keeps its full length.`,
  keepDates: "Keep the original dates (Admin only)",
  keepReason: "Why are you keeping the original dates?",
  extendSummary: "Extend this pass",
  extendHelp: "Adds days to the end of the pass, for example after an unexpected closure. The customer is not emailed, so please tell them.",
  extendDays: "Days to add (1 to 60)",
  extendReason: "Reason (saved in the audit log)",
  extendButton: "Extend pass",
  extendPending: "Extending…",
  cancelPassSummary: "Cancel this pass with a partial refund (Admin only)",
  cancelPassHelp: "For a pass that has already started. Enter how much of the price you are refunding, up to the full price. Leave it empty for no refund.",
  cancelPassRefund: "Refund amount (naira)",
  cancelPassReason: "Reason (the customer will see this)",
  cancelPassButton: "Cancel pass",
  cancelPassPending: "Cancelling…",
  staffStarted: "This pass has started. Only an Admin can cancel it, with a partial refund.",
  refundAmount: "Refund amount owed",
  extendedBy: (n: number) => `Extended by ${n} day${n === 1 ? "" : "s"}`,
  notices: {
    extended: "Pass extended.",
    "pass-cancelled": "Pass cancelled. The customer has been emailed.",
  } as Record<string, string>,
  errors: {
    "shift-blocked": "The desks are not free for the moved dates. An Admin can keep the original dates, or you can cancel the booking.",
    "pass-started": "This pass has started. Only an Admin can cancel it, with a partial refund.",
    days: "Please enter a whole number of days from 1 to 60.",
  } as Record<string, string>,
};
