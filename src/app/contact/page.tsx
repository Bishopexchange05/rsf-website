import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { InlineForm } from "@/components/forms/InlineForm";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { details, formIntro, hero, meta } from "@/content/contact";
import { media } from "@/content/events";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({ path: "/contact", title: meta.title, description: meta.description });

const labelClass = "text-sm font-semibold uppercase tracking-wide opacity-70";
const linkClass =
  "inline-flex min-h-11 items-center text-lg font-medium text-navy underline underline-offset-2 hover:no-underline dark:text-dark-link";

export default function ContactPage() {
  return (
    <>
      <PageHero label={hero.label} heading={hero.heading} text={hero.text} image={media.hero} />

      <Section tone="white">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-2">
            <h2>{details.heading}</h2>
            <dl className="mt-6 space-y-6">
              <div>
                <dt className={labelClass}>{details.addressLabel}</dt>
                <dd className="mt-1 text-lg">{details.address}</dd>
              </div>
              <div>
                <dt className={labelClass}>{details.phoneLabel}</dt>
                <dd>
                  <a href={site.phoneHref} className={linkClass}>
                    {site.phone}
                  </a>
                </dd>
              </div>
              {site.email && (
                <div>
                  <dt className={labelClass}>{details.emailLabel}</dt>
                  <dd>
                    <a href={`mailto:${site.email}`} className={linkClass}>
                      {site.email}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className={labelClass}>{details.whatsappLabel}</dt>
                <dd className="mt-2">
                  <Button href={site.whatsapp} newTab>
                    {details.whatsappButton}
                  </Button>
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-3">
            <Card className="bg-cream p-6 dark:bg-dark-bg sm:p-8">
              <h2 className="text-h3">{formIntro.heading}</h2>
              <div className="mt-5">
                <InlineForm type="contact" />
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
