// Pure validation helpers for the account forms. No imports on purpose: the
// SAME functions run in the browser (instant feedback) and on the server
// (the check that counts).

export const PASSWORD_MIN = 10;
// Supabase hashes with bcrypt, which only uses the first 72 bytes.
export const PASSWORD_MAX = 72;

export type PasswordProblem = "short" | "long" | null;

export function passwordProblem(password: string): PasswordProblem {
  if (password.length < PASSWORD_MIN) return "short";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return "long";
  return null;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function cleanEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}
