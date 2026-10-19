import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { ChallengeForm } from "@/components/auth/TwoFactorForms";
import { twoFactor } from "@/content/accounts";
import { getAal, needsTwoFactor, requireUser } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: twoFactor.challenge.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireUser();
  const aal = await getAal();
  const home = needsTwoFactor(profile.role) ? "/admin" : "/account";
  if (aal.current === "aal2") redirect(home);
  if (aal.next !== "aal2") redirect(needsTwoFactor(profile.role) ? "/two-factor/setup" : "/account");
  return (
    <AuthPage label={twoFactor.label} heading={twoFactor.challenge.heading} text={twoFactor.challenge.text}>
      <ChallengeForm />
    </AuthPage>
  );
}
