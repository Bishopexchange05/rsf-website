import { cn } from "@/lib/cn";

// The box used on the signed-in pages (account, booking, admin): a thin border and tighter corners
// instead of the soft shadow of the public pages' Card, so working pages read as a tool, not a brochure.
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col rounded-xl border border-slate-navy/10 bg-white p-5 dark:border-white/10 dark:bg-dark-card sm:p-6", className)}>{children}</div>;
}
