import "server-only";
import { sendEmail, type Mail, type SendResult } from "@/lib/email/send";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Sends an email and records the outcome in email_log (no recipient address is
// stored, only the user id), so the admin Email health page can show sent and
// failed counts. A logging problem never stops the email.
export async function sendLoggedEmail(
  mail: Mail,
  meta: { template: string; userId?: string },
): Promise<SendResult> {
  const result = await sendEmail(mail);
  if (adminConfigured()) {
    try {
      await createAdminClient()
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
  }
  return result;
}
