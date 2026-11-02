import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/lagos";

// Reads the Admin analytics summary (migration 0016, admin_analytics) and works out totals,
// changes and peaks. The database only answers an Admin who has passed two-step login.

export type Day = { d: string; views: number; visits: number; members: number; bookings: number; revenue: number };
export type Analytics = {
  days: Day[];
  kinds: Record<string, number>;
  weekdays: Record<string, number>;
  hours: Record<string, number>;
  pages: { path: string; views: number }[];
  now: { members: number; waiting_kobo: number; refunds_kobo: number };
};
export type Metric = "revenue" | "bookings" | "members" | "visits";

export async function loadAnalytics(supabase: SupabaseClient, from: string, to: string): Promise<Analytics | null> {
  const { data, error } = await supabase.rpc("admin_analytics", { p_from: from, p_to: to });
  if (error || !data) return null;
  return data as Analytics;
}

export const total = (days: Day[], key: Metric) => days.reduce((s, d) => s + (d[key] ?? 0), 0);

// Percentage change against the previous period, rounded. null when there was nothing before.
export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / before) * 100);
}

// The Monday on or before a date ("YYYY-MM-DD").
function mondayOf(d: string): string {
  const day = new Date(`${d}T12:00:00Z`).getUTCDay();
  return addDays(d, -((day + 6) % 7));
}

// Busiest day, week (Monday to Sunday) and month by visits.
export function peaks(days: Day[]): { day?: Day; week?: { start: string; visits: number }; month?: { month: string; visits: number } } {
  const withVisits = days.filter((d) => d.visits > 0);
  if (!withVisits.length) return {};
  const day = withVisits.reduce((a, b) => (b.visits > a.visits ? b : a));
  const weeks = new Map<string, number>();
  const months = new Map<string, number>();
  for (const d of withVisits) {
    weeks.set(mondayOf(d.d), (weeks.get(mondayOf(d.d)) ?? 0) + d.visits);
    months.set(d.d.slice(0, 7), (months.get(d.d.slice(0, 7)) ?? 0) + d.visits);
  }
  const [ws, wv] = [...weeks].reduce((a, b) => (b[1] > a[1] ? b : a));
  const [ms, mv] = [...months].reduce((a, b) => (b[1] > a[1] ? b : a));
  return { day, week: { start: ws, visits: wv }, month: { month: ms, visits: mv } };
}

// Days grouped into calendar months, for the 12-month view.
export function byMonth(days: Day[]): Day[] {
  const m = new Map<string, Day>();
  for (const d of days) {
    const k = d.d.slice(0, 7);
    const cur = m.get(k) ?? { d: `${k}-01`, views: 0, visits: 0, members: 0, bookings: 0, revenue: 0 };
    cur.views += d.views;
    cur.visits += d.visits;
    cur.members += d.members;
    cur.bookings += d.bookings;
    cur.revenue += d.revenue;
    m.set(k, cur);
  }
  return [...m.values()];
}
