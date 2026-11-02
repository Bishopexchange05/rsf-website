import Link from "next/link";
import { Card } from "@/components/Card";
import { Reveal } from "@/components/Reveal";
import { publicInfo, weekdays } from "@/content/admin-settings";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/settings-validation";
import { loadPublicSettings, type PublicSettings } from "@/lib/public-settings";

// Opening hours, desks and prices on the Tech & Space page. It shows NOTHING unless accounts are
// switched on and the Admin has turned booking on (see lib/public-settings).

function clock(hhmm: string | null): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Monday = 1 ... Sunday = 7, in Nigerian time, as the opening hours are stored.
function lagosWeekday(): number {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short" }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day) + 1;
}

export async function PublicWorkspaceInfo() {
  const info: PublicSettings | null = await loadPublicSettings();
  if (!info) return null;

  const price = (space: string, kind: string, audience: string) =>
    info.prices.find((p) => p.space === space && p.kind === kind && p.audience === audience)?.amount_kobo ?? null;
  // A student price is shown only next to a set standard price for the same option.
  const student = (kind: string) => (price("day", kind, "standard") !== null ? price("day", kind, "student") : null);

  const c = publicInfo.cards;
  const halfDay = price("day", "half_day", "standard");
  const cards: { key: string; label: string; unit: string; value: number | null; student: number | null }[] = [
    { key: "hour", label: c.hour.label, unit: c.hour.unit, value: price("day", "hour", "standard"), student: student("hour") },
    // Half day appears only when it has a price; otherwise the option does not exist.
    ...(halfDay !== null ? [{ key: "half_day", label: c.half_day.label, unit: c.half_day.unit, value: halfDay, student: null }] : []),
    { key: "day", label: c.day.label, unit: c.day.unit, value: price("day", "day", "standard"), student: student("day") },
    { key: "month", label: c.month.label, unit: c.month.unit(info.monthly_pass_days), value: price("day", "month", "standard"), student: student("month") },
    { key: "night", label: c.night.label, unit: c.night.unit, value: price("overnight", "night", "standard"), student: null },
  ];

  const todayNo = lagosWeekday();
  const today = info.hours.find((h) => h.weekday === todayNo);
  const notes = [
    ...(halfDay !== null ? [publicInfo.halfDayNote(clock(info.half_day_split))] : []),
    publicInfo.monthNote(info.monthly_pass_days),
    ...(cards.some((x) => x.student !== null) ? [publicInfo.studentNote] : []),
    publicInfo.overnightNote,
  ];

  return (
    <Reveal>
      <div className="mt-14">
        <h3 className="text-h3">{publicInfo.heading}</h3>
        <p className="mt-2 opacity-85">{publicInfo.intro}</p>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((x) => (
            <li key={x.key} className={cn("flex flex-col rounded-2xl p-4 shadow-sm sm:p-5", x.value === null ? "border border-slate-navy/15 bg-cream dark:border-white/15 dark:bg-dark-bg" : "bg-white dark:bg-dark-card")}>
              <p className="font-heading text-base leading-tight sm:text-lg">{x.label}</p>
              {x.value === null ? (
                <>
                  <p className="mt-3 text-sm font-semibold">{publicInfo.comingSoon}</p>
                  <p className="mt-auto flex flex-wrap gap-x-3 pt-3 text-sm">
                    <Link href={publicInfo.contactLink.href} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                      {publicInfo.askUs}
                    </Link>
                    <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                      WhatsApp
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 font-heading text-2xl text-navy dark:text-dark-green sm:text-3xl">{formatNaira(x.value)}</p>
                  <p className="text-sm opacity-80">{x.unit}</p>
                  {x.student !== null && (
                    <p className="mt-auto pt-3">
                      <span className="inline-block rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold dark:bg-dark-green/15 dark:text-dark-green">
                        {publicInfo.studentTag(formatNaira(x.student))}
                      </span>
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h4 className="font-heading text-lg">{publicInfo.hoursHeading}</h4>
            {today && (
              <p className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-cream px-3 py-1.5 text-sm font-semibold dark:bg-dark-bg">
                <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", today.is_closed ? "bg-slate-navy/40 dark:bg-white/40" : "bg-brand-green dark:bg-dark-green")} />
                {today.is_closed ? publicInfo.closedToday : publicInfo.openToday(`${clock(today.opens_at)} to ${clock(today.closes_at)}`)}
              </p>
            )}
            <details className="group mt-3">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold underline underline-offset-2 [&::-webkit-details-marker]:hidden">
                {publicInfo.allHours}
                <svg viewBox="0 0 20 20" className="h-4 w-4 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </summary>
              <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {info.hours.map((h) => (
                  <div key={h.weekday} className={cn("flex justify-between gap-4 py-0.5", h.weekday === todayNo && "font-semibold")}>
                    <dt>{weekdays[h.weekday - 1]}</dt>
                    <dd>{h.is_closed ? publicInfo.closed : `${clock(h.opens_at)} – ${clock(h.closes_at)}`}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <p className="mt-4 text-sm opacity-85">{publicInfo.desksText(info.day_desks)}</p>
          </Card>

          <Card>
            <h4 className="font-heading text-lg">{publicInfo.goodToKnow}</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm marker:text-navy dark:marker:text-dark-green">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Reveal>
  );
}
