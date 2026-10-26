"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { cleanEmail } from "@/lib/auth-validation";
import { sendLoggedEmail } from "@/lib/email/log";
import { endUserSessions, removeAllFactors } from "@/lib/mfa";
import { limited } from "@/lib/rate-limit-db";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { twoFactor } from "@/content/accounts";

// Admin-only actions behind the People page. Each one: (1) requireRole makes
// sure the caller is an Admin who has passed two-step verification, (2) the
// database function checks the same thing again and writes the audit log in the
// same transaction. Results come back as a short code in the address (never
// personal data) that the page turns into a message.

const TEN_MIN = 10 * 60 * 1000;
const UUID = /^[0-9a-fA-F-]{36}$/;
const BACK = "/admin/users";

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function done(notice: string): ActionResult {
  revalidatePath(BACK);
  return { notice };
}

function fail(error: string): ActionResult {
  return { error };
}

// Turns a database error into one of the page's error codes.
function errorCode(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return "forbidden";
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("last admin")) return "last-admin";
  if (m.includes("your own")) return "self";
  return "failed";
}

export async function setRoleAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const target = text(fd, "target");
  const role = text(fd, "role");
  if (!UUID.test(target) || !["member", "staff", "admin"].includes(role)) return fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_target: target, p_role: role });
  if (error) return fail(errorCode(error));
  return done("role-saved");
}

export async function setActiveAction(fd: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const target = text(fd, "target");
  const active = text(fd, "active") === "true";
  if (!UUID.test(target)) return fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", { p_target: target, p_active: active });
  if (error) return fail(errorCode(error));
  return done("active-saved");
}

// Lost phone AND lost recovery codes: another Admin resets the authenticator.
export async function resetMfaAction(fd: FormData): Promise<ActionResult> {
  const session = await requireRole(["admin"]);
  const target = text(fd, "target");
  const confirmEmail = cleanEmail(text(fd, "confirmEmail"));
  if (!UUID.test(target) || !confirmEmail) return fail("failed");
  if (!adminConfigured()) return fail("not-ready");
  if (await limited(`mfa-reset:${session.user.id}`, 5, TEN_MIN)) return fail("too-many");

  // The database checks the caller is an Admin with two-step, that the target is
  // Staff or Admin, and that it is not the caller themselves.
  const supabase = await createClient();
  const pre = await supabase.rpc("admin_mfa_reset_precheck", { p_target: target });
  if (pre.error) return fail(errorCode(pre.error));
  const row = (pre.data as { email: string; role: string; full_name: string }[] | null)?.[0];
  if (!row) return fail("failed");
  if (cleanEmail(row.email) !== confirmEmail) return fail("confirm-mismatch");

  // Record the reset BEFORE doing it. If the record cannot be written, stop.
  const logged = await writeAuditLog({
    actorId: session.user.id,
    action: "mfa.reset",
    entityType: "profile",
    entityId: target,
    detail: `Reset by ${session.profile.full_name}`,
  });
  if (!logged) return fail("failed");

  const admin = createAdminClient();
  const removed = await removeAllFactors(admin, target);
  if (!removed) return fail("failed");

  // End every open session of that person, so nothing already open keeps Staff or
  // Admin access. If this fails the Admin is told, and can simply run the reset again.
  const ended = await endUserSessions(admin, target);
  await writeAuditLog({
    actorId: session.user.id,
    action: ended === null ? "sessions.end_failed" : "sessions.ended",
    entityType: "profile",
    entityId: target,
    detail: ended === null ? "Could not end sessions after a two-step reset." : `${ended} session(s) ended after a two-step reset.`,
  });
  if (ended === null) return fail("failed");

  await sendLoggedEmail(
    {
      to: row.email,
      subject: twoFactor.email.resetSubject,
      text: twoFactor.email.resetBody(row.full_name, session.profile.full_name),
    },
    { template: "mfa-reset-notice", userId: target },
  );
  return done("mfa-reset");
}
