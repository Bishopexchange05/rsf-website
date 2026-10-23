import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton, adminInput, adminTextarea } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { overnightPage } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { saveOvernightAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: overnightPage.title, ...noIndex };

const hhmm = (t: unknown) => (typeof t === "string" ? t.slice(0, 5) : "");

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("overnight_checkin, overnight_checkout, overnight_location_private, overnight_rules_text")
    .maybeSingle();

  return (
    <SettingsFrame heading={overnightPage.heading} text={overnightPage.text} notice={notice} error={error}>
      <form action={saveOvernightAction} className="space-y-4">
        <Card>
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="checkin" className="mb-1.5 block text-sm font-semibold">
                {overnightPage.checkin}
              </label>
              <input id="checkin" name="checkin" type="time" defaultValue={hhmm(data?.overnight_checkin)} className={adminInput} />
            </div>
            <div>
              <label htmlFor="checkout" className="mb-1.5 block text-sm font-semibold">
                {overnightPage.checkout}
              </label>
              <input id="checkout" name="checkout" type="time" defaultValue={hhmm(data?.overnight_checkout)} className={adminInput} />
            </div>
          </div>
        </Card>
        <Card>
          <label htmlFor="location" className="mb-1.5 block text-sm font-semibold">
            {overnightPage.location}
          </label>
          <textarea id="location" name="location" rows={3} maxLength={500} defaultValue={data?.overnight_location_private ?? ""} className={adminTextarea} />
          <p className="mt-1 text-sm opacity-75">{overnightPage.locationHelp}</p>
        </Card>
        <Card>
          <label htmlFor="rules" className="mb-1.5 block text-sm font-semibold">
            {overnightPage.rules}
          </label>
          <textarea id="rules" name="rules" rows={6} maxLength={2000} defaultValue={data?.overnight_rules_text ?? ""} className={adminTextarea} />
          <p className="mt-1 text-sm opacity-75">{overnightPage.rulesHelp}</p>
        </Card>
        <button type="submit" className={adminButton}>
          {overnightPage.save}
        </button>
      </form>
    </SettingsFrame>
  );
}
