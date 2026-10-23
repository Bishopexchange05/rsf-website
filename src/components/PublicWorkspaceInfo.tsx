import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/Card";
import { Reveal } from "@/components/Reveal";
import { publicInfo } from "@/content/admin-settings";
import { weekdays } from "@/content/admin-settings";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled, supabaseConfig, supabaseConfigured } from "@/lib/supabase/config";

// Opening hours, desks and prices on the Tech & Space page. It shows NOTHING
// unless accounts are switched on for this site AND the Admin has turned the
// booking switch on in Settings. While the switch is off, the database returns
// only {"booking_enabled": false}, so no hours or prices can appear early.

type Pub = {
  booking_enabled: true;
  hours: { weekday: number; is_closed: boolean; opens_at: string | null; closes_at: string | null }[];
  day_desks: number;
  overnight_beds: number;
  half_day_split: string;
  monthly_pass_days: number;
  prices: { space: string; kind: string; audience: string; amount_kobo: number }[];
};

async function load(): Promise<Pub | null> {
  if (!accountsEnabled || !supabaseConfigured()) return null;
  try {
    const { url, anonKey } = supabaseConfig();
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Cached for a minute, so a change in Settings shows within about a minute.
      global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60 } }) },
    });
    const { data, error } = await supabase.rpc("get_public_settings");
    if (error || !data || !(data as { booking_enabled?: boolean }).booking_enabled) return null;
    return data as Pub;
  } catch {
    return null;
  }
}

function clock(hhmm: string | null): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export async function PublicWorkspaceInfo() {
  const info = await load();
  if (!info) return null;

  const price = (space: string, kind: string, audience: string) =>
    info.prices.find((p) => p.space === space && p.kind === kind && p.audience === audience)?.amount_kobo ?? null;

  type Line = { label: string; value: number | null; optional?: boolean };
  const standard: Line[] = [
    { label: publicInfo.perHour, value: price("day", "hour", "standard") },
    { label: publicInfo.halfDay, value: price("day", "half_day", "standard"), optional: true },
    { label: publicInfo.perDay, value: price("day", "day", "standard") },
    { label: publicInfo.perMonth(info.monthly_pass_days), value: price("day", "month", "standard") },
  ].filter((l) => !l.optional || l.value !== null);

  // A student price is shown only next to a set standard price for the same option.
  const studentLine = (label: string, kind: string): Line => ({
    label: `${publicInfo.student}: ${label.toLowerCase()}`,
    value: price("day", kind, "standard") !== null ? price("day", kind, "student") : null,
  });
  const students: Line[] = [
    studentLine(publicInfo.perHour, "hour"),
    studentLine(publicInfo.perDay, "day"),
    studentLine(publicInfo.perMonth(info.monthly_pass_days), "month"),
  ].filter((l) => l.value !== null);

  const overnight: Line[] = [
    { label: publicInfo.perNight, value: price("overnight", "night", "standard") },
    { label: publicInfo.overnightMonth, value: price("overnight", "month", "standard"), optional: true },
  ].filter((l) => !l.optional || l.value !== null);

  const money = (l: Line) =>
    l.value === null ? (
      <Link href={publicInfo.contactLink.href} className="font-medium underline underline-offset-2">
        {publicInfo.contactForPricing}
      </Link>
    ) : (
      <span className="font-semibold">{formatNaira(l.value)}</span>
    );

  return (
    <Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3>{publicInfo.hoursHeading}</h3>
          <dl className="mt-4 space-y-1">
            {info.hours.map((h) => (
              <div key={h.weekday} className="flex justify-between gap-4">
                <dt>{weekdays[h.weekday - 1]}</dt>
                <dd>{h.is_closed ? publicInfo.closed : `${clock(h.opens_at)} – ${clock(h.closes_at)}`}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm opacity-85">{publicInfo.desksText(info.day_desks)}</p>
        </Card>

        <Card>
          <h3>{publicInfo.pricesHeading}</h3>
          <dl className="mt-4 space-y-2">
            {standard.map((l) => (
              <div key={l.label} className="flex flex-wrap justify-between gap-x-4">
                <dt>{l.label}</dt>
                <dd>{money(l)}</dd>
              </div>
            ))}
            {students.map((l) => (
              <div key={l.label} className="flex flex-wrap justify-between gap-x-4">
                <dt>{l.label}</dt>
                <dd>{money(l)}</dd>
              </div>
            ))}
            {overnight.map((l) => (
              <div key={l.label} className="flex flex-wrap justify-between gap-x-4">
                <dt>{l.label}</dt>
                <dd>{money(l)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5">
            <Link
              href={publicInfo.book.href}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-amber px-7 py-3 text-center font-heading text-base text-slate-navy transition hover:brightness-95 sm:w-auto"
            >
              {publicInfo.book.label}
            </Link>
          </p>
          <ul className="mt-4 space-y-1 text-sm opacity-85">
            {price("day", "half_day", "standard") !== null && <li>{publicInfo.halfDayNote(clock(info.half_day_split))}</li>}
            <li>{publicInfo.monthNote(info.monthly_pass_days)}</li>
            {students.length > 0 && <li>{publicInfo.studentNote}</li>}
            <li>{publicInfo.overnightNote}</li>
          </ul>
        </Card>
      </div>
    </Reveal>
  );
}
