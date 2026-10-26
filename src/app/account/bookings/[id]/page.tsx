import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingShell, bookOutline } from "@/components/booking/BookingShell";
import { HoldCountdown } from "@/components/booking/HoldCountdown";
import { Card } from "@/components/Card";
import { common } from "@/content/accounts";
import { bookingPage, errors as bookingErrors, myBookings, notices as bookingNotices } from "@/content/booking";
import { requireUser } from "@/lib/auth";
import { cancelBookingAction } from "@/lib/booking-actions";
import { dayLabel, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PendingButton } from "@/components/PendingButton";

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
};
type Pay = { reference: string; amount_kobo: number; hold_expires_at: string; bank_name: string | null; account_number: string | null; account_name: string | null; note: string | null };

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
    .select("id, reference, kind, starts_at, ends_at, status, amount_kobo, is_student_price, hold_expires_at")
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
          <p className="mt-4 text-sm opacity-85">{bookingPage.pay.next}</p>
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
