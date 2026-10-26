"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/lib/action-result";

// A form that runs a server action and shows the result (saved, or what went wrong)
// WITHOUT leaving or reloading the page. Buttons inside it can be <PendingButton>,
// which shows "Saving…" while the action runs.
//   toast:         show the result as a message at the bottom of the screen (the <Toaster>
//                  in the admin pages) instead of under the form. Use it when the form
//                  disappears after success (for example a payment leaves the queue).
//   lockOnSuccess: switch the fields off after success, so it cannot be sent twice.
export function ActionForm({
  action,
  notices = {},
  errors = {},
  className,
  toast = false,
  lockOnSuccess = false,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  notices?: Record<string, string>;
  errors?: Record<string, string>;
  className?: string;
  toast?: boolean;
  lockOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(async (_prev, fd) => (await action(fd)) ?? {}, {});
  const messageRef = useRef<HTMLDivElement>(null);

  const message = state.error
    ? (errors[state.error] ?? errors.failed ?? "That did not work. Please try again.")
    : state.notice
      ? (notices[state.notice] ?? "Saved.")
      : null;

  useEffect(() => {
    if (!message) return;
    if (toast) {
      window.dispatchEvent(new CustomEvent("rsf:toast", { detail: { message, kind: state.error ? "error" : "notice" } }));
    } else {
      // Make sure the message is on screen even when the button is at the bottom of a long page.
      messageRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className={className}>
      <fieldset disabled={lockOnSuccess && !!state.notice} className="contents">
        {children}
      </fieldset>
      {!toast && (
        <div ref={messageRef} aria-live="polite" className="mt-3 empty:hidden">
          {state.error && message && (
            <p role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
              {message}
            </p>
          )}
          {state.notice && message && (
            <p role="status" className="rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
              {message}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
