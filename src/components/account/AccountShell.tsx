import Link from "next/link";
import { accountNav } from "@/content/accounts";
import { bookingIsOpen } from "@/lib/booking-open";
import { cn } from "@/lib/cn";
import { SignOutButton } from "./SignOutButton";

export type AccountTab = "overview" | "bookings" | "book" | "settings";

// Shared frame for the signed-in pages: a slim banner with the page title, then a tab bar
// (Overview, My bookings, Book a desk, Settings, Admin for staff, Log out). The active tab
// joins the page below it, like a folder tab. "Book a desk" shows only while booking is on.
export async function AccountShell({
  active,
  heading,
  text,
  staff = false,
  wide = false,
  children,
}: {
  active: AccountTab;
  heading: string;
  text?: string;
  staff?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const open = await bookingIsOpen();
  const tabs: { key: AccountTab | "admin"; label: string; href: string }[] = [
    { key: "overview", ...accountNav.overview },
    { key: "bookings", ...accountNav.bookings },
    ...(open ? [{ key: "book" as const, ...accountNav.book }] : []),
    { key: "settings", ...accountNav.settings },
    ...(staff ? [{ key: "admin" as const, ...accountNav.admin }] : []),
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-navy to-purple pt-24 text-white dark:from-dark-bg dark:to-purple-panel md:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-heading text-sm uppercase tracking-widest text-brand-green dark:text-dark-green">{accountNav.label}</p>
          <h1 className="mt-1 text-h2">{heading}</h1>
          {text && <p className="mt-2 max-w-2xl text-white/90">{text}</p>}
          <nav aria-label={accountNav.ariaLabel} className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <ul className="flex min-w-max items-end gap-1">
              {tabs.map((t) => {
                const on = t.key === active;
                return (
                  <li key={t.key}>
                    <Link
                      href={t.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-12 items-center rounded-t-2xl px-4 text-sm font-semibold transition sm:px-5",
                        on
                          ? "bg-cream text-slate-navy dark:bg-dark-bg dark:text-dark-text"
                          : "text-white/85 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
              <li className="pl-2 sm:ml-auto">
                <SignOutButton className="mb-1.5 inline-flex min-h-10 items-center rounded-full border border-white/50 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-70" />
              </li>
            </ul>
          </nav>
        </div>
      </section>
      <div className="min-h-[60vh] bg-cream text-slate-navy dark:bg-dark-bg dark:text-dark-text">
        <div className={cn("mx-auto px-4 py-8 sm:px-6 md:py-12", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</div>
      </div>
    </>
  );
}
