import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { bookButton, bookOutline } from "@/components/booking/buttonClasses";
import { HoldCountdown } from "@/components/booking/HoldCountdown";
import { StatusChip } from "@/components/booking/StatusChip";
import { Card } from "@/components/Card";
import { account, accountNav, overview } from "@/content/accounts";
import { myBookings } from "@/content/booking";
import { needsTwoFactor, requireUser } from "@/lib/auth";
import { bookingIsOpen } from "@/lib/booking-open";
import { bookingWhen } from "@/lib/lagos";
import { MY_BOOKING_COLUMNS, needsPayment, shownStatus, splitBookings, type MyBooking } from "@/lib/my-bookings";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: overview.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!accountsEnabled) notFound();
  const { user, profile } = await requireUser();
  const { notice } = await searchParams;
  const message = notice ? account.notices[notice] : undefined;
  const staff = needsTwoFactor(profile.role);

  const supabase = await createClient();
  const [open, { data }] = await Promise.all([
    bookingIsOpen(),
    supabase.from("bookings").select(MY_BOOKING_COLUMNS).eq("user_id", user.id).order("starts_at", { ascending: true }).limit(50),
  ]);
  const now = Date.now();
  const { upcoming } = splitBookings((data as MyBooking[] | null) ?? [], now);
  const [next, ...rest] = upcoming;
  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? "";

  return (
    <AccountShell active="overview" heading={overview.hello(firstName)} text={open ? overview.textOpen : overview.textClosed} staff={staff} wide>
      {message && (
        <p role="status" className="mb-6 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
          {message}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 sm:p-8">
            <h2 className="text-h3">{overview.nextHeading}</h2>
            {next ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-xl">{myBookings.kinds[next.kind] ?? next.kind}</p>
                    <p className="mt-1">{bookingWhen(next)}</p>
                    <p className="mt-1 text-sm opacity-80">
                      {next.reference} · {formatNaira(next.amount_kobo)}
                    </p>
                  </div>
                  <StatusChip status={shownStatus(next, now)} />
                </div>
                {needsPayment(next, now) && next.hold_expires_at ? (
                  <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-cream p-4 dark:bg-dark-bg sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      <span className="block text-sm font-semibold">{overview.payBy}</span>
                      <HoldCountdown expiresAt={next.hold_expires_at} />
                    </p>
                    <Link href={`/account/bookings/${next.id}`} className={bookButton}>
                      {overview.payNow}
                    </Link>
                  </div>
                ) : (
                  <p className="mt-6">
                    <Link href={`/account/bookings/${next.id}`} className={bookOutline}>
                      {overview.viewBooking}
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <p>{open ? overview.nextNone : overview.nextNoneClosed}</p>
                {open && (
                  <Link href={accountNav.book.href} className={bookButton}>
                    {overview.bookDesk}
                  </Link>
                )}
              </div>
            )}
          </Card>

          {rest.length > 0 && (
            <Card className="p-6 sm:p-8">
              <h2 className="text-h3">{overview.comingUpHeading}</h2>
              <ul className="mt-4 divide-y divide-slate-navy/10 dark:divide-white/10">
                {rest.slice(0, 3).map((b) => (
                  <li key={b.id}>
                    <Link href={`/account/bookings/${b.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 hover:opacity-80">
                      <span>
                        <span className="block font-semibold">{myBookings.kinds[b.kind] ?? b.kind}</span>
                        <span className="block text-sm opacity-80">{bookingWhen(b)}</span>
                      </span>
                      <StatusChip status={shownStatus(b, now)} />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                <Link href={accountNav.bookings.href} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                  {overview.allBookings}
                </Link>
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-h3">{overview.quickHeading}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {open && (
                <Link href={accountNav.book.href} className={`${bookButton} sm:w-full`}>
                  {overview.bookDesk}
                </Link>
              )}
              <Link href={accountNav.bookings.href} className={bookOutline}>
                {overview.myBookings}
              </Link>
              <Link href={accountNav.settings.href} className={bookOutline}>
                {overview.settings}
              </Link>
              {staff && (
                <Link href={account.adminLink.href} className={bookOutline}>
                  {overview.adminLink}
                </Link>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-h3">{overview.youHeading}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">{account.emailLabel}</dt>
                <dd className="break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="font-semibold">{account.roleLabel}</dt>
                <dd>{account.roles[profile.role]}</dd>
              </div>
            </dl>
            <p className="mt-4">
              <Link href={accountNav.settings.href} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                {overview.editDetails}
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </AccountShell>
  );
}
