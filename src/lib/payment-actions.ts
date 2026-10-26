"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole, requireUser } from "@/lib/auth";
import { sendLoggedEmail } from "@/lib/email/log";
import { bookingWhen } from "@/lib/lagos";
import { limited } from "@/lib/rate-limit-db";
import { formatNaira, nairaToKobo } from "@/lib/settings-validation";
import { getSiteOrigin } from "@/lib/site-origin";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { passEmailNote } from "@/content/monthly";
import { emails } from "@/content/payments";

// The bank-transfer actions. Customers say "I've paid"; Staff and Admin confirm or
// reject, cancel, mark no-show or re-open; Admin records refunds. Every action checks
// the role here and again inside the database function (which also writes the audit
// log). Results come back in place as short codes; the forms turn them into wording.

const HOUR = 60 * 60 * 1000;
const UUID = /^[0-9a-fA-F-]{36}$/;

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

type DbError = { code?: string; message?: string };

function memberError(error: DbError): string {
  if (error.code === "42501") return "forbidden";
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("no longer be marked as paid")) return "cannot-claim";
  if (m.includes("too long")) return "reference-long";
  return "failed";
}

function staffError(error: DbError): string {
  if (error.code === "42501") return "forbidden";
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("only a booking") || m.includes("only a confirmed") || m.includes("only an expired") || m.includes("cannot be cancelled") || m.includes("no refund is owed")) return "wrong-state";
  if (m.includes("give a reason")) return "reason";
  if (m.includes("no longer available")) return "unavailable";
  if (m.includes("already passed")) return "passed";
  if (m.includes("not started")) return "not-started";
  if (m.includes("amount received") || m.includes("refund amount")) return "amount";
  if (m.includes("moved dates")) return "shift-blocked";
  if (m.includes("pass has started")) return "pass-started";
  if (m.includes("number of days")) return "days";
  if (m.includes("note is too long")) return "note";
  return "failed";
}

// The customer's email address and name, for the notification. (Staff cannot read
// email addresses, so this uses the server key; nothing is shown to Staff.)
async function customerFor(userId: string | null): Promise<{ email: string | null; name: string }> {
  if (!userId || !adminConfigured()) return { email: null, name: "there" };
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    return { email: data.user?.email ?? null, name: profile?.full_name ?? "there" };
  } catch {
    return { email: null, name: "there" };
  }
}

type BookingRow = {
  id: string;
  reference: string;
  kind: string;
  user_id: string | null;
  starts_at: string;
  ends_at: string;
  amount_kobo: number;
  is_student_price: boolean;
  status: string;
  cancel_reason: string | null;
  refund_owed: boolean;
};

async function loadBooking(id: string): Promise<BookingRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, reference, kind, user_id, starts_at, ends_at, amount_kobo, is_student_price, status, cancel_reason, refund_owed")
    .eq("id", id)
    .maybeSingle();
  return (data as BookingRow | null) ?? null;
}

function whenLabel(b: BookingRow): string {
  return bookingWhen(b);
}

function refresh(id: string) {
  revalidatePath(`/account/bookings/${id}`);
  revalidatePath("/account/bookings");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin");
  revalidatePath("/book");
}

// ------------------------------------------------------------ the customer

export async function claimPaymentAction(fd: FormData): Promise<ActionResult> {
  const session = await requireUser();
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };
  if (await limited(`claim:${session.user.id}`, 10, HOUR)) return { error: "too-many" };

  const before = await loadBooking(id);
  const alreadyClaimed = before?.status === "payment_claimed";

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_payment", { p_booking: id, p_reference: text(fd, "reference").slice(0, 200) });
  if (error) return { error: memberError(error) };

  // Emails only the first time (pressing the button twice must not send two).
  if (!alreadyClaimed && before) {
    const origin = await getSiteOrigin();
    const amount = formatNaira(before.amount_kobo);
    if (session.user.email) {
      await sendLoggedEmail(
        { to: session.user.email, subject: emails.claimAck.subject(before.reference), text: emails.claimAck.body(session.profile.full_name, before.reference, amount, `${origin}/account/bookings/${id}`) },
        { template: "payment-claim-ack", userId: session.user.id },
      );
    }
    const staffInbox = (process.env.FORMS_TO_EMAIL ?? "").trim().replace(/^"|"$/g, "");
    if (staffInbox) {
      await sendLoggedEmail(
        { to: staffInbox, subject: emails.staffNotice.subject(before.reference), text: emails.staffNotice.body(before.reference, amount, `${origin}/admin/payments`) },
        { template: "payment-staff-notice", userId: session.user.id },
      );
    }
  }
  refresh(id);
  return { notice: "claimed" };
}

// --------------------------------------------------------- Staff and Admin

export async function confirmPaymentAction(fd: FormData): Promise<ActionResult> {
  const session = await requireRole(["admin", "staff"]);
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };
  if (await limited(`confirm:${session.user.id}`, 60, HOUR)) return { error: "too-many" };

  let received: number | null = null;
  const receivedText = text(fd, "received").trim();
  if (receivedText) {
    const k = nairaToKobo(receivedText);
    if (k === "invalid" || k === null) return { error: "amount" };
    received = k;
  }

  // A pass confirmed after its start date starts on the confirmation day; an Admin can
  // keep the original dates by ticking the box and giving a reason (checked in the database).
  const keep = text(fd, "keep") === "on";
  const keepReason = text(fd, "keepReason").trim().slice(0, 300);

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_confirm_payment", {
    p_booking: id,
    p_received_kobo: received,
    p_keep_dates: keep,
    p_reason: keep ? keepReason : null,
  });
  if (error) return { error: staffError(error) };

  const b = await loadBooking(id);
  if (b) {
    const c = await customerFor(b.user_id);
    const origin = await getSiteOrigin();
    if (c.email) {
      await sendLoggedEmail(
        {
          to: c.email,
          subject: emails.confirmed.subject(b.reference),
          text: emails.confirmed.body(c.name, b.reference, whenLabel(b), formatNaira(received ?? b.amount_kobo), `${origin}/account/bookings/${id}`, b.is_student_price, b.kind === "month" ? passEmailNote(Math.round((new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / (24 * HOUR))) : ""),
        },
        { template: "payment-confirmed", userId: b.user_id ?? undefined },
      );
    }
  }
  refresh(id);
  return { notice: "confirmed" };
}

export async function rejectPaymentAction(fd: FormData): Promise<ActionResult> {
  const session = await requireRole(["admin", "staff"]);
  const id = text(fd, "booking");
  const reason = text(fd, "reason").trim();
  if (!UUID.test(id)) return { error: "failed" };
  if (reason.length < 3 || reason.length > 300) return { error: "reason" };
  if (await limited(`reject:${session.user.id}`, 60, HOUR)) return { error: "too-many" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_reject_payment", { p_booking: id, p_reason: reason });
  if (error) return { error: staffError(error) };

  const b = await loadBooking(id);
  if (b) {
    const c = await customerFor(b.user_id);
    const origin = await getSiteOrigin();
    if (c.email) {
      await sendLoggedEmail(
        { to: c.email, subject: emails.rejected.subject(b.reference), text: emails.rejected.body(c.name, b.reference, reason, `${origin}/account/bookings/${id}`, `${origin}/contact`) },
        { template: "payment-rejected", userId: b.user_id ?? undefined },
      );
    }
  }
  refresh(id);
  return { notice: "rejected" };
}

export async function staffCancelBookingAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin", "staff"]);
  const id = text(fd, "booking");
  const reason = text(fd, "reason").trim();
  if (!UUID.test(id)) return { error: "failed" };
  if (reason.length < 3 || reason.length > 300) return { error: "reason" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_cancel_booking", { p_booking: id, p_reason: reason });
  if (error) return { error: staffError(error) };

  const b = await loadBooking(id);
  if (b) {
    const c = await customerFor(b.user_id);
    const origin = await getSiteOrigin();
    if (c.email) {
      await sendLoggedEmail(
        { to: c.email, subject: emails.cancelled.subject(b.reference), text: emails.cancelled.body(c.name, b.reference, reason, b.refund_owed, `${origin}/account/bookings/${id}`, `${origin}/contact`) },
        { template: "booking-cancelled-by-team", userId: b.user_id ?? undefined },
      );
    }
  }
  refresh(id);
  return { notice: "cancelled" };
}

export async function markNoShowAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin", "staff"]);
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_mark_no_show", { p_booking: id });
  if (error) return { error: staffError(error) };
  refresh(id);
  return { notice: "no-show" };
}

export async function reopenBookingAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin", "staff"]);
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_reopen_booking", { p_booking: id });
  if (error) return { error: staffError(error) };
  refresh(id);
  return { notice: "reopened" };
}

// Admin only: record that you paid a refund. The note is your own transfer reference.
export async function markRefundedAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_refunded", { p_booking: id, p_note: text(fd, "note").slice(0, 300) });
  if (error) return { error: staffError(error) };
  refresh(id);
  return { notice: "refunded" };
}


// Admin only: add days to a confirmed pass (after an unexpected closure).
export async function extendPassAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const id = text(fd, "booking");
  const reason = text(fd, "reason").trim();
  const days = Number(text(fd, "days").trim());
  if (!UUID.test(id)) return { error: "failed" };
  if (!Number.isInteger(days) || days < 1 || days > 60) return { error: "days" };
  if (reason.length < 3 || reason.length > 300) return { error: "reason" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_extend_pass", { p_booking: id, p_days: days, p_reason: reason });
  if (error) return { error: staffError(error) };
  refresh(id);
  revalidatePath("/admin/passes");
  return { notice: "extended" };
}

// Admin only: cancel a confirmed pass (also after it has started) with the refund amount
// chosen by the Admin. The amount and reason are recorded; the customer is emailed.
export async function cancelPassAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const id = text(fd, "booking");
  const reason = text(fd, "reason").trim();
  if (!UUID.test(id)) return { error: "failed" };
  if (reason.length < 3 || reason.length > 300) return { error: "reason" };
  const refundText = text(fd, "refund").trim();
  const refund = refundText === "" ? 0 : nairaToKobo(refundText);
  if (refund === "invalid" || refund === null) return { error: "amount" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_pass", { p_booking: id, p_reason: reason, p_refund_kobo: refund });
  if (error) return { error: staffError(error) };

  const b = await loadBooking(id);
  if (b) {
    const c = await customerFor(b.user_id);
    const origin = await getSiteOrigin();
    if (c.email) {
      await sendLoggedEmail(
        { to: c.email, subject: emails.cancelled.subject(b.reference), text: emails.cancelled.body(c.name, b.reference, reason, refund > 0, `${origin}/account/bookings/${id}`, `${origin}/contact`) },
        { template: "booking-cancelled-by-team", userId: b.user_id ?? undefined },
      );
    }
  }
  refresh(id);
  revalidatePath("/admin/passes");
  return { notice: "pass-cancelled" };
}
