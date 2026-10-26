"use client";

import { useEffect, useState } from "react";

// Shows the result of an action (for example "Payment confirmed") at the bottom of the
// screen for a few seconds. It stays on screen even when the page behind it changes
// (for example the payment card leaves the queue). One per page.
export function Toaster() {
  const [toast, setToast] = useState<{ message: string; kind: "notice" | "error" } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; kind: "notice" | "error" }>).detail;
      setToast(d);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), d.kind === "error" ? 9000 : 6000);
    };
    window.addEventListener("rsf:toast", onToast);
    return () => {
      window.removeEventListener("rsf:toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.kind === "error" ? "bg-accent-red text-white" : "bg-navy text-white dark:bg-dark-green dark:text-dark-bg"
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Close message" className="-mr-1 min-h-6 min-w-6 rounded-full text-lg leading-none">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
