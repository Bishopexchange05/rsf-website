import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ClosingSection } from "@/components/ClosingSection";
import { HeroMedia } from "@/components/HeroMedia";
import { PhotoComingSoon } from "@/components/PhotoComingSoon";
import { PillarIcon } from "@/components/PillarIcon";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { TourVideo } from "@/components/TourVideo";
import { VisionMission } from "@/components/VisionMission";
import { WorkingTowards } from "@/components/WorkingTowards";
import { addressStructured, site } from "@/content/site";
import {
  closing,
  hero,
  media,
  pillars,
  pillarsSection,
  techAndSpace,
  whyWeExist,
} from "@/content/home";

const pillarImages = [
  media.pillars.education,
  media.pillars.guidance,
  media.pillars.skills,
];

// Organization data for search engines. Only facts that are in /content/site.ts.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: site.name,
  alternateName: site.shortName,
  url: site.url,
  logo: `${site.url}${site.logo}`,
  address: { "@type": "PostalAddress", ...addressStructured },
  telephone: site.phoneE164,
  sameAs: site.socials.map((s) => s.href),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero: background video (poster first) under a navy-to-purple overlay. */}
      <section className="relative isolate bg-navy pt-24 text-white dark:bg-dark-bg md:pt-28">
        <HeroMedia />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 md:pb-28 md:pt-16 lg:pb-32">
          <div className="max-w-3xl">
            <p className="font-heading text-base uppercase tracking-widest text-brand-green dark:text-dark-green">
              {hero.label}
            </p>
            <h1 className="mt-4">{hero.headline}</h1>
            <p className="mt-6 text-lg text-white/90">{hero.sub}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
              <Button href={hero.secondaryCta.href} variant="secondary">
                {hero.secondaryCta.label}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Section tone="white">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="max-w-3xl">
              <h2>{whyWeExist.heading}</h2>
              <p className="mt-4 text-lg opacity-85">{whyWeExist.text}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-[4/5]">
              <Image
                src={media.whyWeExist.src}
                alt={media.whyWeExist.alt}
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="navy">
        <VisionMission />
      </Section>

      <Section tone="cream">
        <Reveal>
          <SectionHeading>{pillarsSection.heading}</SectionHeading>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="h-full">
              <Link href={p.href} className="group block h-full">
                <Card className="h-full transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                  <div className="relative -mx-6 -mt-6 mb-6 aspect-[16/10]">
                    <Image
                      src={pillarImages[i].src}
                      alt={pillarImages[i].alt}
                      fill
                      sizes="(min-width: 768px) 360px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/10 text-navy transition group-hover:text-amber dark:bg-white/10 dark:text-dark-green">
                    <PillarIcon name={p.icon} />
                  </span>
                  <h3 className="mt-5">{p.title}</h3>
                  <p className="mt-3 opacity-80">{p.text}</p>
                  <span className="mt-auto inline-flex min-h-11 items-center pt-4 font-heading text-base text-navy dark:text-dark-link">
                    {pillarsSection.linkLabel}
                  </span>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="purple">
        <Reveal>
          <div className="max-w-3xl">
            <h2>{techAndSpace.heading}</h2>
            <p className="mt-4 text-lg text-white/90">{techAndSpace.text}</p>
            <div className="mt-8">
              <Button href={techAndSpace.cta.href}>{techAndSpace.cta.label}</Button>
            </div>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-4 md:mt-16 lg:grid-cols-2 lg:gap-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl lg:aspect-auto lg:h-full">
            <TourVideo poster={media.techSpace.poster} />
          </div>
          <ul className="grid grid-cols-2 gap-4">
            {media.techSpace.gallery.map((img) => (
              <li key={img.src} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                {img.soon ? (
                  <PhotoComingSoon label={media.techSpace.comingSoon} />
                ) : (
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    loading="lazy"
                    sizes="(min-width: 1024px) 280px, 50vw"
                    className="object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="white">
        <WorkingTowards />
      </Section>

      <ClosingSection heading={closing.heading} text={closing.text} cta={closing.cta} />
    </>
  );
}
