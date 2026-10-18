import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { RegisterForm } from "@/components/auth/AuthForms";
import { register } from "@/content/accounts";
import { getSession } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: register.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  if (await getSession()) redirect("/account");
  return (
    <AuthPage heading={register.heading} text={register.text}>
      <RegisterForm />
      <p className="mt-6 text-sm">
        {register.haveAccount}{" "}
        <Link href={register.haveAccountLink.href} className="font-medium underline underline-offset-2">
          {register.haveAccountLink.label}
        </Link>
      </p>
    </AuthPage>
  );
}
