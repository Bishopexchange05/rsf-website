import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Is online booking switched on? Read once per page request (the account tab bar and the
// page itself both ask), from the same booking config the booking page uses.
export const bookingIsOpen = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_booking_config");
  return !!(data as { booking_enabled?: boolean } | null)?.booking_enabled;
});
