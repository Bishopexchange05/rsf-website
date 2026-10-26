import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/Card";
import { myBookings } from "@/content/booking";
import { passesAdmin } from "@/content/monthly";
import { requireRole } from "@/lib/auth";
import { addDays, bookingWhen, dayLabel, lagosDate } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: passesAdmin.title, ...noIndex };

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Row = {
  id: string;
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  hold_expires_at: string | null;
  extended_days: number;
  profiles: One<{ full_name: string; phone: string }>;
};

const smallButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-navy px-4 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

const DAY = 24 * 3600 * 1000;

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const [{ data }, capRes, overRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, reference, kind, starts_at, ends_at, status, hold_expires_at, extended_days, profiles(full_name, phone)")
      .eq("kind", "month")
      .in("status", ["pending_payment", "payment_claimed", "confirmed"])
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true })
      .limit(200),
    supabase.rpc("get_pass_cap"),
    supabase.rpc("get_overfilled_hours"),
  ]);
  const now = Date.now();
  // An unpaid pass whose hold has run out no longer holds a desk.
  const rows = ((data as Row[] | null) ?? []).filter(
    (r) => r.status !== "pending_payment" || (r.hold_expires_at && new Date(r.hold_expires_at).getTime() > now),
  );
  const cap = typeof capRes.data === "number" ? capRes.data : 0;
  const over = typeof overRes.data === "number" ? overRes.data : 0;

  const active = rows.filter((r) => r.status === "confirmed" && new Date(r.starts_at).getTime() <= now);
  const soon = rows.filter((r) => r.status === "confirmed" && new Date(r.starts_at).getTime() > now);
  const waiting = rows.filter((r) => r.status !== "confirmed");

  // Desks held by passes (any held status) today and on the busiest of the next 14 days.
  const today = lagosDate();
  let busiest = { n: 0, day: today };
  let todayCount = 0;
  for (let i = 0; i < 14; i++) {
    const day = addDays(today, i);
    const ts = new Date(`${day}T00:00:00+01:00`).getTime();
    const n = rows.filter((r) => new Date(r.starts_at).getTime() <= ts && new Date(r.ends_at).getTime() > ts).length;
    if (i === 0) todayCount = n;
    if (n > busiest.n) busiest = { n, day };
  }

  const groups = [
    { key: "active", title: passesAdmin.groups.active, list: active },
    { key: "soon", title: passesAdmin.groups.soon, list: soon },
    { key: "waiting", title: passesAdmin.groups.waiting, list: waiting },
  ];

  return (
    <AdminShell heading={passesAdmin.heading} text={passesAdmin.text} isAdmin={profile.role === "admin"}>
      <Card className="mb-6">
        <p className="font-semibold">{passesAdmin.desksToday(todayCount, cap)}</p>
        <p className="mt-1 text-sm">{passesAdmin.desksBusiest(busiest.n, cap, dayLabel(`${busiest.day}T12:00:00+01:00`))}</p>
        {over > 0 && <p className="mt-3 rounded-xl bg-accent-red/15 p-3 text-sm font-medium">{passesAdmin.overfill(over)}</p>}
        <p className="mt-3 text-sm">
          <Link href="/admin/bookings?view=refunds" className="font-medium underline underline-offset-2">
            {passesAdmin.refunds}
          </Link>
        </p>
      </Card>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className="text-h3 mb-3">
              {g.title} ({g.list.length})
            </h2>
            {g.list.length === 0 ? (
              <p>{passesAdmin.empty}</p>
            ) : (
              <ul className="space-y-3">
                {g.list.map((r) => {
                  const who = one(r.profiles);
                  const daysLeft = Math.ceil((new Date(r.ends_at).getTime() - now) / DAY);
                  const ending = r.status === "confirmed" && daysLeft <= 5;
                  return (
                    <li key={r.id}>
                      <Card>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-lg font-semibold">{r.reference}</p>
                            <p className="text-sm">{who ? `${who.full_name}, ${who.phone}` : "—"}</p>
                            <p className="text-sm opacity-85">{bookingWhen(r)}</p>
                          </div>
                          <ul className="flex flex-wrap gap-2 text-xs font-semibold">
                            <li className="rounded-full bg-navy px-3 py-1 text-white dark:bg-white/15">{myBookings.statuses[r.status] ?? r.status}</li>
                            {ending && <li className="rounded-full bg-amber/50 px-3 py-1">{passesAdmin.endingSoon}: {passesAdmin.endsIn(daysLeft - 1)}</li>}
                            {r.extended_days > 0 && <li className="rounded-full bg-brand-green/30 px-3 py-1">{passesAdmin.extended(r.extended_days)}</li>}
                          </ul>
                        </div>
                        <p className="mt-3">
                          <Link href={`/admin/bookings/${r.id}`} className={smallButton}>
                            {passesAdmin.open}
                          </Link>
                        </p>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
