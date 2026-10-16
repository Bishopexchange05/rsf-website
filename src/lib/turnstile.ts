// Cloudflare's published always-pass test keys, used only outside production.
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export type TurnstileResult = {
  status: "ok" | "failed" | "not-configured";
  // Error codes returned by Cloudflare (e.g. "timeout-or-duplicate"), or our
  // own ("missing-token", "network-error"). Never contains keys.
  codes: string[];
  // For network failures: why the request to Cloudflare failed (no secrets).
  detail?: string;
};

export async function verifyTurnstile(token: string, ip: string): Promise<TurnstileResult> {
  const isProd = process.env.NODE_ENV === "production";
  const secret =
    process.env.TURNSTILE_SECRET_KEY || (isProd ? "" : TURNSTILE_TEST_SECRET);
  if (!secret) return { status: "not-configured", codes: [] };
  if (!token) return { status: "failed", codes: ["missing-token"] };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return data.success
      ? { status: "ok", codes: [] }
      : { status: "failed", codes: data["error-codes"] ?? ["unknown"] };
  } catch (err) {
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const detail = [err instanceof Error ? err.message : String(err), cause?.code ?? cause?.message]
      .filter(Boolean)
      .join(" / ");
    return { status: "failed", codes: ["network-error"], detail };
  }
}
