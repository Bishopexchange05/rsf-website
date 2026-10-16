import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequestButton } from "@/components/forms/RequestButton";
import { PageHero } from "@/components/PageHero";
import { PillarIcon } from "@/components/PillarIcon";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { cards, hero, media, meta, notSure } from "@/content/get-involved";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export default function GetInvolvedPage() {
  return (
    <>
      <PageHero label={hero.label} heading={hero.heading} text={hero.text} image={media.hero} />

      <Section tone="cream">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08} className="h-full">
              <Card className="h-full">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/10 text-navy dark:bg-white/10 dark:text-dark-green">
                  <PillarIcon name={c.icon} />
                </span>
                <h2 className="mt-5 text-h3">{c.title}</h2>
                <p className="mt-3 opacity-85">{c.text}</p>
                <div className="mt-auto pt-6">
                  <RequestButton type={c.form} label={c.cta} defaults={c.defaults} />
                </div>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 max-w-3xl">
          <p className="text-lg font-medium">{notSure.text}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href={site.whatsapp} newTab>
              {notSure.whatsapp}
            </Button>
            <Button href={notSure.contact.href} variant="outline">
              {notSure.contact.label}
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
