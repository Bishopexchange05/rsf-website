"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// How long the "send the link again" button waits after an email goes out.
// The server enforces its own limit too; this countdown is for the visitor.
export const COOLDOWN_SECONDS = 60;

function readStamp(key: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null; // storage blocked: fall back to a fresh in-memory countdown
  }
}

function writeStamp(key: string, ms: number) {
  try {
    window.sessionStorage.setItem(key, String(ms));
  } catch {
    // ignore: the countdown still works for this page view
  }
}

// A tiny non-cryptographic hash so an email address is not used as a storage key.
export function cooldownKey(prefix: string, value = ""): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  return `rsf:${prefix}:${(h >>> 0).toString(36)}`;
}

// Counts down from COOLDOWN_SECONDS after an email was sent. The time of the
// last send is kept in sessionStorage, so a page refresh keeps the countdown.
//   startOnLoad: the first email was just sent, so start counting on arrival
//                (used when the page opens right after sending).
export function useCooldown(key: string, startOnLoad: boolean) {
  const [remaining, setRemaining] = useState(startOnLoad ? COOLDOWN_SECONDS : 0);
  // Becomes true only when a countdown reaches zero while the page is open, so
  // screen readers hear "available again" once, not every second.
  const [justFinished, setJustFinished] = useState(false);
  const sentAt = useRef<number | null>(null);

  const secondsLeft = useCallback(() => {
    if (sentAt.current === null) return 0;
    return Math.max(0, COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt.current) / 1000));
  }, []);

  useEffect(() => {
    let stamp = readStamp(key);
    if (stamp === null && startOnLoad) {
      stamp = Date.now();
      writeStamp(key, stamp);
    }
    sentAt.current = stamp;
    setRemaining(secondsLeft());
  }, [key, startOnLoad, secondsLeft]);

  const counting = remaining > 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => {
      const left = secondsLeft();
      setRemaining(left);
      if (left <= 0) setJustFinished(true);
    }, 1000);
    return () => clearInterval(id);
  }, [counting, secondsLeft]);

  // Call after the server confirmed that a new email was sent.
  const restart = useCallback(() => {
    sentAt.current = Date.now();
    writeStamp(key, sentAt.current);
    setJustFinished(false);
    setRemaining(COOLDOWN_SECONDS);
  }, [key]);

  return { remaining, justFinished, restart };
}
