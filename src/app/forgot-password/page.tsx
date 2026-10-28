import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import { forgot } from "@/content/accounts";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: forgot.title, ...noIndex };

export default function Page() {
  if (!accountsEnabled) notFound();
  return (
    <AuthPage heading={forgot.heading} text={forgot.text}>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm">
        <Link href={forgot.back.href} className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
          {forgot.back.label}
        </Link>
      </p>
    </AuthPage>
  );
}
