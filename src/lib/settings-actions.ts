"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { sendLoggedEmail } from "@/lib/email/log";
import { nairaToKobo, parseIntIn, parseTime } from "@/lib/settings-validation";
import { createClient } from "@/lib/supabase/server";
import { bankPage, pricingPage, rulesPage } from "@/content/admin-settings";

// Admin-only settings actions. Each one: requireRole (an Admin who has passed
// two-step), validate, call the database function (which checks the role again,
// validates again and writes the audit log), then go back to the page with a
// short code that the page turns into a message. No personal data goes in the address.

const BASE = "/admin/settings";

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function go(section: string, key: "notice" | "error", code: string): never {
  const path = section ? `${BASE}/${section}` : BASE;
  revalidatePath(path);
  revalidatePath("/tech-and-space");
  redirect(`${path}?${key}=${code}`);
}

// Turns a database error into one of the page's error codes.
function errorCode(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return "forbidden";
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("student price")) return "student-higher";
  if (m.includes("fewer than the monthly")) return "desks-below-cap";
  if (m.includes("more than the number of day desks")) return "cap-too-high";
  if (m.includes("10 digits")) return "account-number";
  if (m.includes("bank details before")) return "bank-first";
  if (m.includes("opening time") || m.includes("7 days")) return "time";
  if (error.code === "P0001") return "invalid";
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007" || error.code === "23502") return "number";
  return "failed";
}

// ----------------------------------------------------------------- hours

export async function saveHoursAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const hours: { weekday: number; is_closed: boolean; opens_at: string | null; closes_at: string | null }[] = [];
  for (let day = 1; day <= 7; day++) {
    const closed = text(fd, `closed-${day}`) === "on";
    if (closed) {
      hours.push({ weekday: day, is_closed: true, opens_at: null, closes_at: null });
      continue;
    }
    const opens = parseTime(text(fd, `open-${day}`));
    const closes = parseTime(text(fd, `close-${day}`));
    if (!opens || !closes || closes <= opens) go("hours", "error", "time");
    hours.push({ weekday: day, is_closed: false, opens_at: opens, closes_at: closes });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_opening_hours", { p_hours: hours });
  if (error) go("hours", "error", errorCode(error));
  go("hours", "notice", "saved");
}

// -------------------------------------------------------------- capacity

export async function saveCapacityAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const day = parseIntIn(text(fd, "day_capacity"), 0, 1000);
  const overnight = parseIntIn(text(fd, "overnight_capacity"), 0, 1000);
  if (day === null || overnight === null) go("capacity", "error", "number");

  const supabase = await createClient();
  const a = await supabase.rpc("save_capacity", { p_slug: "day", p_capacity: day, p_bookable: text(fd, "day_bookable") === "on" });
  if (a.error) go("capacity", "error", errorCode(a.error));
  const b = await supabase.rpc("save_capacity", {
    p_slug: "overnight",
    p_capacity: overnight,
    p_bookable: text(fd, "overnight_bookable") === "on",
  });
  if (b.error) go("capacity", "error", errorCode(b.error));
  go("capacity", "notice", "saved");
}

// ---------------------------------------------------------------- prices

export async function savePricesAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const rows: { space: string; kind: string; audience: string; amount_kobo: number | null }[] = [];
  for (const group of pricingPage.groups) {
    for (const r of group.rows) {
      const value = nairaToKobo(text(fd, `price-${r.space}-${r.kind}-${r.audience}`));
      if (value === "invalid") go("pricing", "error", "price");
      rows.push({ space: r.space, kind: r.kind, audience: r.audience, amount_kobo: value });
    }
  }
  // Student price may never exceed the standard price for the same option.
  for (const s of rows.filter((r) => r.audience === "student" && r.amount_kobo !== null)) {
    const standard = rows.find((r) => r.audience === "standard" && r.space === s.space && r.kind === s.kind);
    if (standard?.amount_kobo != null && (s.amount_kobo as number) > standard.amount_kobo) go("pricing", "error", "student-higher");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_prices", { p_prices: rows });
  if (error) go("pricing", "error", errorCode(error));
  go("pricing", "notice", "saved");
}

// ----------------------------------------------------------------- rules

export async function saveRulesAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const rules: Record<string, number | string | boolean> = {};
  for (const f of rulesPage.fields) {
    const n = parseIntIn(text(fd, f.name), f.min, f.max);
    if (n === null) go("rules", "error", "number");
    rules[f.name] = n;
  }
  const split = parseTime(text(fd, "half_day_split"));
  if (!split) go("rules", "error", "time");
  rules.half_day_split = split;
  rules.require_verified_email = text(fd, "require_verified_email") === "on";

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_booking_rules", { p_rules: rules });
  if (error) go("rules", "error", errorCode(error));
  go("rules", "notice", "saved");
}

// ------------------------------------------------------------- overnight

export async function saveOvernightAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const checkinRaw = text(fd, "checkin").trim();
  const checkoutRaw = text(fd, "checkout").trim();
  const checkin = checkinRaw ? parseTime(checkinRaw) : null;
  const checkout = checkoutRaw ? parseTime(checkoutRaw) : null;
  if ((checkinRaw && !checkin) || (checkoutRaw && !checkout)) go("overnight", "error", "time");
  const location = text(fd, "location").slice(0, 500);
  const rules = text(fd, "rules").slice(0, 2000);

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_overnight_details", {
    p_location: location,
    p_rules: rules,
    p_checkin: checkin,
    p_checkout: checkout,
  });
  if (error) go("overnight", "error", errorCode(error));
  go("overnight", "notice", "saved");
}

// ------------------------------------------------------------------ bank

export async function saveBankAction(fd: FormData): Promise<void> {
  const session = await requireRole(["admin"]);
  const number = text(fd, "account_number").replace(/\s/g, "");
  if (number && !/^\d{10}$/.test(number)) go("bank", "error", "account-number");

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_bank_details", {
    p_bank_name: text(fd, "bank_name").slice(0, 80),
    p_account_number: number,
    p_account_name: text(fd, "account_name").slice(0, 120),
    p_note: text(fd, "note").slice(0, 300),
  });
  if (error) go("bank", "error", errorCode(error));

  // Tell the owner, so a changed account number cannot go unnoticed. The new
  // number is deliberately not in the email. A failure here never blocks the save.
  const owner = (process.env.FORMS_TO_EMAIL ?? "").trim().replace(/^"|"$/g, "");
  if (owner) {
    const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }).format(new Date());
    await sendLoggedEmail(
      { to: owner, subject: bankPage.emailSubject, text: bankPage.emailBody(session.profile.full_name, when) },
      { template: "bank-details-changed", userId: session.user.id },
    );
  }
  go("bank", "notice", "saved");
}

// ------------------------------------------------------- booking switch

export async function setBookingEnabledAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const enable = text(fd, "enable") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_booking_enabled", { p_enabled: enable });
  if (error) go("", "error", errorCode(error));
  go("", "notice", enable ? "booking-on" : "booking-off");
}
