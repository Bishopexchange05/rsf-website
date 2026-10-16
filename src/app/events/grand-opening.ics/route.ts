import { event } from "@/content/events";
import { site } from "@/content/site";

// Calendar file for the Grand Opening: 10:00 AM, 16 October 2026, Africa/Lagos.
// No end time was given, so none is set; add one to the content if needed.
export const dynamic = "force-static";

const esc = (v: string) =>
  v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Fold long lines at 75 octets, as the iCalendar spec requires.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  let limit = 75;
  while (i < bytes.length) {
    let end = Math.min(i + limit, bytes.length);
    // Do not split a multi-byte character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(bytes.subarray(i, end).toString("utf8"));
    i = end;
    limit = 74;
  }
  return out.join("\r\n ");
}

export function GET() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Events//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Africa/Lagos",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0100",
    "TZNAME:WAT",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:grand-opening-2026@rafaelsupportfoundation.org",
    `DTSTAMP:${stamp}`,
    "DTSTART;TZID=Africa/Lagos:20261016T100000",
    `SUMMARY:${esc(event.titlePlain)}`,
    `LOCATION:${esc(event.place)}`,
    `DESCRIPTION:${esc(event.description)}`,
    `URL:${site.url}/events`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const body = lines.map(fold).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rsf-grand-opening.ics"',
    },
  });
}
