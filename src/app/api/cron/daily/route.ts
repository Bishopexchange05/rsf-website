import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runBackupCheck } from "@/lib/backup-check";
import { runDormantAccounts } from "@/lib/dormant-accounts";
import { runEmailRetry } from "@/lib/email-retry";
import { runReminders } from "@/lib/reminders";
import { accountsEnabled } from "@/lib/supabase/config";

// The daily job. Vercel calls this once a day (see vercel.json) and sends the secret as
// "Authorization: Bearer <CRON_SECRET>". Without the secret, or with the wrong one, nothing runs.
// If CRON_SECRET is not set in the environment, the route refuses everything.
//
// Each step runs on its own: if one fails, the others still run, and the answer says which failed.
// Vercel's free plan runs this once a day, at some point inside the hour set in vercel.json.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const NO_STORE = { "Cache-Control": "no-store, private" };

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function step<T>(run: () => Promise<T>): Promise<T | { error: true }> {
  try {
    return await run();
  } catch {
    return { error: true };
  }
}

export async function GET(req: NextRequest) {
  if (!accountsEnabled) return new NextResponse("Not found", { status: 404 });
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Not set up." }, { status: 503, headers: NO_STORE });
  if (!authorised(req)) return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });

  // Reminders first (they are time-sensitive), then retries, the account clean-up and the backup check.
  const reminders = await step(runReminders);
  const retry = await step(runEmailRetry);
  const dormant = await step(runDormantAccounts);
  const backup = await step(runBackupCheck);
  return NextResponse.json({ ok: true, reminders, retry, dormant, backup }, { headers: NO_STORE });
}
