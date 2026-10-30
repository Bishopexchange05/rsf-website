import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDormantAccounts } from "@/lib/dormant-accounts";
import { accountsEnabled } from "@/lib/supabase/config";

// The daily job. Vercel calls this once a day (see vercel.json) and sends the secret as
// "Authorization: Bearer <CRON_SECRET>". Without the secret, or with the wrong one, nothing runs.
// If CRON_SECRET is not set in the environment, the route refuses everything.
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

export async function GET(req: NextRequest) {
  if (!accountsEnabled) return new NextResponse("Not found", { status: 404 });
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Not set up." }, { status: 503, headers: NO_STORE });
  if (!authorised(req)) return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });

  const dormant = await runDormantAccounts();
  // Group 2 adds the reminder emails and the backup check here.
  return NextResponse.json({ ok: true, dormant }, { headers: NO_STORE });
}
