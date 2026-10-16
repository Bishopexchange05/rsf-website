import Image from "next/image";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { media } from "@/content/home";

// Closing call-to-action on the closing-banner background, shared across pages.
export function ClosingSection({
  heading,
  text,
  cta,
}: {
  heading: string;
  text?: string;
  cta: { label: string; href: string };
}) {
  return (
    <section className="relative isolate overflow-hidden bg-navy text-white dark:bg-dark-bg">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src={media.closing.src}
          alt={media.closing.alt}
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-navy/90 to-purple/85 dark:from-dark-bg/90 dark:to-purple-panel/85" />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:py-28">
        <Reveal>
          <div className="max-w-3xl">
            <h2>{heading}</h2>
            {text && <p className="mt-4 text-lg text-white/90">{text}</p>}
            <div className="mt-8">
              <Button href={cta.href}>{cta.label}</Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
