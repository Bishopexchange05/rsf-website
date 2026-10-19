import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { RecoveryForm } from "@/components/auth/TwoFactorForms";
import { twoFactor } from "@/content/accounts";
import { requireUser } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: twoFactor.recovery.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  await requireUser();
  return (
    <AuthPage label={twoFactor.label} heading={twoFactor.recovery.heading} text={twoFactor.recovery.text}>
      <RecoveryForm />
    </AuthPage>
  );
}
