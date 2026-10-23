import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { media } from "@/content/events";
import { errors, notices } from "@/content/booking";

export const bookInput =
  "min-h-11 w-full rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
export const bookButton =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-amber px-7 py-3 text-center font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60 sm:w-auto";
export const bookOutline =
  "inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy px-6 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

// Shared frame for the booking pages: a short banner, a notice or error, then content.
export function BookingShell({
  label,
  heading,
  text,
  notice,
  error,
  children,
}: {
  label: string;
  heading: string;
  text: string;
  notice?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHero label={label} heading={heading} text={text} image={media.hero} compact />
      <Section tone="cream">
        <div className="mx-auto max-w-3xl">
          {notice && notices[notice] && (
            <p role="status" className="mb-5 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
              {notices[notice]}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-5 rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
              {errors[error] ?? errors.failed}
            </p>
          )}
          {children}
        </div>
      </Section>
    </>
  );
}
