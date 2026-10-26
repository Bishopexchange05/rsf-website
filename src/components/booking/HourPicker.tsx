"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PendingButton } from "@/components/PendingButton";
import { bookPage, errors as bookErrors } from "@/content/booking";
import { common } from "@/content/accounts";
import { createBookingAction } from "@/lib/booking-actions";
import type { ActionResult } from "@/lib/action-result";
import { formatNaira } from "@/lib/settings-validation";
import { bookButton, bookOutline } from "./buttonClasses";

// Pick a time range by clicking the hours: click the first hour, then the last
// hour, and every hour in between is selected. Hours that cannot be the end of
// the range (full, past, or more than the longest booking) are greyed out.
// Works with the keyboard (Tab, then Enter or Space) and with touch.

export type PickerSlot = {
  start: string; // "09:00" (Lagos)
  startLabel: string; // "9:00 AM"
  endLabel: string; // "10:00 AM"
  remaining: number;
  open: boolean; // false once the hour is too close or already past
};

export function HourPicker({
  date,
  slots,
  maxHours,
  standardKobo,
  studentKobo,
}: {
  date: string;
  slots: PickerSlot[];
  maxHours: number;
  standardKobo: number;
  studentKobo: number | null;
}) {
  const [sel, setSel] = useState<{ from: number; to: number } | null>(null);
  const [picking, setPicking] = useState(false); // first hour chosen, waiting for the last
  const [student, setStudent] = useState(false);
  const firstRender = useRef(true);
  const [result, formAction] = useActionState<ActionResult, FormData>(async (_prev, fd) => (await createBookingAction(fd)) ?? {}, {});

  // A new day means a new choice.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSel(null);
    setPicking(false);
  }, [date]);

  const free = (i: number) => slots[i].open && slots[i].remaining > 0;
  const rangeOk = (lo: number, hi: number) => {
    if (hi - lo + 1 > maxHours) return false;
    for (let k = lo; k <= hi; k++) if (!free(k)) return false;
    return true;
  };
  const enabled = (i: number) => (picking && sel ? rangeOk(Math.min(sel.from, i), Math.max(sel.from, i)) : free(i));

  function choose(i: number) {
    if (!enabled(i)) return;
    if (picking && sel) {
      const lo = Math.min(sel.from, i);
      const hi = Math.max(sel.from, i);
      setSel({ from: lo, to: hi });
      setPicking(false);
    } else {
      setSel({ from: i, to: i });
      setPicking(true);
    }
  }

  function clear() {
    setSel(null);
    setPicking(false);
  }

  const hours = sel ? sel.to - sel.from + 1 : 0;
  const unit = student && studentKobo != null ? Math.min(studentKobo, standardKobo) : standardKobo;
  const total = hours * unit;
  const summary = sel
    ? bookPage.hourly.summary(slots[sel.from].startLabel, slots[sel.to].endLabel, hours, formatNaira(total))
    : bookPage.hourly.nothingYet;

  return (
    <form action={formAction} className="mt-4 space-y-4" onKeyDown={(e) => e.key === "Escape" && clear()}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="kind" value="hour" />
      <input type="hidden" name="start" value={sel ? slots[sel.from].start : ""} />
      <input type="hidden" name="hours" value={hours || ""} />

      <p className="text-sm">
        {bookPage.prices.perHour(formatNaira(standardKobo))}
        {studentKobo != null && <span className="block">{bookPage.prices.studentPerHour(formatNaira(studentKobo))}</span>}
      </p>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{bookPage.hourly.pickLegend}</legend>
        <p className="mb-3 text-sm opacity-80">{picking ? bookPage.hourly.pickEnd : bookPage.hourly.pickStart(maxHours)}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {slots.map((s, i) => {
            const selected = !!sel && i >= sel.from && i <= sel.to;
            const ok = enabled(i);
            return (
              <li key={s.start}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-pressed={selected}
                  aria-disabled={!ok}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition ${
                    selected
                      ? "border-navy bg-navy text-white dark:border-dark-green dark:bg-dark-green dark:text-dark-bg"
                      : ok
                        ? "border-slate-navy/25 hover:bg-navy/10 dark:border-white/25 dark:hover:bg-white/10"
                        : "cursor-not-allowed border-slate-navy/10 opacity-50 dark:border-white/10"
                  }`}
                >
                  <span className="flex-1 text-sm font-semibold">
                    {s.startLabel} to {s.endLabel}
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    {!s.open ? bookPage.hourly.passed : s.remaining > 0 ? bookPage.hourly.left(s.remaining) : bookPage.hourly.full}
                  </span>
                  {!ok && <span className="sr-only">{bookPage.hourly.notAvailableHere}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p role="status" aria-live="polite" className="rounded-xl bg-cream p-3 text-sm font-semibold dark:bg-dark-bg">
        {summary}
      </p>

      {studentKobo != null && (
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" name="student" checked={student} onChange={(e) => setStudent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
          <span>
            <span className="block text-sm font-semibold">{bookPage.student.label}</span>
            <span className="block text-sm opacity-75">{bookPage.student.help}</span>
          </span>
        </label>
      )}

      {result.error && (
        <p role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
          {bookErrors[result.error] ?? bookErrors.failed}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <PendingButton className={bookButton} pendingText={common.booking} disabled={!sel}>
          {bookPage.hourly.submit}
        </PendingButton>
        {sel && (
          <button type="button" onClick={clear} className={bookOutline}>
            {bookPage.hourly.clear}
          </button>
        )}
      </div>
    </form>
  );
}
