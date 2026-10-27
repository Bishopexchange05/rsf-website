import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequestDecision } from "@/components/admin/RequestDecision";
import { Card } from "@/components/Card";
import { requestWhatsappMessage, requestsAdmin } from "@/content/overnight";
import { requireRole } from "@/lib/auth";
import { bookingWhen, dateTimeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: requestsAdmin.title, ...noIndex };

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Row = {
  id: string;
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  amount_kobo: number;
  hold_expires_at: string | null;
  age_confirmed_at: string | null;
  created_at: string;
  profiles: One<{ full_name: string; phone: string }>;
};

const outline =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-navy px-4 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("bookings")
    .select("id, reference, kind, starts_at, ends_at, amount_kobo, hold_expires_at, age_confirmed_at, created_at, profiles(full_name, phone)")
    .eq("kind", "night")
    .eq("status", "pending_approval")
    .gt("hold_expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(100);
  const rows = (data as Row[] | null) ?? [];
  const soon = Date.now() + 24 * 3600 * 1000;

  return (
    <AdminShell heading={requestsAdmin.heading} text={requestsAdmin.text} isAdmin={profile.role === "admin"}>
      {rows.length === 0 ? (
        <p>{requestsAdmin.empty}</p>
      ) : (
        <ul className="space-y-5">
          {rows.map((r) => {
            const who = one(r.profiles);
            const digits = who?.phone.replace(/\D/g, "") ?? "";
            const wa = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(requestWhatsappMessage(who!.full_name.split(" ")[0], r.reference))}` : null;
            const expiresSoon = r.hold_expires_at ? new Date(r.hold_expires_at).getTime() < soon : false;
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-mono text-xl font-semibold">{r.reference}</h2>
                      <p className="text-lg font-semibold">{formatNaira(r.amount_kobo)}</p>
                    </div>
                    {expiresSoon && <p className="rounded-full bg-accent-red px-3 py-1 text-xs font-semibold text-white">{requestsAdmin.expiresSoon}</p>}
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div>
                      <dt className="inline font-semibold">{requestsAdmin.customer}: </dt>
                      <dd className="inline">{who ? `${who.full_name}, ${who.phone}` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{requestsAdmin.stay}: </dt>
                      <dd className="inline">{bookingWhen(r)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{requestsAdmin.requested}: </dt>
                      <dd className="inline">{dateTimeLabel(r.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{requestsAdmin.confirmedAge}: </dt>
                      <dd className="inline">{r.age_confirmed_at ? dateTimeLabel(r.age_confirmed_at) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">{requestsAdmin.expires}: </dt>
                      <dd className="inline">{r.hold_expires_at ? dateTimeLabel(r.hold_expires_at) : "—"}</dd>
                    </div>
                  </dl>
                  {wa && (
                    <p className="mt-4">
                      <a href={wa} target="_blank" rel="noopener noreferrer" className={outline}>
                        {requestsAdmin.whatsapp}
                      </a>
                    </p>
                  )}
                  <div className="mt-5 border-t border-slate-navy/10 pt-4 dark:border-white/10">
                    <RequestDecision bookingId={r.id} />
                  </div>
                  <p className="mt-4 text-sm">
                    <Link href={`/admin/bookings/${r.id}`} className="font-medium underline underline-offset-2">
                      {requestsAdmin.open}
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
