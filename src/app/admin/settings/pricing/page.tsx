import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton, adminInput } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { pricingPage, errors, notices } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { koboToNaira } from "@/lib/settings-validation";
import { savePricesAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PendingButton } from "@/components/PendingButton";

export const metadata: Metadata = { title: pricingPage.title, ...noIndex };

type PriceRow = { kind: string; audience: string; amount_kobo: number | null; spaces: { slug: string } | { slug: string }[] | null };

export default async function Page() {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("prices").select("kind, audience, amount_kobo, spaces(slug)");
  const current = new Map<string, number | null>();
  for (const r of (data as PriceRow[] | null) ?? []) {
    const slug = Array.isArray(r.spaces) ? r.spaces[0]?.slug : r.spaces?.slug;
    if (slug) current.set(`${slug}-${r.kind}-${r.audience}`, r.amount_kobo);
  }

  return (
    <SettingsFrame heading={pricingPage.heading} text={pricingPage.text}>
      <Card className="mb-6">
        <h2 className="text-h3">{pricingPage.rulesHeading}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {pricingPage.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      <ActionForm action={savePricesAction} notices={notices} errors={errors} className="space-y-6">
        {pricingPage.groups.map((g) => (
          <Card key={g.heading}>
            <h2 className="text-h3">{g.heading}</h2>
            <div className="mt-4 space-y-4">
              {g.rows.map((r) => {
                const name = `price-${r.space}-${r.kind}-${r.audience}`;
                return (
                  <div key={name}>
                    <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
                      {r.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-lg font-semibold">
                        {pricingPage.currency}
                      </span>
                      <input
                        id={name}
                        name={name}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Not set"
                        defaultValue={koboToNaira(current.get(`${r.space}-${r.kind}-${r.audience}`))}
                        className={`${adminInput} max-w-48`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
        <PendingButton className={adminButton}>
          {pricingPage.save}
        </PendingButton>
      </ActionForm>
    </SettingsFrame>
  );
}
