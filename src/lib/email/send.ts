import "server-only";
import nodemailer from "nodemailer";
import { isValidEmail } from "@/lib/auth-validation";

// One place that sends the app's own emails (booking and account emails).
// Which provider, which sender and which Reply-To are all environment settings,
// so moving from the Gmail bridge to Resend later changes variables, not code:
//   EMAIL_PROVIDER = smtp | resend
//   EMAIL_FROM     = "Rafael Support Foundation <sender@example.com>"
//   REPLY_TO_EMAIL = where customer replies go
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS      (provider smtp)
//   RESEND_API_KEY                                   (provider resend)
// Supabase's own verification and reset emails use the SMTP fields in the
// Supabase dashboard instead (Authentication, SMTP settings).

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

// Reads a variable and removes one pair of surrounding quotes, so both
// EMAIL_FROM="Name <a@b.c>" in .env files and an unquoted value in Vercel work.
function env(name: string): string {
  const raw = (process.env[name] ?? "").trim();
  if (raw.length >= 2 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

function safeLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendEmail(mail: Mail): Promise<SendResult> {
  const to = mail.to.trim();
  if (!isValidEmail(to)) return { ok: false, error: "Invalid recipient address." };

  const provider = env("EMAIL_PROVIDER") || "smtp";
  const from = env("EMAIL_FROM");
  const replyTo = env("REPLY_TO_EMAIL");
  if (!from) return { ok: false, error: "EMAIL_FROM is not set." };

  const subject = safeLine(mail.subject);

  if (provider === "resend") {
    const key = env("RESEND_API_KEY");
    if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject,
          text: mail.text,
          ...(mail.html ? { html: mail.html } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return { ok: false, error: `Resend refused the email: HTTP ${res.status} ${detail.slice(0, 300)}` };
      }
      const sent = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, id: sent.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (provider !== "smtp") return { ok: false, error: `Unknown EMAIL_PROVIDER "${provider}".` };

  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT") || "465");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  if (!host || !user || !pass || !Number.isFinite(port)) {
    return { ok: false, error: "SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS must all be set." };
  }

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
      ...(replyTo ? { replyTo } : {}),
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    // The message names the SMTP response (for example a refused login), never the password.
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
