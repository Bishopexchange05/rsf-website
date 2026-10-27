import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { BookingShell, bookButton, bookInput } from "@/components/booking/BookingShell";
import { Card } from "@/components/Card";
import { PendingButton } from "@/components/PendingButton";
import { errors as bookErrors } from "@/content/booking";
import { overnight, overnightErrors } from "@/content/overnight";
import { requireUser } from "@/lib/auth";
import { requestOvernightAction } from "@/lib/booking-actions";
import { addDays, dayLabel, isIsoDate, lagosDate, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira, parseIntIn } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: overnight.title, ...noIndex };

type Config = {
  booking_enabled: boolean;
  advance_booking_days: number;
  overnight: { enabled: boolean; max_nights?: number; night_price?: number | null; checkin?: string; checkout?: string; request_expiry_days?: number };
};
type Availability = { available: boolean; reason: string | null; full_night: string | null };

const clock = (hhmm: string) => timeLabel(`2000-01-01T${hhmm}:00+01:00`);

export default async function Page({ searchParams }: { searchParams: Promise<{ checkin?: string; nights?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireUser();
  const supabase = await createClient();

  const { data: cfg } = await supabase.rpc("get_booking_config");
  const config = cfg as Config | null;
  if (!config?.booking_enabled) notFound();
  const on = config.overnight;

  const errors = { ...bookErrors, ...overnightErrors };

  if (!on?.enabled) {
    return (
      <BookingShell label={overnight.label} heading={overnight.heading} text={overnight.text}>
        <Card>
          <p>{overnight.closed}</p>
        </Card>
        <p className="mt-6 text-sm">
          <Link href={overnight.back.href} className="font-medium underline underline-offset-2">
            {overnight.back.label}
          </Link>
        </p>
      </BookingShell>
    );
  }

  const today = lagosDate();
  const maxDate = addDays(today, config.advance_booking_days);
  const maxNights = on.max_nights ?? 1;
  const { checkin: checkinParam, nights: nightsParam } = await searchParams;
  const checkin = checkinParam && isIsoDate(checkinParam) && checkinParam >= today && checkinParam <= maxDate ? checkinParam : addDays(today, 1);
  const nights = parseIntIn(nightsParam ?? "1", 1, maxNights) ?? 1;

  const { data: a } = await supabase.rpc("get_overnight_availability", { p_checkin: checkin, p_nights: nights });
  const avail = ((a as Availability[] | null) ?? [])[0] ?? null;
  const price = on.night_price ?? null;

  const lastNight = addDays(checkin, nights);
  const range = `${dayLabel(`${checkin}T12:00:00+01:00`)}, check-in ${clock(on.checkin ?? "00:00")}, to ${dayLabel(`${lastNight}T12:00:00+01:00`)}, check-out ${clock(on.checkout ?? "00:00")}`;

  return (
    <BookingShell label={overnight.label} heading={overnight.heading} text={overnight.text}>
      <Card className="mb-6">
        <h2 className="text-h3">{overnight.steps.heading}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {overnight.steps.list.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Card>

      <Card>
        <Form action="/book/overnight" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="checkin" className="mb-1.5 block text-sm font-semibold">
              {overnight.checkinLabel}
            </label>
            <input id="checkin" name="checkin" type="date" min={today} max={maxDate} defaultValue={checkin} className={bookInput} />
          </div>
          <div>
            <label htmlFor="nights" className="mb-1.5 block text-sm font-semibold">
              {overnight.nightsLabel}
            </label>
            <input id="nights" name="nights" type="number" min={1} max={maxNights} defaultValue={nights} className={`${bookInput} w-28`} />
          </div>
          <PendingButton className={bookButton}>{overnight.check}</PendingButton>
        </Form>
        <p className="mt-2 text-sm opacity-85">{overnight.nightsHelp(maxNights)}</p>
        <p className="mt-1 text-sm opacity-85">{overnight.times(clock(on.checkin ?? "00:00"), clock(on.checkout ?? "00:00"))}</p>

        <p className="mt-4 font-semibold">{overnight.runs(range)}</p>
        {price != null ? (
          <p className="mt-1">{overnight.price(formatNaira(price), formatNaira(price * nights), nights)}</p>
        ) : (
          <p className="mt-1">
            <Link href={overnight.contactHref} className="font-medium underline underline-offset-2">
              {overnight.priceContact}
            </Link>
          </p>
        )}

        {price != null && avail?.available ? (
          <ActionForm action={requestOvernightAction} errors={errors} className="mt-4 space-y-4">
            <input type="hidden" name="checkin" value={checkin} />
            <input type="hidden" name="nights" value={nights} />
            <p className="font-medium">{overnight.available}</p>
            <label className="flex min-h-11 items-start gap-3">
              <input type="checkbox" name="age" className="mt-1 h-5 w-5 shrink-0 accent-navy" />
              <span>
                <span className="block text-sm font-semibold">{overnight.age.label}</span>
                <span className="block text-sm opacity-75">{overnight.age.help}</span>
              </span>
            </label>
            <p className="text-sm opacity-85">{overnight.expiryNote(on.request_expiry_days ?? 3)}</p>
            <PendingButton pendingText="Sending…" className={bookButton}>
              {overnight.submit}
            </PendingButton>
          </ActionForm>
        ) : (
          price != null && (
            <p className="mt-4 font-semibold">
              {avail?.reason === "full" && avail.full_night ? overnight.full(dayLabel(`${avail.full_night}T12:00:00+01:00`)) : avail?.reason === "closed" ? overnight.closed : overnight.outside}
            </p>
          )
        )}
      </Card>

      <p className="mt-6 text-sm">
        <Link href={overnight.back.href} className="font-medium underline underline-offset-2">
          {overnight.back.label}
        </Link>
      </p>
    </BookingShell>
  );
}
