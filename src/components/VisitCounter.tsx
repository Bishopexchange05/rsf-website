"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Tells the site "this page was viewed" once it has loaded, for the Admin analytics. No cookie and
// nothing about the visitor: just the page address, and whether it is the first page opened in this
// browser tab (a "visit"). Sent with sendBeacon, so it never slows the page.
export function VisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    let first = false;
    try {
      first = !sessionStorage.getItem("rsf:visit");
      sessionStorage.setItem("rsf:visit", "1");
    } catch {
      // storage blocked: count the view only
    }
    const send = () => {
      const data = JSON.stringify({ p: pathname, n: first });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/pv", new Blob([data], { type: "text/plain" }));
    };
    if (document.readyState === "complete") send();
    else window.addEventListener("load", send, { once: true });
    return () => window.removeEventListener("load", send);
  }, [pathname]);
  return null;
}
