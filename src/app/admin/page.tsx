import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusChip } from "@/components/booking/StatusChip";
import { Card } from "@/components/Card";
import { admin, adminHome } from "@/content/accounts";
import { myBookings } from "@/content/booking";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { addDays, bookingWhen, lagosDate } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { readiness } from "@/lib/readiness";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: admin.title, ...noIndex };

type TodayRow = { id: string; reference: string; kind: string; starts_at: string; ends_at: string; status: string; profiles: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null };

// Admin and Staff only, and only after the authenticator-app check. Everyone
// else gets a plain "not found" page. The role is read from the database on the
// server, never from the browser.
export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();
  const now = new Date();
  const dayStart = `${lagosDate()}T00:00:00+01:00`;
  const dayEnd = `${addDays(lagosDate(), 1)}T00:00:00+01:00`;
  const [{ count: toCheck }, { count: refunds }, { count: endingSoon }, { count: requests }, { data: todayRows }, { count: passesToday }, { data: settings }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "payment_claimed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("refund_owed", true).is("refund_done_at", null),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("kind", "month")
      .eq("status", "confirmed")
      .gt("ends_at", now.toISOString())
      .lte("ends_at", new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString()),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("kind", "night").eq("status", "pending_approval").gt("hold_expires_at", now.toISOString()),
    supabase
      .from("bookings")
      .select("id, reference, kind, starts_at, ends_at, status, profiles(full_name, phone)")
      .eq("status", "confirmed")
      .in("kind", ["hour", "half_day", "day", "night"])
      .lt("starts_at", dayEnd)
      .gt("ends_at", dayStart)
      .order("starts_at")
      .limit(20),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("kind", "month").eq("status", "confirmed").lt("starts_at", dayEnd).gt("ends_at", dayStart),
    isAdmin ? supabase.from("settings").select("booking_enabled, legal_review_done_at").maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const t = adminHome.tiles;
  const tiles = [
    { ...t.payments, count: toCheck ?? 0 },
    { ...t.requests, count: requests ?? 0 },
    { ...t.refunds, count: refunds ?? 0 },
    { ...t.passes, count: endingSoon ?? 0 },
  ];
  const rows = (todayRows as TodayRow[] | null) ?? [];
  const who = (r: TodayRow) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles);
  const s = settings as { booking_enabled: boolean; legal_review_done_at: string | null } | null;
  const openItems = s ? readiness(s.legal_review_done_at).filter((i) => !i.ok).length : 0;
  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? "";

  return (
    <AdminShell heading={adminHome.hello(firstName)} text={adminHome.text} isAdmin={isAdmin}>
      <section aria-labelledby="needs">
        <h2 id="needs" className="mb-4 text-h3">
          {adminHome.needsHeading}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tiles.map((x) => (
            <li key={x.label}>
              <Link
                href={x.href}
                className={cn(
                  "flex h-full flex-col justify-between gap-3 rounded-2xl p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none sm:p-5",
                  x.count > 0 ? "bg-white ring-2 ring-accent-red/40 dark:bg-dark-card dark:ring-red-300/40" : "bg-white dark:bg-dark-card",
                )}
              >
                <span className="text-sm font-semibold">{x.label}</span>
                {x.count > 0 ? (
                  <span className="font-heading text-4xl text-navy dark:text-dark-green">{x.count}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-60">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-green dark:bg-dark-green" />
                    {adminHome.allClear}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-3">
        <section aria-labelledby="today" className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
          <h2 id="today" className="mb-4 text-h3">
            {adminHome.todayHeading}
          </h2>
          {rows.length === 0 ? (
            <EmptyState>{adminHome.todayNone}</EmptyState>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-dark-card">
              <ul className="divide-y divide-slate-navy/10 dark:divide-white/10">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/bookings/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-cream dark:hover:bg-white/5">
                      <span className="min-w-0">
                        <span className="block font-semibold">{who(r)?.full_name ?? "—"}</span>
                        <span className="block text-sm opacity-80">
                          {myBookings.kinds[r.kind] ?? r.kind} · {bookingWhen(r)}
                        </span>
                        <span className="block font-mono text-xs opacity-70">{r.reference}</span>
                      </span>
                      <StatusChip status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(passesToday ?? 0) > 0 && <p className="mt-3 text-sm opacity-85">{adminHome.passesToday(passesToday ?? 0)}</p>}
          <p className="mt-3">
            <Link href={adminHome.todayAll.href} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
              {adminHome.todayAll.label}
            </Link>
          </p>
        </section>

        {isAdmin && s && (
          <section aria-labelledby="booking">
            <h2 id="booking" className="mb-4 text-h3">
              {adminHome.bookingHeading}
            </h2>
            <Card>
              <p className="inline-flex items-center gap-2 font-semibold">
                <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", s.booking_enabled ? "bg-brand-green dark:bg-dark-green" : "bg-slate-navy/40 dark:bg-white/40")} />
                {s.booking_enabled ? adminHome.bookingOn : adminHome.bookingOff}
              </p>
              <p className="mt-3 text-sm opacity-85">{openItems > 0 ? adminHome.checklistOpen(openItems) : adminHome.checklistDone}</p>
              <p className="mt-4">
                <Link
                  href={adminHome.settingsLink.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-navy px-5 font-heading text-sm text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg"
                >
                  {adminHome.settingsLink.label}
                </Link>
              </p>
            </Card>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
