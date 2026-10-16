"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { announcement, EVENT_BAR_END_ISO } from "@/content/events";

const STORAGE_KEY = "rsf-announcement-grand-opening-2026";

// Slim bar above the header until the end of 16 October 2026 (Africa/Lagos).
// It lives inside the fixed header block (see layout.tsx), so showing or hiding
// it never shifts page content. Visible in the server HTML; hidden after mount
// if it was dismissed or the event day has passed.
export function AnnouncementBar() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    if (dismissed || Date.now() >= Date.parse(EVENT_BAR_END_ISO)) setShow(false);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  if (!show) return null;

  return (
    <div className="bg-amber text-slate-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href={announcement.href}
          className="flex min-h-11 flex-1 items-center py-1 text-sm font-medium leading-tight hover:underline"
        >
          <span className="sm:hidden">
            {announcement.shortLead} <strong className="underline">{announcement.cta}</strong>
          </span>
          <span className="hidden sm:inline">
            {announcement.lead} <strong className="underline">{announcement.cta}</strong>
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={announcement.dismiss}
          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-navy/10"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
