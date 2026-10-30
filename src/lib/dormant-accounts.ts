import "server-only";
import { dormantAccounts } from "@/content/accounts";
import { site } from "@/content/site";
import { sendLoggedEmail } from "@/lib/email/log";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Dormant accounts (NDPA: keep personal data no longer than needed). Run once a day by the daily job.
//   * A MEMBER with no activity for 23 months gets a warning email, 30 days before deletion.
//   * 30 days later, if still dormant, the account is deleted by the same steps as "Delete my
//     account": bookings anonymised, accounting figures kept, login removed.
//   * Staff and Admin accounts are never touched. An account with an unfinished booking or a
//     refund still owed is skipped and tried again the next day.
// The database decides WHO (24 and 23 month rules); this file only sends the emails and does
// the deleting, a few at a time (at most 50 a run).

export type DormantResult = { warned: number; deleted: number; skipped: number; emailFailed: number };

type Who = { email: string | null; name: string };

async function whoIs(id: string): Promise<Who> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return { email: data.user?.email ?? null, name: profile?.full_name ?? "there" };
}

export async function runDormantAccounts(): Promise<DormantResult> {
  const result: DormantResult = { warned: 0, deleted: 0, skipped: 0, emailFailed: 0 };
  if (!adminConfigured()) return result;
  const admin = createAdminClient();
  const loginUrl = `${site.url}/login`;

  // 1. Warnings. Only people whose email was actually sent are marked as warned, so a failed
  //    email is tried again tomorrow instead of the account being deleted without notice.
  const { data: toWarn } = await admin.rpc("dormant_accounts_to_warn");
  const warnedIds: string[] = [];
  for (const row of (toWarn as { user_id: string }[] | null) ?? []) {
    const who = await whoIs(row.user_id);
    if (!who.email) {
      result.skipped++;
      continue;
    }
    const sent = await sendLoggedEmail(
      { to: who.email, subject: dormantAccounts.warning.subject, text: dormantAccounts.warning.body(who.name, loginUrl, `${site.url}/account`) },
      { template: "dormant-warning", userId: row.user_id },
    );
    if (sent.ok) warnedIds.push(row.user_id);
    else result.emailFailed++;
  }
  if (warnedIds.length) {
    await admin.rpc("mark_dormant_warned", { p_users: warnedIds });
    result.warned = warnedIds.length;
  }

  // 2. Deletions: warned at least 30 days ago and still dormant.
  const { data: toDelete } = await admin.rpc("dormant_accounts_to_delete");
  for (const row of (toDelete as { user_id: string }[] | null) ?? []) {
    const who = await whoIs(row.user_id);
    const { error } = await admin.rpc("anonymise_user_data", { p_user: row.user_id, p_reason: "dormant" });
    if (error) {
      result.skipped++;
      continue;
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(row.user_id);
    if (deleteError) {
      result.skipped++;
      continue;
    }
    result.deleted++;
    if (who.email) {
      // No link to the deleted login is kept in the email log.
      await sendLoggedEmail(
        { to: who.email, subject: dormantAccounts.deleted.subject, text: dormantAccounts.deleted.body(who.name, `${site.url}/register`) },
        { template: "dormant-deleted" },
      );
    }
  }
  return result;
}
