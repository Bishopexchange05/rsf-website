"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  updateProfileAction,
  type ActionState,
} from "@/lib/auth-actions";
import { passwordProblem } from "@/lib/auth-validation";
import { account, common, errors, fields, forgot, login, register, reset, verifyEmail } from "@/content/accounts";
import { cooldownKey, useCooldown } from "./useCooldown";

const inputClass =
  "min-h-12 w-full rounded-xl border border-slate-navy/25 bg-white px-4 py-3 text-slate-navy placeholder:text-slate-navy/50 dark:border-white/25 dark:bg-dark-bg dark:text-dark-text dark:placeholder:text-dark-text/50 aria-[invalid=true]:border-accent-red dark:aria-[invalid=true]:border-accent-red aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent-red/40";

const buttonClass =
  "min-h-12 w-full rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60";

const empty: ActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? common.sending : label}
    </button>
  );
}

function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <div role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
        {error}
      </div>
    );
  }
  if (success) {
    return (
      <div role="status" className="rounded-xl bg-brand-green/15 p-3 text-sm font-medium text-slate-navy dark:text-dark-green">
        {success}
      </div>
    );
  }
  return null;
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  hint,
  placeholder,
  defaultValue,
  error,
  inputMode,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  inputMode?: "tel" | "email";
  required?: boolean;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && shown ? "text" : type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${inputClass} ${isPassword ? "pr-20" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-pressed={shown}
            className="absolute inset-y-0 right-2 my-auto h-10 rounded-full px-3 text-sm font-semibold text-navy hover:underline dark:text-dark-link"
          >
            {shown ? common.hide : common.show}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm opacity-75">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-accent-red dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

// Instant check in the browser. The server checks again, and that is the one that counts.
function blockShortPassword(e: React.FormEvent<HTMLFormElement>, names: string[], setLocal: (m: Record<string, string>) => void) {
  const form = e.currentTarget;
  const local: Record<string, string> = {};
  for (const n of names) {
    const value = (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
    const p = passwordProblem(value);
    if (p === "short") local[n] = errors.passwordShort;
    else if (p === "long") local[n] = errors.passwordLong;
  }
  const a = (form.elements.namedItem("password") as HTMLInputElement | null)?.value;
  const b = (form.elements.namedItem("confirm") as HTMLInputElement | null)?.value;
  if (!local.password && b !== undefined && a !== b) local.confirm = errors.passwordMismatch;
  setLocal(local);
  if (Object.keys(local).length) e.preventDefault();
}

// ---------------------------------------------------------------- register

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, empty);
  const [local, setLocal] = useState<Record<string, string>>({});
  const fe = { ...state.fieldErrors, ...local };
  const v = state.values ?? {};
  return (
    <form action={action} onSubmit={(e) => blockShortPassword(e, ["password"], setLocal)} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field name="fullName" label={fields.fullName.label} autoComplete="name" defaultValue={v.fullName} error={fe.fullName} />
      <Field name="email" label={fields.email.label} type="email" autoComplete="email" inputMode="email" defaultValue={v.email} error={fe.email} />
      <Field
        name="phone"
        label={fields.phone.label}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder={fields.phone.placeholder}
        hint={fields.phone.hint}
        defaultValue={v.phone}
        error={fe.phone}
      />
      <Field name="password" label={fields.password.label} type="password" autoComplete="new-password" hint={fields.password.hint} error={fe.password} />
      {/* Honeypot: hidden from people; bots tend to fill it in. */}
      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" defaultValue="" />
      <div>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" name="terms" aria-invalid={!!fe.terms} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
          <span className="text-sm">
            {register.terms}{" "}
            {register.termsLinks.map((l, i) => (
              <span key={l.href}>
                {i > 0 && " · "}
                <Link href={l.href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                  {l.label}
                </Link>
              </span>
            ))}
          </span>
        </label>
        {fe.terms && <p className="mt-1 text-sm font-medium text-accent-red dark:text-red-300">{fe.terms}</p>}
      </div>
      <SubmitButton label={register.submit} />
    </form>
  );
}

// ------------------------------------------------------------------- login

export function LoginForm() {
  const [state, action] = useActionState(loginAction, empty);
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state.error} />
      <Field name="email" label={fields.email.label} type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} />
      <Field name="password" label={fields.currentPassword.label} type="password" autoComplete="current-password" />
      <SubmitButton label={login.submit} />
      <p className="text-sm">
        <Link href={login.forgot.href} className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
          {login.forgot.label}
        </Link>
      </p>
    </form>
  );
}

// ------------------------------------------------- verify email (resend)

// A submit button that waits out the countdown. The label changes every second
// but the screen-reader announcement (CooldownStatus) happens once, at the end.
function CooldownButton({ label, remaining }: { label: string; remaining: number }) {
  const { pending } = useFormStatus();
  const waiting = remaining > 0;
  return (
    <button type="submit" disabled={pending || waiting} className={buttonClass}>
      {pending ? common.sending : waiting ? verifyEmail.waiting(remaining) : label}
    </button>
  );
}

function CooldownStatus({ announce }: { announce: boolean }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {announce ? verifyEmail.available : ""}
    </p>
  );
}

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerificationAction, empty);
  // The first email was sent a moment ago (we only know the address then), so
  // the countdown starts as soon as the page opens.
  const { remaining, justFinished, restart } = useCooldown(cooldownKey("verify-sent", email), !!email);
  useEffect(() => {
    if (state.success) restart();
  }, [state, restart]);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state.error} success={state.success ? verifyEmail.resent : undefined} />
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field name="email" label={fields.email.label} type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} />
      )}
      <CooldownButton label={verifyEmail.resend} remaining={remaining} />
      {remaining > 0 && <p className="text-sm opacity-75">{verifyEmail.countdownNote}</p>}
      <CooldownStatus announce={justFinished} />
    </form>
  );
}

// ------------------------------------------------------ forgot / reset

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, empty);
  // No email has been sent yet when the page opens, so no countdown until the first send.
  const { remaining, justFinished, restart } = useCooldown(cooldownKey("forgot-sent"), false);
  useEffect(() => {
    if (state.success) restart();
  }, [state, restart]);
  const sentBefore = !!state.success || remaining > 0;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.success ? forgot.sent : undefined} />
      <Field name="email" label={fields.email.label} type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <CooldownButton label={sentBefore ? forgot.resend : forgot.submit} remaining={remaining} />
      {remaining > 0 && <p className="text-sm opacity-75">{forgot.countdownNote}</p>}
      <CooldownStatus announce={justFinished} />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, empty);
  const [local, setLocal] = useState<Record<string, string>>({});
  const fe = { ...state.fieldErrors, ...local };
  return (
    <form action={action} onSubmit={(e) => blockShortPassword(e, ["password"], setLocal)} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field name="password" label={fields.newPassword.label} type="password" autoComplete="new-password" hint={fields.newPassword.hint} error={fe.password} />
      <Field name="confirm" label={fields.confirmPassword.label} type="password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton label={reset.submit} />
    </form>
  );
}

// ---------------------------------------------------------------- account

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, empty);
  const v = state.values ?? { fullName, phone };
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.success ? account.detailsSaved : undefined} />
      <Field name="fullName" label={fields.fullName.label} autoComplete="name" defaultValue={v.fullName} error={state.fieldErrors?.fullName} />
      <Field
        name="phone"
        label={fields.phone.label}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder={fields.phone.placeholder}
        defaultValue={v.phone}
        error={state.fieldErrors?.phone}
      />
      <SubmitButton label={account.saveDetails} />
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, empty);
  const [local, setLocal] = useState<Record<string, string>>({});
  const fe = { ...state.fieldErrors, ...local };
  return (
    <form action={action} onSubmit={(e) => blockShortPassword(e, ["password"], setLocal)} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.success ? account.passwordSaved : undefined} />
      <Field name="password" label={fields.newPassword.label} type="password" autoComplete="new-password" hint={fields.newPassword.hint} error={fe.password} />
      <Field name="confirm" label={fields.confirmPassword.label} type="password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton label={account.savePassword} />
    </form>
  );
}
