"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/lib/action-result";

// A form that runs a server action and shows the result (saved, or what went wrong)
// right underneath, WITHOUT leaving or reloading the page. Buttons inside it can be
// <PendingButton>, which shows "Saving…" while the action runs.
export function ActionForm({
  action,
  notices = {},
  errors = {},
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  notices?: Record<string, string>;
  errors?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(async (_prev, fd) => (await action(fd)) ?? {}, {});
  const messageRef = useRef<HTMLDivElement>(null);

  // Make sure the message is on screen even when the Save button is at the bottom of a long page.
  useEffect(() => {
    if (state.notice || state.error) messageRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state]);

  return (
    <form action={formAction} className={className}>
      {children}
      <div ref={messageRef} aria-live="polite" className="mt-3 empty:hidden">
        {state.error && (
          <p role="alert" className="rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
            {errors[state.error] ?? errors.failed ?? "That did not work. Please try again."}
          </p>
        )}
        {state.notice && (
          <p role="status" className="rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
            {notices[state.notice] ?? "Saved."}
          </p>
        )}
      </div>
    </form>
  );
}
