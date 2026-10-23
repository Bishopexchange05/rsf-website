import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SettingsFrame, adminButton } from "@/components/admin/SettingsFrame";
import { Card } from "@/components/Card";
import { settingsHub } from "@/content/admin-settings";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { setBookingEnabledAction } from "@/lib/settings-actions";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: settingsHub.title, ...noIndex };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("booking_enabled").maybeSingle();
  const on = !!data?.booking_enabled;

  return (
    <SettingsFrame heading={settingsHub.heading} text={settingsHub.text} notice={notice} error={error} showBack={false}>
      <Card className="mb-8">
        <h2 className="text-h3">{settingsHub.switchHeading}</h2>
        <p className="mt-2">{on ? settingsHub.switchOnText : settingsHub.switchOffText}</p>
        <form action={setBookingEnabledAction} className="mt-4">
          <input type="hidden" name="enable" value={on ? "false" : "true"} />
          <button type="submit" className={adminButton}>
            {on ? settingsHub.turnOff : settingsHub.turnOn}
          </button>
          {!on && <p className="mt-2 text-sm opacity-75">{settingsHub.turnOnHelp}</p>}
        </form>
      </Card>

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
