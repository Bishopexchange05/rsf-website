import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { ChangePasswordForm, ProfileForm } from "@/components/auth/AuthForms";
import { RegenerateCodes } from "@/components/auth/TwoFactorForms";
import { Panel } from "@/components/Panel";
import { account, settingsPage, twoFactor } from "@/content/accounts";
import { getAal, needsTwoFactor, requireUser } from "@/lib/auth";
import { countUnusedRecoveryCodes } from "@/lib/mfa";
import { noIndex } from "@/lib/no-index";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { accountsEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: settingsPage.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  const { user, profile } = await requireUser();
  const staff = needsTwoFactor(profile.role);
  const aal = staff ? await getAal() : null;
  const enrolled = aal?.next === "aal2";
  const codesLeft = enrolled && adminConfigured() ? await countUnusedRecoveryCodes(createAdminClient(), user.id) : null;
  const link = "inline-flex min-h-11 items-center font-semibold underline underline-offset-2";

  return (
    <AccountShell active="settings" heading={settingsPage.heading} text={settingsPage.text} staff={staff} wide>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel className="p-6 sm:p-8">
          <h2 className="text-h3">{account.detailsHeading}</h2>
          <dl className="mt-4 space-y-1 text-sm">
            <div>
              <dt className="inline font-semibold">{account.emailLabel}: </dt>
              <dd className="inline break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{account.roleLabel}: </dt>
              <dd className="inline">{account.roles[profile.role]}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <ProfileForm fullName={profile.full_name} phone={profile.phone} />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6 sm:p-8">
            <h2 className="text-h3">{account.passwordHeading}</h2>
            <div className="mt-4">
              <ChangePasswordForm />
            </div>
          </Panel>

          {staff && (
            <Panel className="p-6 sm:p-8">
              <h2 className="text-h3">{twoFactor.account.heading}</h2>
              <div className="mt-4 space-y-3">
                <p>{enrolled ? twoFactor.account.on : twoFactor.account.off}</p>
                {!enrolled && (
                  <Link href={twoFactor.account.setupLink.href} className={link}>
                    {twoFactor.account.setupLink.label}
                  </Link>
                )}
                {enrolled && codesLeft !== null && <p className="text-sm">{twoFactor.account.codesLeft(codesLeft)}</p>}
                {enrolled && aal?.current === "aal2" && <RegenerateCodes />}
              </div>
            </Panel>
          )}

          <Panel className="p-6 sm:p-8">
            <h2 className="text-h3">{account.data.heading}</h2>
            <p className="mt-3">{account.data.text}</p>
            <p className="mt-3">
              <a href="/api/account/export" download className={link}>
                {account.data.download}
              </a>
              <span className="block text-sm opacity-75">{account.data.downloadHelp}</span>
            </p>
            {staff ? (
              <p className="mt-4 text-sm opacity-85">{account.data.staffNote}</p>
            ) : (
              <div className="mt-6 rounded-xl border border-accent-red/30 p-4 dark:border-red-300/30">
                <h3 className="text-base font-semibold">{settingsPage.dangerHeading}</h3>
                <p className="mt-1 text-sm opacity-85">{settingsPage.dangerText}</p>
                <Link href={account.data.deleteLink.href} className={`${link} text-accent-red dark:text-red-300`}>
                  {account.data.deleteLink.label}
                </Link>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AccountShell>
  );
}
