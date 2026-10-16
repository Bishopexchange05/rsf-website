import { forms, formsCommon } from "@/content/techspace";
import type { FieldDef, FormType } from "./form-types";

export const FORM_TYPES = Object.keys(forms) as FormType[];

export function isFormType(value: string): value is FormType {
  return (FORM_TYPES as string[]).includes(value);
}

// Nigerian mobile numbers: 0XXXXXXXXXX, 234XXXXXXXXXX or +234XXXXXXXXXX,
// where the network prefix after 0/234 is 70x, 80x, 81x, 90x or 91x.
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = /^(?:\+?234|0)([789][01]\d{8})$/.exec(digits);
  return match ? `+234${match[1]}` : null;
}

// Strips control characters and angle brackets, collapses whitespace.
export function sanitize(value: string, maxLength: number, multiline = false): string {
  let v = value.normalize("NFC");
  v = v.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "");
  v = v.replace(/[<>]/g, "");
  if (multiline) {
    v = v.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  } else {
    v = v.replace(/\s+/g, " ");
  }
  return v.trim().slice(0, maxLength + 1);
}

function isValidDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false;
  // Not in the past (one day of leeway for time zones) and within two years.
  const now = Date.now();
  return d.getTime() >= now - 36 * 3600 * 1000 && d.getTime() <= now + 2 * 366 * 24 * 3600 * 1000;
}

function isValidDateTime(value: string): boolean {
  const m = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/.exec(value);
  return !!m && isValidDate(m[1]);
}

export type Validated =
  | { ok: true; values: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

// Validates and sanitises submitted values against the form definition.
// Used on the server (authoritative) and on the client (for instant feedback).
export function validateForm(type: FormType, input: Record<string, unknown>): Validated {
  const def = forms[type];
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const field of def.fields) {
    const raw = typeof input[field.name] === "string" ? (input[field.name] as string) : "";
    const error = checkField(field, raw);
    if (error) errors[field.name] = error;
    else values[field.name] = cleanValue(field, raw);
  }

  const consent = input.consent === true || input.consent === "true" || input.consent === "on";
  if (def.requireConsent !== false && !consent) errors.consent = formsCommon.consentRequired;

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

function limitFor(field: FieldDef): number {
  return field.maxLength ?? (field.type === "textarea" ? 1000 : 150);
}

function cleanValue(field: FieldDef, raw: string): string {
  if (field.type === "tel") return normalizeNigerianPhone(raw) ?? "";
  return sanitize(raw, limitFor(field), field.type === "textarea");
}

function checkField(field: FieldDef, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return field.required ? formsCommon.required : null;

  switch (field.type) {
    case "tel":
      return normalizeNigerianPhone(trimmed) ? null : formsCommon.invalidPhone;
    case "date":
      return isValidDate(trimmed) ? null : formsCommon.invalidDate;
    case "datetime-local":
      return isValidDateTime(trimmed) ? null : formsCommon.invalidDate;
    case "select":
    case "radio":
      return field.options?.includes(trimmed) ? null : formsCommon.invalidChoice;
    default: {
      const cleaned = sanitize(trimmed, limitFor(field), field.type === "textarea");
      if (!cleaned && field.required) return formsCommon.required;
      return cleaned.length > limitFor(field) ? formsCommon.tooLong : null;
    }
  }
}
