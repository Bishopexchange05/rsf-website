// All wording for the overnight workspace (M7): the request page, the booking page
// states, the Staff and Admin screens and the emails. No copy in components.
//
// The private address and house rules are never written here. They come from the
// database, only for the owner of a confirmed overnight booking.

// ---------------------------------------------------------------- member

export const overnight = {
  title: "Request an overnight desk",
  label: "RSF Tech & Space",
  heading: "Request an overnight desk",
  text: "Overnight desks are for people aged 18 or over. We meet you at the office first, and then you pay by bank transfer. We never ask you to upload an ID.",
  steps: {
    heading: "How it works",
    list: [
      "Choose your nights and send a request. This holds a desk for you for a few days.",
      "Come to the office to meet our team. Your ID is checked there, in person. It is never uploaded or stored on this website.",
      "When we approve your request, you pay by bank transfer.",
      "Once your payment is confirmed, we show you the address and house rules in your account and by email.",
    ],
  },
  checkinLabel: "First night (check-in date)",
  nightsLabel: "Number of nights",
  check: "Check these nights",
  nightsHelp: (max: number) => `Up to ${max} night${max === 1 ? "" : "s"} at a time.`,
  times: (checkin: string, checkout: string) => `Check-in is at ${checkin}. Check-out is at ${checkout} on the last morning.`,
  runs: (range: string) => `Your stay: ${range}.`,
  price: (perNight: string, total: string, nights: number) => `${perNight} per night, ${total} for ${nights} night${nights === 1 ? "" : "s"}.`,
  priceContact: "Contact us for pricing",
  contactHref: "/contact",
  available: "A desk is free on every one of these nights.",
  full: (date: string) => `There is no free desk on ${date}. Please choose other nights.`,
  closed: "Overnight requests are not open yet.",
  outside: "Please choose a date and number of nights within the limits shown.",
  age: {
    label: "I am 18 or over",
    help: "You must be 18 or over. Our team will check your ID at the office. Do not send or upload any ID.",
  },
  submit: "Send my request",
  expiryNote: (days: number) => `If we do not answer within ${days} day${days === 1 ? "" : "s"}, the request expires and the desk is released.`,
  cardOnBook: {
    heading: "Overnight desk",
    text: "For people aged 18 or over. We approve you in person first, then you pay.",
    link: "Request an overnight desk",
    href: "/book/overnight",
  },
  back: { label: "Back to Book a desk", href: "/book" },
};

export const overnightBooking = {
  kind: "Overnight",
  nights: (n: number) => `${n} night${n === 1 ? "" : "s"}`,
  checkin: "Check-in",
  checkout: "Check-out",
  waiting: {
    heading: "Your request is waiting for approval",
    text: "Please come to the office to meet our team. We check your ID there, in person. We never ask you to send or upload it. A desk is held for you until the date below.",
    heldUntil: "Held until",
    contact: "Message us on WhatsApp",
  },
  approvedNote: "Your request is approved. Please pay before the timer ends to keep your desks.",
  rejected: {
    heading: "We could not approve this request",
    reason: "Reason",
    text: "Your desks have been released. If you think this is a mistake, please contact us.",
  },
  expired: "This request ran out of time and the desks were released. You are welcome to send a new request.",
  details: {
    heading: "Your address and house rules",
    intro: "Thank you, your payment is confirmed. Please keep this to yourself.",
    location: "Address",
    rules: "House rules",
    times: (checkin: string, checkout: string) => `Check-in ${checkin}. Check-out ${checkout}.`,
  },
  notices: {
    requested: "Your request was sent. Please come to the office to meet our team.",
  } as Record<string, string>,
};

export const overnightErrors: Record<string, string> = {
  "under-age": "You must be 18 or over to request an overnight desk.",
  "too-many-nights": "That is more nights than we allow at a time. Please choose fewer nights.",
  "request-waiting": "You already have a request waiting for approval. Please wait for our answer, or cancel it first.",
};

// ------------------------------------------------------- Staff and Admin

export const requestsAdmin = {
  title: "Overnight requests",
  heading: "Overnight requests",
  text: "People who asked for an overnight desk. Meet them at the office and check their ID in person. Never ask them to send an ID to the website. Then approve or reject.",
  nav: { label: "Overnight requests", href: "/admin/overnight", text: "Requests waiting for you to meet the person and approve or reject." },
  empty: "No requests are waiting.",
  customer: "Person",
  stay: "Stay",
  nights: "Nights",
  amount: "Price for the stay",
  confirmedAge: "Confirmed they are 18 or over",
  requested: "Requested",
  expires: "Held until",
  expiresSoon: "Expires soon",
  approve: "Approve",
  approving: "Approving…",
  approveHelp: "Press this after you have met the person and checked their ID in person. They are then asked to pay.",
  reject: "Reject",
  rejecting: "Rejecting…",
  rejectSummary: "Reject this request",
  reasonLabel: "Reason (the person will see this)",
  quickReasonsLabel: "Quick reasons (click one, then edit if you like)",
  quickReasons: [
    "We could not meet you at the office, so we could not approve this request.",
    "We could not verify your ID in person.",
    "You must be 18 or over to stay overnight.",
    "The room is not available for those nights after all.",
  ],
  open: "Open booking",
  whatsapp: "Message on WhatsApp",
  recent: "Recently decided",
  notices: {
    approved: "Request approved. The person has been emailed and can now pay.",
    "request-rejected": "Request rejected. The person has been emailed.",
  } as Record<string, string>,
  errors: {
    "request-expired": "This request has expired. Ask the person to make a new request.",
  } as Record<string, string>,
  detail: {
    age: "18 or over confirmed on",
    approvedAt: "Approved on",
  },
};

export const requestWhatsappMessage = (name: string, reference: string) =>
  `Hello ${name}, this is Rafael Support Foundation about your overnight request ${reference}.`;

// ------------------------------------------------------------------ emails

export const overnightEmails = {
  requested: {
    subject: (ref: string) => `We received your overnight request: ${ref}`,
    body: (name: string, ref: string, when: string, until: string, whatsapp: string, hours: string, url: string) =>
      `Hello ${name},\n\nThank you for your request for an overnight desk at RSF Tech & Space.\n\nReference: ${ref}\nStay: ${when}\n\nThe next step is to come and meet us at the office. We check your ID there, in person. Please do not send or upload an ID to the website or by email.\n\nWhen you can visit: ${hours}\nTo arrange a time, message us on WhatsApp: ${whatsapp}\n\nWe are holding a desk for you until ${until}. If you have not been to see us by then, the request expires and the desk is released.\n\nYour request:\n${url}\n\nRafael Support Foundation`,
  },
  staffNotice: {
    subject: (ref: string) => `Overnight request to review: ${ref}`,
    body: (ref: string, when: string, url: string) =>
      `A member has requested an overnight desk (${ref}, ${when}).\n\nMeet them at the office, check their ID in person, then approve or reject here:\n${url}\n\nPersonal details are in the admin area, not in this email.`,
  },
  approved: {
    subject: (ref: string) => `Your overnight request is approved: ${ref}`,
    body: (name: string, ref: string, when: string, amount: string, url: string) =>
      `Hello ${name},\n\nThank you for visiting us. Your overnight request is approved.\n\nReference: ${ref}\nStay: ${when}\nAmount: ${amount}\n\nThe next step is to pay by bank transfer. The bank details and a timer are on your booking page:\n${url}\n\nUse the reference as the transfer description. Once your payment is confirmed, we will show you the address and house rules.\n\nRafael Support Foundation`,
  },
  rejected: {
    subject: (ref: string) => `We could not approve your overnight request: ${ref}`,
    body: (name: string, ref: string, reason: string, contactUrl: string) =>
      `Hello ${name},\n\nWe could not approve your overnight request ${ref}.\n\nReason: ${reason}\n\nYour desks have been released. If you think this is a mistake, please contact us:\n${contactUrl}\n\nRafael Support Foundation`,
  },
  // Added to the "booking confirmed" email of an overnight booking, only after payment is confirmed.
  confirmedDetails: (location: string, rules: string, checkin: string, checkout: string) =>
    `Your address and house rules\n\nAddress: ${location || "We will share it with you in person."}\n${rules ? `\nHouse rules:\n${rules}\n` : ""}\nCheck-in ${checkin}. Check-out ${checkout}.\n\nPlease keep this to yourself.`,
};
