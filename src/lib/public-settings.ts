import { createClient } from "@supabase/supabase-js";
import { accountsEnabled, supabaseConfig, supabaseConfigured } from "@/lib/supabase/config";

// What the public Tech & Space page may know: opening hours, desks and prices, and whether
// overnight requests are open. It returns null unless accounts are switched on for this site
// AND the Admin has turned the booking switch on in Settings. While the switch is off the
// database returns only {"booking_enabled": false}, so nothing can appear early. The address
// and house rules are never part of this.

export type PublicSettings = {
  booking_enabled: true;
  hours: { weekday: number; is_closed: boolean; opens_at: string | null; closes_at: string | null }[];
  day_desks: number;
  overnight_desks: number;
  overnight_open: boolean;
  half_day_split: string;
  monthly_pass_days: number;
  prices: { space: string; kind: string; audience: string; amount_kobo: number }[];
};

export async function loadPublicSettings(): Promise<PublicSettings | null> {
  if (!accountsEnabled || !supabaseConfigured()) return null;
  try {
    const { url, anonKey } = supabaseConfig();
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Cached for a minute, so a change in Settings shows within about a minute.
      global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60 } }) },
    });
    const { data, error } = await supabase.rpc("get_public_settings");
    if (error || !data || !(data as { booking_enabled?: boolean }).booking_enabled) return null;
    return data as PublicSettings;
  } catch {
    return null;
  }
}
