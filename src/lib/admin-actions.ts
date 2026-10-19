"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { cleanEmail } from "@/lib/auth-validation";
import { sendLoggedEmail } from "@/lib/email/log";
import { removeAllFactors } from "@/lib/mfa";
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

function done(notice: string): never {
  revalidatePath(BACK);
  redirect(`${BACK}?notice=${notice}`);
}

function fail(error: string): never {
  redirect(`${BACK}?error=${error}`);
}

// Turns a database error into one of the page's error codes.
function errorCode(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return "forbidden";
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("last admin")) return "last-admin";
  if (m.includes("your own")) return "self";
  return "failed";
}

export async function setRoleAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const target = text(fd, "target");
  const role = text(fd, "role");
  if (!UUID.test(target) || !["member", "staff", "admin"].includes(role)) fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_target: target, p_role: role });
  if (error) fail(errorCode(error));
  done("role-saved");
}

export async function setActiveAction(fd: FormData): Promise<void> {
  await requireRole(["admin"]);
  const target = text(fd, "target");
  const active = text(fd, "active") === "true";
  if (!UUID.test(target)) fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", { p_target: target, p_active: active });
  if (error) fail(errorCode(error));
  done("active-saved");
}

// Lost phone AND lost recovery codes: another Admin resets the authenticator.
export async function resetMfaAction(fd: FormData): Promise<void> {
  const session = await requireRole(["admin"]);
  const target = text(fd, "target");
  const confirmEmail = cleanEmail(text(fd, "confirmEmail"));
  if (!UUID.test(target) || !confirmEmail) fail("failed");
  if (!adminConfigured()) fail("not-ready");
  if (await limited(`mfa-reset:${session.user.id}`, 5, TEN_MIN)) fail("too-many");

  // The database checks the caller is an Admin with two-step, that the target is
  // Staff or Admin, and that it is not the caller themselves.
  const supabase = await createClient();
  const pre = await supabase.rpc("admin_mfa_reset_precheck", { p_target: target });
  if (pre.error) fail(errorCode(pre.error));
  const row = (pre.data as { email: string; role: string; full_name: string }[] | null)?.[0];
  if (!row) fail("failed");
  if (cleanEmail(row.email) !== confirmEmail) fail("confirm-mismatch");

  // Record the reset BEFORE doing it. If the record cannot be written, stop.
  const logged = await writeAuditLog({
    actorId: session.user.id,
    action: "mfa.reset",
    entityType: "profile",
    entityId: target,
    detail: `Reset by ${session.profile.full_name}`,
  });
  if (!logged) fail("failed");

  const removed = await removeAllFactors(createAdminClient(), target);
  if (!removed) fail("failed");

  await sendLoggedEmail(
    {
      to: row.email,
      subject: twoFactor.email.resetSubject,
      text: twoFactor.email.resetBody(row.full_name, session.profile.full_name),
    },
    { template: "mfa-reset-notice", userId: target },
  );
  done("mfa-reset");
}
