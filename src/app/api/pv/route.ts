import { NextResponse, type NextRequest } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// The cookie-free visit counter. The browser sends the page address after the page has loaded;
// this counts it for today (see migration 0016). Nothing about the visitor is stored: no IP address,
// no browser details, no cookie. Robots and private pages are not counted.
export const dynamic = "force-dynamic";

const PRIVATE = /^\/(admin|account|api|book|two-factor|auth|login|register|verify-email|forgot-password|reset-password|account-deleted)(\/|$)/;
const ROBOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|facebookexternalhit|whatsapp|monitor|uptime|curl|wget|python|node-fetch/i;
const NOTHING = new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  if (!adminConfigured() || ROBOT.test(req.headers.get("user-agent") ?? "")) return NOTHING;
  let body: { p?: unknown; n?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NOTHING;
  }
  const path = typeof body.p === "string" ? body.p.toLowerCase() : "";
  if (!/^\/[a-z0-9\-/]{0,99}$/.test(path) || PRIVATE.test(path)) return NOTHING;
  try {
    await createAdminClient().rpc("record_site_visit", { p_path: path, p_new_visit: body.n === true });
  } catch {
    // Counting must never break anything.
  }
  return NOTHING;
}
