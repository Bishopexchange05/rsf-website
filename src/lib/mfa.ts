import "server-only";
import { createHash, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---- recovery codes --------------------------------------------------------
// 16 characters from a 32-character alphabet (no I, O, 0 or 1) = 80 bits of
// randomness each, shown as XXXX-XXXX-XXXX-XXXX. Only a SHA-256 hash is stored.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_COUNT = 10;

export function generateRecoveryCode(): string {
  let s = "";
  for (let i = 0; i < 16; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function formatRecoveryCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

// Accepts what a person types: any case, with or without dashes or spaces.
export function normaliseRecoveryCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{16}$/.test(s) ? s : null;
}

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

// Replaces ALL of a person's recovery codes with a fresh set and returns the
// readable codes (to be shown once, never stored).
export async function replaceRecoveryCodes(admin: SupabaseClient, userId: string): Promise<string[] | null> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  const del = await admin.from("recovery_codes").delete().eq("user_id", userId);
  if (del.error) return null;
  const ins = await admin
    .from("recovery_codes")
    .insert(codes.map((c) => ({ user_id: userId, code_hash: hashCode(userId, c) })));
  if (ins.error) return null;
  return codes.map(formatRecoveryCode);
}

// Marks one unused code as used. Returns true only for the single request that
// wins, so a code can never be used twice.
export async function consumeRecoveryCode(admin: SupabaseClient, userId: string, code: string): Promise<boolean> {
  const { data, error } = await admin
    .from("recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("code_hash", hashCode(userId, code))
    .is("used_at", null)
    .select("id");
  return !error && Array.isArray(data) && data.length === 1;
}

export async function countUnusedRecoveryCodes(admin: SupabaseClient, userId: string): Promise<number> {
  const { count } = await admin
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);
  return count ?? 0;
}

// ---- removing authenticator factors (service role) -------------------------

export async function removeAllFactors(admin: SupabaseClient, userId: string): Promise<boolean> {
  const list = await admin.auth.admin.mfa.listFactors({ userId });
  if (list.error) return false;
  for (const factor of list.data?.factors ?? []) {
    const del = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (del.error) return false;
  }
  const codes = await admin.from("recovery_codes").delete().eq("user_id", userId);
  return !codes.error;
}
