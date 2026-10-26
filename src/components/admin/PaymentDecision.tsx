import { ActionForm } from "@/components/ActionForm";
import { ReasonPicker } from "@/components/admin/ReasonPicker";
import { PendingButton } from "@/components/PendingButton";
import { confirmPaymentAction, rejectPaymentAction } from "@/lib/payment-actions";
import { koboToNaira } from "@/lib/settings-validation";
import { actionErrors, actionNotices, queue } from "@/content/payments";

const input =
  "min-h-11 rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
const solid =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-amber px-6 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60";
const outline =
  "inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy px-6 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white disabled:opacity-60 dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

// Confirm or reject a payment. Used on the Payments queue and on the booking page.
// Results appear as a message at the bottom of the screen (the page changes behind it).
export function PaymentDecision({ bookingId, expectedKobo }: { bookingId: string; expectedKobo: number }) {
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
