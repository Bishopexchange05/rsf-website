"use client";

import { useEffect, useRef } from "react";
import { TURNSTILE_TEST_SITE_KEY } from "@/lib/turnstile";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      // Remove the failed tag so a later "Try again" can load it afresh.
      script.remove();
      reject(new Error("turnstile"));
    });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

// Cloudflare Turnstile bot check. Uses Cloudflare's test key in development
// unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
export function Turnstile({
  onToken,
  onProblem,
  onBlocked,
  resetSignal,
}: {
  onToken: (token: string) => void;
  // Called when the Turnstile script cannot be loaded (e.g. an ad blocker).
  onBlocked: () => void;
  // Called when the token expires, the widget errors, or the script fails.
  onProblem: () => void;
  // Increment to reset the widget and get a fresh token (tokens are single-use).
  resetSignal: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | undefined>(undefined);
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SITE_KEY : "");

  useEffect(() => {
    if (!siteKey) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(boxRef.current, {
          sitekey: siteKey,
          callback: onToken,
          "expired-callback": onProblem,
          "error-callback": onProblem,
        });
        widgetRef.current = widgetId;
      })
      .catch(onBlocked);
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      widgetRef.current = undefined;
    };
  }, [siteKey, onToken, onProblem, onBlocked]);

  useEffect(() => {
    if (resetSignal > 0 && widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
    }
  }, [resetSignal]);

  return <div ref={boxRef} className="min-h-[65px]" />;
}
