import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { confirm, reset } from "@/content/accounts";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: reset.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  // Only reachable after opening the link from the reset email (that link signs
  // the person in for this one purpose).
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <AuthPage heading={confirm.invalidHeading} text={reset.needLink}>
        <Link href={confirm.newReset.href} className="font-medium underline underline-offset-2">
          {confirm.newReset.label}
        </Link>
      </AuthPage>
    );
  }
  return (
    <AuthPage heading={reset.heading} text={reset.text}>
      <ResetPasswordForm />
    </AuthPage>
  );
}
