// Date and time helpers. Everything is shown in Nigerian time (Africa/Lagos, UTC+1,
// no daylight saving), whatever the visitor's device clock says. Pure functions,
// safe in browser and server code.

const TZ = "Africa/Lagos";

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
const isoDayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hhmmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

export function timeLabel(iso: string): string {
  return timeFmt.format(new Date(iso)).toUpperCase();
}

export function dayLabel(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function dateTimeLabel(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

// "2026-10-27" for a moment, in Lagos.
export function lagosDate(d: Date = new Date()): string {
  return isoDayFmt.format(d);
}

// "09:00" for a moment, in Lagos.
export function lagosHHMM(iso: string): string {
  return hhmmFmt.format(new Date(iso));
}

// Adds whole days to a "YYYY-MM-DD" string.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
