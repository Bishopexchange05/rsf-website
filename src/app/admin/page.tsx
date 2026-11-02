import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusChip } from "@/components/booking/StatusChip";
import { Panel } from "@/components/Panel";
import { account, admin, adminHome } from "@/content/accounts";
import { analytics } from "@/content/analytics";
import { myBookings } from "@/content/booking";
import { loadAnalytics, total } from "@/lib/analytics";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { addDays, lagosDate, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { readiness } from "@/lib/readiness";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: admin.title, ...noIndex };

type Person = { full_name: string; phone: string };
type TodayRow = { id: string; reference: string; kind: string; starts_at: string; ends_at: string; status: string; profiles: Person | Person[] | null };

// Admin and Staff only, and only after the authenticator-app check. Everyone
// else gets a plain "not found" page. The role is read from the database on the
// server, never from the browser.
export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();
  const now = new Date();
  const today = lagosDate();
  const dayStart = `${today}T00:00:00+01:00`;
  const dayEnd = `${addDays(today, 1)}T00:00:00+01:00`;
  const [{ count: toCheck }, { count: refunds }, { count: endingSoon }, { count: requests }, { data: todayRows }, { count: passesToday }, { data: settings }, month] = await Promise.all([
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
    // Admins also see this month so far (money, bookings, members, visits).
    isAdmin ? loadAnalytics(supabase, `${today.slice(0, 8)}01`, today) : Promise.resolve(null),
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
  const dateText = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).format(now);
  const monthFigures = month
    ? [
        { label: analytics.kpis.revenue, value: formatNaira(total(month.days, "revenue")) },
        { label: analytics.kpis.bookings, value: total(month.days, "bookings").toLocaleString("en-NG") },
        { label: analytics.kpis.members, value: total(month.days, "members").toLocaleString("en-NG") },
        { label: analytics.kpis.visits, value: total(month.days, "visits").toLocaleString("en-NG") },
      ]
    : [];

  return (
    <AdminShell heading={adminHome.heading} text={adminHome.text(dateText, profile.full_name, account.roles[profile.role])} isAdmin={isAdmin}>
      <section aria-labelledby="waiting">
        <h2 id="waiting" className="mb-3 text-lg font-semibold">
          {adminHome.needsHeading}
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((x) => (
            <li key={x.label}>
              <Link
                href={x.href}
                className={cn(
                  "flex h-full flex-col justify-between gap-3 rounded-xl border bg-white p-4 transition hover:border-navy/40 dark:bg-dark-card dark:hover:border-dark-green/50 sm:p-5",
                  x.count > 0 ? "border-slate-navy/10 border-l-4 border-l-accent-red dark:border-white/10 dark:border-l-red-300" : "border-slate-navy/10 dark:border-white/10",
                )}
              >
                <span className="text-sm font-semibold">{x.label}</span>
                {x.count > 0 ? (
                  <span className="font-heading text-3xl tabular-nums text-navy dark:text-dark-green">{x.count}</span>
                ) : (
                  <span className="text-sm opacity-60">{adminHome.allClear}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {month && (
        <section aria-labelledby="month" className="mt-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="month" className="text-lg font-semibold">
              {adminHome.monthHeading}
            </h2>
            <Link href={adminHome.openAnalytics.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-navy underline underline-offset-2 dark:text-dark-link">
              {adminHome.openAnalytics.label}
            </Link>
          </div>
          <dl className="grid grid-cols-2 divide-slate-navy/10 rounded-xl border border-slate-navy/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-dark-card lg:grid-cols-4 lg:divide-x">
            {monthFigures.map((f) => (
              <div key={f.label} className="p-4 sm:p-5">
                <dt className="text-sm opacity-75">{f.label}</dt>
                <dd className="mt-1 font-heading text-2xl tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
        <section aria-labelledby="today" className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
          <h2 id="today" className="mb-3 text-lg font-semibold">
            {adminHome.todayHeading}
          </h2>
          {rows.length === 0 ? (
            <EmptyState>{adminHome.todayNone}</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-navy/10 bg-white dark:border-white/10 dark:bg-dark-card">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-navy/10 bg-cream/60 text-xs uppercase tracking-wide dark:border-white/10 dark:bg-white/5">
                  <tr>
                    {adminHome.todayColumns.map((c) => (
                      <th key={c} scope="col" className="px-4 py-3 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-navy/10 dark:divide-white/10">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-cream/50 dark:hover:bg-white/5">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {timeLabel(r.starts_at)} to {timeLabel(r.ends_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/bookings/${r.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {who(r)?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{myBookings.kinds[r.kind] ?? r.kind}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.reference}</td>
                      <td className="px-4 py-3">
                        <StatusChip status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(passesToday ?? 0) > 0 && <p className="mt-3 text-sm opacity-85">{adminHome.passesToday(passesToday ?? 0)}</p>}
          <p className="mt-2">
            <Link href={adminHome.todayAll.href} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2">
              {adminHome.todayAll.label}
            </Link>
          </p>
        </section>

        {isAdmin && s && (
          <section aria-labelledby="booking">
            <h2 id="booking" className="mb-3 text-lg font-semibold">
              {adminHome.bookingHeading}
            </h2>
            <Panel>
              <p className="flex items-start gap-2 font-semibold">
                <span aria-hidden="true" className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", s.booking_enabled ? "bg-brand-green dark:bg-dark-green" : "bg-slate-navy/40 dark:bg-white/40")} />
                {s.booking_enabled ? adminHome.bookingOn : adminHome.bookingOff}
              </p>
              <p className="mt-3 text-sm opacity-85">{openItems > 0 ? adminHome.checklistOpen(openItems) : adminHome.checklistDone}</p>
              <p className="mt-4">
                <Link
                  href={adminHome.settingsLink.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-navy px-4 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg"
                >
                  {adminHome.settingsLink.label}
                </Link>
              </p>
            </Panel>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
