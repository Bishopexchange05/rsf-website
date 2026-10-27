import { ActionForm } from "@/components/ActionForm";
import { ReasonPicker } from "@/components/admin/ReasonPicker";
import { PendingButton } from "@/components/PendingButton";
import { requestsAdmin } from "@/content/overnight";
import { actionErrors, actionNotices } from "@/content/payments";
import { approveRequestAction, rejectRequestAction } from "@/lib/payment-actions";

const solid =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-amber px-6 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60";
const outline =
  "inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy px-6 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white disabled:opacity-60 dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

// Approve or reject an overnight request, after meeting the person at the office.
// Used on the Overnight requests page and on the booking page.
export function RequestDecision({ bookingId }: { bookingId: string }) {
  return (
    <div className="space-y-4">
      <ActionForm action={approveRequestAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="space-y-3">
        <input type="hidden" name="booking" value={bookingId} />
        <p className="text-sm opacity-85">{requestsAdmin.approveHelp}</p>
        <PendingButton className={solid} pendingText={requestsAdmin.approving}>
          {requestsAdmin.approve}
        </PendingButton>
      </ActionForm>

      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">{requestsAdmin.rejectSummary}</summary>
        <ActionForm action={rejectRequestAction} notices={actionNotices} errors={actionErrors} toast lockOnSuccess className="mt-3 space-y-3">
          <input type="hidden" name="booking" value={bookingId} />
          <ReasonPicker name="reason" label={requestsAdmin.reasonLabel} quickLabel={requestsAdmin.quickReasonsLabel} quick={requestsAdmin.quickReasons} />
          <PendingButton className={outline} pendingText={requestsAdmin.rejecting}>
            {requestsAdmin.reject}
          </PendingButton>
        </ActionForm>
      </details>
    </div>
  );
}
