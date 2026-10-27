import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { BookingShell, bookButton, bookInput, bookOutline } from "@/components/booking/BookingShell";
import { HoldCountdown } from "@/components/booking/HoldCountdown";
import { Card } from "@/components/Card";
import { PendingButton } from "@/components/PendingButton";
import { common } from "@/content/accounts";
import { bookingPage, errors as bookingErrors, myBookings, notices as bookingNotices } from "@/content/booking";
import { passBooking } from "@/content/monthly";
import { overnightBooking } from "@/content/overnight";
import { claim } from "@/content/payments";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { cancelBookingAction, renewPassAction } from "@/lib/booking-actions";
import { bookingWhen, dateTimeLabel, lagosDate, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { claimPaymentAction } from "@/lib/payment-actions";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: bookingPage.title, ...noIndex };

type Booking = {
  id: string;
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  amount_kobo: number;
  is_student_price: boolean;
  hold_expires_at: string | null;
  refund_owed: boolean;
  refund_done_at: string | null;
  extended_days: number;
  refund_amount_kobo: number | null;
  cancel_reason: string | null;
  approved_at: string | null;
};
type Details = { location: string | null; rules: string | null; checkin: string | null; checkout: string | null };
type Pay = { reference: string; amount_kobo: number; hold_expires_at: string; bank_name: string | null; account_number: string | null; account_name: string | null; note: string | null };
type PaymentRow = { customer_reference: string | null; rejected_reason: string | null; status: string };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  if (!accountsEnabled) notFound();
  const { user } = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const { notice } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, reference, kind, starts_at, ends_at, status, amount_kobo, is_student_price, hold_expires_at, refund_owed, refund_done_at, extended_days, refund_amount_kobo, cancel_reason, approved_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const b = data as Booking | null;
  if (!b) notFound();

  const lapsed = b.status === "pending_payment" && !!b.hold_expires_at && new Date(b.hold_expires_at).getTime() <= Date.now();
  const status = lapsed ? "expired" : b.status;
  const needsPayment = status === "pending_payment";

  let pay: Pay | null = null;
  if (needsPayment) {
    const { data: rows } = await supabase.rpc("get_payment_instructions", { p_booking: id });
    pay = ((rows as Pay[] | null) ?? [])[0] ?? null;
  }
  let payment: PaymentRow | null = null;
  if (["payment_claimed", "confirmed", "rejected"].includes(status)) {
    const { data: p } = await supabase.from("payments").select("customer_reference, rejected_reason, status").eq("booking_id", id).maybeSingle();
    payment = (p as PaymentRow | null) ?? null;
  }
  const canCancel = status === "pending_payment" || status === "pending_approval" || status === "confirmed";
  const isNight = b.kind === "night";
  const neverApproved = isNight && !b.approved_at;

  // The address and house rules: the database returns them only to the owner of a CONFIRMED
  // overnight booking. For anyone else, or any other state, this stays empty.
  let details: Details | null = null;
  if (isNight && status === "confirmed") {
    const { data: d } = await supabase.rpc("get_overnight_details", { p_booking: id });
    details = ((d as Details[] | null) ?? [])[0] ?? null;
  }
  const at = (t: string | null) => (t ? timeLabel("2000-01-01T" + t.slice(0, 5) + ":00+01:00") : "");

  const isPass = b.kind === "month";
  let cutoffHours: number | null = null;
  let renewOpen = false;
  if (isPass) {
    const { data: cfg } = await supabase.rpc("get_booking_config");
    const c = cfg as { monthly_self_cancel_cutoff_hours?: number; monthly_start_window_days?: number } | null;
    cutoffHours = c?.monthly_self_cancel_cutoff_hours ?? null;
    if (status === "confirmed" && c?.monthly_start_window_days !== undefined) {
      const endsOn = lagosDate(new Date(new Date(b.ends_at).getTime() - 60 * 60 * 1000));
      const limit = new Date(`${lagosDate()}T12:00:00Z`);
      limit.setUTCDate(limit.getUTCDate() + c.monthly_start_window_days - 1);
      renewOpen = endsOn <= limit.toISOString().slice(0, 10);
    }
  }

  return (
    <BookingShell label="RSF Tech & Space" heading={bookingPage.heading} text={myBookings.kinds[b.kind] ?? b.kind} notice={notice}>
      <Card>
        <dl className="space-y-2">
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingPage.reference}</dt>
            <dd className="font-mono text-lg font-semibold">{b.reference}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingPage.when}</dt>
            <dd>{bookingWhen(b)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingPage.amount}</dt>
            <dd className="font-semibold">{formatNaira(b.amount_kobo)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingPage.status}</dt>
            <dd>{myBookings.statuses[status] ?? status}</dd>
          </div>
        </dl>
        {b.is_student_price && <p className="mt-3 text-sm opacity-85">{bookingPage.studentPrice}</p>}
        {isPass && (
          <div className="mt-3 space-y-1 text-sm opacity-85">
            <p>{passBooking.length(Math.round((new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 86400000) - b.extended_days)}</p>
            {b.extended_days > 0 && <p className="font-medium">{passBooking.extended(b.extended_days)}</p>}
            <p>{passBooking.anyDesk}</p>
            {status === "pending_payment" && <p>{passBooking.moved}</p>}
          </div>
        )}
      </Card>

      {needsPayment && (
        <Card className="mt-6">
          <h2 className="text-h3">{bookingPage.pay.heading}</h2>
          <p className="mt-2">{bookingPage.pay.intro}</p>
          {pay && pay.hold_expires_at && (
            <p className="mt-4">
              {bookingPage.pay.timeLeft}: <HoldCountdown expiresAt={pay.hold_expires_at} />
            </p>
          )}
          {pay && pay.bank_name && pay.account_number && pay.account_name ? (
            <dl className="mt-4 space-y-2 rounded-xl bg-cream p-4 dark:bg-dark-bg">
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-semibold">{bookingPage.pay.bank}</dt>
                <dd>{pay.bank_name}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-semibold">{bookingPage.pay.accountNumber}</dt>
                <dd className="font-mono text-lg font-semibold">{pay.account_number}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-semibold">{bookingPage.pay.accountName}</dt>
                <dd>{pay.account_name}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-semibold">{bookingPage.amount}</dt>
                <dd className="font-semibold">{formatNaira(pay.amount_kobo)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-semibold">{bookingPage.pay.referenceHint}</dt>
                <dd className="font-mono text-lg font-semibold">{pay.reference}</dd>
              </div>
              {pay.note && <p className="pt-2 text-sm">{pay.note}</p>}
            </dl>
          ) : (
            <p className="mt-4">{bookingPage.pay.noBank}</p>
          )}

          {/* ---- "I've paid" ---- */}
          <div className="mt-6 border-t border-slate-navy/10 pt-5 dark:border-white/10">
            <h3 className="text-lg font-semibold">{claim.heading}</h3>
            <ActionForm action={claimPaymentAction} notices={claim.notices} errors={claim.errors} lockOnSuccess className="mt-3 space-y-3">
              <input type="hidden" name="booking" value={b.id} />
              <div>
                <label htmlFor="reference" className="mb-1.5 block text-sm font-semibold">
                  {claim.referenceLabel}
                </label>
                <input id="reference" name="reference" type="text" maxLength={120} autoComplete="off" className={bookInput} />
                <p className="mt-1 text-sm opacity-75">{claim.referenceHelp}</p>
              </div>
              <p className="text-sm opacity-85">{claim.confirmNote}</p>
              <PendingButton className={bookButton} pendingText={claim.pending}>
                {claim.button}
              </PendingButton>
            </ActionForm>
          </div>
        </Card>
      )}

      {isNight && status === "pending_approval" && (
        <Card className="mt-6">
          <h2 className="text-h3">{overnightBooking.waiting.heading}</h2>
          <p className="mt-2">{overnightBooking.waiting.text}</p>
          {b.hold_expires_at && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">{overnightBooking.waiting.heldUntil}:</span> {dateTimeLabel(b.hold_expires_at)}
            </p>
          )}
          <p className="mt-3">
            <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className={bookOutline}>
              {overnightBooking.waiting.contact}
            </a>
          </p>
        </Card>
      )}

      {isNight && status === "pending_payment" && b.approved_at && <p className="mt-6 font-semibold">{overnightBooking.approvedNote}</p>}

      {details && (
        <Card className="mt-6">
          <h2 className="text-h3">{overnightBooking.details.heading}</h2>
          <p className="mt-2">{overnightBooking.details.intro}</p>
          {details.location && (
            <p className="mt-3 whitespace-pre-line">
              <span className="font-semibold">{overnightBooking.details.location}:</span> {details.location}
            </p>
          )}
          {details.rules && (
            <div className="mt-3">
              <p className="font-semibold">{overnightBooking.details.rules}</p>
              <p className="whitespace-pre-line">{details.rules}</p>
            </div>
          )}
          <p className="mt-3 text-sm">{overnightBooking.details.times(at(details.checkin), at(details.checkout))}</p>
        </Card>
      )}

      {status === "payment_claimed" && (
        <Card className="mt-6">
          <h2 className="text-h3">{claim.claimedHeading}</h2>
          <p className="mt-2">{claim.claimedText}</p>
          {payment?.customer_reference && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">{claim.yourReference}:</span> {payment.customer_reference}
            </p>
          )}
        </Card>
      )}

      {status === "confirmed" && (
        <Card className="mt-6">
          <h2 className="text-h3">{claim.confirmedHeading}</h2>
          <p className="mt-2">{claim.confirmedText}</p>
          {b.is_student_price && <p className="mt-3 rounded-xl bg-amber/30 p-3 text-sm font-medium">{claim.studentReminder}</p>}
        </Card>
      )}

      {status === "rejected" && neverApproved && (
        <Card className="mt-6">
          <h2 className="text-h3">{overnightBooking.rejected.heading}</h2>
          {b.cancel_reason && (
            <p className="mt-2">
              <span className="font-semibold">{overnightBooking.rejected.reason}:</span> {b.cancel_reason}
            </p>
          )}
          <p className="mt-2">{overnightBooking.rejected.text}</p>
          <p className="mt-3">
            <Link href={claim.contactHref} className={bookOutline}>
              {claim.contactLine}
            </Link>
          </p>
        </Card>
      )}

      {status === "rejected" && !neverApproved && (
        <Card className="mt-6">
          <h2 className="text-h3">{claim.rejectedHeading}</h2>
          {payment?.rejected_reason && (
            <p className="mt-2">
              <span className="font-semibold">{claim.rejectedWhy}:</span> {payment.rejected_reason}
            </p>
          )}
          <p className="mt-2">{claim.rejectedText}</p>
          <p className="mt-3">
            <Link href={claim.contactHref} className={bookOutline}>
              {claim.contactLine}
            </Link>
          </p>
        </Card>
      )}

      {status === "cancelled" && (
        <Card className="mt-6">
          <p>{claim.cancelledText}</p>
          {b.refund_owed && !b.refund_done_at && (
            <p className="mt-2 font-semibold">
              {claim.cancelledRefund}
              {b.refund_amount_kobo !== null && " (" + formatNaira(b.refund_amount_kobo) + ")"}
            </p>
          )}
        </Card>
      )}

      {status === "no_show" && (
        <Card className="mt-6">
          <p>{claim.noShowText}</p>
        </Card>
      )}

      {status === "expired" && <p className="mt-6">{neverApproved ? overnightBooking.expired : bookingPage.pay.expired}</p>}

      {isPass && renewOpen && (
        <Card className="mt-6">
          <h2 className="text-h3">{passBooking.renew.heading}</h2>
          <p className="mt-2">{passBooking.renew.text}</p>
          <ActionForm action={renewPassAction} notices={passBooking.notices} errors={{ ...bookingErrors, ...passBooking.errors }} className="mt-4">
            <input type="hidden" name="booking" value={b.id} />
            <PendingButton className={bookButton} pendingText={passBooking.renew.pending}>
              {passBooking.renew.button}
            </PendingButton>
          </ActionForm>
        </Card>
      )}

      {canCancel && (
        <ActionForm action={cancelBookingAction} notices={bookingNotices} errors={bookingErrors} className="mt-6">
          <input type="hidden" name="booking" value={b.id} />
          <p className="mb-3 text-sm opacity-85">{status === "confirmed" ? (isPass ? passBooking.cancelConfirmed(cutoffHours) : bookingPage.cancel.confirmedHelp) : bookingPage.cancel.help}</p>
          <PendingButton className={bookOutline} pendingText={common.cancelling}>
            {bookingPage.cancel.button}
          </PendingButton>
        </ActionForm>
      )}

      <p className="mt-8 text-sm">
        <Link href={bookingPage.back.href} className="font-medium underline underline-offset-2">
          {bookingPage.back.label}
        </Link>
      </p>
    </BookingShell>
  );
}
