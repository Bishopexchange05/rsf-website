import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { lagosDate } from "@/lib/lagos";
import { limited } from "@/lib/rate-limit-db";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// "Download my data" (NDPA right of access). Returns a file with everything held about the
// signed-in person, and only about them: the database function reads it for the caller's own
// login, so no one can ask for someone else's. Never cached, and the download is recorded in
// the audit log.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, private" };

export async function GET() {
  if (!accountsEnabled) return new NextResponse("Not found", { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: NO_STORE });

  if (await limited(`export:${session.user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many downloads. Please try again later." }, { status: 429, headers: NO_STORE });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error || !data) return NextResponse.json({ error: "That did not work. Please try again." }, { status: 500, headers: NO_STORE });

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsf-my-data-${lagosDate()}.json"`,
    },
  });
}
