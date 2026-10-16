import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-amber text-slate-navy hover:brightness-95",
  secondary: "border-2 border-white/80 text-white hover:bg-white hover:text-navy",
  outline:
    "border-2 border-navy text-navy hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg",
  ghost: "text-navy hover:underline dark:text-dark-link",
};

export function Button({
  href,
  variant = "primary",
  className,
  download,
  newTab,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  // Plain anchor for file downloads.
  download?: boolean;
  // Plain anchor opening in a new tab (external links).
  newTab?: boolean;
  children: React.ReactNode;
}) {
  const classes = cn(
    "inline-flex min-h-12 w-full items-center justify-center rounded-full px-7 py-3 text-center font-heading text-base transition sm:w-auto",
    styles[variant],
    className,
  );
  if (download || newTab) {
    return (
      <a
        href={href}
        className={classes}
        {...(download ? { download: true } : {})}
        {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
