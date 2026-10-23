import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingShell, bookOutline } from "@/components/booking/BookingShell";
import { Card } from "@/components/Card";
import { myBookings } from "@/content/booking";
import { requireUser } from "@/lib/auth";
import { dayLabel, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: myBookings.title, ...noIndex };

type Row = { id: string; reference: string; kind: string; starts_at: string; ends_at: string; status: string; amount_kobo: number; hold_expires_at: string | null };

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, reference, kind, starts_at, ends_at, status, amount_kobo, hold_expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data as Row[] | null) ?? [];
  const now = Date.now();

  return (
    <BookingShell label="RSF Tech & Space" heading={myBookings.heading} text={myBookings.text}>
      {rows.length === 0 ? (
        <Card>
          <p>{myBookings.empty}</p>
          <p className="mt-4">
            <Link href={myBookings.bookNow.href} className={bookOutline}>
              {myBookings.bookNow.label}
            </Link>
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            // An unpaid hold that has run out shows as Expired straight away.
            const lapsed = r.status === "pending_payment" && r.hold_expires_at && new Date(r.hold_expires_at).getTime() <= now;
            const status = lapsed ? "expired" : r.status;
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-h3">{myBookings.kinds[r.kind] ?? r.kind}</h2>
                      <p className="text-sm">
                        {dayLabel(r.starts_at)}, {timeLabel(r.starts_at)} to {timeLabel(r.ends_at)}
                      </p>
                      <p className="text-sm opacity-85">
                        {r.reference} · {formatNaira(r.amount_kobo)}
                      </p>
                    </div>
                    <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white dark:bg-white/15">
                      {myBookings.statuses[status] ?? status}
                    </span>
                  </div>
                  <p className="mt-4">
                    <Link href={`/account/bookings/${r.id}`} className={bookOutline}>
                      {myBookings.view}
                    </Link>
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </BookingShell>
  );
}
