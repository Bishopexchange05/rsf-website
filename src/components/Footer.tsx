import Link from "next/link";
import { footerColumns, site } from "@/content/site";
import { Logo } from "./Logo";
import { SocialIcon } from "./SocialIcon";

const heading =
  "font-heading text-base uppercase tracking-wide text-brand-green dark:text-dark-green";
const linkClass =
  "inline-flex min-h-11 items-center hover:text-white hover:underline";

export function Footer() {
  return (
    <footer className="bg-navy text-white dark:border-t dark:border-white/10 dark:bg-dark-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <span className="max-w-[9.5rem] font-heading text-lg leading-tight">
              {site.name}
            </span>
          </div>
          <p className="mt-4 text-sm text-white/80">{site.tagline}</p>
        </div>

        {footerColumns.slice(0, 2).map((col) => (
          <div key={col.title}>
            <h2 className={heading}>{col.title}</h2>
            <ul className="mt-3 text-sm text-white/80">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link className={linkClass} href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className={heading}>Contact</h2>
          <ul className="mt-3 text-sm text-white/80">
            <li className="py-2">{site.address}</li>
            {site.email && (
              <li>
                <a className={linkClass} href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </li>
            )}
            <li>
              <a className={linkClass} href={site.phoneHref}>
                {site.phone}
              </a>
            </li>
            <li>
              <a className={linkClass} href={site.whatsapp}>
                Chat on WhatsApp
              </a>
            </li>
          </ul>
          {site.socials.length > 0 && (
            <ul className="mt-2 flex gap-2">
              {site.socials.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-11 w-11 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
                  >
                    <SocialIcon id={s.id} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-white/70 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>{site.copyright}</p>
          <ul className="flex flex-wrap gap-x-5">
            {footerColumns[2].links.map((l) => (
              <li key={l.href}>
                <Link className={linkClass} href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
