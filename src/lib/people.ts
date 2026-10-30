import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Who = { email: string | null; name: string };

// A member's email address and name, for the daily job (which has no signed-in user).
export async function whoIs(id: string): Promise<Who> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return { email: data.user?.email ?? null, name: profile?.full_name ?? "there" };
}

// The email addresses of every active Admin, for alerts that go to the owners.
export async function adminEmails(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true).is("deleted_at", null);
  const out: string[] = [];
  for (const row of (data as { id: string }[] | null) ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(row.id);
    if (u.user?.email) out.push(u.user.email);
  }
  return out;
}
