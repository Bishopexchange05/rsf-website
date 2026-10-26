import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton, adminInput } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { capacityPage, errors, notices } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { saveCapacityAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PendingButton } from "@/components/PendingButton";

export const metadata: Metadata = { title: capacityPage.title, ...noIndex };

type Space = { slug: string; capacity: number; is_bookable: boolean };

export default async function Page() {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("spaces").select("slug, capacity, is_bookable");
  const spaces = (data as Space[] | null) ?? [];
  const day = spaces.find((s) => s.slug === "day");
  const overnight = spaces.find((s) => s.slug === "overnight");

  return (
    <SettingsFrame heading={capacityPage.heading} text={capacityPage.text}>
      <ActionForm action={saveCapacityAction} notices={notices} errors={errors} className="space-y-4">
        <Card>
          <label htmlFor="day_capacity" className="mb-1.5 block text-sm font-semibold">
            {capacityPage.dayLabel}
          </label>
          <input id="day_capacity" name="day_capacity" type="number" inputMode="numeric" min={0} max={1000} required defaultValue={day?.capacity} className={`${adminInput} max-w-40`} />
          <p className="mt-1 text-sm opacity-75">{capacityPage.dayHelp}</p>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="day_bookable" defaultChecked={day?.is_bookable} className="h-5 w-5 accent-navy" />
            {capacityPage.bookable}
          </label>
        </Card>
        <Card>
          <label htmlFor="overnight_capacity" className="mb-1.5 block text-sm font-semibold">
            {capacityPage.overnightLabel}
          </label>
          <input id="overnight_capacity" name="overnight_capacity" type="number" inputMode="numeric" min={0} max={1000} required defaultValue={overnight?.capacity} className={`${adminInput} max-w-40`} />
          <p className="mt-1 text-sm opacity-75">{capacityPage.overnightHelp}</p>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="overnight_bookable" defaultChecked={overnight?.is_bookable} className="h-5 w-5 accent-navy" />
            {capacityPage.bookable}
          </label>
        </Card>
        <p className="text-sm opacity-85">{capacityPage.lowerWarning}</p>
        <PendingButton className={adminButton}>
          {capacityPage.save}
        </PendingButton>
      </ActionForm>
    </SettingsFrame>
  );
}
