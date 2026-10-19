import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client with the service-role (secret) key. It bypasses Row Level
// Security, so it is used only in a few server functions that have already
// checked who is asking: two-factor resets, recovery codes, audit and email
// logging, and the database rate limiter. The key lives only in the server
// environment (Vercel and .env.local), never in a NEXT_PUBLIC_ variable.
export function adminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() && !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
}

export function createAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
