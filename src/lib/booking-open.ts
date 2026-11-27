import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The booking config (prices, rules, whether booking is on), read once per page request: the
// account tab bar and the booking page both need it, and each read is a trip to the database.
export const getBookingConfig = cache(async (): Promise<unknown> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_booking_config");
  return data;
});

// Is online booking switched on?
export const bookingIsOpen = cache(async (): Promise<boolean> => {
  return !!((await getBookingConfig()) as { booking_enabled?: boolean } | null)?.booking_enabled;
});

// Hours before the first night/day up to which a monthly pass or monthly overnight stay can be
// cancelled online for a full refund (a setting; 48 unless an Admin changed it).
export async function monthCutoffHours(): Promise<number> {
  const c = (await getBookingConfig()) as { monthly_self_cancel_cutoff_hours?: number } | null;
  return c?.monthly_self_cancel_cutoff_hours ?? 48;
}
