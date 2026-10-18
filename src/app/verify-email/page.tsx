import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { ResendForm } from "@/components/auth/AuthForms";
import { common, verifyEmail } from "@/content/accounts";
import { noIndex } from "@/lib/no-index";
import { readPendingEmail } from "@/lib/pending-email";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: verifyEmail.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  const email = await readPendingEmail();
  return (
    <AuthPage heading={verifyEmail.heading} text={email ? verifyEmail.textWithEmail(email) : verifyEmail.textNoEmail}>
      <p className="mb-6 opacity-85">{verifyEmail.spam}</p>
      <ResendForm email={email} />
      <p className="mt-6 text-sm">
        {verifyEmail.help}{" "}
        <Link href={common.contactHref} className="font-medium underline underline-offset-2">
          {common.contactLabel}
        </Link>
        .
      </p>
    </AuthPage>
  );
}
