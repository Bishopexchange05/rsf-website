import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { confirm } from "@/content/accounts";
import { confirmAction } from "@/lib/auth-actions";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: confirm.title, ...noIndex };

type Params = { token_hash?: string; type?: string; error?: string };

// The link in the email lands here. Nothing happens until the person presses the
// button, so email scanners that open links cannot use up the one-time token.
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  if (!accountsEnabled) notFound();
  const { token_hash, type, error } = await searchParams;
  const recovery = type === "recovery";
  const valid =
    !error &&
    !!token_hash &&
    /^[A-Za-z0-9_-]{10,200}$/.test(token_hash) &&
    ["email", "signup", "recovery"].includes(type ?? "");

  if (!valid) {
    const next = recovery ? confirm.newReset : confirm.newVerification;
    return (
      <AuthPage heading={confirm.invalidHeading} text={confirm.invalidText}>
        <Link href={next.href} className="font-medium underline underline-offset-2">
          {next.label}
        </Link>
      </AuthPage>
    );
  }

  return (
    <AuthPage heading={confirm.heading} text={recovery ? confirm.recoveryText : confirm.verifyText}>
      <form action={confirmAction}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <button
          type="submit"
          className="min-h-12 w-full rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95"
        >
          {recovery ? confirm.recoveryButton : confirm.verifyButton}
        </button>
      </form>
    </AuthPage>
  );
}
