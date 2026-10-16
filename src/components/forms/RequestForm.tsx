"use client";

import { useId, useRef, useState } from "react";
import { forms, formsCommon } from "@/content/techspace";
import type { FieldDef, FormType } from "@/lib/form-types";
import { validateForm } from "@/lib/forms";
import Link from "next/link";
import { WhatsAppButton } from "./WhatsAppButton";

// If the server has not answered after this long, stop waiting and show an error.
const REQUEST_TIMEOUT_MS = 10000;

type Status = "idle" | "sending" | "done";
// "retry" errors show the Try again and WhatsApp buttons; "fields" errors point at the form.
type FormError = { kind: "retry" | "fields"; message: string };

const inputClass =
  "min-h-12 w-full rounded-xl border border-slate-navy/25 bg-white px-4 py-3 text-slate-navy placeholder:text-slate-navy/50 dark:border-white/25 dark:bg-dark-bg dark:text-dark-text dark:placeholder:text-dark-text/50 aria-[invalid=true]:border-accent-red dark:aria-[invalid=true]:border-accent-red aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent-red/40";

// One reusable request form. Each form's fields and wording live in
// content/techspace.ts. Submits to /api/forms/[type].
export function RequestForm({
  type,
  defaults = {},
  onClose,
}: {
  type: FormType;
  defaults?: Record<string, string>;
  onClose: () => void;
}) {
  const def = forms[type];
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // When the form opened, so the server can ignore instant (bot) submissions.
  const openedAt = useRef(Date.now());
  const [status, setStatus] = useState<Status>("idle");

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

  async function onSubmit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const form = formRef.current;
    if (!form || status === "sending") return;
    setFormError(null);
    const check = validateForm(type, { ...values, consent });
    if (!check.ok) {
      setErrors(check.errors);
      focusFirstInvalid(form);
      return;
    }
    setErrors({});
    setStatus("sending");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const honeypot = (form.elements.namedItem("website") as HTMLInputElement)?.value;
      const res = await fetch(`/api/forms/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...values,
          consent,
          website: honeypot,
          elapsedMs: Date.now() - openedAt.current,
        }),
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
      // Failed: keep everything the visitor typed and show why.
      if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        focusFirstInvalid(form);
        setFormError({ kind: "fields", message: formsCommon.fixFields });
      } else {
        setFormError({
          kind: "retry",
          // Only server messages that came with a code are visitor-friendly.
          message: data.code && data.error ? data.error : formsCommon.genericError,
        });
      }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      setFormError({ kind: "retry", message: timedOut ? formsCommon.timeout : formsCommon.genericError });
    } finally {
      clearTimeout(timer);
    }
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

      {formError && (
        <div role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
          <p>{formError.message}</p>
          {formError.kind === "retry" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <WhatsAppButton />
              <button
                type="button"
                onClick={() => onSubmit()}
                className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-current px-5 text-sm font-semibold hover:bg-accent-red/10"
              >
                {formsCommon.tryAgain}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 w-full rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60"
      >
        {status === "sending" ? formsCommon.sending : def.submitLabel}
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
