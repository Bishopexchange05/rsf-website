import Image from "next/image";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

// Shows /public/images/logo.png: the file is never edited, recolored or
// cropped. Next.js serves a right-sized WebP copy of it so a 48px logo does not
// download the full 232 KB original. Size it with width/height classes only;
// the box stays square so proportions are preserved.
export function Logo({
  className,
  eager = false,
}: {
  className?: string;
  // Header logo: load immediately (no lazy delay on the first screen).
  eager?: boolean;
}) {
  return (
    <Image
      src={site.logo}
      alt={`${site.name} logo`}
      width={600}
      height={600}
      sizes="(min-width: 768px) 48px, 40px"
      quality={90}
      loading={eager ? "eager" : "lazy"}
      className={cn(
        "shrink-0 rounded-full object-contain dark:ring-1 dark:ring-white/40",
        className,
      )}
    />
  );
}
