import "server-only";
import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "member" | "staff" | "admin";

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  is_student: boolean;
  is_active: boolean;
};

export type Session = { user: User; profile: Profile };

// The signed-in person and their profile, or null. The role is read from the
// database (profiles.role), never from anything the browser can edit.
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, is_student, is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;

  return { user: data.user, profile: profile as Profile };
}

// Signed-in members only. Anyone else is sent to the login page.
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Role-restricted pages. Signed-out visitors go to login; signed-in people
// without the role get a plain "not found" page (it does not reveal that the
// page exists).
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await requireUser();
  if (!roles.includes(session.profile.role)) notFound();
  return session;
}
