import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingShell, bookButton } from "@/components/booking/BookingShell";
import { HoldCountdown } from "@/components/booking/HoldCountdown";
import { StatusChip } from "@/components/booking/StatusChip";
import { Panel } from "@/components/Panel";
import { accountNav } from "@/content/accounts";
import { myBookings } from "@/content/booking";
import { needsTwoFactor, requireUser } from "@/lib/auth";
import { bookingIsOpen } from "@/lib/booking-open";
import { bookingWhen } from "@/lib/lagos";
import { MY_BOOKING_COLUMNS, needsPayment, shownStatus, splitBookings, type MyBooking } from "@/lib/my-bookings";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: myBookings.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const [open, { data }] = await Promise.all([
    bookingIsOpen(),
    supabase.from("bookings").select(MY_BOOKING_COLUMNS).eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const rows = (data as MyBooking[] | null) ?? [];
  const now = Date.now();
  const { upcoming, past } = splitBookings(rows, now);

  const item = (b: MyBooking) => {
    const status = shownStatus(b, now);
    const pay = needsPayment(b, now) && b.hold_expires_at;
    return (
      <li key={b.id}>
        <Link
          href={`/account/bookings/${b.id}`}
          className="block rounded-xl border border-slate-navy/10 bg-white p-5 ring-navy/30 dark:border-white/10 transition hover:border-navy/40 dark:hover:border-dark-green/50 focus-visible:ring-2 dark:bg-dark-card sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-lg">{myBookings.kinds[b.kind] ?? b.kind}</p>
              <p className="mt-0.5 text-sm">{bookingWhen(b)}</p>
              <p className="mt-0.5 text-sm opacity-75">
                {b.reference} · {formatNaira(b.amount_kobo)}
              </p>
            </div>
            <StatusChip status={status} />
          </div>
          {pay && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-navy/10 pt-4 dark:border-white/10">
              <p className="text-sm">
                <HoldCountdown expiresAt={b.hold_expires_at!} /> <span className="opacity-80">{myBookings.timeLeft}</span>
              </p>
              <span className="inline-flex min-h-10 items-center rounded-full bg-amber px-5 font-heading text-sm text-slate-navy">{myBookings.payNow}</span>
            </div>
          )}
        </Link>
      </li>
    );
  };

  return (
    <BookingShell active="bookings" heading={myBookings.heading} text={myBookings.text} staff={needsTwoFactor(profile.role)}>
      {rows.length === 0 ? (
        <Panel className="p-6 sm:p-8">
          <p>{myBookings.empty}</p>
          {open && (
            <p className="mt-5">
              <Link href={accountNav.book.href} className={bookButton}>
                {myBookings.bookNow.label}
              </Link>
            </p>
          )}
        </Panel>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="upcoming">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="upcoming" className="text-h3">
                {myBookings.upcoming}
              </h2>
              {open && (
                <Link href={accountNav.book.href} className={bookButton}>
                  {myBookings.bookNow.label}
                </Link>
              )}
            </div>
            {upcoming.length ? <ul className="space-y-4">{upcoming.map(item)}</ul> : <p className="opacity-80">{myBookings.noUpcoming}</p>}
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past">
              <h2 id="past" className="mb-4 text-h3">
                {myBookings.past}
              </h2>
              <ul className="space-y-4 opacity-90">{past.map(item)}</ul>
            </section>
          )}
        </div>
      )}
    </BookingShell>
  );
}
