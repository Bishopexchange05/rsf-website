"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type AdminTab = { href: string; label: string };

// The admin tab bar. The tab for the page you are on joins the page below it, like a folder tab.
// On a phone the row scrolls sideways instead of piling up.
export function AdminTabs({ tabs, ariaLabel, back }: { tabs: AdminTab[]; ariaLabel: string; back: AdminTab }) {
  const pathname = usePathname();
  const isOn = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label={ariaLabel} className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max items-end gap-1">
        {tabs.map((t) => {
          const on = isOn(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-t-2xl px-3 text-sm font-semibold transition xl:px-4",
                  on ? "bg-cream text-slate-navy dark:bg-dark-bg dark:text-dark-text" : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
        <li className="pl-2 lg:ml-auto">
          <Link href={back.href} className="mb-1.5 inline-flex min-h-10 items-center rounded-full border border-white/50 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
            {back.label}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
