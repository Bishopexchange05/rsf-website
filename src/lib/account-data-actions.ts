"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { deleteAccount } from "@/content/accounts";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { sendLoggedEmail } from "@/lib/email/log";
import { limited } from "@/lib/rate-limit-db";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// "Delete my account" (NDPA right to erasure). Steps, in this order:
//   1. the person must be a Member (Staff and Admin are changed by an Admin first);
//   2. they type their password again, so a borrowed, unlocked phone cannot delete the account;
//   3. the database unlinks and scrubs their bookings (and refuses while something is unfinished);
//   4. the login itself is deleted; 5. they are signed out and told by email.
// Accounting figures (amounts, dates, references) are kept, with no link to the person.

const HOUR = 60 * 60 * 1000;

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function deleteAccountAction(fd: FormData): Promise<ActionResult> {
  const session = await requireUser();
  if (session.profile.role !== "member") return { error: "staff" };
  if (text(fd, "confirm") !== "on") return { error: "confirm" };
  if (!adminConfigured()) return { error: "failed" };

  // Few attempts, because this form also checks a password.
  if (await limited(`delete:${session.user.id}`, 5, HOUR)) return { error: "too-many" };

  const email = session.user.email ?? "";
  const password = text(fd, "password");
  if (!email || !password) return { error: "bad-password" };

  // Check the password with a throwaway client, so it does not touch the person's own session.
  const { url, anonKey } = supabaseConfig();
  const checker = createPlainClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pwError } = await checker.auth.signInWithPassword({ email, password });
  if (pwError) return { error: "bad-password" };

  const admin = createAdminClient();
  const { error: dataError } = await admin.rpc("anonymise_user_data", { p_user: session.user.id });
  if (dataError) {
    const m = (dataError.message ?? "").toLowerCase();
    if (m.includes("not finished")) return { error: "open-bookings" };
    if (m.includes("staff and admin")) return { error: "staff" };
    return { error: "failed" };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(session.user.id);
  if (deleteError) return { error: "failed" };

  // Tell them (no link to the deleted login is kept), then sign the browser out.
  await sendLoggedEmail(
    { to: email, subject: deleteAccount.email.subject, text: deleteAccount.email.body(session.profile.full_name) },
    { template: "account-deleted" },
  );
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // The login no longer exists, so there is nothing more to end.
  }
  redirect("/account-deleted");
}
