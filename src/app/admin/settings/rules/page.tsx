import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton, adminInput } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { rulesPage } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { saveRulesAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: rulesPage.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").maybeSingle();
  const s = (data ?? {}) as Record<string, number | string | boolean | null>;

  return (
    <SettingsFrame heading={rulesPage.heading} text={rulesPage.text} notice={notice} error={error}>
      <form action={saveRulesAction} className="space-y-4">
        {rulesPage.fields.map((f) => (
          <Card key={f.name}>
            <label htmlFor={f.name} className="mb-1.5 block text-sm font-semibold">
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type="number"
              inputMode="numeric"
              min={f.min}
              max={f.max}
              required
              defaultValue={s[f.name] as number | undefined}
              className={`${adminInput} max-w-40`}
            />
            <p className="mt-1 text-sm opacity-75">{f.help}</p>
          </Card>
        ))}
        <Card>
          <label htmlFor="half_day_split" className="mb-1.5 block text-sm font-semibold">
            {rulesPage.halfDayLabel}
          </label>
          <input id="half_day_split" name="half_day_split" type="time" required defaultValue={String(s.half_day_split ?? "13:00").slice(0, 5)} className={`${adminInput} max-w-40`} />
          <p className="mt-1 text-sm opacity-75">{rulesPage.halfDayHelp}</p>
        </Card>
        <Card>
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" name="require_verified_email" defaultChecked={!!s.require_verified_email} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
            <span>
              <span className="block text-sm font-semibold">{rulesPage.verifiedEmailLabel}</span>
              <span className="block text-sm opacity-75">{rulesPage.verifiedEmailHelp}</span>
            </span>
          </label>
        </Card>
        <button type="submit" className={adminButton}>
          {rulesPage.save}
        </button>
      </form>
    </SettingsFrame>
  );
}
