export type FieldType =
  | "text"
  | "tel"
  | "date"
  | "datetime-local"
  | "textarea"
  | "select"
  | "radio";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: readonly string[];
  maxLength?: number;
  placeholder?: string;
  hint?: string;
};

export type FormType =
  | "day-space"
  | "overnight-access"
  | "media-room"
  | "course-interest"
  | "guidance"
  | "digital-marketing"
  | "event-rsvp"
  | "contact"
  | "volunteer"
  | "partner";

export type FormDef = {
  title: string;
  intro: string;
  submitLabel: string;
  // Optional overrides: success screen wording and the email subject.
  successTitle?: string;
  successText?: string;
  emailSubject?: string;
  // Replaces the standard consent tick-box wording and its line in the email.
  // Set false for a form with no consent tick box (default: required).
  requireConsent?: boolean;
  consentLabel?: string;
  consentEmailLine?: string;
  fields: readonly FieldDef[];
};
