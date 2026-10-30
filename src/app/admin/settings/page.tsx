import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { readiness as readinessText, settingsHub, errors, notices } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { dateTimeLabel } from "@/lib/lagos";
import { readiness } from "@/lib/readiness";
import { setBookingEnabledAction, setLegalReviewAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PendingButton } from "@/components/PendingButton";

export const metadata: Metadata = { title: settingsHub.title, ...noIndex };

export default async function Page() {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("booking_enabled").maybeSingle();
  const on = !!data?.booking_enabled;
  // Read separately, so the booking switch always shows its true state even if this column is missing.
  const { data: legal } = await supabase.from("settings").select("legal_review_done_at").maybeSingle();
  const legalDoneAt = (legal?.legal_review_done_at as string | null | undefined) ?? null;
  const checks = readiness(legalDoneAt);
  const notReady = checks.filter((c) => !c.ok).length;

  return (
    <SettingsFrame heading={settingsHub.heading} text={settingsHub.text} showBack={false}>
      <Card className="mb-8">
        <h2 className="text-h3">{settingsHub.switchHeading}</h2>
        <p className="mt-2">{on ? settingsHub.switchOnText : settingsHub.switchOffText}</p>
        <ActionForm action={setBookingEnabledAction} notices={notices} errors={errors} className="mt-4">
          <input type="hidden" name="enable" value={on ? "false" : "true"} />
          <PendingButton className={adminButton}>
            {on ? settingsHub.turnOff : notReady > 0 ? settingsHub.turnOnAnyway : settingsHub.turnOn}
          </PendingButton>
          {!on && <p className="mt-2 text-sm opacity-75">{settingsHub.turnOnHelp}</p>}
        </ActionForm>
      </Card>

      {!on && (
        <Card className="mb-8">
          <h2 className="text-h3">{readinessText.heading}</h2>
          <p className="mt-2 text-sm opacity-85">{readinessText.intro}</p>
          {notReady === 0 && <p className="mt-3 font-semibold">{readinessText.allGood}</p>}
          <ul className="mt-4 space-y-4">
            {checks.map((c) => {
              const item = readinessText.items[c.id];
              const okText = c.id === "legal" ? readinessText.items.legal.ok(legalDoneAt ? dateTimeLabel(legalDoneAt) : "") : (item as { ok: string }).ok;
              return (
                <li key={c.id}>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.ok ? "bg-brand-green/30" : "bg-amber/50"}`}>
                      {c.ok ? readinessText.ready : readinessText.notReady}
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </p>
                  <p className="mt-1 text-sm opacity-85">{c.ok ? okText : item.warn}</p>
                  {c.id === "legal" && (
                    <ActionForm action={setLegalReviewAction} notices={notices} errors={errors} className="mt-2">
                      <input type="hidden" name="done" value={c.ok ? "false" : "true"} />
                      <PendingButton className={adminButton}>
                        {c.ok ? readinessText.items.legal.unmark : readinessText.items.legal.mark}
                      </PendingButton>
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {settingsHub.sections.map((s) => (
          <li key={s.href}>
            <Card className="h-full">
              <h2 className="text-h3">
                <Link href={s.href} className="underline-offset-4 hover:underline">
                  {s.label}
                </Link>
              </h2>
              <p className="mt-2 text-sm opacity-85">{s.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </SettingsFrame>
  );
}
