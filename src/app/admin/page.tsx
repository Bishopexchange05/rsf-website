import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/Card";
import { account, admin } from "@/content/accounts";
import { staffNav } from "@/content/payments";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: admin.title, ...noIndex };

// Admin and Staff only, and only after the authenticator-app check. Everyone
// else gets a plain "not found" page. The role is read from the database on the
// server, never from the browser.
export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();
  const [{ count: toCheck }, { count: refunds }, { count: endingSoon }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "payment_claimed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("refund_owed", true).is("refund_done_at", null),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("kind", "month")
      .eq("status", "confirmed")
      .gt("ends_at", new Date().toISOString())
      .lte("ends_at", new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()),
  ]);

  const cards = [
    { ...staffNav.payments, badge: toCheck ? `${toCheck} to check` : null },
    { ...staffNav.bookings, badge: refunds ? `${refunds} refund${refunds === 1 ? "" : "s"} owed` : null, href: refunds ? "/admin/bookings?view=refunds" : staffNav.bookings.href },
    { ...staffNav.passes, badge: endingSoon ? `${endingSoon} ending soon` : null },
    ...(isAdmin ? admin.links.map((l) => ({ ...l, badge: null as string | null })) : []),
  ];

  return (
    <AdminShell heading={admin.heading} text={admin.text} isAdmin={isAdmin}>
      <p className="mb-6">{admin.signedInAs(profile.full_name, account.roles[profile.role])}</p>
      <ul className="grid gap-4 md:grid-cols-3">
        {cards.map((l) => (
          <li key={l.label}>
            <Card className="h-full">
              <h2 className="text-h3">
                <Link href={l.href} className="underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </h2>
              {l.badge && <p className="mt-2 inline-block rounded-full bg-amber/40 px-3 py-1 text-sm font-semibold">{l.badge}</p>}
              <p className="mt-2 text-sm opacity-85">{l.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
