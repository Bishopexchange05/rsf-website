"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { sendLoggedEmail } from "@/lib/email/log";
import { dateTimeLabel, dayLabel, isIsoDate, timeLabel } from "@/lib/lagos";
import { limited } from "@/lib/rate-limit-db";
import { formatNaira, parseIntIn, parseTime } from "@/lib/settings-validation";
import { getSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";
import { bookingPage } from "@/content/booking";

// Member booking actions. Everything is checked again inside the database
// function, which is the part that counts. Results come back as short codes in
// the address (never personal data) that the pages turn into messages.

const HOUR = 60 * 60 * 1000;
const UUID = /^[0-9a-fA-F-]{36}$/;

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function errorCode(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return "forbidden";
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("not open")) return "not-open";
  if (m.includes("verify your email")) return "verify-email";
  if (m.includes("booking window")) return "window";
  if (m.includes("closed")) return "closed";
  if (m.includes("no longer available")) return "unavailable";
  if (m.includes("unpaid bookings")) return "too-many-unpaid";
  if (m.includes("contact us for pricing")) return "price-not-set";
  if (m.includes("already have a booking")) return "overlap";
  if (m.includes("too soon") || m.includes("already past")) return "past";
  if (m.includes("too late to cancel")) return "too-late";
  if (m.includes("cannot be cancelled")) return "cannot-cancel";
  if (m.includes("invalid")) return "invalid";
  return "failed";
}

// A booking problem is shown in place, under the form. If the desks changed under the
// person (someone else booked first), the page is refreshed so the counts are right.
function problem(error: string): ActionResult {
  if (error === "unavailable" || error === "overlap" || error === "too-many-unpaid") revalidatePath("/book");
  return { error };
}

export async function createBookingAction(fd: FormData): Promise<ActionResult> {
  const session = await requireUser();
  const date = text(fd, "date");
  const kind = text(fd, "kind");
  if (!isIsoDate(date) || !["hour", "half_day", "day"].includes(kind)) return problem("invalid");

  let start: string | null = null;
  let hours: number | null = null;
  let half: string | null = null;
  if (kind === "hour") {
    start = parseTime(text(fd, "start"));
    hours = parseIntIn(text(fd, "hours"), 1, 14);
    if (!start || hours === null) return problem("invalid");
  } else if (kind === "half_day") {
    half = text(fd, "half");
    if (!["morning", "afternoon"].includes(half)) return problem("invalid");
  }

  if (await limited(`book:${session.user.id}`, 15, HOUR)) return problem("too-many");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_day_booking", {
    p_date: date,
    p_kind: kind,
    p_start: start,
    p_hours: hours,
    p_half: half,
    p_student: text(fd, "student") === "on",
  });
  if (error || typeof data !== "string") return problem(error ? errorCode(error) : "failed");

  const id = data as string;

  // Tell the member (bank details and the timer are on the booking page). A failed
  // email never stops the booking.
  const { data: b } = await supabase
    .from("bookings")
    .select("reference, starts_at, ends_at, amount_kobo, hold_expires_at")
    .eq("id", id)
    .maybeSingle();
  if (b && session.user.email) {
    const origin = await getSiteOrigin();
    const when = `${dayLabel(b.starts_at)}, ${timeLabel(b.starts_at)} to ${timeLabel(b.ends_at)}`;
    await sendLoggedEmail(
      {
        to: session.user.email,
        subject: bookingPage.email.subject(b.reference),
        text: bookingPage.email.body(
          session.profile.full_name,
          b.reference,
          when,
          formatNaira(b.amount_kobo),
          b.hold_expires_at ? dateTimeLabel(b.hold_expires_at) : "",
          `${origin}/account/bookings/${id}`,
        ),
      },
      { template: "booking-created", userId: session.user.id },
    );
  }
  redirect(`/account/bookings/${id}?notice=created`);
}

export async function cancelBookingAction(fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_booking", { p_booking: id });
  if (error) return { error: errorCode(error) };
  revalidatePath(`/account/bookings/${id}`);
  revalidatePath("/account/bookings");
  revalidatePath("/book");
  return { notice: "cancelled" };
}
