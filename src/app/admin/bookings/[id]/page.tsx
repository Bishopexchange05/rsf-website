import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { PaymentDecision } from "@/components/admin/PaymentDecision";
import { ReasonPicker } from "@/components/admin/ReasonPicker";
import { Card } from "@/components/Card";
import { PendingButton } from "@/components/PendingButton";
import { myBookings } from "@/content/booking";
import { passAdminDetail } from "@/content/monthly";
import { actionErrors, actionNotices, bookingDetail, whatsappMessage } from "@/content/payments";
import { requireRole } from "@/lib/auth";
import { bookingWhen, dateTimeLabel, passLateStart } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { cancelPassAction, extendPassAction, markNoShowAction, markRefundedAction, reopenBookingAction, staffCancelBookingAction } from "@/lib/payment-actions";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: bookingDetail.title, ...noIndex };

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

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
  cancel_reason: string | null;
  refund_owed: boolean;
  refund_done_at: string | null;
  refund_note: string | null;
  extended_days: number;
  refund_amount_kobo: number | null;
  profiles: One<{ full_name: string; phone: string }>;
  payments: One<{
    customer_reference: string | null;
    claimed_at: string;
    status: string;
    confirmed_at: string | null;
    received_kobo: number | null;
    rejected_reason: string | null;
  }>;
};
type Event = { id: string; actor_role: string | null; from_status: string | null; to_status: string; note: string | null; created_at: string };

const solid =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-amber px-6 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60";
const outline =
  "inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy px-6 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white disabled:opacity-60 dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";
const input =
  "min-h-11 rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, reference, kind, starts_at, ends_at, status, amount_kobo, is_student_price, hold_expires_at, cancel_reason, refund_owed, refund_done_at, refund_note, extended_days, refund_amount_kobo, profiles(full_name, phone), payments(customer_reference, claimed_at, status, confirmed_at, received_kobo, rejected_reason)",
    )
    .eq("id", id)
    .maybeSingle();
  const b = data as Booking | null;
  if (!b) notFound();
  const { data: ev } = await supabase
    .from("booking_events")
    .select("id, actor_role, from_status, to_status, note, created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: true });
  const events = (ev as Event[] | null) ?? [];

  const who = one(b.profiles);
  const pay = one(b.payments);
  const lapsed = b.status === "pending_payment" && !!b.hold_expires_at && new Date(b.hold_expires_at).getTime() <= Date.now();
  const status = lapsed ? "expired" : b.status;
  const statusLabel = myBookings.statuses[status] ?? status;
  const started = new Date(b.starts_at).getTime() <= Date.now();
  const ended = new Date(b.ends_at).getTime() <= Date.now();
  const isPass = b.kind === "month";
  const passStarted = isPass && status === "confirmed" && started;
  const canCancel = ["pending_payment", "payment_claimed", "confirmed"].includes(status);

  const digits = who?.phone.replace(/\D/g, "") ?? "";
  const whatsapp = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage(who!.full_name.split(" ")[0], b.reference, formatNaira(b.amount_kobo), statusLabel))}`
    : null;

  return (
    <AdminShell heading={bookingDetail.heading} text={b.reference} isAdmin={isAdmin}>
      <Card>
        <dl className="space-y-2">
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.reference}</dt>
            <dd className="font-mono text-lg font-semibold">{b.reference}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.customer}</dt>
            <dd>{who?.full_name ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.phone}</dt>
            <dd>{who?.phone ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.type}</dt>
            <dd>{myBookings.kinds[b.kind] ?? b.kind}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.when}</dt>
            <dd>{bookingWhen(b)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.amount}</dt>
            <dd className="font-semibold">{formatNaira(b.amount_kobo)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{bookingDetail.status}</dt>
            <dd>{statusLabel}</dd>
          </div>
        </dl>
        {b.is_student_price && <p className="mt-3 rounded-xl bg-amber/30 p-2 text-sm font-medium">{bookingDetail.studentPrice}</p>}
        {b.extended_days > 0 && <p className="mt-3 text-sm font-medium">{passAdminDetail.extendedBy(b.extended_days)}</p>}
        {whatsapp && (
          <p className="mt-4">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={outline}>
              {bookingDetail.whatsapp}
            </a>
          </p>
        )}
      </Card>

      {pay && (
        <Card className="mt-6">
          <h2 className="text-h3">{bookingDetail.payment}</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div>
              <dt className="inline font-semibold">{bookingDetail.paidAt}: </dt>
              <dd className="inline">{dateTimeLabel(pay.claimed_at)}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{bookingDetail.theirNote}: </dt>
              <dd className="inline">{pay.customer_reference || "—"}</dd>
            </div>
            {pay.confirmed_at && (
              <div>
                <dt className="inline font-semibold">{bookingDetail.confirmedAt}: </dt>
                <dd className="inline">{dateTimeLabel(pay.confirmed_at)}</dd>
              </div>
            )}
            {pay.status === "confirmed" && pay.received_kobo && (
              <div>
                <dt className="inline font-semibold">{bookingDetail.receivedAmount}: </dt>
                <dd className="inline">{formatNaira(pay.received_kobo)}</dd>
              </div>
            )}
            {pay.rejected_reason && (
              <div>
                <dt className="inline font-semibold">{bookingDetail.rejectedWhy}: </dt>
                <dd className="inline">{pay.rejected_reason}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-h3">{bookingDetail.actions}</h2>
        <div className="mt-4 space-y-6">
          {status === "payment_claimed" && <PaymentDecision bookingId={b.id} expectedKobo={b.amount_kobo} late={passLateStart(b)} isAdmin={isAdmin} />}

          {status === "confirmed" && started && !isPass && (
            <ActionForm action={markNoShowAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess>
              <input type="hidden" name="booking" value={b.id} />
              <PendingButton className={outline} pendingText={bookingDetail.noShowPending}>
                {bookingDetail.noShow}
              </PendingButton>
            </ActionForm>
          )}

          {status === "expired" && !ended && (
            <ActionForm action={reopenBookingAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="space-y-2">
              <input type="hidden" name="booking" value={b.id} />
              <p className="text-sm opacity-85">{bookingDetail.reopenHelp}</p>
              <PendingButton className={solid} pendingText={bookingDetail.reopenPending}>
                {bookingDetail.reopen}
              </PendingButton>
            </ActionForm>
          )}

          {isPass && status === "confirmed" && !ended && isAdmin && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">{passAdminDetail.extendSummary}</summary>
              <ActionForm action={extendPassAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="mt-3 space-y-3">
                <input type="hidden" name="booking" value={b.id} />
                <p className="text-sm opacity-85">{passAdminDetail.extendHelp}</p>
                <div>
                  <label htmlFor="extend-days" className="mb-1.5 block text-sm font-semibold">
                    {passAdminDetail.extendDays}
                  </label>
                  <input id="extend-days" name="days" type="text" inputMode="numeric" autoComplete="off" className={`${input} w-28`} />
                </div>
                <ReasonPicker name="reason" label={passAdminDetail.extendReason} quick={[]} />
                <PendingButton className={solid} pendingText={passAdminDetail.extendPending}>
                  {passAdminDetail.extendButton}
                </PendingButton>
              </ActionForm>
            </details>
          )}

          {passStarted && !isAdmin && <p className="text-sm opacity-85">{passAdminDetail.staffStarted}</p>}

          {passStarted && isAdmin && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">{passAdminDetail.cancelPassSummary}</summary>
              <ActionForm action={cancelPassAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="mt-3 space-y-3">
                <input type="hidden" name="booking" value={b.id} />
                <p className="text-sm opacity-85">{passAdminDetail.cancelPassHelp}</p>
                <div>
                  <label htmlFor="cancel-refund" className="mb-1.5 block text-sm font-semibold">
                    {passAdminDetail.cancelPassRefund}
                  </label>
                  <input id="cancel-refund" name="refund" type="text" inputMode="numeric" autoComplete="off" className={`${input} w-40`} />
                </div>
                <ReasonPicker name="reason" label={passAdminDetail.cancelPassReason} quick={[]} />
                <PendingButton className={outline} pendingText={passAdminDetail.cancelPassPending}>
                  {passAdminDetail.cancelPassButton}
                </PendingButton>
              </ActionForm>
            </details>
          )}

          {canCancel && !passStarted && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">{bookingDetail.cancelSummary}</summary>
              <ActionForm action={staffCancelBookingAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="mt-3 space-y-3">
                <input type="hidden" name="booking" value={b.id} />
                <ReasonPicker name="reason" label={bookingDetail.cancelReason} quick={[]} />
                {status === "confirmed" && <p className="text-sm opacity-85">{bookingDetail.cancelRefundNote}</p>}
                <PendingButton className={outline} pendingText={bookingDetail.cancelPending}>
                  {bookingDetail.cancelButton}
                </PendingButton>
              </ActionForm>
            </details>
          )}
        </div>
      </Card>

      {b.refund_owed && (
        <Card className="mt-6">
          <h2 className="text-h3">{bookingDetail.refundHeading}</h2>
          {b.refund_done_at ? (
            <p className="mt-3">
              {bookingDetail.refundDone}: {dateTimeLabel(b.refund_done_at)}
              {b.refund_note ? ` (${b.refund_note})` : ""}
            </p>
          ) : (
            <>
              <p className="mt-3">{bookingDetail.refundOwed}</p>
              <p className="mt-2 font-semibold">
                {passAdminDetail.refundAmount}: {formatNaira(b.refund_amount_kobo ?? b.amount_kobo)}
              </p>
              {isAdmin ? (
                <ActionForm action={markRefundedAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="mt-4 space-y-3">
                  <input type="hidden" name="booking" value={b.id} />
                  <div>
                    <label htmlFor="refund-note" className="mb-1.5 block text-sm font-semibold">
                      {bookingDetail.refundNote}
                    </label>
                    <input id="refund-note" name="note" type="text" maxLength={200} autoComplete="off" className={`${input} w-full`} />
                  </div>
                  <PendingButton className={solid} pendingText={bookingDetail.refundPending}>
                    {bookingDetail.refundButton}
                  </PendingButton>
                </ActionForm>
              ) : (
                <p className="mt-3 text-sm opacity-85">{bookingDetail.refundAdminOnly}</p>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-h3">{bookingDetail.timeline}</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {events.map((e) => (
            <li key={e.id} className="border-l-4 border-navy/30 pl-3 dark:border-white/30">
              <p className="font-semibold">{myBookings.statuses[e.to_status] ?? e.to_status}</p>
              <p className="opacity-85">
                {dateTimeLabel(e.created_at)} · {e.actor_role ? (bookingDetail.timelineBy[e.actor_role] ?? e.actor_role) : bookingDetail.system}
              </p>
              {e.note && <p className="opacity-85">{e.note}</p>}
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-6 text-sm">
        <Link href={bookingDetail.back.href} className="font-medium underline underline-offset-2">
          {bookingDetail.back.label}
        </Link>
      </p>
    </AdminShell>
  );
}
