import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { EnrollPanel } from "@/components/auth/TwoFactorForms";
import { twoFactor } from "@/content/accounts";
import { getAal, needsTwoFactor, requireUser } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: twoFactor.setup.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!accountsEnabled) notFound();
  const { profile } = await requireUser();
  if (!needsTwoFactor(profile.role)) redirect("/account");
  const aal = await getAal();
  if (aal.current === "aal2") redirect("/admin");
  if (aal.next === "aal2") redirect("/two-factor");
  const { notice } = await searchParams;
  return (
    <AuthPage label={twoFactor.label} heading={twoFactor.setup.heading} text={twoFactor.setup.text}>
      {notice === "recovered" && (
        <p role="status" className="mb-5 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
          {twoFactor.recovery.notice}
        </p>
      )}
      <EnrollPanel />
    </AuthPage>
  );
}
