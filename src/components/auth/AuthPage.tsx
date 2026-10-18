import { Card } from "@/components/Card";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { common } from "@/content/accounts";
import { media } from "@/content/events";

// Shared frame for the account pages: the usual page hero, then one card.
export function AuthPage({
  label = common.label,
  heading,
  text,
  children,
}: {
  label?: string;
  heading: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHero label={label} heading={heading} text={text} image={media.hero} />
      <Section tone="cream">
        <div className="mx-auto max-w-lg">
          <Card className="p-6 sm:p-8">{children}</Card>
        </div>
      </Section>
    </>
  );
}
