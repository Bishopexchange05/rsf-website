// Shared rules for showing a member's own bookings (Overview and My bookings).

export type MyBooking = {
  id: string;
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  amount_kobo: number;
  hold_expires_at: string | null;
};

export const MY_BOOKING_COLUMNS = "id, reference, kind, starts_at, ends_at, status, amount_kobo, hold_expires_at";

// States in which a booking is still going ahead.
const ACTIVE = ["pending_payment", "payment_claimed", "pending_approval", "approved", "confirmed"];

// An unpaid hold that has run out shows as Expired straight away.
export function shownStatus(b: MyBooking, now: number): string {
  const lapsed = b.status === "pending_payment" && !!b.hold_expires_at && new Date(b.hold_expires_at).getTime() <= now;
  return lapsed ? "expired" : b.status;
}

// Still going ahead and not yet over.
export function isUpcoming(b: MyBooking, now: number): boolean {
  return ACTIVE.includes(shownStatus(b, now)) && new Date(b.ends_at).getTime() > now;
}

// Upcoming soonest first; everything else newest first.
export function splitBookings(rows: MyBooking[], now: number): { upcoming: MyBooking[]; past: MyBooking[] } {
  const upcoming = rows.filter((b) => isUpcoming(b, now)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = rows.filter((b) => !isUpcoming(b, now)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, past };
}

// Waiting for this member to pay, with time still left on the hold.
export function needsPayment(b: MyBooking, now: number): boolean {
  return shownStatus(b, now) === "pending_payment" && !!b.hold_expires_at;
}
