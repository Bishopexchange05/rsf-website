"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { headerAccountLink, headerAdminLink, headerLink } from "@/content/accounts";
import { nav, site } from "@/content/site";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/cn";

// Login link only where accounts are switched on (never on the live site).
const accountsOn = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";

type Me = { signedIn: boolean; role: "member" | "staff" | "admin" | null };
// Pages where someone may have just signed in or out.
const ACCOUNT_AREA = /^\/(login|register|account|admin|two-factor|auth|verify-email|forgot-password|reset-password|book)/;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Who is signed in? Asked AFTER the page has loaded (never during server rendering),
  // so public pages stay fast and static. The last answer is remembered for this tab.
  useEffect(() => {
    if (!accountsOn) return;
    let cached: Me | null = null;
    try {
      const raw = sessionStorage.getItem("rsf:me");
      if (raw) cached = JSON.parse(raw) as Me;
    } catch {
      // storage blocked: just ask the server
    }
    if (cached && !me) setMe(cached);
    // Ask again on first load and on pages where signing in or out happens.
    if (me && !ACCOUNT_AREA.test(pathname)) return;
    let cancelled = false;
    fetch("/api/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then((d) => {
        if (cancelled || !d) return;
        setMe(d);
        try {
          sessionStorage.setItem("rsf:me", JSON.stringify(d));
        } catch {
          // ignore
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const signedIn = !!me?.signedIn;
  const showAdmin = signedIn && (me?.role === "staff" || me?.role === "admin");
  const accountLink = signedIn ? headerAccountLink : headerLink;

  // Lock page scroll and allow Escape to close while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "relative transition-colors duration-300",
        scrolled || open
          ? "bg-navy shadow-md dark:border-b dark:border-white/10 dark:bg-dark-bg"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 text-white"
          onClick={() => setOpen(false)}
        >
          <Logo eager className="h-10 w-10 md:h-12 md:w-12" />
          <span className="max-w-[8.5rem] font-heading text-base leading-tight md:max-w-[9.5rem] md:text-lg">
            {site.name}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-medium transition hover:bg-white/15 hover:text-white xl:px-3",
                isActive(item.href)
                  ? "text-white after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-amber"
                  : "text-white/90",
              )}
            >
              {item.label}
            </Link>
          ))}
          {accountsOn && showAdmin && (
            <Link
              href={headerAdminLink.href}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-white/90 transition hover:bg-white/15 hover:text-white"
            >
              {headerAdminLink.label}
            </Link>
          )}
          {accountsOn && (
            <Link
              href={accountLink.href}
              className="inline-flex min-h-11 items-center rounded-full border border-white/60 px-4 text-sm font-medium text-white transition hover:bg-white/15"
            >
              {accountLink.label}
            </Link>
          )}
          <ThemeToggle />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/15 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-7rem)] overflow-y-auto bg-navy px-4 pb-8 pt-4 shadow-lg dark:bg-dark-bg lg:hidden"
        >
          <ul className="mx-auto flex max-w-md flex-col">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-white/15">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 items-center font-heading text-xl",
                    isActive(item.href)
                      ? "-ml-3 border-l-4 border-amber pl-2 text-amber"
                      : "text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {accountsOn && showAdmin && (
              <li className="border-b border-white/15">
                <Link
                  href={headerAdminLink.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center font-heading text-xl text-white"
                >
                  {headerAdminLink.label}
                </Link>
              </li>
            )}
            {accountsOn && (
              <li className="border-b border-white/15">
                <Link
                  href={accountLink.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center font-heading text-xl text-white"
                >
                  {accountLink.label}
                </Link>
              </li>
            )}
          </ul>
          <div className="mx-auto mt-6 flex max-w-md items-center justify-between text-white">
            <span className="text-sm font-medium">Light / dark mode</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
