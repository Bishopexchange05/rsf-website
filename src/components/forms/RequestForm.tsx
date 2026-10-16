"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { forms, formsCommon } from "@/content/techspace";
import type { FieldDef, FormType } from "@/lib/form-types";
import { validateForm } from "@/lib/forms";
import Link from "next/link";
import { Turnstile } from "./Turnstile";
import { WhatsAppButton } from "./WhatsAppButton";

// If no token arrives within this long, assume the security check is blocked.
const CHECK_TIMEOUT_MS = 8000;

type Status = "idle" | "sending" | "done";
// "verify" and "widget" errors clear themselves when a fresh token arrives.
type FormError = { kind: "verify" | "widget" | "email" | "other"; message: string };

const inputClass =
  "min-h-12 w-full rounded-xl border border-slate-navy/25 bg-white px-4 py-3 text-slate-navy placeholder:text-slate-navy/50 dark:border-white/25 dark:bg-dark-bg dark:text-dark-text dark:placeholder:text-dark-text/50 aria-[invalid=true]:border-accent-red dark:aria-[invalid=true]:border-accent-red aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent-red/40";

// One reusable request form. Each form's fields and wording live in
// content/techspace.ts. Submits to /api/forms/[type].
export function RequestForm({
  type,
  defaults = {},
  onClose,
  lazyCheck = false,
}: {
  type: FormType;
  defaults?: Record<string, string>;
  onClose: () => void;
  // Start the Turnstile check only when the form is near the screen or used.
  lazyCheck?: boolean;
}) {
  const def = forms[type];
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [checkStarted, setCheckStarted] = useState(!lazyCheck);
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const onToken = useCallback((t: string) => {
    setToken(t);
    // The widget succeeded: drop any stale security-check message.
    setFormError((e) => (e && (e.kind === "verify" || e.kind === "widget") ? null : e));
  }, []);
  // Token expired, widget errored or script failed: reset and ask to retry.
  const onProblem = useCallback(() => {
    setToken("");
    setResetSignal((n) => n + 1);
    setFormError({ kind: "widget", message: formsCommon.verifyRetry });
  }, []);
  // The Turnstile script could not load at all (ad blocker, antivirus shield).
  const onBlocked = useCallback(() => setBlocked(true), []);
  // Lazy mode: begin the security check once the form is near the screen.
  useEffect(() => {
    if (checkStarted) return;
    const el = formRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setCheckStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCheckStarted(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [checkStarted]);
  // No token yet after a while: show the fallback. A late token cancels it.
  useEffect(() => {
    if (!checkStarted) return;
    if (token) {
      setBlocked(false);
      return;
    }
    const id = setTimeout(() => setBlocked(true), CHECK_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [token, attempt, resetSignal, checkStarted]);
  // "Try again": reload the widget (and script) without touching typed answers.
  function tryAgain() {
    setBlocked(false);
    setToken("");
    setFormError((e) => (e && (e.kind === "verify" || e.kind === "widget") ? null : e));
    setAttempt((n) => n + 1);
  }
  // Tokens are single-use: after any attempt that reached the server, get a new one.
  function refreshToken() {
    setToken("");
    setResetSignal((n) => n + 1);
  }

  function set(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  }

  // Move focus to the first field that failed so the visitor sees what to fix.
  function focusFirstInvalid(form: HTMLFormElement) {
    requestAnimationFrame(() => {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setFormError(null);
    const check = validateForm(type, { ...values, consent });
    if (!check.ok) {
      setErrors(check.errors);
      focusFirstInvalid(form);
      return;
    }
    if (!token) {
      setFormError({ kind: "verify", message: formsCommon.verifyError });
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const honeypot = (form.elements.namedItem("website") as HTMLInputElement)?.value;
      const res = await fetch(`/api/forms/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, consent, website: honeypot, turnstileToken: token }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        fieldErrors?: Record<string, string>;
      };
      if (res.ok) {
        setStatus("done");
        return;
      }
      // Failed: keep everything the visitor typed, show why, get a fresh token.
      if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        focusFirstInvalid(form);
      }
      if (data.code === "email_failed") {
        setFormError({ kind: "email", message: formsCommon.emailFailed });
      } else if (data.code === "verify_failed") {
        // The server explains why (e.g. the check was already used).
        setFormError({ kind: "verify", message: data.error ?? formsCommon.verifyRetry });
      } else if (data.fieldErrors) {
        setFormError({ kind: "other", message: formsCommon.fixFields });
      } else {
        setFormError({
          kind: "other",
          // Only server messages that came with a code are visitor-friendly.
          message: data.code && data.error ? data.error : formsCommon.genericError,
        });
      }
    } catch {
      setFormError({ kind: "other", message: formsCommon.genericError });
    }
    refreshToken();
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div role="status" className="py-4 text-center">
        <h3 className="text-navy dark:text-dark-green">{def.successTitle ?? formsCommon.successTitle}</h3>
        <p className="mx-auto mt-3">{def.successText ?? formsCommon.successText}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-12 rounded-full bg-amber px-7 font-heading text-base text-slate-navy hover:brightness-95"
        >
          {formsCommon.close}
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onFocusCapture={() => setCheckStarted(true)}
      noValidate
      className="space-y-5"
    >
      <p className="opacity-85">{def.intro}</p>

      {def.fields.map((field) => (
        <Field
          key={field.name}
          field={field}
          id={`${uid}-${field.name}`}
          value={values[field.name] ?? ""}
          error={errors[field.name]}
          onChange={(v) => set(field.name, v)}
        />
      ))}

      {/* Honeypot: hidden from people; bots tend to fill it in. */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        defaultValue=""
      />

      {def.requireConsent !== false && (
      <div>
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (errors.consent) setErrors((x) => ({ ...x, consent: "" }));
            }}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? `${uid}-consent-error` : undefined}
            className="mt-1 h-5 w-5 shrink-0 accent-navy"
          />
          <span className="text-sm">{def.consentLabel ?? formsCommon.consent}</span>
        </label>
        {errors.consent && (
          <p id={`${uid}-consent-error`} className="mt-1 text-sm font-medium text-accent-red dark:text-red-300">
            {errors.consent}
          </p>
        )}
      </div>
      )}

      {checkStarted && (
      <Turnstile
        key={attempt}
        onToken={onToken}
        onProblem={onProblem}
        onBlocked={onBlocked}
        resetSignal={resetSignal}
      />
      )}

      {blocked && !token && (
        <div role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
          <p>{formsCommon.securityBlocked}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <WhatsAppButton />
            <button
              type="button"
              onClick={tryAgain}
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-current px-5 text-sm font-semibold hover:bg-accent-red/10"
            >
              {formsCommon.tryAgain}
            </button>
          </div>
        </div>
      )}

      {formError && (
        <div role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
          <p>{formError.message}</p>
          {formError.kind === "email" && (
            <div className="mt-3">
              <WhatsAppButton />
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending" || !token}
        className="min-h-12 w-full rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60"
      >
        {status === "sending" ? formsCommon.sending : !token ? formsCommon.checking : def.submitLabel}
      </button>

      <p className="flex flex-wrap items-center gap-x-1 text-sm opacity-80">
        <span>
          {formsCommon.privacyLead} {formsCommon.privacySee}
        </span>
        <Link
          href={formsCommon.privacyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-medium underline underline-offset-2 hover:no-underline"
        >
          {formsCommon.privacyLinkLabel}
        </Link>
        <span className="-ml-1">.</span>
      </p>
    </form>
  );
}

function Field({
  field,
  id,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errId = `${id}-error`;
  const common = {
    id,
    name: field.name,
    required: field.required,
    "aria-invalid": !!error,
    "aria-describedby": error ? errId : undefined,
  };

  let control: React.ReactNode;
  if (field.type === "textarea") {
    control = (
      <textarea
        {...common}
        rows={4}
        maxLength={field.maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  } else if (field.type === "select") {
    control = (
      <select {...common} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Choose…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "radio") {
    control = (
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-3">
        {field.options?.map((o) => (
          <label
            key={o}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-navy/25 px-4 dark:border-white/25"
          >
            <input
              type="radio"
              name={field.name}
              value={o}
              checked={value === o}
              onChange={() => onChange(o)}
              className="h-4 w-4 accent-navy"
            />
            {o}
          </label>
        ))}
      </div>
    );
  } else {
    control = (
      <input
        {...common}
        type={field.type}
        inputMode={field.type === "tel" ? "tel" : undefined}
        autoComplete={field.type === "tel" ? "tel" : field.name === "name" ? "name" : undefined}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }

  return (
    <div>
      <label id={`${id}-label`} htmlFor={field.type === "radio" ? undefined : id} className="mb-1.5 block text-sm font-semibold">
        {field.label}
      </label>
      {control}
      {error && (
        <p id={errId} className="mt-1 text-sm font-medium text-accent-red dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
