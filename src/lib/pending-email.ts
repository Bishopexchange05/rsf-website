import "server-only";
import { cookies } from "next/headers";
import { isValidEmail } from "@/lib/auth-validation";

// The address someone just registered with, kept for an hour in a cookie that
// scripts cannot read, so "check your email" pages need no email in the URL.
export const PENDING_COOKIE = "rsf_pending_email";

export async function readPendingEmail(): Promise<string> {
  const v = (await cookies()).get(PENDING_COOKIE)?.value ?? "";
  return isValidEmail(v) ? v : "";
}
