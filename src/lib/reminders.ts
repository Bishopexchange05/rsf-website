import "server-only";
import { reminders } from "@/content/reminders";
import { site } from "@/content/site";
import { sendLoggedEmail } from "@/lib/email/log";
import { bookingWhen, dateTimeLabel } from "@/lib/lagos";
import { whoIs } from "@/lib/people";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Reminder emails. The database says who is due (and remembers who was already reminded, so nobody
// gets one twice); this file writes and sends the emails. A reminder is marked as sent only when the
// email really went, so a failed one is simply tried again at the next run.

export type ReminderResult = { due: number; sent: number; failed: number; skipped: number };

type Due = {
  booking_id: string;
  user_id: string;
  reminder: "day_before" | "pass_starts" | "pass_ends" | "hold_expiring";
  reference: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  hold_expires_at: string | null;
};

export async function runReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { due: 0, sent: 0, failed: 0, skipped: 0 };
  if (!adminConfigured()) return result;
  const admin = createAdminClient();

  const { data } = await admin.rpc("reminders_due");
  const rows = (data as Due[] | null) ?? [];
  result.due = rows.length;

  for (const r of rows) {
    const who = await whoIs(r.user_id);
    if (!who.email) {
      result.skipped++;
      continue;
    }
    const link = `${site.url}/account/bookings/${r.booking_id}`;
    const when = bookingWhen(r);
    let mail: { subject: string; text: string };
    if (r.reminder === "day_before") {
      mail = { subject: reminders.dayBefore.subject(r.reference), text: reminders.dayBefore.body(who.name, r.reference, when, link) };
    } else if (r.reminder === "pass_starts") {
      mail = { subject: reminders.passStarts.subject(r.reference), text: reminders.passStarts.body(who.name, r.reference, when, link) };
    } else if (r.reminder === "pass_ends") {
      mail = { subject: reminders.passEnds.subject(r.reference), text: reminders.passEnds.body(who.name, r.reference, when, link) };
    } else {
      mail = {
        subject: reminders.holdExpiring.subject(r.reference),
        text: reminders.holdExpiring.body(who.name, r.reference, when, r.hold_expires_at ? dateTimeLabel(r.hold_expires_at) : "soon", link),
      };
    }
    const sent = await sendLoggedEmail({ to: who.email, ...mail }, { template: `reminder-${r.reminder}`, userId: r.user_id, retry: false });
    if (sent.ok) {
      await admin.rpc("mark_reminder_sent", { p_booking: r.booking_id, p_reminder: r.reminder });
      result.sent++;
    } else {
      result.failed++;
    }
  }
  return result;
}
