"use client";

import { useId, useState } from "react";

// A reason box with quick-pick reasons. Clicking one fills the box; staff can still edit it.
export function ReasonPicker({
  name,
  label,
  quickLabel,
  quick,
  maxLength = 300,
}: {
  name: string;
  label: string;
  quickLabel?: string;
  quick: string[];
  maxLength?: number;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      {quick.length > 0 && (
        <div>
          {quickLabel && <p className="mb-1.5 text-sm font-semibold">{quickLabel}</p>}
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setValue(q)}
                className="min-h-11 rounded-full border border-navy/30 px-3 text-left text-sm hover:bg-navy hover:text-white dark:border-white/30 dark:hover:bg-white/15"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
          {label}
        </label>
        <textarea
          id={id}
          name={name}
          rows={3}
          maxLength={maxLength}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-slate-navy/25 bg-white px-3 py-2 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text"
        />
      </div>
    </div>
  );
}
