import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";
import { media } from "@/content/events";
import { notFound } from "@/content/notFound";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <PageHero
      label={notFound.label}
      heading={notFound.heading}
      text={notFound.text}
      image={media.hero}
    >
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:max-w-lg">
        {notFound.links.map((l, i) => (
          <li key={l.href}>
            <Button href={l.href} variant={i === 0 ? "primary" : "secondary"} className="w-full">
              {l.label}
            </Button>
          </li>
        ))}
      </ul>
      <div className="h-16 md:h-24" aria-hidden="true" />
    </PageHero>
  );
}
