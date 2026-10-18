import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseConfig } from "./config";

// Refreshes the login session cookie on requests to account pages, so the
// server always sees an up-to-date session. It does not decide who may see
// what: every page and action checks the role itself, on the server.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured()) return response;

  const { url, anonKey } = supabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() checks the token with Supabase (unlike getSession(), which only
  // reads the cookie). This is what triggers the refresh.
  await supabase.auth.getUser();
  return response;
}
