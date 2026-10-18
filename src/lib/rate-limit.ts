// Simple in-memory limiter: about 5 submissions per IP per 10 minutes.
// Note: memory is per server instance, so on serverless hosting this is a
// best-effort guard. The honeypot and the time check do the rest; move this
// to a shared store (e.g. Upstash Redis) if abuse appears.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

const hits = new Map<string, number[]>();

// Same limiter with its own allowance, used by the account actions
// (for example 1 resend per minute, 8 login tries per 10 minutes).
export function rateLimitedWith(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

export function rateLimited(key: string, now = Date.now()): boolean {
  return rateLimitedWith(key, MAX_HITS, WINDOW_MS, now);
}

export function clientIpFromHeaders(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}
