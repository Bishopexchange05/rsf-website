import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingShell, bookButton, bookInput } from "@/components/booking/BookingShell";
import { Card } from "@/components/Card";
import { bookPage } from "@/content/booking";
import { requireUser } from "@/lib/auth";
import { createBookingAction } from "@/lib/booking-actions";
import { addDays, isIsoDate, lagosDate, lagosHHMM, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: bookPage.title, ...noIndex };

type Config = {
  booking_enabled: boolean;
  advance_booking_days: number;
  max_hours_per_booking: number;
  half_day_split: string;
  prices: Partial<Record<"hour" | "half_day" | "day", { standard: number; student: number | null }>>;
};
type Slot = { slot_start: string; slot_end: string; remaining: number; open_for_booking: boolean };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; error?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireUser();
  const supabase = await createClient();

  const { data: cfg } = await supabase.rpc("get_booking_config");
  const config = cfg as Config | null;
  if (!config?.booking_enabled) notFound();

  const today = lagosDate();
  const maxDate = addDays(today, config.advance_booking_days);
  const { date: dateParam, error } = await searchParams;
  const date = dateParam && isIsoDate(dateParam) && dateParam >= today && dateParam <= maxDate ? dateParam : today;

  const { data: slotData } = await supabase.rpc("get_day_availability", { p_date: date });
  const slots = (slotData as Slot[] | null) ?? [];
  const bookable = (s: Slot) => s.open_for_booking && s.remaining > 0;

  const morning = slots.filter((s) => lagosHHMM(s.slot_start) < config.half_day_split);
  const afternoon = slots.filter((s) => lagosHHMM(s.slot_start) >= config.half_day_split);
  const allOk = (group: Slot[]) => group.length > 0 && group.every(bookable);

  const p = config.prices;
  const dayName = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00+01:00`));

  const studentBox = (kind: "hour" | "half_day" | "day") =>
    p[kind]?.student != null ? (
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="student" className="mt-1 h-5 w-5 shrink-0 accent-navy" />
        <span>
          <span className="block text-sm font-semibold">{bookPage.student.label}</span>
          <span className="block text-sm opacity-75">{bookPage.student.help}</span>
        </span>
      </label>
    ) : null;

  return (
    <BookingShell label={bookPage.label} heading={bookPage.heading} text={bookPage.text} error={error}>
      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="date" className="mb-1.5 block text-sm font-semibold">
              {bookPage.dateLabel}
            </label>
            <input id="date" name="date" type="date" min={today} max={maxDate} defaultValue={date} className={bookInput} />
          </div>
          <button type="submit" className={bookButton}>
            {bookPage.dateButton}
          </button>
        </form>
        <p className="mt-3 font-semibold">{dayName}</p>
        <p className="mt-1 text-sm">
          <Link href={bookPage.accountLink.href} className="font-medium underline underline-offset-2">
            {bookPage.accountLink.label}
          </Link>
        </p>
      </Card>

      {slots.length === 0 ? (
        <p>{bookPage.closedDay}</p>
      ) : (
        <div className="space-y-6">
          {/* ---- by the hour ---- */}
          <Card>
            <h2 className="text-h3">{bookPage.hourly.heading}</h2>
            {p.hour ? (
              <form action={createBookingAction} className="mt-4 space-y-4">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="kind" value="hour" />
                <p className="text-sm">
                  {bookPage.prices.perHour(formatNaira(p.hour.standard))}
                  {p.hour.student != null && <span className="block">{bookPage.prices.studentPerHour(formatNaira(p.hour.student))}</span>}
                </p>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">{bookPage.hourly.startLabel}</legend>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {slots.map((s) => {
                      const ok = bookable(s);
                      return (
                        <li key={s.slot_start}>
                          <label className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 ${ok ? "cursor-pointer border-slate-navy/25 dark:border-white/25" : "border-slate-navy/10 opacity-60 dark:border-white/10"}`}>
                            <input type="radio" name="start" value={lagosHHMM(s.slot_start)} disabled={!ok} required className="h-5 w-5 accent-navy" />
                            <span className="flex-1 text-sm">
                              {timeLabel(s.slot_start)} to {timeLabel(s.slot_end)}
                            </span>
                            <span className="text-xs font-semibold opacity-80">
                              {!s.open_for_booking ? bookPage.hourly.passed : s.remaining > 0 ? bookPage.hourly.left(s.remaining) : bookPage.hourly.full}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
                <div>
                  <label htmlFor="hours" className="mb-1.5 block text-sm font-semibold">
                    {bookPage.hourly.hoursLabel}
                  </label>
                  <select id="hours" name="hours" defaultValue="1" className={`${bookInput} max-w-40`}>
                    {Array.from({ length: Math.min(config.max_hours_per_booking, slots.length) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                {studentBox("hour")}
                <button type="submit" className={bookButton}>
                  {bookPage.hourly.submit}
                </button>
              </form>
            ) : (
              <p className="mt-3">
                <Link href={bookPage.contactHref} className="font-medium underline underline-offset-2">
                  {bookPage.prices.contact}
                </Link>
              </p>
            )}
          </Card>

          {/* ---- half day (only when a half-day price is set) ---- */}
          {p.half_day && (
            <Card>
              <h2 className="text-h3">{bookPage.half.heading}</h2>
              <p className="mt-2 text-sm">{formatNaira(p.half_day.standard)}</p>
              <form action={createBookingAction} className="mt-4 space-y-4">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="kind" value="half_day" />
                <div className="flex flex-wrap gap-3">
                  <button type="submit" name="half" value="morning" disabled={!allOk(morning)} className={bookButton}>
                    {allOk(morning)
                      ? `${bookPage.half.morning}: ${timeLabel(morning[0].slot_start)} to ${timeLabel(morning[morning.length - 1].slot_end)}`
                      : `${bookPage.half.morning}: ${bookPage.half.unavailable}`}
                  </button>
                  <button type="submit" name="half" value="afternoon" disabled={!allOk(afternoon)} className={bookButton}>
                    {allOk(afternoon)
                      ? `${bookPage.half.afternoon}: ${timeLabel(afternoon[0].slot_start)} to ${timeLabel(afternoon[afternoon.length - 1].slot_end)}`
                      : `${bookPage.half.afternoon}: ${bookPage.half.unavailable}`}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* ---- full day ---- */}
          <Card>
            <h2 className="text-h3">{bookPage.full.heading}</h2>
            {p.day ? (
              <form action={createBookingAction} className="mt-4 space-y-4">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="kind" value="day" />
                <p className="text-sm">
                  {formatNaira(p.day.standard)}
                  {p.day.student != null && <span className="block">{bookPage.prices.studentFlat(formatNaira(p.day.student))}</span>}
                </p>
                {studentBox("day")}
                <button type="submit" disabled={!allOk(slots)} className={bookButton}>
                  {allOk(slots) ? bookPage.full.submit : bookPage.full.unavailable}
                </button>
              </form>
            ) : (
              <p className="mt-3">
                <Link href={bookPage.contactHref} className="font-medium underline underline-offset-2">
                  {bookPage.prices.contact}
                </Link>
              </p>
            )}
          </Card>
        </div>
      )}
    </BookingShell>
  );
}
