import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PaymentDecision } from "@/components/admin/PaymentDecision";
import { Card } from "@/components/Card";
import { myBookings } from "@/content/booking";
import { queue } from "@/content/payments";
import { requireRole } from "@/lib/auth";
import { dateTimeLabel, dayLabel, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: queue.title, ...noIndex };

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Row = {
  id: string;
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  amount_kobo: number;
  is_student_price: boolean;
  payments: One<{ customer_reference: string | null; claimed_at: string }>;
  profiles: One<{ full_name: string; phone: string }>;
};

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const [{ data }, hoursRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, reference, kind, starts_at, ends_at, amount_kobo, is_student_price, payments(customer_reference, claimed_at), profiles(full_name, phone)")
      .eq("status", "payment_claimed")
      .limit(100),
    supabase.rpc("get_review_hours"),
  ]);
  const reviewHours = typeof hoursRes.data === "number" ? hoursRes.data : 48;
  const rows = ((data as Row[] | null) ?? [])
    .map((r) => ({ r, pay: one(r.payments), who: one(r.profiles) }))
    .sort((a, b) => (a.pay?.claimed_at ?? "").localeCompare(b.pay?.claimed_at ?? ""));
  const now = Date.now();

  return (
    <AdminShell heading={queue.heading} text={queue.text} isAdmin={profile.role === "admin"}>
      {rows.length === 0 ? (
        <p>{queue.empty}</p>
      ) : (
        <ul className="space-y-5">
          {rows.map(({ r, pay, who }) => {
            const overdue = pay ? now - new Date(pay.claimed_at).getTime() > reviewHours * 3600 * 1000 : false;
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-mono text-xl font-semibold">{r.reference}</h2>
                      <p className="text-lg font-semibold">{formatNaira(r.amount_kobo)}</p>
                    </div>
                    <ul className="flex flex-wrap gap-2 text-xs font-semibold">
                      {overdue && <li className="rounded-full bg-accent-red px-3 py-1 text-white">{queue.overdue}</li>}
                      {r.is_student_price && <li className="rounded-full bg-amber/40 px-3 py-1">{queue.studentNote}</li>}
                    </ul>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div>
                      <dt className="inline font-semibold">{queue.customer}: </dt>
                      <dd className="inline">
                        {who ? `${who.full_name}, ${who.phone}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{myBookings.kinds[r.kind] ?? r.kind}: </dt>
                      <dd className="inline">
                        {dayLabel(r.starts_at)}, {timeLabel(r.starts_at)} to {timeLabel(r.ends_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{queue.waitingSince}: </dt>
                      <dd className="inline">{pay ? dateTimeLabel(pay.claimed_at) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{queue.reference}: </dt>
                      <dd className="inline">{pay?.customer_reference || queue.none}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 border-t border-slate-navy/10 pt-4 dark:border-white/10">
                    <PaymentDecision bookingId={r.id} expectedKobo={r.amount_kobo} />
                  </div>
                  <p className="mt-4 text-sm">
                    <Link href={`/admin/bookings/${r.id}`} className="font-medium underline underline-offset-2">
                      {queue.viewBooking}
                    </Link>
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
