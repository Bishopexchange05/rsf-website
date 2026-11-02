import { cn } from "@/lib/cn";

// A calm "nothing here" box for the admin lists, instead of one bare line on an empty page.
export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("rounded-xl border border-slate-navy/10 bg-white px-5 py-8 text-center text-sm opacity-90 dark:border-white/10 dark:bg-dark-card", className)}>{children}</p>;
}
