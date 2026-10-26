import Link from "next/link";
import { Toaster } from "@/components/admin/Toaster";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { admin } from "@/content/accounts";
import { media } from "@/content/events";
import { staffNav } from "@/content/payments";

const pill =
  "inline-flex min-h-11 items-center rounded-full border border-navy/30 px-4 text-sm font-semibold hover:bg-navy hover:text-white dark:border-white/30 dark:hover:bg-white/15";

// Frame for the admin pages: a short banner, then a wide content area. Staff see
// Payments and Bookings; Admins also see People, Settings, Audit log and Email health.
export function AdminShell({
  heading,
  text,
  isAdmin,
  children,
}: {
  heading: string;
  text: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHero label={admin.label} heading={heading} text={text} image={media.hero} compact />
      <Section tone="cream" className="min-h-[70vh]">
        <nav aria-label="Admin" className="mb-8 flex flex-wrap gap-2">
          <Link href="/admin" className={pill}>
            {admin.title}
          </Link>
          <Link href={staffNav.payments.href} className={pill}>
            {staffNav.payments.label}
          </Link>
          <Link href={staffNav.bookings.href} className={pill}>
            {staffNav.bookings.label}
          </Link>
          {isAdmin &&
            admin.links.map((l) => (
              <Link key={l.href} href={l.href} className={pill}>
                {l.label}
              </Link>
            ))}
          <Link href="/account" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold underline underline-offset-2">
            {admin.back.label}
          </Link>
        </nav>
        {children}
      </Section>
      <Toaster />
    </>
  );
}
