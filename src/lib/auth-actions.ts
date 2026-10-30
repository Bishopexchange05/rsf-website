"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAal, getSession, needsTwoFactor, requireUser } from "@/lib/auth";
import { cleanEmail, isValidEmail, passwordProblem } from "@/lib/auth-validation";
import { normalizeNigerianPhone, sanitize } from "@/lib/forms";
import { PENDING_COOKIE, readPendingEmail } from "@/lib/pending-email";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { limited } from "@/lib/rate-limit-db";
import { getSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";
import { errors, common } from "@/content/accounts";

// Every action here runs on the server and re-checks everything it is given.
// The browser forms validate too, but only for instant feedback.

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const TEN_MIN = 10 * 60 * 1000;

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

async function ip(): Promise<string> {
  return clientIpFromHeaders(await headers());
}

async function setPendingEmail(email: string) {
  (await cookies()).set(PENDING_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });
}

function passwordError(password: string): string | null {
  const p = passwordProblem(password);
  if (p === "short") return errors.passwordShort;
  if (p === "long") return errors.passwordLong;
  return null;
}

// ---------------------------------------------------------------- register

export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Honeypot: real people never fill this in. Pretend it worked.
  if (text(fd, "website")) redirect("/verify-email");

  const fullName = sanitize(text(fd, "fullName"), 100);
  const phoneRaw = text(fd, "phone");
  const phone = normalizeNigerianPhone(phoneRaw);
  const email = cleanEmail(text(fd, "email"));
  const password = text(fd, "password");
  const terms = text(fd, "terms") === "on";
  const adult = text(fd, "adult") === "on";
  const values = { fullName, phone: phoneRaw, email };

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = errors.name;
  if (!phone) fieldErrors.phone = errors.phone;
  if (!isValidEmail(email)) fieldErrors.email = errors.email;
  const pe = passwordError(password);
  if (pe) fieldErrors.password = pe;
  if (!terms) fieldErrors.terms = errors.terms;
  if (!adult) fieldErrors.adult = errors.adult;
  if (Object.keys(fieldErrors).length) return { fieldErrors, values, error: common.fixFields };

  if (await limited(`signup:${await ip()}`, 5, TEN_MIN)) {
    return { error: common.tooMany, values };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      // Only the fact is stored (and the database adds the time): no date of birth, no age.
      data: { full_name: fullName, phone, terms_accepted: true, adult_confirmed: true },
    },
  });

  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: errors.passwordShort }, values };
    if (error.code === "over_email_send_rate_limit") return { error: errors.emailRate, values };
    return { error: common.genericError, values };
  }

  // Same result whether or not the address already had an account, so this
  // page cannot be used to find out who is registered.
  await setPendingEmail(email);
  redirect("/verify-email");
}

// ------------------------------------------------------------------- login

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = cleanEmail(text(fd, "email"));
  const password = text(fd, "password");
  const values = { email };
  if (!isValidEmail(email) || !password) return { error: errors.badLogin, values };

  const who = await ip();
  if (await limited(`login:${who}:${email}`, 8, TEN_MIN) || await limited(`login-ip:${who}`, 40, TEN_MIN)) {
    return { error: common.tooMany, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      await setPendingEmail(email);
      redirect("/verify-email");
    }
    // One message for a wrong password and an unknown address.
    return { error: errors.badLogin, values };
  }
  // Staff and Admin must pass the authenticator step; so must anyone who has one set up.
  const session = await getSession();
  const aal = await getAal();
  if (session && needsTwoFactor(session.profile.role)) {
    redirect(aal.next === "aal2" ? "/two-factor" : "/two-factor/setup");
  }
  if (aal.next === "aal2" && aal.current !== "aal2") redirect("/two-factor");
  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?notice=signed-out");
}

// ------------------------------------------------- resend verification link

export async function resendVerificationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = cleanEmail(text(fd, "email")) || (await readPendingEmail());
  if (!isValidEmail(email)) return { error: errors.email };

  if (await limited(`resend:${email}`, 1, 60 * 1000) || await limited(`resend-ip:${await ip()}`, 10, TEN_MIN)) {
    return { error: errors.waitResend, values: { email } };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error?.code === "over_email_send_rate_limit") return { error: errors.emailRate, values: { email } };

  // Always the same answer, so it does not reveal whether an account exists.
  return { success: "sent", values: { email } };
}

// ------------------------------------------------------------ forgot / reset

export async function forgotPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = cleanEmail(text(fd, "email"));
  if (!isValidEmail(email)) return { fieldErrors: { email: errors.email }, values: { email } };

  const who = await ip();
  if (await limited(`forgot:${email}`, 3, TEN_MIN) || await limited(`forgot-ip:${who}`, 10, TEN_MIN)) {
    return { error: common.tooMany, values: { email } };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  });
  if (error?.code === "over_email_send_rate_limit") return { error: errors.emailRate, values: { email } };

  return { success: "sent", values: { email } };
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const password = text(fd, "password");
  const confirm = text(fd, "confirm");
  const fieldErrors: Record<string, string> = {};
  const pe = passwordError(password);
  if (pe) fieldErrors.password = pe;
  else if (password !== confirm) fieldErrors.confirm = errors.passwordMismatch;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: errors.linkExpired };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: errors.passwordSame } };
    if (error.code === "weak_password") return { fieldErrors: { password: errors.passwordShort } };
    return { error: common.genericError };
  }
  await supabase.auth.signOut();
  redirect("/login?notice=password-updated");
}

// ----------------------------------------- email link (verify or recovery)

const OTP_TYPES = ["email", "signup", "recovery"] as const;
type OtpType = (typeof OTP_TYPES)[number];

// The link in the email opens a page with a button; the button runs this. A
// plain GET link would let mail scanners "click" it and use up the token.
export async function confirmAction(fd: FormData): Promise<void> {
  const tokenHash = text(fd, "token_hash");
  const type = text(fd, "type") as OtpType;
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash) || !OTP_TYPES.includes(type)) {
    redirect("/auth/confirm?error=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect(`/auth/confirm?error=1&type=${type === "recovery" ? "recovery" : "email"}`);

  (await cookies()).delete(PENDING_COOKIE);
  redirect(type === "recovery" ? "/reset-password" : "/account?notice=verified");
}

// ------------------------------------------------------------ account page

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser();
  const fullName = sanitize(text(fd, "fullName"), 100);
  const phoneRaw = text(fd, "phone");
  const phone = normalizeNigerianPhone(phoneRaw);
  const values = { fullName, phone: phoneRaw };

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = errors.name;
  if (!phone) fieldErrors.phone = errors.phone;
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  // Row Level Security: only the signed-in person's own row, and only these two columns.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", session.user.id);
  if (error) return { error: common.genericError, values };
  return { success: "saved", values };
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const password = text(fd, "password");
  const confirm = text(fd, "confirm");
  const fieldErrors: Record<string, string> = {};
  const pe = passwordError(password);
  if (pe) fieldErrors.password = pe;
  else if (password !== confirm) fieldErrors.confirm = errors.passwordMismatch;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: errors.passwordSame } };
    if (error.code === "weak_password") return { fieldErrors: { password: errors.passwordShort } };
    return { error: common.genericError };
  }
  return { success: "saved" };
}
