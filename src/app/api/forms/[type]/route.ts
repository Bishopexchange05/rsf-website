import { NextResponse } from "next/server";
import { forms, formsCommon } from "@/content/techspace";
import { isFormType, validateForm } from "@/lib/forms";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const MIN_FILL_MS = 2000;
const isDev = process.env.NODE_ENV !== "production";

// Say exactly why a request was rejected, in the server console only (never
// shown to visitors). Logs field names and error codes, never secrets, keys or
// visitor-typed values.
function logReject(type: string, status: number, reason: string) {
  console.warn(`[forms] ${type} -> ${status}: ${reason}`);
}

// Phase 1 request forms. One handler serves all six form types. Requests are
// validated and sanitised on the server, then emailed with Resend. Nothing is
// stored, and no ID documents are ever accepted.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!isFormType(type)) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404 });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    logReject(type, 429, "rate limit reached for this IP");
    return NextResponse.json({ error: formsCommon.rateLimited, code: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    logReject(type, 400, "request body is not valid JSON");
    return NextResponse.json({ error: formsCommon.genericError, code: "bad_request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    logReject(type, 400, "request body is not a JSON object");
    return NextResponse.json({ error: formsCommon.genericError, code: "bad_request" }, { status: 400 });
  }

  // Honeypot: real people never see or fill this field. Pretend success.
  if (typeof body.website === "string" && body.website.length > 0) {
    logReject(type, 200, "honeypot field was filled in (silently dropped)");
    return NextResponse.json({ ok: true });
  }

  // Time check: a form cannot be filled in and sent in under 2 seconds. A missing
  // or too-small value means a script posted it directly. Pretend success.
  if (typeof body.elapsedMs !== "number" || body.elapsedMs < MIN_FILL_MS) {
    logReject(type, 200, "submitted too quickly or without a timer (silently dropped)");
    return NextResponse.json({ ok: true });
  }

  const result = validateForm(type, body);
  if (!result.ok) {
    logReject(type, 422, `invalid fields: ${Object.entries(result.errors).map(([f, m]) => `${f} (${m})`).join("; ")}`);
    return NextResponse.json({ error: "Invalid", fieldErrors: result.errors }, { status: 422 });
  }

  const def = forms[type];
  const lines = def.fields
    .filter((f) => result.values[f.name])
    .map((f) => `${f.label}: ${result.values[f.name]}`);
  const subject = def.emailSubject
    ? `${def.emailSubject}: ${result.values.name ?? result.values.contactPerson ?? result.values.organisation ?? ""}`.trim()
    : `New request: ${def.title}`;
  const consentLine =
    def.requireConsent === false ? [] : ["", def.consentEmailLine ?? "Consent to be contacted: yes"];
  const text = [def.title, "", ...lines, ...consentLine].join("\n");

  const key = process.env.RESEND_API_KEY;
  const to = process.env.FORMS_TO_EMAIL;
  if (!key || !to) {
    if (process.env.NODE_ENV === "production") {
      logReject(type, 503, "RESEND_API_KEY or FORMS_TO_EMAIL is not set (production)");
      return NextResponse.json({ error: formsCommon.notConfigured, code: "not_configured" }, { status: 503 });
    }
    // Development: no email configured, so log the submission instead.
    console.log(`\n[forms] ${subject}\n${text}\n`);
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FORMS_FROM_EMAIL || "RSF Website <onboarding@resend.dev>",
        to,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      // Resend explains refusals in the JSON body (never includes our key).
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend refused the email: HTTP ${res.status} ${detail.slice(0, 300)}`);
    }
    if (isDev) {
      const sent = (await res.json().catch(() => ({}))) as { id?: string };
      console.log(`[forms] ${type}: email accepted by Resend (id ${sent.id ?? "unknown"})`);
    }
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : "";
    console.error("[forms] email failed:", err instanceof Error ? err.message : String(err), cause);
    return NextResponse.json({ error: formsCommon.genericError, code: "email_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
