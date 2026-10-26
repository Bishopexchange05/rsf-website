import { ActionForm } from "@/components/ActionForm";
import { ReasonPicker } from "@/components/admin/ReasonPicker";
import { PendingButton } from "@/components/PendingButton";
import { confirmPaymentAction, rejectPaymentAction } from "@/lib/payment-actions";
import { koboToNaira } from "@/lib/settings-validation";
import { passAdminDetail } from "@/content/monthly";
import { actionErrors, actionNotices, queue } from "@/content/payments";

const input =
  "min-h-11 rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
const solid =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-amber px-6 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60";
const outline =
  "inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy px-6 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white disabled:opacity-60 dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

// Confirm or reject a payment. Used on the Payments queue and on the booking page.
// Results appear as a message at the bottom of the screen (the page changes behind it).
// For a monthly pass confirmed after its start date, `late` explains that the start moves
// to today, and an Admin may keep the original dates instead (with a reason).
export function PaymentDecision({
  bookingId,
  expectedKobo,
  late,
  isAdmin = false,
}: {
  bookingId: string;
  expectedKobo: number;
  late?: { oldStart: string; newStart: string };
  isAdmin?: boolean;
}) {
  return (
    <div className="space-y-4">
      <ActionForm action={confirmPaymentAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="space-y-3">
        <input type="hidden" name="booking" value={bookingId} />
        <div>
          <label htmlFor={`recv-${bookingId}`} className="mb-1.5 block text-sm font-semibold">
            {queue.received}
          </label>
          <input
            id={`recv-${bookingId}`}
            name="received"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={koboToNaira(expectedKobo)}
            className={`${input} w-40`}
          />
          <p className="mt-1 text-sm opacity-75">{queue.receivedHelp}</p>
        </div>
        {late && (
          <div className="space-y-2 rounded-xl bg-amber/30 p-3 text-sm">
            <p className="font-medium">{passAdminDetail.late(late.oldStart, late.newStart)}</p>
            {isAdmin && (
              <>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" name="keep" className="h-5 w-5 shrink-0 accent-navy" />
                  <span className="font-semibold">{passAdminDetail.keepDates}</span>
                </label>
                <label htmlFor={`keep-${bookingId}`} className="block font-semibold">
                  {passAdminDetail.keepReason}
                </label>
                <input id={`keep-${bookingId}`} name="keepReason" type="text" maxLength={300} autoComplete="off" className={`${input} w-full`} />
              </>
            )}
          </div>
        )}
        <PendingButton className={solid} pendingText={queue.confirming}>
          {queue.confirm}
        </PendingButton>
      </ActionForm>

      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">{queue.rejectSummary}</summary>
        <ActionForm action={rejectPaymentAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="mt-3 space-y-3">
          <input type="hidden" name="booking" value={bookingId} />
          <ReasonPicker name="reason" label={queue.reasonLabel} quickLabel={queue.quickReasonsLabel} quick={queue.quickReasons} />
          <PendingButton className={outline} pendingText={queue.rejecting}>
            {queue.reject}
          </PendingButton>
        </ActionForm>
      </details>
    </div>
  );
}
