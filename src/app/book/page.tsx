import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { BookingShell, bookButton, bookInput, bookOutline } from "@/components/booking/BookingShell";
import { HourPicker, type PickerSlot } from "@/components/booking/HourPicker";
import { Card } from "@/components/Card";
import { PendingButton } from "@/components/PendingButton";
import { common } from "@/content/accounts";
import { bookPage, errors as bookErrors } from "@/content/booking";
import { pass } from "@/content/monthly";
import { overnight } from "@/content/overnight";
import { needsTwoFactor, requireUser } from "@/lib/auth";
import { createBookingAction, createPassAction } from "@/lib/booking-actions";
import { cn } from "@/lib/cn";
import { addDays, dayLabel, isIsoDate, lagosDate, lagosHHMM, timeLabel } from "@/lib/lagos";
import { noIndex } from "@/lib/no-index";
import { formatNaira } from "@/lib/settings-validation";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: bookPage.title, ...noIndex };

type Kind = "hour" | "half_day" | "day" | "month";
type Config = {
  booking_enabled: boolean;
  advance_booking_days: number;
  max_hours_per_booking: number;
  half_day_split: string;
  monthly_pass_days: number;
  monthly_start_window_days: number;
  overnight?: { enabled: boolean };
  prices: Partial<Record<Kind, { standard: number; student: number | null }>>;
};
type Availability = { available: boolean; reason: string | null; next_start: string | null };
type Slot = { slot_start: string; slot_end: string; remaining: number; open_for_booking: boolean };

const KINDS: Kind[] = ["hour", "half_day", "day", "month"];
// How many days the quick day picker shows; later dates use "Another date".
const STRIP_DAYS = 14;

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-h3">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy font-sans text-sm font-bold text-white dark:bg-dark-green dark:text-dark-bg">
        {n}
      </span>
      {children}
    </h2>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; start?: string; type?: string }> }) {
  if (!accountsEnabled) notFound();
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data: cfg } = await supabase.rpc("get_booking_config");
  const config = cfg as Config | null;
  if (!config?.booking_enabled) notFound();
  const p = config.prices;

  const today = lagosDate();
  const maxDate = addDays(today, config.advance_booking_days);
  const { date: dateParam, start: startParam, type: typeParam } = await searchParams;
  const date = dateParam && isIsoDate(dateParam) && dateParam >= today && dateParam <= maxDate ? dateParam : today;
  const lastStart = addDays(today, config.monthly_start_window_days);
  const start = startParam && isIsoDate(startParam) && startParam >= today && startParam <= lastStart ? startParam : today;

  // Which option is open. Half day exists only when it has a price.
  const offered = KINDS.filter((k) => k !== "half_day" || !!p.half_day);
  const kind: Kind = offered.includes(typeParam as Kind) ? (typeParam as Kind) : (offered.find((k) => p[k]) ?? "hour");
  const href = (q: { type?: Kind; date?: string; start?: string }) =>
    `/book?type=${q.type ?? kind}&date=${q.date ?? date}&start=${q.start ?? start}`;

  // Only the lookups the open option needs. They do not depend on each other, so they run together.
  const isPass = kind === "month";
  const [availRes, coveringRes, slotRes] = await Promise.all([
    isPass && p.month ? supabase.rpc("get_monthly_availability", { p_start: start }) : Promise.resolve({ data: null }),
    isPass
      ? Promise.resolve({ data: null })
      : supabase
          .from("bookings")
          .select("status, hold_expires_at")
          .eq("kind", "month")
          .lte("starts_at", `${date}T00:00:00+01:00`)
          .gt("ends_at", `${date}T00:00:00+01:00`)
          .in("status", ["pending_payment", "payment_claimed", "confirmed"]),
    isPass ? Promise.resolve({ data: null }) : supabase.rpc("get_day_availability", { p_date: date }),
  ]);
  const avail: Availability | null = ((availRes.data as Availability[] | null) ?? [])[0] ?? null;
  const covering = (coveringRes.data as { status: string; hold_expires_at: string | null }[] | null) ?? [];
  const covered = covering.some((r) => r.status !== "pending_payment" || (r.hold_expires_at && new Date(r.hold_expires_at).getTime() > Date.now()));

  const slots = (slotRes.data as Slot[] | null) ?? [];
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

  const dayName = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00+01:00`));
  const stripEnd = addDays(today, Math.min(STRIP_DAYS - 1, config.advance_booking_days));
  const strip: string[] = [];
  for (let d = today; d <= stripEnd; d = addDays(d, 1)) strip.push(d);
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short" });
  const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short" });

  const studentBox = (k: Kind) =>
    p[k]?.student != null ? (
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="student" className="mt-1 h-5 w-5 shrink-0 accent-navy" />
        <span>
          <span className="block text-sm font-semibold">{bookPage.student.label}</span>
          <span className="block text-sm opacity-75">{bookPage.student.help}</span>
        </span>
      </label>
    ) : null;

  const contact = (
    <p>
      <Link href={bookPage.contactHref} className={bookOutline}>
        {bookPage.prices.contact}
      </Link>
    </p>
  );
  const optionCard = "flex min-h-24 flex-col justify-between gap-2 rounded-2xl border-2 p-4 text-left transition";
  const optionIdle = "border-transparent bg-white shadow-sm hover:border-navy/40 dark:bg-dark-card dark:hover:border-dark-green/50";
  const optionOn = "border-navy bg-white shadow-md dark:border-dark-green dark:bg-dark-card";

  return (
    <BookingShell heading={bookPage.heading} text={bookPage.text} staff={needsTwoFactor(profile.role)} wide>
      {/* ---- 1. what ---- */}
      <section aria-labelledby="step-what">
        <StepHeading n={1}>
          <span id="step-what">{bookPage.steps.what}</span>
        </StepHeading>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {offered.map((k) => {
            const price = p[k];
            const opt = bookPage.options[k];
            return (
              <li key={k}>
                <Link href={href({ type: k })} aria-current={k === kind ? "true" : undefined} className={cn(optionCard, "h-full", k === kind ? optionOn : optionIdle)}>
                  <span className="font-heading text-lg leading-tight">{opt.label}</span>
                  <span className="text-sm opacity-80">{price ? opt.note(formatNaira(price.standard)) : bookPage.options.contactNote}</span>
                </Link>
              </li>
            );
          })}
          {config.overnight?.enabled && (
            <li>
              <Link href={overnight.cardOnBook.href} className={cn(optionCard, "h-full", optionIdle)}>
                <span className="font-heading text-lg leading-tight">{bookPage.options.night.label}</span>
                <span className="text-sm opacity-80">{bookPage.options.night.note}</span>
              </Link>
            </li>
          )}
        </ul>
      </section>

      {isPass ? (
        /* ---- monthly pass: 2. start date, then book ---- */
        <section aria-labelledby="step-pass" className="mt-10">
          <StepHeading n={2}>
            <span id="step-pass">{bookPage.steps.pass}</span>
          </StepHeading>
          <Card className="p-6 sm:p-8">
            <h3 className="text-h3">{pass.heading}</h3>
            {p.month ? (
              <>
                <p className="mt-2">{pass.intro(config.monthly_pass_days)}</p>
                <p className="mt-1 text-sm opacity-85">{pass.anyDesk}</p>
                <p className="mt-3 font-semibold">{pass.priceLine(formatNaira(p.month.standard))}</p>
                {p.month.student != null && <p className="text-sm">{pass.studentLine(formatNaira(p.month.student))}</p>}

                <Form action="/book" className="mt-5 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="type" value="month" />
                  <input type="hidden" name="date" value={date} />
                  <div className="min-w-0 flex-1">
                    <label htmlFor="start" className="mb-1.5 block text-sm font-semibold">
                      {pass.startLabel}
                    </label>
                    <input id="start" name="start" type="date" min={today} max={lastStart} defaultValue={start} className={bookInput} />
                  </div>
                  <PendingButton className={bookOutline}>{pass.startButton}</PendingButton>
                </Form>

                <p className="mt-3 text-sm">
                  {pass.runs(`${dayLabel(`${start}T12:00:00+01:00`)} to ${dayLabel(`${addDays(start, config.monthly_pass_days - 1)}T12:00:00+01:00`)}`)}
                </p>

                {avail?.available ? (
                  <ActionForm action={createPassAction} errors={{ ...bookErrors }} className="mt-5 space-y-4 border-t border-slate-navy/10 pt-5 dark:border-white/10">
                    <input type="hidden" name="start" value={start} />
                    <p className="font-medium">{pass.available}</p>
                    {studentBox("month")}
                    <PendingButton pendingText={common.booking} className={bookButton}>
                      {pass.book}
                    </PendingButton>
                  </ActionForm>
                ) : (
                  <div className="mt-5 space-y-2 border-t border-slate-navy/10 pt-5 dark:border-white/10">
                    <p className="font-semibold">{avail?.reason === "cap" ? pass.fullCap : avail?.reason === "hours" ? pass.fullHours : pass.outside}</p>
                    {avail?.reason &&
                      avail.reason !== "window" &&
                      (avail.next_start ? (
                        <p>
                          {pass.next(dayLabel(`${avail.next_start}T12:00:00+01:00`))}{" "}
                          <Link href={href({ start: avail.next_start })} className="font-medium underline underline-offset-2">
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
              <div className="mt-4">{contact}</div>
            )}
          </Card>
        </section>
      ) : (
        <>
          {/* ---- 2. day ---- */}
          <section aria-labelledby="step-day" className="mt-10">
            <StepHeading n={2}>
              <span id="step-day">{bookPage.steps.day}</span>
            </StepHeading>
            <nav aria-label={bookPage.steps.day} className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              <ul className="flex min-w-max gap-2 lg:min-w-0 lg:flex-wrap">
                {strip.map((d) => {
                  const at = new Date(`${d}T12:00:00+01:00`);
                  const on = d === date;
                  const top = d === today ? bookPage.today : d === addDays(today, 1) ? bookPage.tomorrow : weekday.format(at);
                  return (
                    <li key={d}>
                      <Link
                        href={href({ date: d })}
                        aria-current={on ? "date" : undefined}
                        className={cn(
                          "flex min-h-16 w-20 flex-col items-center justify-center rounded-2xl border-2 text-center transition",
                          on ? "border-navy bg-navy text-white dark:border-dark-green dark:bg-dark-green dark:text-dark-bg" : "border-transparent bg-white shadow-sm hover:border-navy/40 dark:bg-dark-card",
                        )}
                      >
                        <span className="text-xs font-semibold">{top}</span>
                        <span className="font-heading text-base">{dayMonth.format(at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            {config.advance_booking_days >= STRIP_DAYS && (
              <Form action="/book" className="mt-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="type" value={kind} />
                <input type="hidden" name="start" value={start} />
                <div className="w-full max-w-xs">
                  <label htmlFor="date" className="mb-1.5 block text-sm font-semibold">
                    {bookPage.otherDate}
                  </label>
                  <input id="date" name="date" type="date" min={today} max={maxDate} defaultValue={date} className={bookInput} />
                </div>
                <PendingButton className={bookOutline}>{bookPage.otherDateButton}</PendingButton>
              </Form>
            )}
          </section>

          {/* ---- 3. time ---- */}
          <section aria-labelledby="step-time" className="mt-10">
            <StepHeading n={3}>
              <span id="step-time">
                {bookPage.steps.time}
                <span className="block font-sans text-base font-semibold opacity-80">{dayName}</span>
              </span>
            </StepHeading>

            {slots.length === 0 ? (
              <Card className="p-6 sm:p-8">
                <p>{bookPage.closedDay}</p>
              </Card>
            ) : covered ? (
              <Card className="p-6 sm:p-8">
                <p className="font-semibold">{pass.coversDay}</p>
              </Card>
            ) : kind === "hour" ? (
              // Not a Card: the summary bar inside sticks to the bottom of a phone screen, which an
              // overflow-hidden card would stop.
              <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-card sm:p-8">
                {p.hour ? (
                  <HourPicker date={date} slots={pickerSlots} maxHours={config.max_hours_per_booking} standardKobo={p.hour.standard} studentKobo={p.hour.student} />
                ) : (
                  contact
                )}
              </div>
            ) : kind === "half_day" && p.half_day ? (
              <Card className="p-6 sm:p-8">
                <p className="text-sm opacity-85">{bookPage.halfPick}</p>
                <ActionForm action={createBookingAction} errors={bookErrors} className="mt-4">
                  <input type="hidden" name="date" value={date} />
                  <input type="hidden" name="kind" value="half_day" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["morning", bookPage.half.morning, morning],
                        ["afternoon", bookPage.half.afternoon, afternoon],
                      ] as const
                    ).map(([value, label, group]) => {
                      const ok = allOk(group);
                      return (
                        <PendingButton
                          key={value}
                          pendingText={common.booking}
                          name="half"
                          value={value}
                          disabled={!ok}
                          className="flex min-h-24 flex-col items-start justify-center gap-1 rounded-2xl border-2 border-navy/25 p-4 text-left transition hover:border-navy hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/25 dark:hover:border-dark-green dark:hover:bg-white/5"
                        >
                          <span className="font-heading text-lg">{label}</span>
                          <span className="text-sm">
                            {ok ? `${timeLabel(group[0].slot_start)} to ${timeLabel(group[group.length - 1].slot_end)} · ${formatNaira(p.half_day!.standard)}` : bookPage.half.unavailable}
                          </span>
                        </PendingButton>
                      );
                    })}
                  </div>
                </ActionForm>
              </Card>
            ) : (
              <Card className="p-6 sm:p-8">
                {p.day ? (
                  <ActionForm action={createBookingAction} errors={bookErrors} className="space-y-4">
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="kind" value="day" />
                    <p className="text-sm opacity-85">{bookPage.dayNote}</p>
                    <p className="text-lg font-semibold">
                      {formatNaira(p.day.standard)}
                      {p.day.student != null && <span className="block text-sm font-normal">{bookPage.prices.studentFlat(formatNaira(p.day.student))}</span>}
                    </p>
                    {studentBox("day")}
                    <PendingButton pendingText={common.booking} disabled={!allOk(slots)} className={bookButton}>
                      {allOk(slots) ? bookPage.full.submit : bookPage.full.unavailable}
                    </PendingButton>
                  </ActionForm>
                ) : (
                  contact
                )}
              </Card>
            )}
          </section>
        </>
      )}
    </BookingShell>
  );
}
