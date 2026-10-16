import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ClosingSection } from "@/components/ClosingSection";
import { RequestButton } from "@/components/forms/RequestButton";
import { PageHero } from "@/components/PageHero";
import { PhotoComingSoon } from "@/components/PhotoComingSoon";
import { PillarIcon } from "@/components/PillarIcon";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { TourVideo } from "@/components/TourVideo";
import {
  closing,
  consulting,
  courses,
  digitalMarketing,
  hero,
  learn,
  media,
  mediaRoom,
  meta,
  visit,
  whatYouGet,
  workspace,
} from "@/content/techspace";
import { media as homeMedia } from "@/content/home";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

const anchor = "scroll-mt-24";

export default function TechSpacePage() {
  return (
    <>
      <PageHero
        id="hero"
        label={hero.label}
        heading={hero.heading}
        text={hero.text}
        image={media.hero}
      >
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
          <Button href={hero.secondaryCta.href} variant="secondary">
            {hero.secondaryCta.label}
          </Button>
        </div>
        <ul className="mt-8 flex flex-wrap gap-3">
          {hero.badges.map((b) => (
            <li
              key={b}
              className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur"
            >
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-2xl border-l-4 border-amber bg-white/10 p-4 backdrop-blur sm:p-5">
          <p className="font-heading text-lg">{hero.banner.title}</p>
          <p className="mt-1 text-white/90">{hero.banner.place}</p>
        </div>
      </PageHero>

      <Section id="what-you-get" tone="white" className={anchor}>
        <Reveal>
          <SectionHeading>{whatYouGet.heading}</SectionHeading>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {whatYouGet.cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08} className="h-full">
              <Card className="h-full bg-cream dark:bg-dark-bg">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/10 text-navy dark:bg-white/10 dark:text-dark-green">
                  <PillarIcon name={c.icon} />
                </span>
                <h3 className="mt-5">{c.title}</h3>
                <p className="mt-3 opacity-85">{c.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="workspace" tone="cream" className={anchor}>
        <Reveal>
          <SectionHeading sub={workspace.intro}>{workspace.heading}</SectionHeading>
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          {workspace.cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08} className="h-full">
              <Card className="h-full">
                <div className="relative -mx-6 -mt-6 mb-6 aspect-[16/10]">
                  {c.image.soon ? (
                    <PhotoComingSoon label={homeMedia.techSpace.comingSoon} ariaLabel={c.image.alt} />
                  ) : (
                    <Image
                      src={c.image.src}
                      alt={c.image.alt}
                      fill
                      sizes="(min-width: 1024px) 560px, 100vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <h3>{c.title}</h3>
                <p className="mt-3 opacity-85">{c.text}</p>
                {"note" in c && (
                  <p className="mt-3 font-semibold text-navy dark:text-dark-green">{c.note}</p>
                )}
                <div className="mt-auto pt-6">
                  <RequestButton type={c.form} label={c.cta} />
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="media-room" tone="white" className={anchor}>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              {mediaRoom.image.soon ? (
                <PhotoComingSoon label={homeMedia.techSpace.comingSoon} />
              ) : (
                <Image
                  src={mediaRoom.image.src}
                  alt={mediaRoom.image.alt}
                  fill
                  sizes="(min-width: 1024px) 540px, 100vw"
                  className="object-cover"
                />
              )}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h2>{mediaRoom.heading}</h2>
            <p className="mt-4 text-lg opacity-85">{mediaRoom.text}</p>
            <div className="mt-8">
              <RequestButton type={mediaRoom.form} label={mediaRoom.cta} />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section id="learn" tone="navy" className={anchor}>
        <Reveal>
          <SectionHeading sub={learn.text}>{learn.heading}</SectionHeading>
        </Reveal>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => (
            <li key={c.name}>
              <Reveal delay={(i % 3) * 0.06} className="h-full">
                <Card className="h-full text-slate-navy dark:text-dark-text">
                  <h3>{c.name}</h3>
                  {"details" in c && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 opacity-85">
                      {c.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-6">
                    <RequestButton
                      type="course-interest"
                      label={learn.cta}
                      defaults={{ course: c.name }}
                      variant="outline"
                    />
                  </div>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-lg text-white/90">{learn.note}</p>

        <div className="mt-12 max-w-3xl">
          <h3 className="mb-4">{learn.videoHeading}</h3>
          <div className="aspect-video w-full overflow-hidden rounded-2xl">
            <TourVideo poster={media.learn.poster} />
          </div>
        </div>
      </Section>

      <Section id="consulting" tone="white" className={anchor}>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <Reveal className="lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={consulting.image.src}
                alt={consulting.image.alt}
                fill
                sizes="(min-width: 1024px) 540px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.08} className="lg:order-1">
            <h2>{consulting.heading}</h2>
            <p className="mt-4 text-lg opacity-85">{consulting.text}</p>
            <p className="mt-4 text-sm font-medium opacity-75">{consulting.smallPrint}</p>
            <div className="mt-8">
              <RequestButton type={consulting.form} label={consulting.cta} />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section id="digital-marketing" tone="cream" className={anchor}>
        <Reveal>
          <div className="max-w-3xl">
            <h2>{digitalMarketing.heading}</h2>
            <p className="mt-4 text-lg opacity-85">{digitalMarketing.text}</p>
            <div className="mt-8">
              <RequestButton type={digitalMarketing.form} label={digitalMarketing.cta} />
            </div>
          </div>
        </Reveal>
      </Section>

      <Section id="visit" tone="purple" className={anchor}>
        <Reveal>
          <div className="max-w-3xl">
            <h2>{visit.heading}</h2>
            <p className="mt-4 text-lg text-white/90">{visit.address}</p>
            <div className="mt-8">
              <Button href={site.whatsapp}>{visit.cta}</Button>
            </div>
          </div>
        </Reveal>
      </Section>

      <div id="closing" className={anchor}>
        <ClosingSection heading={closing.heading} cta={closing.cta} />
      </div>
    </>
  );
}
