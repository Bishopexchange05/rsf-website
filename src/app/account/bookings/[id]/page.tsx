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
import { claim } from "@/content/payments";
import { requireUser } from "@/lib/auth";
import { cancelBookingAction } from "@/lib/booking-actions";
import { dayLabel, timeLabel } from "@/lib/lagos";
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
};
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
    .select("id, reference, kind, starts_at, ends_at, status, amount_kobo, is_student_price, hold_expires_at, refund_owed, refund_done_at")
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
  const canCancel = status === "pending_payment" || status === "confirmed";

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
            <dd>
              {dayLabel(b.starts_at)}, {timeLabel(b.starts_at)} to {timeLabel(b.ends_at)}
            </dd>
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

      {status === "rejected" && (
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
          {b.refund_owed && !b.refund_done_at && <p className="mt-2 font-semibold">{claim.cancelledRefund}</p>}
        </Card>
      )}

      {status === "no_show" && (
        <Card className="mt-6">
          <p>{claim.noShowText}</p>
        </Card>
      )}

      {status === "expired" && <p className="mt-6">{bookingPage.pay.expired}</p>}

      {canCancel && (
        <ActionForm action={cancelBookingAction} notices={bookingNotices} errors={bookingErrors} className="mt-6">
          <input type="hidden" name="booking" value={b.id} />
          <p className="mb-3 text-sm opacity-85">{status === "confirmed" ? bookingPage.cancel.confirmedHelp : bookingPage.cancel.help}</p>
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
