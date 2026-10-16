import { PageHero } from "@/components/PageHero";
import { RichText } from "@/components/RichText";
import { Section } from "@/components/Section";
import { media } from "@/content/events";
import { legalCommon, type LegalPageData } from "@/content/legal";

// Shared layout for the legal pages. All wording comes from /content/legal.ts.
export function LegalPage({ page }: { page: LegalPageData }) {
  return (
    <>
      <PageHero
        label={legalCommon.label}
        heading={page.title}
        text={page.heroText}
        image={media.hero}
      />
      <Section tone="white">
        <article className="max-w-[70ch]">
          <p className="text-sm font-semibold opacity-75">
            {legalCommon.lastUpdatedPrefix} {page.lastUpdated}
          </p>
          <div className="mt-6 space-y-4 text-lg leading-relaxed">
            {page.blocks.map((block, i) => {
              switch (block.type) {
                case "h2":
                  return (
                    <h2 key={i} className="!mt-10 text-h3">
                      {block.text}
                    </h2>
                  );
                case "p":
                  return (
                    <p key={i}>
                      <RichText text={block.text} />
                    </p>
                  );
                case "ul":
                  return (
                    <ul key={i} className="list-disc space-y-2 pl-6 marker:text-brand-green">
                      {block.items.map((item) => (
                        <li key={item}>
                          <RichText text={item} />
                        </li>
                      ))}
                    </ul>
                  );
                case "ol":
                  return (
                    <ol key={i} className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-navy dark:marker:text-dark-green">
                      {block.items.map((item) => (
                        <li key={item}>
                          <RichText text={item} />
                        </li>
                      ))}
                    </ol>
                  );
              }
            })}
          </div>
        </article>
      </Section>
    </>
  );
}
