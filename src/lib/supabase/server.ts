import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

// Supabase client for server components, server actions and route handlers.
// It reads and writes the session cookies, so it acts as the signed-in person
// and every query is subject to Row Level Security.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseConfig();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component, which cannot set cookies. The
          // middleware refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}
