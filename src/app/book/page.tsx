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
import { pass } from "@/content/monthly";
import { createBookingAction, createPassAction } from "@/lib/booking-actions";
import { addDays, dayLabel, isIsoDate, lagosDate, lagosHHMM, timeLabel } from "@/lib/lagos";
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
  monthly_pass_days: number;
  monthly_start_window_days: number;
  prices: Partial<Record<"hour" | "half_day" | "day" | "month", { standard: number; student: number | null }>>;
};
type Availability = { available: boolean; reason: string | null; next_start: string | null };
type Slot = { slot_start: string; slot_end: string; remaining: number; open_for_booking: boolean };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; start?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireUser();
  const supabase = await createClient();

  const { data: cfg } = await supabase.rpc("get_booking_config");
  const config = cfg as Config | null;
  if (!config?.booking_enabled) notFound();

  const today = lagosDate();
  const maxDate = addDays(today, config.advance_booking_days);
  const { date: dateParam, start: startParam } = await searchParams;
  const date = dateParam && isIsoDate(dateParam) && dateParam >= today && dateParam <= maxDate ? dateParam : today;

  // Monthly pass: the start date being checked (default today) and whether a pass is free from it.
  const lastStart = addDays(today, config.monthly_start_window_days);
  const start = startParam && isIsoDate(startParam) && startParam >= today && startParam <= lastStart ? startParam : today;
  let avail: Availability | null = null;
  if (config.prices.month) {
    const { data: a } = await supabase.rpc("get_monthly_availability", { p_start: start });
    avail = ((a as Availability[] | null) ?? [])[0] ?? null;
  }

  // A pass that already covers this day: nothing more to book for it.
  const { data: covering } = await supabase
    .from("bookings")
    .select("status, hold_expires_at")
    .eq("kind", "month")
    .lte("starts_at", `${date}T00:00:00+01:00`)
    .gt("ends_at", `${date}T00:00:00+01:00`)
    .in("status", ["pending_payment", "payment_claimed", "confirmed"]);
  const covered = (covering ?? []).some((r) => r.status !== "pending_payment" || (r.hold_expires_at && new Date(r.hold_expires_at).getTime() > Date.now()));

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

  const studentBox = (kind: "hour" | "half_day" | "day" | "month") =>
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
          <input type="hidden" name="start" value={start} />
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
      ) : covered ? (
        <Card>
          <p className="font-semibold">{pass.coversDay}</p>
        </Card>
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

      {/* ---- monthly pass ---- */}
      <Card className="mt-6">
        <h2 className="text-h3">{pass.heading}</h2>
        {p.month ? (
          <>
            <p className="mt-2">{pass.intro(config.monthly_pass_days)}</p>
            <p className="mt-1 text-sm opacity-85">{pass.anyDesk}</p>
            <p className="mt-3 font-semibold">{pass.priceLine(formatNaira(p.month.standard))}</p>
            {p.month.student != null && <p className="text-sm">{pass.studentLine(formatNaira(p.month.student))}</p>}

            <Form action="/book" className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="date" value={date} />
              <div className="min-w-0 flex-1">
                <label htmlFor="start" className="mb-1.5 block text-sm font-semibold">
                  {pass.startLabel}
                </label>
                <input id="start" name="start" type="date" min={today} max={lastStart} defaultValue={start} className={bookInput} />
              </div>
              <PendingButton className={bookButton}>{pass.startButton}</PendingButton>
            </Form>

            <p className="mt-3 text-sm">
              {pass.runs(`${dayLabel(`${start}T12:00:00+01:00`)} to ${dayLabel(`${addDays(start, config.monthly_pass_days - 1)}T12:00:00+01:00`)}`)}
            </p>

            {avail?.available ? (
              <ActionForm action={createPassAction} errors={{ ...bookErrors }} className="mt-4 space-y-4">
                <input type="hidden" name="start" value={start} />
                <p className="font-medium">{pass.available}</p>
                {studentBox("month")}
                <PendingButton pendingText={common.booking} className={bookButton}>
                  {pass.book}
                </PendingButton>
              </ActionForm>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="font-semibold">
                  {avail?.reason === "cap" ? pass.fullCap : avail?.reason === "hours" ? pass.fullHours : pass.outside}
                </p>
                {avail?.reason && avail.reason !== "window" &&
                  (avail.next_start ? (
                    <p>
                      {pass.next(dayLabel(`${avail.next_start}T12:00:00+01:00`))}{" "}
                      <Link href={`/book?date=${date}&start=${avail.next_start}`} className="font-medium underline underline-offset-2">
                        {pass.nextLink}
                      </Link>
                    </p>
                  ) : (
                    <p>{pass.none}</p>
                  ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-3">
            <Link href={pass.contactHref} className="font-medium underline underline-offset-2">
              {pass.contact}
            </Link>
          </p>
        )}
      </Card>
    </BookingShell>
  );
}
