import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/Button";
import { ClosingSection } from "@/components/ClosingSection";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { VisionMission } from "@/components/VisionMission";
import { WorkingTowards } from "@/components/WorkingTowards";
import {
  hero,
  media,
  meta,
  story,
  techSpace,
  theme,
  whatWeDo,
  whatWeLookFor,
} from "@/content/about";
import { closing, media as homeMedia } from "@/content/home";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({ path: "/about", title: meta.title, description: meta.description });

const blockImages = [
  homeMedia.pillars.education,
  homeMedia.pillars.guidance,
  homeMedia.pillars.skills,
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        label={hero.label}
        heading={hero.heading}
        text={hero.text}
        image={media.hero}
      />

      <Section tone="white">
        <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-16">
          <Reveal delay={0.1} className="lg:order-2 lg:col-span-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-[4/5]">
              <Image
                src={media.story.src}
                alt={media.story.alt}
                fill
                loading="eager"
                sizes="(min-width: 1024px) 440px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal className="lg:order-1 lg:col-span-3">
            <h2>{story.heading}</h2>
            <div className="mt-4 space-y-4 text-lg opacity-85">
              {story.paragraphs.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="cream">
        <VisionMission stackBelow="lg" />
      </Section>

      <Section tone="purple" className="text-center">
        <Reveal>
          <h2 className="mx-auto max-w-4xl text-display">{theme.line}</h2>
          <p className="mx-auto mt-8 font-heading text-h3 font-extrabold">{theme.payForward}</p>
          <p className="mx-auto mt-2 text-lg text-white/90">{theme.sub}</p>
        </Reveal>
      </Section>

      <Section tone="white">
        <Reveal>
          <SectionHeading>{whatWeDo.heading}</SectionHeading>
        </Reveal>
        <div className="space-y-10 md:space-y-12">
          {whatWeDo.blocks.map((b, i) => (
            <article
              key={b.id}
              id={b.id}
              className="grid scroll-mt-24 items-center gap-5 lg:grid-cols-2 lg:gap-10"
            >
              <Reveal className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                  <Image
                    src={blockImages[i].src}
                    alt={blockImages[i].alt}
                    fill
                    sizes="(min-width: 1024px) 360px, 100vw"
                    className="object-cover"
                  />
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <h3>{b.title}</h3>
                <p className="mt-3 text-lg opacity-85">{b.text}</p>
              </Reveal>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="cream">
        <Reveal>
          <div className="max-w-3xl">
            <h2>{whatWeLookFor.heading}</h2>
            <p className="mt-4 text-lg opacity-85">{whatWeLookFor.text}</p>
          </div>
        </Reveal>
      </Section>

      <Section tone="navy">
        <Reveal>
          <div className="max-w-3xl">
            <h2>{techSpace.heading}</h2>
            <p className="mt-4 text-lg text-white/90">{techSpace.text}</p>
            <div className="mt-8">
              <Button href={techSpace.cta.href}>{techSpace.cta.label}</Button>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section tone="white">
        <WorkingTowards stackBelow="lg" />
      </Section>

      <ClosingSection heading={closing.heading} cta={closing.cta} />
    </>
  );
}
