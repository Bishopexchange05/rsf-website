// Opening hours as a sentence for emails: "Monday to Saturday, 8:00 AM to 6:00 PM. Closed on Sunday."
// The hours come from the database (the Admin edits them in Settings), never from code.

export type OpeningDay = { weekday: number; is_closed: boolean; opens_at: string; closes_at: string };

const NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function clock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function officeHoursText(days: OpeningDay[] | null | undefined): string {
  if (!days || days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a.weekday - b.weekday);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    const d = sorted[i];
    if (d.is_closed) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < sorted.length && !sorted[j + 1].is_closed && sorted[j + 1].opens_at === d.opens_at && sorted[j + 1].closes_at === d.closes_at && sorted[j + 1].weekday === sorted[j].weekday + 1) j++;
    const span = j === i ? NAMES[d.weekday] : `${NAMES[d.weekday]} to ${NAMES[sorted[j].weekday]}`;
    parts.push(`${span}, ${clock(d.opens_at)} to ${clock(d.closes_at)}`);
    i = j + 1;
  }
  const closed = sorted.filter((d) => d.is_closed).map((d) => NAMES[d.weekday]);
  return `${parts.join("; ")}.${closed.length ? ` Closed on ${closed.join(" and ")}.` : ""}`;
}
