import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { media } from "@/content/events";
import { errors, notices } from "@/content/booking";

export { bookButton, bookInput, bookOutline } from "./buttonClasses";

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
      <Section tone="cream" className="min-h-[70vh]">
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
