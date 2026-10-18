// Public Supabase settings (safe for the browser): the project URL and the
// publishable (anon) key. The secret/service-role key is NEVER read here.
export function supabaseConfig(): { url: string; anonKey: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, anonKey };
}

export function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() && !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

// Accounts are switched on per environment. Off (or unset) on the live site.
export const accountsEnabled = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";
