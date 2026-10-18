import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { LoginForm } from "@/components/auth/AuthForms";
import { login } from "@/content/accounts";
import { getSession } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: login.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!accountsEnabled) notFound();
  if (await getSession()) redirect("/account");
  const { notice } = await searchParams;
  const message = notice ? login.notices[notice] : undefined;
  return (
    <AuthPage heading={login.heading} text={login.text}>
      {message && (
        <p role="status" className="mb-5 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
          {message}
        </p>
      )}
      <LoginForm />
      <p className="mt-6 text-sm">
        {login.noAccount}{" "}
        <Link href={login.noAccountLink.href} className="font-medium underline underline-offset-2">
          {login.noAccountLink.label}
        </Link>
      </p>
    </AuthPage>
  );
}
