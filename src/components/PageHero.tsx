import Image from "next/image";

// Inner-page hero: background image under the navy-to-purple overlay.
export function PageHero({
  id,
  label,
  heading,
  text,
  image,
  children,
}: {
  id?: string;
  label: string;
  heading: string;
  text: string;
  image: { src: string; alt: string };
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="relative isolate bg-navy pt-24 text-white dark:bg-dark-bg md:pt-28">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image src={image.src} alt={image.alt} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy/85 to-purple/80 dark:from-dark-bg/90 dark:to-purple-panel/85" />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-12 lg:pb-28">
        <div className="max-w-3xl">
          <p className="font-heading text-base uppercase tracking-widest text-brand-green dark:text-dark-green">
            {label}
          </p>
          <h1 className="mt-4">{heading}</h1>
          <p className="mt-6 text-lg text-white/90">{text}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
