import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/Card";
import { myBookings } from "@/content/booking";
import { bookingsAdmin } from "@/content/payments";
import { requireRole } from "@/lib/auth";
import { addDays, bookingWhen, isIsoDate } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: bookingsAdmin.title, ...noIndex };

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Row = {
  id: string;
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  amount_kobo: number;
  hold_expires_at: string | null;
  refund_owed: boolean;
  refund_done_at: string | null;
  profiles: One<{ full_name: string; phone: string }>;
};

const input =
  "min-h-11 rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
const smallButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-navy px-4 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

const VIEW_STATUS: Record<string, string> = { claimed: "payment_claimed", pending: "pending_payment", confirmed: "confirmed", expired: "expired" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; day?: string; view?: string }> }) {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const { q: qRaw = "", day = "", view = "" } = await searchParams;
  const q = qRaw.replace(/[%,()*]/g, " ").trim().slice(0, 40);
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select("id, reference, kind, starts_at, ends_at, status, amount_kobo, hold_expires_at, refund_owed, refund_done_at, profiles(full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (VIEW_STATUS[view]) query = query.eq("status", VIEW_STATUS[view]);
  if (view === "passes") query = query.eq("kind", "month");
  if (view === "requests") query = query.eq("kind", "night").eq("status", "pending_approval");
  if (view === "refunds") query = query.eq("refund_owed", true).is("refund_done_at", null);
  if (isIsoDate(day)) {
    query = query.gte("starts_at", `${day}T00:00:00+01:00`).lt("starts_at", `${addDays(day, 1)}T00:00:00+01:00`);
  }
  if (q) {
    if (/^rsf/i.test(q)) {
      query = query.ilike("reference", `%${q}%`);
    } else {
      // Name or phone: find the people first, then their bookings.
      const { data: people } = await supabase.from("profiles").select("id").or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(50);
      const ids = (people ?? []).map((p) => p.id as string);
      query = query.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }
  }
  const { data } = await query;
  const rows = (data as Row[] | null) ?? [];
  const now = Date.now();

  const viewHref = (v: string) => {
    const params = new URLSearchParams({ ...(v ? { view: v } : {}), ...(q ? { q } : {}), ...(isIsoDate(day) ? { day } : {}) }).toString();
    return params ? `/admin/bookings?${params}` : "/admin/bookings";
  };

  return (
    <AdminShell heading={bookingsAdmin.heading} text={bookingsAdmin.text} isAdmin={profile.role === "admin"}>
      <Form action="/admin/bookings" className="mb-5 flex flex-wrap items-end gap-3">
        {view && <input type="hidden" name="view" value={view} />}
        <div className="min-w-0 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
            {bookingsAdmin.searchLabel}
          </label>
          <input id="q" name="q" type="search" defaultValue={q} maxLength={40} className={`${input} w-full`} />
        </div>
        <div>
          <label htmlFor="day" className="mb-1.5 block text-sm font-semibold">
            {bookingsAdmin.dayLabel}
          </label>
          <input id="day" name="day" type="date" defaultValue={isIsoDate(day) ? day : ""} className={input} />
        </div>
        <button type="submit" className={smallButton}>
          {bookingsAdmin.search}
        </button>
      </Form>

      <nav aria-label="Views" className="mb-6 flex flex-wrap gap-2 text-sm">
        {bookingsAdmin.views.map((v) => (
          <Link
            key={v.value || "latest"}
            href={viewHref(v.value)}
            aria-current={v.value === view ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 font-semibold ${
              v.value === view ? "border-navy bg-navy text-white dark:border-white/40 dark:bg-white/15" : "border-navy/30 dark:border-white/30"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p>{bookingsAdmin.empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const who = one(r.profiles);
            const lapsed = r.status === "pending_payment" && r.hold_expires_at && new Date(r.hold_expires_at).getTime() <= now;
            const status = lapsed ? "expired" : r.status;
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-lg font-semibold">{r.reference}</p>
                      <p className="text-sm">{who ? `${who.full_name}, ${who.phone}` : "—"}</p>
                      <p className="text-sm opacity-85">
                        {myBookings.kinds[r.kind] ?? r.kind}: {bookingWhen(r)} · {formatNaira(r.amount_kobo)}
                      </p>
                    </div>
                    <ul className="flex flex-wrap gap-2 text-xs font-semibold">
                      <li className="rounded-full bg-navy px-3 py-1 text-white dark:bg-white/15">{myBookings.statuses[status] ?? status}</li>
                      {r.refund_owed && !r.refund_done_at && <li className="rounded-full bg-accent-red px-3 py-1 text-white">{bookingsAdmin.refundBadge}</li>}
                      {r.refund_owed && r.refund_done_at && <li className="rounded-full bg-brand-green/30 px-3 py-1">{bookingsAdmin.refundedBadge}</li>}
                    </ul>
                  </div>
                  <p className="mt-3">
                    <Link href={`/admin/bookings/${r.id}`} className={smallButton}>
                      {bookingsAdmin.open}
                    </Link>
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-sm opacity-75">{bookingsAdmin.limitNote}</p>
    </AdminShell>
  );
}
