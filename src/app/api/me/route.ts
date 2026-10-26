import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Tiny answer for the site header: is someone signed in, and are they Staff or
// Admin? The header asks AFTER the page has loaded, so public pages are never
// slowed down or made dynamic by a session check. For visitors with no login
// cookie it answers straight away without contacting Supabase.
// Returns only { signedIn, role }, never anything personal.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, private" };
const OUT = { signedIn: false, role: null };

export async function GET(req: NextRequest) {
  if (!accountsEnabled || !supabaseConfigured()) return NextResponse.json(OUT, { headers: NO_STORE });

  const hasLoginCookie = req.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name));
  if (!hasLoginCookie) return NextResponse.json(OUT, { headers: NO_STORE });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return NextResponse.json(OUT, { headers: NO_STORE });
    const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
    if (!profile || !profile.is_active) return NextResponse.json(OUT, { headers: NO_STORE });
    return NextResponse.json({ signedIn: true, role: profile.role }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(OUT, { headers: NO_STORE });
  }
}
