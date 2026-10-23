import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton, adminInput, adminTextarea } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { bankPage } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { saveBankAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: bankPage.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("bank_details").select("bank_name, account_number, account_name, note").maybeSingle();

  return (
    <SettingsFrame heading={bankPage.heading} text={bankPage.text} notice={notice} error={error}>
      <form action={saveBankAction} className="space-y-4">
        <Card className="space-y-4">
          <div>
            <label htmlFor="bank_name" className="mb-1.5 block text-sm font-semibold">
              {bankPage.bankName}
            </label>
            <input id="bank_name" name="bank_name" type="text" maxLength={80} defaultValue={data?.bank_name ?? ""} className={adminInput} />
          </div>
          <div>
            <label htmlFor="account_number" className="mb-1.5 block text-sm font-semibold">
              {bankPage.accountNumber}
            </label>
            <input
              id="account_number"
              name="account_number"
              type="text"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              autoComplete="off"
              defaultValue={data?.account_number ?? ""}
              className={`${adminInput} max-w-60`}
            />
          </div>
          <div>
            <label htmlFor="account_name" className="mb-1.5 block text-sm font-semibold">
              {bankPage.accountName}
            </label>
            <input id="account_name" name="account_name" type="text" maxLength={120} defaultValue={data?.account_name ?? ""} className={adminInput} />
          </div>
          <div>
            <label htmlFor="note" className="mb-1.5 block text-sm font-semibold">
              {bankPage.note}
            </label>
            <textarea id="note" name="note" rows={3} maxLength={300} defaultValue={data?.note ?? ""} className={adminTextarea} />
          </div>
        </Card>
        <button type="submit" className={adminButton}>
          {bankPage.save}
        </button>
      </form>
    </SettingsFrame>
  );
}
