// All wording for booking a day desk (M4). Components never hardcode copy.

export const errors: Record<string, string> = {
  "not-open": "Booking is not open yet.",
  "verify-email": "Please verify your email before booking.",
  window: "That date is outside the days you can book.",
  closed: "We are closed on that day.",
  unavailable: "Sorry, that time is no longer available. Please choose another.",
  "too-many-unpaid": "You already have the most unpaid bookings allowed. Please pay for one, or cancel it, first.",
  "price-not-set": "That option is not available to book online. Please contact us for pricing.",
  overlap: "You already have a booking at that time.",
  "pass-overlap": "You already have a booking during those dates. Cancel it first, or choose another start date.",
  "pass-full": "Monthly passes are fully booked for that start date. Please choose another start date.",
  "pass-hours": "The desks are not all free for the whole pass from that date. Please choose another start date.",
  "pass-covers": "Your monthly pass already covers this day.",
  "renew-early": "Renewal is not open yet. Please try again nearer the end of your pass.",
  past: "That time is too soon or already past. Please choose a later time.",
  invalid: "Please check your choices and try again.",
  "too-late": "It is too late to cancel this online. Please contact us.",
  "cannot-cancel": "This booking cannot be cancelled online. Please contact us.",
  "too-many": "Too many attempts. Please wait a few minutes and try again.",
  forbidden: "You cannot book with this account.",
  failed: "That did not work. Please try again.",
};

export const notices: Record<string, string> = {
  created: "Your desk is held. Pay before the timer ends to keep it.",
  renewed: "Your new pass is held. Pay before the timer ends to keep it.",
  cancelled: "Your booking was cancelled.",
};

export const bookPage = {
  title: "Book a desk",
  label: "RSF Tech & Space",
  heading: "Book a desk",
  text: "Choose a day, then the hours you need. We hold your desk while you pay by bank transfer.",
  dateLabel: "Choose a day",
  dateButton: "Show times",
  closedDay: "We are closed on that day. Please choose another day.",
  nothingToBook: "There is nothing to book on that day.",
  hourly: {
    heading: "By the hour",
    pickLegend: "Choose your hours",
    pickStart: (max: number) => `Click the first hour you want. You can book up to ${max} hours in a row.`,
    pickEnd: "Now click the last hour you want. Every hour in between is included. Or press Book to take just this one hour.",
    nothingYet: "No hours chosen yet.",
    summary: (from: string, to: string, hours: number, price: string) =>
      `${from} to ${to}, ${hours === 1 ? "1 hour" : `${hours} hours`}, ${price}`,
    notAvailableHere: "Not available for this choice.",
    clear: "Clear",
    submit: "Book these hours",
    left: (n: number) => (n === 1 ? "1 desk left" : `${n} desks left`),
    full: "Full",
    passed: "Passed",
  },
  half: {
    heading: "Half day",
    morning: "Morning",
    afternoon: "Afternoon",
    unavailable: "Not available",
  },
  full: {
    heading: "Full day",
    submit: "Book the full day",
    unavailable: "Not available (full or already started)",
  },
  student: {
    label: "I am a student",
    help: "You pay the student price. Please bring your student ID. Our team checks it when you arrive.",
  },
  prices: {
    perHour: (price: string) => `${price} per hour`,
    studentPerHour: (price: string) => `Student: ${price} per hour`,
    studentFlat: (price: string) => `Student: ${price}`,
    contact: "Contact us for pricing",
  },
  contactHref: "/contact",
  accountLink: { label: "My bookings", href: "/account/bookings" },
};

export const myBookings = {
  title: "My bookings",
  heading: "My bookings",
  text: "Your desk bookings at RSF Tech & Space.",
  empty: "You have no bookings yet.",
  bookNow: { label: "Book a desk", href: "/book" },
  view: "View",
  statuses: {
    pending_payment: "Waiting for payment",
    payment_claimed: "Payment being checked",
    confirmed: "Confirmed",
    rejected: "Not accepted",
    cancelled: "Cancelled",
    expired: "Expired",
    completed: "Completed",
    no_show: "Did not attend",
    pending_approval: "Waiting for approval",
    approved: "Approved",
  } as Record<string, string>,
  kinds: { hour: "By the hour", half_day: "Half day", day: "Full day", month: "Monthly pass" } as Record<string, string>,
};

export const bookingPage = {
  title: "Your booking",
  heading: "Your booking",
  reference: "Reference",
  when: "When",
  type: "Type",
  amount: "Amount",
  studentPrice: "Student price. Please bring your student ID.",
  status: "Status",
  back: { label: "Back to my bookings", href: "/account/bookings" },
  pay: {
    heading: "How to pay",
    intro: "Make a bank transfer for the exact amount. Use your reference as the transfer description so we can find your payment.",
    bank: "Bank",
    accountNumber: "Account number",
    accountName: "Account name",
    referenceHint: "Use this as the transfer description",
    timeLeft: "Time left to pay",
    expired: "This hold has ended. Your desk was released.",
    noBank: "Bank details are not available yet. Please contact us.",
    next: "After you pay, our team will confirm your booking. A button to tell us you have paid is coming soon.",
  },
  cancel: {
    button: "Cancel this booking",
    help: "Cancelling an unpaid booking frees your desk straight away.",
    confirmedHelp: "You can cancel a confirmed booking until the cutoff time. Refunds are handled by our team.",
  },
  email: {
    subject: (ref: string) => `Your desk is held: ${ref}`,
    body: (name: string, ref: string, when: string, amount: string, until: string, url: string, note = "") =>
      `Hello ${name},\n\nWe are holding a desk for you at RSF Tech & Space.\n\nReference: ${ref}\nWhen: ${when}\nAmount: ${amount}\nPay before: ${until}\n${note ? `\n${note}\n` : ""}\nThe bank details and a timer are on your booking page:\n${url}\n\nUse the reference as the transfer description. If you do not pay in time, the desk is released automatically.\n\nRafael Support Foundation`,
  },
};
