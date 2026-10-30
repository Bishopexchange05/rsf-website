import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { deleteAccount } from "@/content/accounts";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: deleteAccount.done.title, ...noIndex };

// Shown after someone deletes their account. Public (the login no longer exists), noindex.
export default function Page() {
  if (!accountsEnabled) notFound();
  return (
    <AuthPage heading={deleteAccount.done.heading} text={deleteAccount.done.text}>
      <p>
        <Link href={deleteAccount.done.home.href} className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
          {deleteAccount.done.home.label}
        </Link>
      </p>
    </AuthPage>
  );
}
