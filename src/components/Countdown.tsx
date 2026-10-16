"use client";

import { useEffect, useState } from "react";
import { countdown, EVENT_START_ISO } from "@/content/events";

const START = Date.parse(EVENT_START_ISO);

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  return {
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
  };
}

// Live countdown to 10:00 AM on 16 October 2026 (Africa/Lagos).
// In development only, add ?now=2026-10-16T09:59:30%2B01:00 to the URL to
// pretend it is that moment (the clock keeps ticking from there).
export function Countdown() {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let offset = 0;
    if (process.env.NODE_ENV !== "production") {
      const fake = new URLSearchParams(window.location.search).get("now");
      const t = fake ? Date.parse(fake) : NaN;
      if (!Number.isNaN(t)) offset = t - Date.now();
    }
    const tick = () => setLeft(START - (Date.now() + offset));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (left !== null && left <= 0) {
    return (
      <div role="status" className="rounded-2xl bg-cream p-5 dark:bg-dark-bg">
        <p className="font-heading text-xl text-navy dark:text-dark-green">{countdown.after.title}</p>
        <p className="mt-1">{countdown.after.text}</p>
      </div>
    );
  }

  const p = left === null ? null : parts(left);
  const cells = [
    { label: countdown.units.days, value: p?.days },
    { label: countdown.units.hours, value: p?.hours },
    { label: countdown.units.minutes, value: p?.minutes },
  ];

  return (
    <div>
      <p className="mb-3 text-sm font-semibold opacity-80">{countdown.heading}</p>
      <div role="timer" className="grid max-w-md grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-2xl bg-cream p-3 text-center dark:bg-dark-bg">
            <div className="font-heading text-3xl leading-none text-navy dark:text-dark-green sm:text-4xl">
              {c.value === undefined ? "–" : String(c.value).padStart(2, "0")}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide opacity-75">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
