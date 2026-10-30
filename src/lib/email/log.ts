import "server-only";
import { sendEmail, type Mail, type SendResult } from "@/lib/email/send";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Sends an email and records the outcome in email_log (no recipient address is
// stored, only the user id), so the admin Email health page can show sent and
// failed counts. A logging problem never stops the email.
//
// If the email fails and it was meant for a signed-in member, a copy of the subject and text goes
// into a small retry queue (no address; it is looked up again at retry time) and the daily job
// tries again, up to 3 times. Pass retry: false for emails that have their own retry (reminders).
export async function sendLoggedEmail(
  mail: Mail,
  meta: { template: string; userId?: string; retry?: boolean },
): Promise<SendResult> {
  const result = await sendEmail(mail);
  if (adminConfigured()) {
    const admin = createAdminClient();
    try {
      await admin
        .from("email_log")
        .insert({
          to_user_id: meta.userId ?? null,
          template: meta.template,
          status: result.ok ? "sent" : "failed",
          provider: (process.env.EMAIL_PROVIDER ?? "smtp").trim() || "smtp",
          provider_id: result.ok ? (result.id ?? null) : null,
          error: result.ok ? null : result.error.slice(0, 400),
        });
    } catch {
      // ignore
    }
    if (!result.ok && meta.userId && meta.retry !== false && result.error !== "Invalid recipient address.") {
      try {
        await admin.from("email_retry").insert({
          to_user_id: meta.userId,
          template: meta.template.slice(0, 80),
          subject: mail.subject.slice(0, 300),
          body: mail.text.slice(0, 20000),
        });
      } catch {
        // ignore
      }
    }
  }
  return result;
}
