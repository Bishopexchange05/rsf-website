"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { sendLoggedEmail } from "@/lib/email/log";
import { nairaToKobo, parseIntIn, parseTime } from "@/lib/settings-validation";
import { createClient } from "@/lib/supabase/server";
import { bankPage, pricingPage, rulesPage } from "@/content/admin-settings";

// Admin-only settings actions. Each one: requireRole (an Admin who has passed
// two-step), validate, call the database function (which checks the role again,
// validates again and writes the audit log), then answer with a short code that the
// form turns into a message IN PLACE. They never redirect to the same page, because
// that blanks the page for a moment while the server rebuilds it.

const BASE = "/admin/settings";

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function done(section: string, code = "saved"): ActionResult {
  revalidatePath(section ? `${BASE}/${section}` : BASE);
  revalidatePath("/tech-and-space");
  return { notice: code };
}

function bad(code: string): ActionResult {
  return { error: code };
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

export async function saveHoursAction(fd: FormData): Promise<ActionResult> {
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
    if (!opens || !closes || closes <= opens) return bad("time");
    hours.push({ weekday: day, is_closed: false, opens_at: opens, closes_at: closes });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_opening_hours", { p_hours: hours });
  if (error) return bad(errorCode(error));
  return done("hours");
}

// -------------------------------------------------------------- capacity

export async function saveCapacityAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const day = parseIntIn(text(fd, "day_capacity"), 0, 1000);
  const overnight = parseIntIn(text(fd, "overnight_capacity"), 0, 1000);
  if (day === null || overnight === null) return bad("number");

  const supabase = await createClient();
  const a = await supabase.rpc("save_capacity", { p_slug: "day", p_capacity: day, p_bookable: text(fd, "day_bookable") === "on" });
  if (a.error) return bad(errorCode(a.error));
  const b = await supabase.rpc("save_capacity", {
    p_slug: "overnight",
    p_capacity: overnight,
    p_bookable: text(fd, "overnight_bookable") === "on",
  });
  if (b.error) return bad(errorCode(b.error));
  return done("capacity");
}

// ---------------------------------------------------------------- prices

export async function savePricesAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const rows: { space: string; kind: string; audience: string; amount_kobo: number | null }[] = [];
  for (const group of pricingPage.groups) {
    for (const r of group.rows) {
      const value = nairaToKobo(text(fd, `price-${r.space}-${r.kind}-${r.audience}`));
      if (value === "invalid") return bad("price");
      rows.push({ space: r.space, kind: r.kind, audience: r.audience, amount_kobo: value });
    }
  }
  // Student price may never exceed the standard price for the same option.
  for (const s of rows.filter((r) => r.audience === "student" && r.amount_kobo !== null)) {
    const standard = rows.find((r) => r.audience === "standard" && r.space === s.space && r.kind === s.kind);
    if (standard?.amount_kobo != null && (s.amount_kobo as number) > standard.amount_kobo) return bad("student-higher");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_prices", { p_prices: rows });
  if (error) return bad(errorCode(error));
  return done("pricing");
}

// ----------------------------------------------------------------- rules

export async function saveRulesAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const rules: Record<string, number | string | boolean> = {};
  for (const f of rulesPage.fields) {
    const n = parseIntIn(text(fd, f.name), f.min, f.max);
    if (n === null) return bad("number");
    rules[f.name] = n;
  }
  const split = parseTime(text(fd, "half_day_split"));
  if (!split) return bad("time");
  rules.half_day_split = split;
  rules.require_verified_email = text(fd, "require_verified_email") === "on";

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_booking_rules", { p_rules: rules });
  if (error) return bad(errorCode(error));
  return done("rules");
}

// ------------------------------------------------------------- overnight

export async function saveOvernightAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const checkinRaw = text(fd, "checkin").trim();
  const checkoutRaw = text(fd, "checkout").trim();
  const checkin = checkinRaw ? parseTime(checkinRaw) : null;
  const checkout = checkoutRaw ? parseTime(checkoutRaw) : null;
  if ((checkinRaw && !checkin) || (checkoutRaw && !checkout)) return bad("time");
  const location = text(fd, "location").slice(0, 500);
  const rules = text(fd, "rules").slice(0, 2000);

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_overnight_details", {
    p_location: location,
    p_rules: rules,
    p_checkin: checkin,
    p_checkout: checkout,
  });
  if (error) return bad(errorCode(error));
  return done("overnight");
}

// ------------------------------------------------------------------ bank

export async function saveBankAction(fd: FormData): Promise<ActionResult> {
  const session = await requireRole(["admin"]);
  const number = text(fd, "account_number").replace(/\s/g, "");
  if (number && !/^\d{10}$/.test(number)) return bad("account-number");

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_bank_details", {
    p_bank_name: text(fd, "bank_name").slice(0, 80),
    p_account_number: number,
    p_account_name: text(fd, "account_name").slice(0, 120),
    p_note: text(fd, "note").slice(0, 300),
  });
  if (error) return bad(errorCode(error));

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
  return done("bank");
}

// ------------------------------------------------------- booking switch

// Advisory launch checklist: the owner marks the lawyer's review as done (or removes the mark).
// It never blocks anything.
export async function setLegalReviewAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const doneMark = text(fd, "done") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_legal_review_done", { p_done: doneMark });
  if (error) return bad(errorCode(error));
  return done("", doneMark ? "legal-marked" : "legal-unmarked");
}

export async function setBookingEnabledAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const enable = text(fd, "enable") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_booking_enabled", { p_enabled: enable });
  if (error) return bad(errorCode(error));
  return done("", enable ? "booking-on" : "booking-off");
}
