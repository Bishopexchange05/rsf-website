import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/Card";
import { emailHealth } from "@/content/accounts";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: emailHealth.title, ...noIndex };

type Row = { status: "sent" | "failed"; template: string; error: string | null; created_at: string };

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
const dayLabel = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium" });

export default async function Page() {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);

  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_log")
    .select("status, template, error, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  const rows = (data as Row[] | null) ?? [];

  const perDay = new Map<string, { sent: number; failed: number; label: string }>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = dayFormat.format(d);
    const cur = perDay.get(key) ?? { sent: 0, failed: 0, label: dayLabel.format(d) };
    cur[r.status] += 1;
    perDay.set(key, cur);
  }
  const days = Array.from(perDay.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const todayKey = dayFormat.format(new Date());
  const sentToday = perDay.get(todayKey)?.sent ?? 0;
  const failures = rows.filter((r) => r.status === "failed").slice(0, 10);

  const cap = Number.parseInt((process.env.EMAIL_DAILY_CAP ?? "").trim(), 10);
  const hasCap = Number.isFinite(cap) && cap > 0;
  const pct = hasCap ? Math.round((sentToday / cap) * 100) : 0;
  const provider = (process.env.EMAIL_PROVIDER ?? "smtp").trim() || "smtp";

  return (
    <AdminShell heading={emailHealth.heading} text={emailHealth.text} isAdmin>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold opacity-75">{emailHealth.provider}</p>
          <p className="mt-1 text-lg font-semibold">{emailHealth.providers[provider] ?? provider}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold opacity-75">{emailHealth.today}</p>
          <p className="mt-1 text-lg font-semibold">{hasCap ? emailHealth.capLabel(sentToday, cap, pct) : `${sentToday}`}</p>
          {!hasCap && <p className="mt-1 text-sm opacity-75">{emailHealth.capNotSet}</p>}
          {hasCap && pct >= 70 && (
            <p role="alert" className="mt-2 rounded-xl bg-amber/40 p-2 text-sm font-medium">
              {emailHealth.capWarning}
            </p>
          )}
        </Card>
      </div>

      <h2 className="mt-10 text-h3">{emailHealth.tableHeading}</h2>
      {days.length === 0 ? (
        <p className="mt-3">{emailHealth.empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-dark-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-navy/10 dark:border-white/10">
                <th scope="col" className="p-3">{emailHealth.columns.day}</th>
                <th scope="col" className="p-3">{emailHealth.columns.sent}</th>
                <th scope="col" className="p-3">{emailHealth.columns.failed}</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([key, v]) => (
                <tr key={key} className="border-b border-slate-navy/10 last:border-0 dark:border-white/10">
                  <td className="p-3">{v.label}</td>
                  <td className="p-3">{v.sent}</td>
                  <td className="p-3">{v.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 text-h3">{emailHealth.failedHeading}</h2>
      {failures.length === 0 ? (
        <p className="mt-3">{emailHealth.noFailures}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {failures.map((f, i) => (
            <li key={i} className="rounded-xl bg-white p-3 shadow-sm dark:bg-dark-card">
              <span className="font-semibold">{f.template}</span>
              <span className="opacity-75"> · {dayLabel.format(new Date(f.created_at))}</span>
              {f.error && <span className="block break-words opacity-85">{f.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
