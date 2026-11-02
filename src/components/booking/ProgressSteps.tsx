import { bookingPage } from "@/content/booking";
import { cn } from "@/lib/cn";

// Where a booking is on its way: Booked, Paid, Confirmed (overnight: Requested, Approved,
// Paid, Confirmed). Shown only while a booking is still active; ended bookings show their
// status instead.
export function progressFor(kind: string, status: string): { steps: string[]; done: number } | null {
  const s = bookingPage.steps;
  if (kind === "night") {
    const steps = [s.requested, s.approved, s.paid, s.confirmed];
    const done = { pending_approval: 1, pending_payment: 2, payment_claimed: 3, confirmed: 4, completed: 4 }[status];
    return done === undefined ? null : { steps, done };
  }
  const steps = [s.booked, s.paid, s.confirmed];
  const done = { pending_payment: 1, payment_claimed: 2, confirmed: 3, completed: 3 }[status];
  return done === undefined ? null : { steps, done };
}

export function ProgressSteps({ steps, done }: { steps: string[]; done: number }) {
  return (
    <ol aria-label={bookingPage.progressLabel} className="flex items-start">
      {steps.map((label, i) => {
        const complete = i < done;
        const current = i === done;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2", i <= done ? "bg-brand-green dark:bg-dark-green" : "bg-slate-navy/15 dark:bg-white/15")}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-bold",
                complete
                  ? "border-brand-green bg-brand-green text-slate-navy dark:border-dark-green dark:bg-dark-green dark:text-dark-bg"
                  : current
                    ? "border-navy bg-white text-navy dark:border-dark-green dark:bg-dark-card dark:text-dark-green"
                    : "border-slate-navy/20 bg-white text-slate-navy/50 dark:border-white/20 dark:bg-dark-card dark:text-white/50",
              )}
            >
              {complete ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={cn("mt-2 text-xs font-semibold sm:text-sm", !complete && !current && "opacity-60")}>
              {label}
              {complete && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
