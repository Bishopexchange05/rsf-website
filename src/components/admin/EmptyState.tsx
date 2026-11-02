import { cn } from "@/lib/cn";

// A friendly "nothing here" box for the admin lists, instead of one bare line on an empty page.
export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-navy/15 px-6 py-12 text-center dark:border-white/15", className)}>
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-brand-green/15 text-brand-green dark:bg-dark-green/15 dark:text-dark-green">
        <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 10.5l4 4 8-9" />
        </svg>
      </span>
      <p className="max-w-md">{children}</p>
    </div>
  );
}
