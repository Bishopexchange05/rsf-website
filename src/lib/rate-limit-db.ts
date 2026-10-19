import "server-only";
import { rateLimitedWith } from "@/lib/rate-limit";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Rate limit that survives serverless restarts (counted in the database).
// Returns true when the caller is OVER the limit. If the database limiter is
// not available (service key not set, or a temporary error) it falls back to
// the in-memory limiter, so a hiccup never locks everyone out.
export async function limited(key: string, max: number, windowMs: number): Promise<boolean> {
  if (adminConfigured()) {
    try {
      const { data, error } = await createAdminClient().rpc("check_rate_limit", {
        p_key: key,
        p_action: "app",
        p_max: max,
        p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      });
      if (!error && typeof data === "boolean") return data;
    } catch {
      // fall through to the in-memory limiter
    }
  }
  return rateLimitedWith(key, max, windowMs);
}
