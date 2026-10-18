import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { account, admin } from "@/content/accounts";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: admin.title, ...noIndex };

// Admin and Staff only. Everyone else gets a plain "not found" page. The role is
// read from the database on the server, never from the browser.
export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireRole(["admin", "staff"]);
  return (
    <AuthPage label={admin.label} heading={admin.heading} text={admin.text}>
      <p>{admin.signedInAs(profile.full_name, account.roles[profile.role])}</p>
      <p className="mt-6 text-sm">
        <Link href={admin.back.href} className="font-medium underline underline-offset-2">
          {admin.back.label}
        </Link>
      </p>
    </AuthPage>
  );
}
