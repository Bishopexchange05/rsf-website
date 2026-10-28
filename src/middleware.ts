import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Accounts are off (the launch state): these addresses must not exist. Answer a real 404.
  // A page that calls notFound() after its loading skeleton has streamed would send 200.
  if (!accountsEnabled) return NextResponse.rewrite(new URL("/account-pages-are-off", request.url), { status: 404 });
  return updateSession(request);
}

// Only account pages run this. Public pages (home, about, events, forms...) are
// untouched, so their speed does not change.
export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
    "/two-factor/:path*",
    "/book/:path*",
    "/two-factor",
  ],
};
