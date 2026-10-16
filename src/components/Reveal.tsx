"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Scroll-reveal that is safe by default, and cheap (plain CSS transitions and
// one shared IntersectionObserver, no animation library, no layout reads):
// - Content is fully visible in the server HTML and before JavaScript runs.
// - Once JS is running, blocks that start off-screen are hidden and revealed
//   (once) when ~10% of them enters the screen. Blocks already on screen are
//   never hidden or animated.
// - With prefers-reduced-motion, nothing is ever hidden or animated.
// - Printing, or the window becoming much taller (full-page captures),
//   reveals blocks instantly with no animation.

// Return true to stop observing this element.
type Handler = (entry: IntersectionObserverEntry) => boolean;

const handlers = new WeakMap<Element, Handler>();
let observer: IntersectionObserver | null = null;

function observe(el: Element, handler: Handler) {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const done = handlers.get(entry.target)?.(entry);
          if (done) {
            handlers.delete(entry.target);
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 },
    );
  }
  handlers.set(el, handler);
  observer.observe(el);
}

function unobserve(el: Element) {
  handlers.delete(el);
  observer?.unobserve(el);
}

// Stagger delays (seconds) mapped to fixed Tailwind classes.
function delayClass(delay: number) {
  if (delay <= 0) return "";
  if (delay < 0.09) return "delay-75";
  if (delay < 0.13) return "delay-100";
  if (delay < 0.18) return "delay-150";
  if (delay < 0.25) return "delay-200";
  return "delay-300";
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let first = true;
    observe(el, (entry) => {
      if (entry.isIntersecting) {
        setHidden(false);
        return true;
      }
      // Already scrolled past (above the screen): just show it.
      if (entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0)) {
        setHidden(false);
        return true;
      }
      // Below the screen when first seen: hide it until it scrolls into view.
      if (first) setHidden(true);
      first = false;
      return false;
    });

    const showNow = () => {
      setInstant(true);
      setHidden(false);
      unobserve(el);
    };
    window.addEventListener("beforeprint", showNow);
    // A much taller window (full-page capture) reveals; small mobile
    // address-bar resizes do not.
    const startH = window.innerHeight;
    const onResize = () => {
      if (window.innerHeight > startH * 1.5) showNow();
    };
    window.addEventListener("resize", onResize);
    return () => {
      unobserve(el);
      window.removeEventListener("beforeprint", showNow);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={hidden ? "hidden" : "shown"}
      className={cn(
        "transition duration-500 ease-out motion-reduce:transition-none",
        hidden ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100",
        hidden || instant ? "!duration-0" : delayClass(delay),
        className,
      )}
    >
      {children}
    </div>
  );
}
