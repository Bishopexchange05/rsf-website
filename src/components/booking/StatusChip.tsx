import { myBookings } from "@/content/booking";
import { cn } from "@/lib/cn";

// A booking's status as a small label with a coloured dot: red when the member must act
// (pay), blue while we check or approve, green when it is confirmed, grey once it has ended.
const dots: Record<string, string> = {
  pending_payment: "bg-accent-red",
  payment_claimed: "bg-accent-blue",
  pending_approval: "bg-accent-blue",
  confirmed: "bg-brand-green dark:bg-dark-green",
  approved: "bg-brand-green dark:bg-dark-green",
  completed: "bg-brand-green dark:bg-dark-green",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-navy/15 bg-white px-2.5 py-1 text-xs font-semibold text-slate-navy dark:border-white/15 dark:bg-white/5 dark:text-dark-text",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", dots[status] ?? "bg-slate-navy/40 dark:bg-white/40")} />
      {myBookings.statuses[status] ?? status}
    </span>
  );
}
