"use client";

import { useState } from "react";
import { bookingPage } from "@/content/booking";

// Copies one value (account number, amount, reference) so it can be pasted into a banking
// app. Says "Copied" for a moment; screen readers hear it too.
export function CopyButton({ value, what }: { value: string; what: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers: copy through a hidden text box.
      const box = document.createElement("textarea");
      box.value = value;
      box.setAttribute("readonly", "");
      box.className = "fixed -left-[9999px]";
      document.body.appendChild(box);
      box.select();
      document.execCommand("copy");
      box.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={bookingPage.copyLabel(what)}
      className="inline-flex min-h-10 min-w-[4.5rem] items-center justify-center rounded-full border border-navy/30 px-3 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white dark:border-dark-green/50 dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg"
    >
      <span aria-live="polite">{done ? bookingPage.copied : bookingPage.copy}</span>
    </button>
  );
}
