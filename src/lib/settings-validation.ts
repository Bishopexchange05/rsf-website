// Pure checks for the admin settings forms. The database checks again; these
// give clear messages first. No imports on purpose.

export const MAX_NAIRA = 10_000_000;

// "1,500", "₦1500", " 1 500 " -> kobo. Empty -> null (not set). Anything else -> "invalid".
export function nairaToKobo(input: string): number | null | "invalid" {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d{1,8}$/.test(cleaned)) return "invalid";
  const naira = Number(cleaned);
  if (naira < 1 || naira > MAX_NAIRA) return "invalid";
  return naira * 100;
}

export function koboToNaira(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "";
  return String(Math.round(kobo / 100));
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

export function parseTime(input: string): string | null {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input) ? input : null;
}

export function parseIntIn(input: string, min: number, max: number): number | null {
  if (!/^\d{1,6}$/.test(input.trim())) return null;
  const n = Number(input);
  return n >= min && n <= max ? n : null;
}
