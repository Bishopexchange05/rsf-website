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

export type Aal = { current: string | null; next: string | null };

// How strongly this session has been verified: aal1 = password only, aal2 =
// password plus a code from the authenticator app. "next" is aal2 when the
// person has an authenticator set up.
//
// "next" is read from the database (fresh), NOT from the session. The session
// keeps a copy of the person's factors that goes stale when an authenticator is
// removed (recovery code, Admin reset), which used to send people back to the
// code page instead of the setup page. Pass { enrollment: false } when only the
// current level matters, to skip that extra lookup.
export async function getAal(opts: { enrollment?: boolean } = {}): Promise<Aal> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const current = data?.currentLevel ?? null;
  if (opts.enrollment === false) return { current, next: null };
  const factors = await supabase.auth.mfa.listFactors();
  const enrolled = (factors.data?.totp ?? []).length > 0;
  return { current, next: enrolled ? "aal2" : "aal1" };
}

export function needsTwoFactor(role: Role): boolean {
  return role === "admin" || role === "staff";
}

// Where a password-only session must go next: the code page if an
// authenticator is set up, otherwise the setup page.
export async function twoFactorPath(): Promise<string> {
  const aal = await getAal();
  return aal.next === "aal2" ? "/two-factor" : "/two-factor/setup";
}

// Role-restricted pages. Signed-out visitors go to login; signed-in people
// without the role get a plain "not found" page (it does not reveal that the
// page exists). Staff and Admin must also have passed the authenticator-app
// check in this session, otherwise they are sent to set it up or enter a code.
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await requireUser();
  if (!roles.includes(session.profile.role)) notFound();
  if (needsTwoFactor(session.profile.role)) {
    const aal = await getAal({ enrollment: false });
    if (aal.current !== "aal2") redirect(await twoFactorPath());
  }
  return session;
}
