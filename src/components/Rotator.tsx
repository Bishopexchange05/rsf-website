"use client";

import { useEffect, useState } from "react";

// Auto-rotating slides with a visible pause control and dot navigation.
export function Rotator({
  items,
  interval = 6000,
  label,
}: {
  items: React.ReactNode[];
  interval?: number;
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Users who prefer reduced motion start paused; they can still press Play.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [paused, items.length, interval]);

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label}>
      <div aria-live={paused ? "polite" : "off"} className="min-h-[7rem]">
        {items[index]}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="min-h-11 rounded-full border border-current px-4 text-sm font-semibold opacity-80 hover:opacity-100"
        >
          {paused ? "Play" : "Pause"}
        </button>
        <div className="flex">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show item ${i + 1}`}
              aria-current={i === index}
              className="grid h-11 w-8 place-items-center"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full bg-current transition ${
                  i === index ? "opacity-100" : "opacity-30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
