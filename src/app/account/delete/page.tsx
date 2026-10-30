import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { bookInput, bookOutline } from "@/components/booking/BookingShell";
import { PendingButton } from "@/components/PendingButton";
import { deleteAccount } from "@/content/accounts";
import { requireUser } from "@/lib/auth";
import { deleteAccountAction } from "@/lib/account-data-actions";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: deleteAccount.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { profile } = await requireUser();
  if (profile.role !== "member") redirect("/account");

  return (
    <AuthPage heading={deleteAccount.heading} text={deleteAccount.text}>
      <h2 className="text-h3">{deleteAccount.whatHappens.heading}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        {deleteAccount.whatHappens.list.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm opacity-85">{deleteAccount.blockers}</p>

      <ActionForm action={deleteAccountAction} errors={deleteAccount.errors} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
            {deleteAccount.passwordLabel}
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={`${bookInput} w-full`} />
        </div>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" name="confirm" className="mt-1 h-5 w-5 shrink-0 accent-navy" />
          <span className="text-sm font-semibold">{deleteAccount.confirmLabel}</span>
        </label>
        <PendingButton className={bookOutline} pendingText={deleteAccount.pending}>
          {deleteAccount.button}
        </PendingButton>
      </ActionForm>

      <p className="mt-6">
        <Link href={deleteAccount.back.href} className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
          {deleteAccount.back.label}
        </Link>
      </p>
    </AuthPage>
  );
}
