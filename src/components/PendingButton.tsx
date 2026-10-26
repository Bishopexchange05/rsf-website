"use client";

import { useFormStatus } from "react-dom";
import { common } from "@/content/accounts";

// A submit button that shows its own "pending" wording and cannot be pressed twice
// while the form is being sent. Works inside any <form action={serverAction}>.
export function PendingButton({
  children,
  pendingText = common.saving,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...rest} disabled={disabled || pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
