import "server-only";
import { sendEmail } from "@/lib/email/send";
import { whoIs } from "@/lib/people";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Tries again the emails that failed (see email/log.ts). Run once a day by the daily job.
// An email is tried at most 3 times in all (the first try plus two retries here); after that it is
// dropped and the failure stays visible on the Admin Email health page. Nothing stays in the queue
// longer than 3 days.

export type RetryResult = { retried: number; sent: number; gaveUp: number };

const MAX_ATTEMPTS = 2;

type Row = { id: string; to_user_id: string; template: string; subject: string; body: string; attempts: number };

export async function runEmailRetry(): Promise<RetryResult> {
  const result: RetryResult = { retried: 0, sent: 0, gaveUp: 0 };
  if (!adminConfigured()) return result;
  const admin = createAdminClient();

  await admin.rpc("purge_old_email_retry");
  const { data } = await admin.from("email_retry").select("id, to_user_id, template, subject, body, attempts").order("created_at").limit(50);

  for (const row of (data as Row[] | null) ?? []) {
    const who = await whoIs(row.to_user_id);
    const sent = who.email ? await sendEmail({ to: who.email, subject: row.subject, text: row.body }) : ({ ok: false, error: "No address on file." } as const);
    result.retried++;
    await admin.from("email_log").insert({
      to_user_id: row.to_user_id,
      template: `${row.template}-retry`.slice(0, 80),
      status: sent.ok ? "sent" : "failed",
      provider: (process.env.EMAIL_PROVIDER ?? "smtp").trim() || "smtp",
      provider_id: sent.ok ? (sent.id ?? null) : null,
      error: sent.ok ? null : sent.error.slice(0, 400),
    });
    if (sent.ok) {
      await admin.from("email_retry").delete().eq("id", row.id);
      result.sent++;
    } else if (row.attempts + 1 >= MAX_ATTEMPTS) {
      await admin.from("email_retry").delete().eq("id", row.id);
      result.gaveUp++;
    } else {
      await admin.from("email_retry").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    }
  }
  return result;
}
