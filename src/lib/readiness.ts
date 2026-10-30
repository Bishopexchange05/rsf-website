import { site } from "@/content/site";

// The launch checklist on the Settings page. It is ADVICE ONLY: nothing here blocks or forces
// anything. The Admin decides when booking goes live. The only thing that refuses to switch booking
// on is the database rule that bank details must be entered first.
//
// The site can only see how it is configured, not the outside world, so two of these are honest
// best guesses (the wording on the page says so).

export type ReadinessId = "email" | "legal" | "production";
export type ReadinessItem = { id: ReadinessId; ok: boolean };

export function readiness(legalDoneAt: string | null): ReadinessItem[] {
  const provider = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const from = (process.env.EMAIL_FROM ?? "").toLowerCase();
  const emailOk = provider === "resend" && from.includes(`@${site.domain}`);
  const productionOk = process.env.VERCEL_ENV === "production";
  return [
    { id: "email", ok: emailOk },
    { id: "legal", ok: legalDoneAt !== null },
    { id: "production", ok: productionOk },
  ];
}
