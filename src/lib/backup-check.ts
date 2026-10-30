import "server-only";
import { backupAlert } from "@/content/reminders";
import { sendLoggedEmail } from "@/lib/email/log";
import { adminEmails } from "@/lib/people";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Checks that the nightly backup is still arriving, using the backup monitor on healthchecks.io
// (read-only key in HEALTHCHECKS_READ_KEY). If its last ping is older than 36 hours, or it has never
// pinged, every Admin gets one email, and no more than one a day. The key can only read.
//
// Optional: HEALTHCHECKS_CHECK_NAME picks the monitor by name (default: a monitor whose name
// contains "backup", or the only monitor if there is just one).

export type BackupCheckResult = { status: "ok" | "stale" | "not-configured" | "error"; ageHours?: number; emailed?: number };

const STALE_HOURS = 36;

type Check = { name?: string; last_ping?: string | null };

function ageLabel(hours: number | undefined): string {
  if (hours === undefined) return backupAlert.neverPinged;
  return hours < 72 ? `${Math.round(hours)} hours ago` : `${Math.round(hours / 24)} days ago`;
}

export async function runBackupCheck(): Promise<BackupCheckResult> {
  const key = (process.env.HEALTHCHECKS_READ_KEY ?? "").trim();
  if (!key) return { status: "not-configured" };

  let checks: Check[];
  try {
    const res = await fetch("https://healthchecks.io/api/v3/checks/", { headers: { "X-Api-Key": key }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) return { status: "error" };
    checks = ((await res.json()) as { checks?: Check[] }).checks ?? [];
  } catch {
    return { status: "error" };
  }

  const wanted = (process.env.HEALTHCHECKS_CHECK_NAME ?? "").trim().toLowerCase();
  const pick = wanted
    ? checks.find((c) => (c.name ?? "").toLowerCase() === wanted)
    : checks.find((c) => (c.name ?? "").toLowerCase().includes("backup")) ?? (checks.length === 1 ? checks[0] : undefined);
  if (!pick) return { status: "error" };

  const ageHours = pick.last_ping ? (Date.now() - new Date(pick.last_ping).getTime()) / 3600000 : undefined;
  if (ageHours !== undefined && ageHours <= STALE_HOURS) return { status: "ok", ageHours };

  // Stale. Email the Admins, but only once a day.
  if (!adminConfigured()) return { status: "stale", ageHours };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 20 * 3600000).toISOString();
  const { data: recent } = await admin.from("email_log").select("id").eq("template", "backup-alert").eq("status", "sent").gte("created_at", since).limit(1);
  if (recent && recent.length) return { status: "stale", ageHours, emailed: 0 };

  let emailed = 0;
  for (const to of await adminEmails()) {
    const sent = await sendLoggedEmail({ to, subject: backupAlert.subject, text: backupAlert.body(ageLabel(ageHours), "https://healthchecks.io/") }, { template: "backup-alert", retry: false });
    if (sent.ok) emailed++;
  }
  return { status: "stale", ageHours, emailed };
}
