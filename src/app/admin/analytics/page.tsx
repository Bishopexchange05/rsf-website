import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BarChart, LineChart, RingChart, type Point } from "@/components/admin/Charts";
import { analytics as a } from "@/content/analytics";
import { nav } from "@/content/site";
import { requireRole } from "@/lib/auth";
import { byMonth, change, loadAnalytics, peaks, total, type Day, type Metric } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { addDays, lagosDate } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: a.title, ...noIndex };

const TZ = "Africa/Lagos";
const at = (d: string) => new Date(`${d}T12:00:00+01:00`);
const fmtDay = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
const fmtDayLong = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short" });
const fmtMonthLong = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "long", year: "numeric" });

const panel = "rounded-xl border border-slate-navy/10 bg-white p-5 dark:border-white/10 dark:bg-dark-card sm:p-6";

function Numbers({ rows, first }: { rows: [string, string][]; first: string }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-2">{a.table.show}</summary>
      <div className="mt-2 max-h-64 overflow-y-auto">
        <table className="w-full tabular-nums">
          <thead>
            <tr className="border-b border-slate-navy/10 text-left dark:border-white/10">
              <th className="py-1.5 font-semibold">{first}</th>
              <th className="py-1.5 text-right font-semibold">{a.table.value}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-navy/5 dark:border-white/5">
                <td className="py-1">{k}</td>
                <td className="py-1 text-right">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const { range: rangeParam } = await searchParams;
  const range = a.ranges.find((r) => r.key === rangeParam) ?? a.ranges[1];

  const today = lagosDate();
  const monthStart = (d: string, back: number) => {
    const [y, m] = d.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 - back, 1));
    return t.toISOString().slice(0, 10);
  };
  const from = range.key === "12m" ? monthStart(today, 11) : addDays(today, -(range.days - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = range.key === "12m" ? monthStart(prevTo, 11) : addDays(prevTo, -(range.days - 1));
  const yearFrom = addDays(today, -364);

  const supabase = await createClient();
  const [cur, prev, year] = await Promise.all([
    loadAnalytics(supabase, from, today),
    loadAnalytics(supabase, prevFrom, prevTo),
    range.key === "12m" ? Promise.resolve(null) : loadAnalytics(supabase, yearFrom, today),
  ]);
  if (!cur) notFound();
  const yearData = year ?? cur;

  const monthly = range.key === "12m";
  const series: Day[] = monthly ? byMonth(cur.days) : cur.days;
  const label = (d: Day) => (monthly ? fmtMonth.format(at(d.d)) : fmtDay.format(at(d.d)));
  const thisMonth = today.slice(0, 7);
  const tip = (d: Day) => (monthly ? (d.d.startsWith(thisMonth) ? a.soFar(fmtMonthLong.format(at(d.d))) : fmtMonthLong.format(at(d.d))) : fmtDayLong.format(at(d.d)));
  const pageName = (p: string) => a.pageNames[p] ?? nav.find((n) => n.href === p)?.label ?? p;
  const points = (key: Metric): Point[] => series.map((d) => ({ label: label(d), tip: tip(d), value: key === "revenue" ? d.revenue : d[key] }));

  const kpis: { key: Metric; label: string; value: string; delta: number | null }[] = (["revenue", "bookings", "members", "visits"] as Metric[]).map((key) => {
    const now = total(cur.days, key);
    return { key, label: a.kpis[key], value: key === "revenue" ? formatNaira(now) : now.toLocaleString("en-NG"), delta: change(now, prev ? total(prev.days, key) : 0) };
  });

  const k = cur.kinds;
  const mix = [
    { label: a.mixKinds.short, value: (k.hour ?? 0) + (k.half_day ?? 0) },
    { label: a.mixKinds.day, value: k.day ?? 0 },
    { label: a.mixKinds.month, value: k.month ?? 0 },
    { label: a.mixKinds.night, value: k.night ?? 0 },
  ];
  const mixTotal = mix.reduce((s, m) => s + m.value, 0);
  const weekdayBars: Point[] = a.weekdays.map((w, i) => ({ label: w, tip: w, value: cur.weekdays[String(i + 1)] ?? 0 }));
  const hourKeys = Object.keys(cur.hours).map(Number);
  const hourBars: Point[] = hourKeys.length
    ? Array.from({ length: Math.max(...hourKeys) - Math.min(...hourKeys) + 1 }, (_, i) => {
        const h = Math.min(...hourKeys) + i;
        const lbl = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
        return { label: lbl, tip: lbl, value: cur.hours[String(h)] ?? 0 };
      })
    : [];
  const peak = peaks(yearData.days);
  const visitsTotal = total(cur.days, "visits");
  const revenueTotal = total(cur.days, "revenue");

  return (
    <AdminShell heading={a.heading} text={a.text} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={a.rangeLabel} className="inline-flex rounded-lg border border-slate-navy/15 bg-white p-1 dark:border-white/15 dark:bg-dark-card">
          {a.ranges.map((r) => (
            <Link
              key={r.key}
              href={`/admin/analytics?range=${r.key}`}
              aria-current={r.key === range.key ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold transition",
                r.key === range.key ? "bg-navy text-white dark:bg-dark-green dark:text-dark-bg" : "hover:bg-cream dark:hover:bg-white/10",
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm opacity-75">{a.privacy}</p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((x) => (
          <div key={x.key} className={panel}>
            <dt className="text-sm font-semibold opacity-80">{x.label}</dt>
            <dd className="mt-2 font-heading text-2xl tabular-nums sm:text-3xl">{x.value}</dd>
            <dd className="mt-1 text-xs opacity-75">
              {x.delta === null ? a.change.fresh(range.previous) : x.delta === 0 ? a.change.same(range.previous) : x.delta > 0 ? `▲ ${a.change.up(x.delta, range.previous)}` : `▼ ${a.change.down(-x.delta, range.previous)}`}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="now" className="mt-4">
        <h2 id="now" className="sr-only">
          {a.nowHeading}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-slate-navy/10 bg-white px-5 py-3 dark:bg-dark-card text-sm dark:border-white/10 sm:grid-cols-3">
          <div className="flex justify-between gap-3 sm:block">
            <dt className="opacity-75">{a.now.members}</dt>
            <dd className="font-semibold tabular-nums">{cur.now.members.toLocaleString("en-NG")}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="opacity-75">{a.now.waiting}</dt>
            <dd className="font-semibold tabular-nums">{formatNaira(cur.now.waiting_kobo)}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="opacity-75">{a.now.refunds}</dt>
            <dd className="font-semibold tabular-nums">{formatNaira(cur.now.refunds_kobo)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="visits">
          <h2 id="visits" className="text-lg font-semibold">
            {a.visitsChart.heading}
          </h2>
          <p className="text-sm opacity-75">{a.visitsChart.note}</p>
          <div className="mt-4">{visitsTotal ? <LineChart points={points("visits")} unit="count" label={a.visitsChart.heading} /> : <p className="py-10 text-center text-sm opacity-75">{a.visitsEmpty}</p>}</div>
          {visitsTotal > 0 && <Numbers first={monthly ? a.table.month : a.table.date} rows={series.map((d) => [tip(d), `${d.visits.toLocaleString("en-NG")} (${d.views.toLocaleString("en-NG")} views)`])} />}
        </section>
        <section className={panel} aria-labelledby="revenue">
          <h2 id="revenue" className="text-lg font-semibold">
            {a.revenueChart.heading}
          </h2>
          <p className="text-sm opacity-75">{a.revenueChart.note}</p>
          <div className="mt-4">{revenueTotal ? <LineChart points={points("revenue")} unit="naira" label={a.revenueChart.heading} /> : <p className="py-10 text-center text-sm opacity-75">{a.revenueEmpty}</p>}</div>
          {revenueTotal > 0 && <Numbers first={monthly ? a.table.month : a.table.date} rows={series.map((d) => [tip(d), formatNaira(d.revenue)])} />}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className={panel} aria-labelledby="mix">
          <h2 id="mix" className="text-lg font-semibold">
            {a.mixChart.heading}
          </h2>
          <div className="mt-4">{mixTotal ? <RingChart parts={mix} label={a.mixChart.heading} totalLabel={a.kpis.bookings} /> : <p className="py-10 text-center text-sm opacity-75">{a.mixChart.empty}</p>}</div>
        </section>
        <section className={panel} aria-labelledby="weekday">
          <h2 id="weekday" className="text-lg font-semibold">
            {a.weekdayChart.heading}
          </h2>
          <p className="text-sm opacity-75">{a.weekdayChart.note}</p>
          <div className="mt-4">{weekdayBars.some((b) => b.value) ? <BarChart bars={weekdayBars} label={a.weekdayChart.heading} /> : <p className="py-10 text-center text-sm opacity-75">{a.weekdayChart.empty}</p>}</div>
          {weekdayBars.some((b) => b.value) && <Numbers first={a.table.date} rows={weekdayBars.map((b) => [b.label, String(b.value)])} />}
        </section>
        <section className={panel} aria-labelledby="hours">
          <h2 id="hours" className="text-lg font-semibold">
            {a.hourChart.heading}
          </h2>
          <p className="text-sm opacity-75">{a.hourChart.note}</p>
          <div className="mt-4">{hourBars.length ? <BarChart bars={hourBars} label={a.hourChart.heading} /> : <p className="py-10 text-center text-sm opacity-75">{a.hourChart.empty}</p>}</div>
          {hourBars.length > 0 && <Numbers first={a.table.date} rows={hourBars.map((b) => [b.label, String(b.value)])} />}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="peaks">
          <h2 id="peaks" className="text-lg font-semibold">
            {a.peaksHeading}
          </h2>
          {peak.day ? (
            <dl className="mt-4 divide-y divide-slate-navy/10 text-sm dark:divide-white/10">
              <div className="flex flex-wrap justify-between gap-2 py-2.5">
                <dt className="opacity-75">{a.peaks.day}</dt>
                <dd className="font-semibold">
                  {fmtDayLong.format(at(peak.day.d))} · {a.peaks.visits(peak.day.visits)}
                </dd>
              </div>
              {peak.week && (
                <div className="flex flex-wrap justify-between gap-2 py-2.5">
                  <dt className="opacity-75">{a.peaks.week}</dt>
                  <dd className="font-semibold">
                    {a.peaks.weekOf(fmtDay.format(at(peak.week.start)))} · {a.peaks.visits(peak.week.visits)}
                  </dd>
                </div>
              )}
              {peak.month && (
                <div className="flex flex-wrap justify-between gap-2 py-2.5">
                  <dt className="opacity-75">{a.peaks.month}</dt>
                  <dd className="font-semibold">
                    {fmtMonthLong.format(at(`${peak.month.month}-01`))} · {a.peaks.visits(peak.month.visits)}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-4 text-sm opacity-75">{a.peaks.none}</p>
          )}
        </section>
        <section className={panel} aria-labelledby="pages">
          <h2 id="pages" className="text-lg font-semibold">
            {a.pagesHeading}
          </h2>
          {cur.pages.length ? (
            <table className="mt-3 w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-slate-navy/10 text-left dark:border-white/10">
                  <th className="py-1.5 font-semibold">{a.pageCol}</th>
                  <th className="py-1.5 text-right font-semibold">{a.viewsCol}</th>
                </tr>
              </thead>
              <tbody>
                {cur.pages.map((p) => (
                  <tr key={p.path} className="border-b border-slate-navy/5 dark:border-white/5">
                    <td className="py-1.5">{pageName(p.path)}</td>
                    <td className="py-1.5 text-right">{p.views.toLocaleString("en-NG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-sm opacity-75">{a.pagesEmpty}</p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
