"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { forms } from "@/content/techspace";
import type { FormType } from "@/lib/form-types";
import { cn } from "@/lib/cn";

// The form code is only downloaded once a visitor opens a form.
const RequestForm = dynamic(() => import("./RequestForm").then((m) => m.RequestForm), {
  ssr: false,
  loading: () => <div className="min-h-[12rem]" aria-hidden="true" />,
});

// A button that opens the matching request form in a modal dialog.
export function RequestButton({
  type,
  label,
  defaults,
  variant = "primary",
  className,
}: {
  type: FormType;
  label: string;
  defaults?: Record<string, string>;
  variant?: "primary" | "outline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-12 w-full items-center justify-center rounded-full px-7 py-3 text-center font-heading text-base transition sm:w-auto",
          variant === "primary"
            ? "bg-amber text-slate-navy hover:brightness-95"
            : "border-2 border-navy text-navy hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg",
          className,
        )}
      >
        {label}
      </button>
      {open && <FormDialog type={type} defaults={defaults} onClose={() => setOpen(false)} />}
    </>
  );
}

function FormDialog({
  type,
  defaults,
  onClose,
}: {
  type: FormType;
  defaults?: Record<string, string>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={`dlg-${type}-title`}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-0 text-slate-navy shadow-2xl backdrop:bg-black/60 dark:bg-dark-card dark:text-dark-text"
    >
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={`dlg-${type}-title`} className="text-h3">
            {forms[type].title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-navy/10 dark:hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <RequestForm type={type} defaults={defaults} onClose={onClose} />
      </div>
    </dialog>
  );
}
