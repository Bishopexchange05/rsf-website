"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { sendLoggedEmail } from "@/lib/email/log";
import { bookingWhen, dateTimeLabel, isIsoDate } from "@/lib/lagos";
import { limited } from "@/lib/rate-limit-db";
import { formatNaira, parseIntIn, parseTime } from "@/lib/settings-validation";
import { getSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";
import { bookingPage } from "@/content/booking";
import { passEmailNote } from "@/content/monthly";
import { overnightEmails } from "@/content/overnight";
import { site } from "@/content/site";
import { officeHoursText, type OpeningDay } from "@/lib/office-hours";

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
  if (m.includes("18 or over")) return "under-age";
  if (m.includes("nights at a time")) return "too-many-nights";
  if (m.includes("waiting for approval")) return "request-waiting";
  if (m.includes("during those dates")) return "pass-overlap";
  if (m.includes("fully booked")) return "pass-full";
  if (m.includes("not all free")) return "pass-hours";
  if (m.includes("covers this day")) return "pass-covers";
  if (m.includes("renewal is not open")) return "renew-early";
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
  if (["unavailable", "overlap", "too-many-unpaid", "pass-full", "pass-hours", "pass-overlap", "request-waiting"].includes(error)) revalidatePath("/book");
  return { error };
}

type Session = Awaited<ReturnType<typeof requireUser>>;

// Tell the member (bank details and the timer are on the booking page). A failed
// email never stops the booking.
async function sendCreatedEmail(session: Session, id: string) {
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("reference, kind, starts_at, ends_at, amount_kobo, hold_expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!b || !session.user.email) return;
  const origin = await getSiteOrigin();
  const days = Math.round((new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / (24 * HOUR));
  await sendLoggedEmail(
    {
      to: session.user.email,
      subject: bookingPage.email.subject(b.reference),
      text: bookingPage.email.body(
        session.profile.full_name,
        b.reference,
        bookingWhen(b),
        formatNaira(b.amount_kobo),
        b.hold_expires_at ? dateTimeLabel(b.hold_expires_at) : "",
        `${origin}/account/bookings/${id}`,
        b.kind === "month" ? passEmailNote(days) : "",
      ),
    },
    { template: "booking-created", userId: session.user.id },
  );
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

  // A member whose monthly pass covers this day has nothing more to book for it.
  const dayStart = `${date}T00:00:00+01:00`;
  const { data: covering } = await supabase
    .from("bookings")
    .select("status, hold_expires_at")
    .eq("user_id", session.user.id)
    .eq("kind", "month")
    .lte("starts_at", dayStart)
    .gt("ends_at", dayStart)
    .in("status", ["pending_payment", "payment_claimed", "confirmed"]);
  const live = (covering ?? []).some((r) => r.status !== "pending_payment" || (r.hold_expires_at && new Date(r.hold_expires_at).getTime() > Date.now()));
  if (live) return problem("pass-covers");

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
  await sendCreatedEmail(session, id);
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

// Book a monthly pass: the start date (and the student box) come from the form.
export async function createPassAction(fd: FormData): Promise<ActionResult> {
  const session = await requireUser();
  const start = text(fd, "start");
  if (!isIsoDate(start)) return problem("invalid");
  if (await limited(`book:${session.user.id}`, 15, HOUR)) return problem("too-many");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_month_booking", { p_start: start, p_student: text(fd, "student") === "on" });
  if (error || typeof data !== "string") return problem(error ? errorCode(error) : "failed");
  await sendCreatedEmail(session, data);
  redirect(`/account/bookings/${data}?notice=created`);
}

export async function renewPassAction(fd: FormData): Promise<ActionResult> {
  const session = await requireUser();
  const id = text(fd, "booking");
  if (!UUID.test(id)) return { error: "failed" };
  if (await limited(`book:${session.user.id}`, 15, HOUR)) return problem("too-many");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("renew_my_pass", { p_booking: id });
  if (error || typeof data !== "string") return problem(error ? errorCode(error) : "failed");
  await sendCreatedEmail(session, data);
  redirect(`/account/bookings/${data}?notice=renewed`);
}

// Request some overnight nights. The 18+ tick is stored with the time. There is no upload
// of any kind: ID is checked in person at the office.
export async function requestOvernightAction(fd: FormData): Promise<ActionResult> {
  const session = await requireUser();
  const checkin = text(fd, "checkin");
  const nights = parseIntIn(text(fd, "nights"), 1, 60);
  if (!isIsoDate(checkin) || nights === null) return problem("invalid");
  if (await limited(`night:${session.user.id}`, 10, HOUR)) return problem("too-many");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_night_request", {
    p_checkin: checkin,
    p_nights: nights,
    p_age_confirmed: text(fd, "age") === "on",
  });
  if (error || typeof data !== "string") return problem(error ? errorCode(error) : "failed");
  const id = data as string;

  // Tell the member how to come and meet us, and tell the team. A failed email never stops the request.
  const { data: b } = await supabase
    .from("bookings")
    .select("reference, kind, starts_at, ends_at, hold_expires_at")
    .eq("id", id)
    .maybeSingle();
  if (b) {
    const origin = await getSiteOrigin();
    const { data: pub } = await supabase.rpc("get_public_settings");
    const hours = officeHoursText((pub as { hours?: OpeningDay[] } | null)?.hours);
    const when = bookingWhen(b);
    if (session.user.email) {
      await sendLoggedEmail(
        {
          to: session.user.email,
          subject: overnightEmails.requested.subject(b.reference),
          text: overnightEmails.requested.body(
            session.profile.full_name,
            b.reference,
            when,
            b.hold_expires_at ? dateTimeLabel(b.hold_expires_at) : "",
            site.whatsapp,
            hours || "Please message us on WhatsApp to arrange a time.",
            `${origin}/account/bookings/${id}`,
          ),
        },
        { template: "overnight-requested", userId: session.user.id },
      );
    }
    const staffInbox = (process.env.FORMS_TO_EMAIL ?? "").trim().replace(/^"|"$/g, "");
    if (staffInbox) {
      await sendLoggedEmail(
        { to: staffInbox, subject: overnightEmails.staffNotice.subject(b.reference), text: overnightEmails.staffNotice.body(b.reference, when, `${origin}/admin/overnight`) },
        { template: "overnight-staff-notice", userId: session.user.id },
      );
    }
  }
  redirect(`/account/bookings/${id}?notice=requested`);
}
