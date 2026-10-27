// All wording for the bank-transfer flow (M5): the customer's "I've paid", the
// staff Payments queue and Bookings pages, and the emails. No copy in components.

import { passAdminDetail } from "@/content/monthly";
import { requestsAdmin } from "@/content/overnight";

// ---------------------------------------------------------------- customer

export const claim = {
  heading: "Tell us you have paid",
  referenceLabel: "Transfer reference or the name on the account you paid from (optional)",
  referenceHelp: "This helps us find your payment. Do not type any account numbers.",
  button: "I've paid",
  pending: "Sending…",
  confirmNote: "Press this only after your transfer has gone through.",
  claimedHeading: "We are checking your payment",
  claimedText: "Thank you. Our team is checking the bank account and will confirm your booking soon. We will email you. Your desks stay held while we check.",
  yourReference: "What you told us",
  confirmedHeading: "Your booking is confirmed",
  confirmedText: "Thank you, your payment is confirmed. Please arrive on time.",
  studentReminder: "You booked at the student price. Please bring your student ID. Our team will ask to see it when you arrive.",
  rejectedHeading: "We could not accept this payment",
  rejectedWhy: "Reason",
  rejectedText: "Your desks have been released. If you think this is a mistake, please contact us and have your reference ready.",
  contactLine: "Contact us",
  contactHref: "/contact",
  cancelledText: "This booking was cancelled.",
  cancelledRefund: "A refund is owed to you. Our team will contact you to arrange it. Please do not send your bank details through this website.",
  noShowText: "This booking was marked as not attended.",
  notices: { claimed: "Thank you. We are checking your payment now." } as Record<string, string>,
  errors: {
    "cannot-claim": "This booking can no longer be marked as paid. Please contact us.",
    "reference-long": "That is too long. Please keep it under 120 characters.",
    "too-many": "Too many attempts. Please wait a few minutes.",
    failed: "That did not work. Please try again.",
  } as Record<string, string>,
};

// -------------------------------------------------------- staff and admin

export const staffNav = {
  payments: { label: "Payments", href: "/admin/payments", text: "Bookings where the customer says they have paid. Check the bank account, then confirm or reject." },
  bookings: { label: "Bookings", href: "/admin/bookings", text: "Find any booking by reference, name, phone or day, and manage it." },
  passes: { label: "Monthly passes", href: "/admin/passes", text: "Active and upcoming passes, the desks they hold, and passes ending soon." },
};

export const queue = {
  title: "Payments to check",
  heading: "Payments to check",
  text: "Oldest first. Look for the amount and the reference in the bank account, then confirm or reject.",
  empty: "Nothing to check. Every payment has been dealt with.",
  overdue: "Waiting too long",
  waitingSince: "Marked as paid",
  customer: "Customer",
  reference: "Their note",
  none: "(nothing typed)",
  expected: "Amount expected",
  received: "Amount that reached the bank (naira)",
  receivedHelp: "Leave as it is if the full amount arrived. Change it if less or more arrived.",
  confirm: "Confirm payment",
  confirming: "Confirming…",
  reject: "Reject",
  rejecting: "Rejecting…",
  rejectSummary: "Reject this payment",
  reasonLabel: "Reason (the customer will see this)",
  quickReasonsLabel: "Quick reasons (click one, then edit if you like)",
  quickReasons: [
    "The amount did not match what you owe.",
    "We could not find your transfer in our bank account.",
    "The reference you gave did not match any transfer.",
    "The transfer reached us after your hold ended and the desks were taken.",
    "We could not confirm the sender's name.",
  ],
  studentNote: "Student price. Check the student ID when they arrive.",
  viewBooking: "Open booking",
  notices: { confirmed: "Payment confirmed. The customer has been emailed.", rejected: "Payment rejected. The customer has been emailed." } as Record<string, string>,
  errors: {
    forbidden: "You are not allowed to do that.",
    "wrong-state": "This booking is no longer waiting for a decision. Please refresh the page.",
    reason: "Please give a reason (3 to 300 characters).",
    amount: "The amount is not valid. Use whole naira, for example 1500.",
    "too-many": "Too many attempts. Please wait a few minutes.",
    failed: "That did not work. Please try again.",
  } as Record<string, string>,
};

export const bookingsAdmin = {
  title: "Bookings",
  heading: "Bookings",
  text: "Every booking. Search by reference, name or phone number, or pick a day.",
  searchLabel: "Reference, name or phone",
  dayLabel: "Day",
  search: "Search",
  views: [
    { value: "", label: "Latest" },
    { value: "claimed", label: "Payment to check" },
    { value: "pending", label: "Waiting for payment" },
    { value: "confirmed", label: "Confirmed" },
    { value: "expired", label: "Expired" },
    { value: "passes", label: "Monthly passes" },
    { value: "requests", label: "Overnight requests" },
    { value: "refunds", label: "Refunds owed" },
  ],
  empty: "No bookings match.",
  limitNote: "Showing up to 50 bookings.",
  open: "Open",
  refundBadge: "Refund owed",
  refundedBadge: "Refunded",
  columns: { reference: "Reference", customer: "Customer", when: "When", status: "Status", amount: "Amount" },
};

export const bookingDetail = {
  title: "Booking",
  heading: "Booking",
  back: { label: "Back to bookings", href: "/admin/bookings" },
  customer: "Customer",
  phone: "Phone",
  reference: "Reference",
  when: "When",
  type: "Type",
  amount: "Amount",
  status: "Status",
  studentPrice: "Student price. Check the student ID when they arrive.",
  payment: "Payment",
  theirNote: "Their note",
  paidAt: "Marked as paid",
  confirmedAt: "Decided",
  receivedAmount: "Amount received",
  rejectedWhy: "Reason given",
  timeline: "What happened",
  timelineBy: { member: "Customer", staff: "Staff", admin: "Admin" } as Record<string, string>,
  system: "System",
  whatsapp: "Message on WhatsApp",
  actions: "Actions",
  cancelSummary: "Cancel this booking",
  cancelReason: "Reason (the customer will see this)",
  cancelButton: "Cancel booking",
  cancelPending: "Cancelling…",
  cancelRefundNote: "A confirmed booking that is cancelled becomes a refund owed.",
  noShow: "Mark as did not attend",
  noShowPending: "Saving…",
  reopen: "Re-open (the customer paid after the hold ended)",
  reopenPending: "Re-opening…",
  reopenHelp: "Works only if the desks are still free. The booking goes back to 'payment to check'.",
  refundHeading: "Refund",
  refundOwed: "A refund is owed on this booking. Collect the customer's account details by phone or WhatsApp, pay the refund by bank transfer, then record it here. Never type their account number on this website.",
  refundDone: "Refund recorded",
  refundNote: "Your transfer reference (optional)",
  refundButton: "Mark refund as paid",
  refundPending: "Saving…",
  refundAdminOnly: "Only an Admin can record a refund.",
  notices: {
    confirmed: "Payment confirmed. The customer has been emailed.",
    rejected: "Payment rejected. The customer has been emailed.",
    cancelled: "Booking cancelled. The customer has been emailed.",
    "no-show": "Marked as did not attend.",
    reopened: "Booking re-opened. It is now waiting for a payment check.",
    refunded: "Refund recorded.",
  } as Record<string, string>,
  errors: {
    forbidden: "You are not allowed to do that.",
    "wrong-state": "This booking cannot do that in its current state. Please refresh the page.",
    reason: "Please give a reason (3 to 300 characters).",
    unavailable: "The desks for that time are no longer free, so it cannot be re-opened.",
    passed: "That booking time has already passed.",
    "not-started": "That booking has not started yet.",
    amount: "The amount is not valid. Use whole naira, for example 1500.",
    note: "That note is too long (200 characters at most).",
    failed: "That did not work. Please try again.",
  } as Record<string, string>,
};

export const refundsPage = { empty: "No refunds are owed." };

export const whatsappMessage = (name: string, reference: string, amount: string, status: string) =>
  `Hello ${name}, this is Rafael Support Foundation about your booking ${reference} (${amount}). Status: ${status}.`;

// ------------------------------------------------------------------ emails

export const emails = {
  claimAck: {
    subject: (ref: string) => `We are checking your payment: ${ref}`,
    body: (name: string, ref: string, amount: string, url: string) =>
      `Hello ${name},\n\nThank you for letting us know you have paid for booking ${ref} (${amount}). Our team is checking the bank account and will confirm your booking soon. Your desks stay held while we check.\n\nYour booking:\n${url}\n\nRafael Support Foundation`,
  },
  staffNotice: {
    subject: (ref: string) => `Payment to check: ${ref}`,
    body: (ref: string, amount: string, url: string) =>
      `A customer says they have paid for booking ${ref} (${amount}).\n\nCheck the bank account for the amount and the reference, then confirm or reject here:\n${url}\n\nCustomer details are in the admin area, not in this email.`,
  },
  confirmed: {
    subject: (ref: string) => `Your booking is confirmed: ${ref}`,
    body: (name: string, ref: string, when: string, amount: string, url: string, student: boolean, note = "") =>
      `Hello ${name},\n\nYour payment is confirmed and your desk is booked at RSF Tech & Space.\n\nReference: ${ref}\nWhen: ${when}\nAmount paid: ${amount}\n${note ? `\n${note}\n` : ""}${student ? "\nYou booked at the student price. Please bring your student ID. Our team will ask to see it when you arrive.\n" : ""}\nYour booking:\n${url}\n\nRafael Support Foundation`,
  },
  rejected: {
    subject: (ref: string) => `We could not accept your payment: ${ref}`,
    body: (name: string, ref: string, reason: string, url: string, contactUrl: string) =>
      `Hello ${name},\n\nWe could not accept the payment for booking ${ref}.\n\nReason: ${reason}\n\nYour desks have been released. If you think this is a mistake, please contact us and have your reference ready:\n${contactUrl}\n\nYour booking:\n${url}\n\nRafael Support Foundation`,
  },
  cancelled: {
    subject: (ref: string) => `Your booking was cancelled: ${ref}`,
    body: (name: string, ref: string, reason: string, refund: boolean, url: string, contactUrl: string) =>
      `Hello ${name},\n\nOur team cancelled booking ${ref}.\n\nReason: ${reason}\n${refund ? "\nBecause your payment had been confirmed, a refund is owed to you. Our team will contact you to arrange it. Please do not send your bank details by email or through the website.\n" : ""}\nIf you have questions, please contact us:\n${contactUrl}\n\nYour booking:\n${url}\n\nRafael Support Foundation`,
  },
};

// Messages for every staff action form (the queue and the booking page share them).
export const actionNotices: Record<string, string> = { ...queue.notices, ...bookingDetail.notices, ...passAdminDetail.notices, ...requestsAdmin.notices };
export const actionErrors: Record<string, string> = { ...queue.errors, ...bookingDetail.errors, ...passAdminDetail.errors, ...requestsAdmin.errors };
