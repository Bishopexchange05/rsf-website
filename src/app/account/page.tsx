import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { ChangePasswordForm, ProfileForm } from "@/components/auth/AuthForms";
import { account } from "@/content/accounts";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: account.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!accountsEnabled) notFound();
  const { user, profile } = await requireUser();
  const { notice } = await searchParams;
  const message = notice ? account.notices[notice] : undefined;
  const staffOrAdmin = profile.role === "admin" || profile.role === "staff";
  return (
    <AuthPage heading={account.heading} text={account.text}>
      {message && (
        <p role="status" className="mb-5 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
          {message}
        </p>
      )}
      <h2 className="text-h3">{account.detailsHeading}</h2>
      <dl className="mt-4 space-y-1 text-sm">
        <div>
          <dt className="inline font-semibold">{account.emailLabel}: </dt>
          <dd className="inline">{user.email}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">{account.roleLabel}: </dt>
          <dd className="inline">{account.roles[profile.role]}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <ProfileForm fullName={profile.full_name} phone={profile.phone} />
      </div>

      <h2 className="mt-10 text-h3">{account.passwordHeading}</h2>
      <div className="mt-4">
        <ChangePasswordForm />
      </div>

      {staffOrAdmin && (
        <p className="mt-8 text-sm">
          <Link href={account.adminLink.href} className="font-medium underline underline-offset-2">
            {account.adminLink.label}
          </Link>
        </p>
      )}

      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-navy px-7 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg"
        >
          {account.signOut}
        </button>
      </form>
    </AuthPage>
  );
}
