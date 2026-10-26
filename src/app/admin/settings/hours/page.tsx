import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton, adminInput } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { hoursPage, weekdays, errors, notices } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { saveHoursAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PendingButton } from "@/components/PendingButton";

export const metadata: Metadata = { title: hoursPage.title, ...noIndex };

type Row = { weekday: number; is_closed: boolean; opens_at: string | null; closes_at: string | null };

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export default async function Page() {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("opening_hours").select("weekday, is_closed, opens_at, closes_at").order("weekday");
  const rows = (data as Row[] | null) ?? [];

  return (
    <SettingsFrame heading={hoursPage.heading} text={hoursPage.text}>
      <ActionForm action={saveHoursAction} notices={notices} errors={errors}>
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.weekday}>
              <Card>
                <h2 className="text-h3">{weekdays[r.weekday - 1]}</h2>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name={`closed-${r.weekday}`} defaultChecked={r.is_closed} className="h-5 w-5 accent-navy" />
                    {hoursPage.closed}
                  </label>
                  <div>
                    <label htmlFor={`open-${r.weekday}`} className="mb-1.5 block text-sm font-semibold">
                      {hoursPage.opens}
                    </label>
                    <input id={`open-${r.weekday}`} name={`open-${r.weekday}`} type="time" defaultValue={hhmm(r.opens_at)} className={adminInput} />
                  </div>
                  <div>
                    <label htmlFor={`close-${r.weekday}`} className="mb-1.5 block text-sm font-semibold">
                      {hoursPage.closes}
                    </label>
                    <input id={`close-${r.weekday}`} name={`close-${r.weekday}`} type="time" defaultValue={hhmm(r.closes_at)} className={adminInput} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <PendingButton className={`${adminButton} mt-6`}>
          {hoursPage.save}
        </PendingButton>
      </ActionForm>
    </SettingsFrame>
  );
}
