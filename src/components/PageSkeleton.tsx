// Shown while an account, admin or booking page is being prepared on the server. Without it
// the browser showed an EMPTY page (and the footer jumped to the top) for the moment between
// pressing Save and the new page arriving. It has the same banner and minimum height as the
// real pages, so nothing jumps.
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <div className="bg-navy pt-24 text-white dark:bg-dark-bg">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 md:pb-10 md:pt-6">
          <div className="animate-pulse space-y-4 motion-reduce:animate-none">
            <div className="h-4 w-28 rounded bg-white/25" />
            <div className="h-10 w-64 max-w-full rounded bg-white/25" />
            <div className="h-5 w-80 max-w-full rounded bg-white/20" />
          </div>
        </div>
      </div>
      <div className="min-h-[70vh] bg-cream dark:bg-dark-bg">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
          <div className="animate-pulse space-y-4 motion-reduce:animate-none">
            <div className="h-32 rounded-2xl bg-slate-navy/10 dark:bg-white/10" />
            <div className="h-48 rounded-2xl bg-slate-navy/10 dark:bg-white/10" />
            <div className="h-32 rounded-2xl bg-slate-navy/10 dark:bg-white/10" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
