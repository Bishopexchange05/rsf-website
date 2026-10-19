import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/Card";
import { account, admin } from "@/content/accounts";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: admin.title, ...noIndex };

// Admin and Staff only, and only after the authenticator-app check. Everyone
// else gets a plain "not found" page. The role is read from the database on the
// server, never from the browser.
export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  const isAdmin = profile.role === "admin";
  return (
    <AdminShell heading={admin.heading} text={admin.text} isAdmin={isAdmin}>
      <p className="mb-6">{admin.signedInAs(profile.full_name, account.roles[profile.role])}</p>
      {isAdmin ? (
        <ul className="grid gap-4 md:grid-cols-3">
          {admin.links.map((l) => (
            <li key={l.href}>
              <Card className="h-full">
                <h2 className="text-h3">
                  <Link href={l.href} className="underline-offset-4 hover:underline">
                    {l.label}
                  </Link>
                </h2>
                <p className="mt-2 text-sm opacity-85">{l.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="opacity-85">{admin.staffNote}</p>
      )}
    </AdminShell>
  );
}
