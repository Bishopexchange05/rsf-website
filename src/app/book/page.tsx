import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingShell, bookButton, bookInput } from "@/components/booking/BookingShell";
import { HourPicker, type PickerSlot } from "@/components/booking/HourPicker";
import { Card } from "@/components/Card";
import { common } from "@/content/accounts";
import { bookPage, errors as bookErrors } from "@/content/booking";
import { requireUser } from "@/lib/auth";
import { createBookingAction } from "@/lib/booking-actions";
import { addDays, isIsoDate, lagosDate, lagosHHMM, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PendingButton } from "@/components/PendingButton";

export const metadata: Metadata = { title: bookPage.title, ...noIndex };

type Config = {
  booking_enabled: boolean;
  advance_booking_days: number;
  max_hours_per_booking: number;
  half_day_split: string;
  prices: Partial<Record<"hour" | "half_day" | "day", { standard: number; student: number | null }>>;
};
type Slot = { slot_start: string; slot_end: string; remaining: number; open_for_booking: boolean };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireUser();
  const supabase = await createClient();

  const { data: cfg } = await supabase.rpc("get_booking_config");
  const config = cfg as Config | null;
  if (!config?.booking_enabled) notFound();

  const today = lagosDate();
  const maxDate = addDays(today, config.advance_booking_days);
  const { date: dateParam } = await searchParams;
  const date = dateParam && isIsoDate(dateParam) && dateParam >= today && dateParam <= maxDate ? dateParam : today;

  const { data: slotData } = await supabase.rpc("get_day_availability", { p_date: date });
  const slots = (slotData as Slot[] | null) ?? [];
  const bookable = (s: Slot) => s.open_for_booking && s.remaining > 0;

  const morning = slots.filter((s) => lagosHHMM(s.slot_start) < config.half_day_split);
  const afternoon = slots.filter((s) => lagosHHMM(s.slot_start) >= config.half_day_split);
  const allOk = (group: Slot[]) => group.length > 0 && group.every(bookable);

  const pickerSlots: PickerSlot[] = slots.map((s) => ({
    start: lagosHHMM(s.slot_start),
    startLabel: timeLabel(s.slot_start),
    endLabel: timeLabel(s.slot_end),
    remaining: s.remaining,
    open: s.open_for_booking,
  }));

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
    <BookingShell label={bookPage.label} heading={bookPage.heading} text={bookPage.text}>
      <Card className="mb-6">
        <Form action="/book" className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="date" className="mb-1.5 block text-sm font-semibold">
              {bookPage.dateLabel}
            </label>
            <input id="date" name="date" type="date" min={today} max={maxDate} defaultValue={date} className={bookInput} />
          </div>
          <PendingButton className={bookButton}>
            {bookPage.dateButton}
          </PendingButton>
        </Form>
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
              <HourPicker
                date={date}
                slots={pickerSlots}
                maxHours={config.max_hours_per_booking}
                standardKobo={p.hour.standard}
                studentKobo={p.hour.student}
              />
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
              <ActionForm action={createBookingAction} errors={bookErrors} className="mt-4 space-y-4">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="kind" value="half_day" />
                <div className="flex flex-wrap gap-3">
                  <PendingButton pendingText={common.booking} name="half" value="morning" disabled={!allOk(morning)} className={bookButton}>
                    {allOk(morning)
                      ? `${bookPage.half.morning}: ${timeLabel(morning[0].slot_start)} to ${timeLabel(morning[morning.length - 1].slot_end)}`
                      : `${bookPage.half.morning}: ${bookPage.half.unavailable}`}
                  </PendingButton>
                  <PendingButton pendingText={common.booking} name="half" value="afternoon" disabled={!allOk(afternoon)} className={bookButton}>
                    {allOk(afternoon)
                      ? `${bookPage.half.afternoon}: ${timeLabel(afternoon[0].slot_start)} to ${timeLabel(afternoon[afternoon.length - 1].slot_end)}`
                      : `${bookPage.half.afternoon}: ${bookPage.half.unavailable}`}
                  </PendingButton>
                </div>
              </ActionForm>
            </Card>
          )}

          {/* ---- full day ---- */}
          <Card>
            <h2 className="text-h3">{bookPage.full.heading}</h2>
            {p.day ? (
              <ActionForm action={createBookingAction} errors={bookErrors} className="mt-4 space-y-4">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="kind" value="day" />
                <p className="text-sm">
                  {formatNaira(p.day.standard)}
                  {p.day.student != null && <span className="block">{bookPage.prices.studentFlat(formatNaira(p.day.student))}</span>}
                </p>
                {studentBox("day")}
                <PendingButton pendingText={common.booking} disabled={!allOk(slots)} className={bookButton}>
                  {allOk(slots) ? bookPage.full.submit : bookPage.full.unavailable}
                </PendingButton>
              </ActionForm>
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
