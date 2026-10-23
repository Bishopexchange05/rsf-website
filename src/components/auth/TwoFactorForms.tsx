"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  challengeAction,
  recoveryCodeAction,
  regenerateCodesAction,
  startEnrollAction,
  verifyEnrollAction,
  type MfaState,
} from "@/lib/mfa-actions";
import { signOutAction } from "@/lib/auth-actions";
import { common, twoFactor } from "@/content/accounts";

const inputClass =
  "min-h-12 w-full rounded-xl border border-slate-navy/25 bg-white px-4 py-3 text-slate-navy placeholder:text-slate-navy/50 dark:border-white/25 dark:bg-dark-bg dark:text-dark-text dark:placeholder:text-dark-text/50 aria-[invalid=true]:border-accent-red dark:aria-[invalid=true]:border-accent-red aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent-red/40";
const buttonClass =
  "min-h-12 w-full rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60";
const outlineClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy px-6 py-3 font-heading text-base text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

const empty: MfaState = {};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? common.sending : label}
    </button>
  );
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
      {message}
    </div>
  );
}

function CodeField({ name, label, numeric = true }: { name: string; label: string; numeric?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        autoComplete={numeric ? "one-time-code" : "off"}
        pattern={numeric ? "[0-9 ]*" : undefined}
        maxLength={numeric ? 7 : 24}
        required
        className={`${inputClass} ${numeric ? "text-center font-mono text-2xl tracking-[0.3em]" : "font-mono uppercase"}`}
      />
    </div>
  );
}

// ------------------------------------------------------- recovery codes list

export function CodesPanel({ codes, showContinue }: { codes: string[]; showContinue: boolean }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const body = `${twoFactor.codes.fileHeader}\n\n${codes.join("\n")}\n`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = twoFactor.codes.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-h3">{twoFactor.codes.heading}</h2>
      <p>{twoFactor.codes.text}</p>
      <ul className="grid grid-cols-1 gap-2 rounded-xl bg-cream p-4 font-mono text-lg tracking-wide dark:bg-dark-bg sm:grid-cols-2">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={copy} className={outlineClass}>
          {copied ? twoFactor.codes.copied : twoFactor.codes.copy}
        </button>
        <button type="button" onClick={download} className={outlineClass}>
          {twoFactor.codes.download}
        </button>
      </div>
      {showContinue && (
        <>
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
            <span className="text-sm">{twoFactor.codes.saved}</span>
          </label>
          {saved ? (
            <Link href="/admin" className={`${buttonClass} inline-flex items-center justify-center`}>
              {twoFactor.codes.continue}
            </Link>
          ) : (
            <button type="button" disabled className={buttonClass}>
              {twoFactor.codes.continue}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- set up

export function EnrollPanel({ alreadyOn = false }: { alreadyOn?: boolean }) {
  const [start, startAction] = useActionState(startEnrollAction, empty);
  const [verify, verifyAction] = useActionState(verifyEnrollAction, empty);

  if (verify.codes) return <CodesPanel codes={verify.codes} showContinue />;

  if (alreadyOn) {
    return (
      <div className="space-y-4">
        <p>{twoFactor.setup.alreadyOn}</p>
        <Link href={twoFactor.setup.alreadyOnLink.href} className="font-medium underline underline-offset-2">
          {twoFactor.setup.alreadyOnLink.label}
        </Link>
      </div>
    );
  }

  if (start.factorId && start.qr) {
    return (
      <form action={verifyAction} className="space-y-5">
        <ErrorBox message={verify.error} />
        {/* eslint-disable-next-line @next/next/no-img-element -- generated QR image (data address) */}
        <img src={start.qr} alt={twoFactor.setup.scanAlt} width={200} height={200} className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
        <div className="text-sm">
          <p className="font-semibold">{twoFactor.setup.keyLabel}</p>
          <p className="mt-1 break-all rounded-lg bg-cream p-2 font-mono dark:bg-dark-bg">{start.secret}</p>
        </div>
        <input type="hidden" name="factorId" value={start.factorId} />
        <CodeField name="code" label={twoFactor.setup.codeLabel} />
        <Submit label={twoFactor.setup.verify} />
      </form>
    );
  }

  return (
    <form action={startAction} className="space-y-5">
      <ErrorBox message={start.error} />
      <ol className="list-decimal space-y-2 pl-5">
        {twoFactor.setup.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <Submit label={twoFactor.setup.start} />
    </form>
  );
}

// ------------------------------------------------------- code at each login

export function ChallengeForm() {
  const [state, action] = useActionState(challengeAction, empty);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        <ErrorBox message={state.error} />
        <CodeField name="code" label={twoFactor.challenge.codeLabel} />
        <Submit label={twoFactor.challenge.submit} />
      </form>
      <p className="text-sm">
        <Link href={twoFactor.challenge.recoveryLink.href} className="font-medium underline underline-offset-2">
          {twoFactor.challenge.recoveryLink.label}
        </Link>
      </p>
      <form action={signOutAction}>
        <button type="submit" className="text-sm font-medium underline underline-offset-2">
          {twoFactor.challenge.signOut}
        </button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------ recovery code

export function RecoveryForm() {
  const [state, action] = useActionState(recoveryCodeAction, empty);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        <ErrorBox message={state.error} />
        <CodeField name="code" label={twoFactor.recovery.codeLabel} numeric={false} />
        <Submit label={twoFactor.recovery.submit} />
      </form>
      <p className="text-sm">
        <Link href={twoFactor.recovery.back.href} className="font-medium underline underline-offset-2">
          {twoFactor.recovery.back.label}
        </Link>
      </p>
    </div>
  );
}

// ------------------------------------------------- new codes (account page)

export function RegenerateCodes() {
  const [state, action] = useActionState(regenerateCodesAction, empty);
  if (state.codes) return <CodesPanel codes={state.codes} showContinue={false} />;
  return (
    <form action={action} className="space-y-3">
      <ErrorBox message={state.error} />
      <p className="text-sm opacity-85">{twoFactor.account.regenerateHelp}</p>
      <Submit label={twoFactor.account.regenerate} />
    </form>
  );
}
