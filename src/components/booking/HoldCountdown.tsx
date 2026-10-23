"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bookingPage } from "@/content/booking";

// Counts down to the end of the payment hold. The seconds change visibly but are
// not announced; screen readers hear one message when the hold ends.
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end]);

  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  if (left === null) return <span aria-hidden="true">--:--</span>;
  if (left === 0) {
    return (
      <span role="status" className="font-semibold">
        {bookingPage.pay.expired}
      </span>
    );
  }
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const text = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  return <span className="font-mono text-lg font-semibold">{text}</span>;
}
