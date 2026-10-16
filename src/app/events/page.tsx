import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ClosingSection } from "@/components/ClosingSection";
import { Countdown } from "@/components/Countdown";
import { RequestButton } from "@/components/forms/RequestButton";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import {
  card,
  closing,
  event,
  EVENT_START_ISO,
  hero,
  media,
  meta,
  moments,
  SHOW_MOMENTS_GALLERY,
  whatToExpect,
  whoShouldCome,
} from "@/content/events";
import { addressStructured, site } from "@/content/site";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: event.titlePlain,
  description: event.description,
  startDate: EVENT_START_ISO,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  isAccessibleForFree: true,
  location: {
    "@type": "Place",
    name: "RSF Tech & Space",
    address: { "@type": "PostalAddress", ...addressStructured },
  },
  organizer: { "@type": "Organization", name: site.name, url: site.url },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "NGN",
    availability: "https://schema.org/InStock",
    url: `${site.url}/events`,
  },
};

export default function EventsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />

      <PageHero label={hero.label} heading={hero.heading} text={hero.text} image={media.hero} />

      <Section tone="white">
        <Reveal>
          <Card className="bg-cream p-6 dark:bg-dark-bg sm:p-8">
            <h2>{event.title}</h2>
            <dl className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide opacity-70">{card.dateLabel}</dt>
                <dd className="mt-1 text-lg font-medium">{event.date}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide opacity-70">{card.placeLabel}</dt>
                <dd className="mt-1 text-lg font-medium">{event.place}</dd>
              </div>
            </dl>

            <p className="mt-6 rounded-2xl border-l-4 border-amber bg-white p-4 font-heading text-lg dark:bg-dark-card">
              {event.freeLine}
            </p>

            <div className="mt-6">
              <Countdown />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RequestButton type="event-rsvp" label={card.register} />
              <Button href={card.calendarHref} variant="outline" download>
                {card.calendar}
              </Button>
              <Button href={event.directionsUrl} variant="outline" newTab>
                {card.directions}
              </Button>
            </div>
          </Card>
        </Reveal>
      </Section>

      <Section tone="cream">
        <Reveal>
          <SectionHeading>{whatToExpect.heading}</SectionHeading>
        </Reveal>
        <ul className="grid max-w-3xl gap-4">
          {whatToExpect.items.map((item, i) => (
            <li key={item}>
              <Reveal delay={i * 0.06} className="h-full">
                <div className="flex items-start gap-4 rounded-2xl bg-white p-5 text-lg dark:bg-dark-card">
                  <span
                    className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-green text-white"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </span>
                  <span>{item}</span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-medium opacity-80">{whatToExpect.note}</p>
      </Section>

      <Section tone="navy">
        <Reveal>
          <div className="max-w-3xl">
            <h2>{whoShouldCome.heading}</h2>
            <p className="mt-4 text-lg text-white/90">{whoShouldCome.text}</p>
          </div>
        </Reveal>
      </Section>

      {SHOW_MOMENTS_GALLERY && (
        <Section tone="white">
          <Reveal>
            <SectionHeading>{moments.heading}</SectionHeading>
          </Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {moments.items.map((img) => (
              <li key={img.src}>
                <Card className="!p-0">
                  <div className="aspect-[4/3] w-full">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={moments.width}
                      height={moments.height}
                      loading="lazy"
                      sizes="(min-width: 1280px) 280px, (min-width: 1024px) 22vw, 50vw"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ClosingSection heading={closing.heading} cta={closing.cta} />
    </>
  );
}
