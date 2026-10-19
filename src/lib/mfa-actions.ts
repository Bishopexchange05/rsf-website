"use server";

import { redirect } from "next/navigation";
import { getAal, needsTwoFactor, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendLoggedEmail } from "@/lib/email/log";
import { consumeRecoveryCode, normaliseRecoveryCode, removeAllFactors, replaceRecoveryCodes } from "@/lib/mfa";
import { limited } from "@/lib/rate-limit-db";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { common, twoFactor } from "@/content/accounts";
import { orgName } from "@/content/site";

// Authenticator-app (TOTP) two-step verification. Every action re-checks who is
// asking on the server. Recovery codes are made here (Supabase has no built-in
// ones): readable codes are shown once, only hashes are stored.

export type MfaState = {
  error?: string;
  factorId?: string;
  qr?: string;
  secret?: string;
  codes?: string[];
};

const TEN_MIN = 10 * 60 * 1000;

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function qrSrc(raw: string): string {
  return raw.startsWith("data:") ? raw : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
}

function homeFor(role: string): string {
  return role === "admin" || role === "staff" ? "/admin" : "/account";
}

// ------------------------------------------------------------ set up (enrol)

export async function startEnrollAction(): Promise<MfaState> {
  const session = await requireUser();
  if (!needsTwoFactor(session.profile.role)) redirect("/account");
  // Recovery codes need the server key; refuse early rather than half-finish.
  if (!adminConfigured()) return { error: twoFactor.setup.notReady };

  const supabase = await createClient();
  const list = await supabase.auth.mfa.listFactors();
  if ((list.data?.totp ?? []).length > 0) redirect("/two-factor");

  // Remove half-finished setups from earlier tries.
  for (const f of list.data?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `RSF ${Date.now().toString(36)}`,
    issuer: orgName,
  });
  if (error || !data) return { error: common.genericError };
  return { factorId: data.id, qr: qrSrc(data.totp.qr_code), secret: data.totp.secret };
}

export async function verifyEnrollAction(_prev: MfaState, fd: FormData): Promise<MfaState> {
  const session = await requireUser();
  if (!needsTwoFactor(session.profile.role)) redirect("/account");
  const factorId = text(fd, "factorId");
  const code = text(fd, "code").replace(/\s/g, "");
  if (!/^[0-9a-fA-F-]{36}$/.test(factorId) || !/^\d{6}$/.test(code)) return { error: twoFactor.setup.badCode };

  if (await limited(`mfa-enrol:${session.user.id}`, 8, TEN_MIN)) return { error: common.tooMany };

  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { error: twoFactor.setup.badCode };
  const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
  if (verify.error) return { error: twoFactor.setup.badCode };

  await writeAuditLog({ actorId: session.user.id, action: "mfa.enrolled", entityType: "profile", entityId: session.user.id });

  const codes = await replaceRecoveryCodes(createAdminClient(), session.user.id);
  if (!codes) return { error: common.genericError };
  return { codes };
}

// ------------------------------------------------------- code at each login

export async function challengeAction(_prev: MfaState, fd: FormData): Promise<MfaState> {
  const session = await requireUser();
  const code = text(fd, "code").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: twoFactor.challenge.badCode };
  if (await limited(`mfa-code:${session.user.id}`, 8, TEN_MIN)) return { error: common.tooMany };

  const supabase = await createClient();
  const factors = await supabase.auth.mfa.listFactors();
  const factor = factors.data?.totp?.[0];
  if (!factor) redirect(needsTwoFactor(session.profile.role) ? "/two-factor/setup" : "/account");

  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error || !challenge.data) return { error: twoFactor.challenge.badCode };
  const verify = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code });
  if (verify.error) return { error: twoFactor.challenge.badCode };

  redirect(homeFor(session.profile.role));
}

// ------------------------------------------------ lost phone: recovery code

export async function recoveryCodeAction(_prev: MfaState, fd: FormData): Promise<MfaState> {
  const session = await requireUser();
  if (!adminConfigured()) return { error: twoFactor.setup.notReady };
  if (await limited(`mfa-recovery:${session.user.id}`, 5, TEN_MIN)) return { error: common.tooMany };

  const code = normaliseRecoveryCode(text(fd, "code"));
  if (!code) return { error: twoFactor.recovery.bad };

  const admin = createAdminClient();
  const ok = await consumeRecoveryCode(admin, session.user.id, code);
  if (!ok) return { error: twoFactor.recovery.bad };

  // Record first, then remove the old authenticator.
  await writeAuditLog({
    actorId: session.user.id,
    action: "mfa.recovery_code_used",
    entityType: "profile",
    entityId: session.user.id,
    detail: "Old authenticator removed. New setup required.",
  });
  const removed = await removeAllFactors(admin, session.user.id);
  if (!removed) return { error: common.genericError };

  if (session.user.email) {
    await sendLoggedEmail(
      {
        to: session.user.email,
        subject: twoFactor.email.recoverySubject,
        text: twoFactor.email.recoveryBody(session.profile.full_name),
      },
      { template: "mfa-recovery-used", userId: session.user.id },
    );
  }
  redirect("/two-factor/setup?notice=recovered");
}

// --------------------------------------------------- new recovery codes later

export async function regenerateCodesAction(): Promise<MfaState> {
  const session = await requireUser();
  if (!needsTwoFactor(session.profile.role)) redirect("/account");
  const aal = await getAal();
  if (aal.current !== "aal2") return { error: twoFactor.account.needSignInAgain };
  if (!adminConfigured()) return { error: twoFactor.setup.notReady };

  const codes = await replaceRecoveryCodes(createAdminClient(), session.user.id);
  if (!codes) return { error: common.genericError };
  await writeAuditLog({ actorId: session.user.id, action: "mfa.codes_regenerated", entityType: "profile", entityId: session.user.id });
  return { codes };
}
