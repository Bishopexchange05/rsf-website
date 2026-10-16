import { LeafDivider } from "@/components/LeafDivider";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/Section";
import { workingTowards } from "@/content/home";

// "What we're working towards" goals list, shared by the Home and About pages.
// Place it inside a Section with a white background.
export function WorkingTowards({ stackBelow = "sm" }: { stackBelow?: "sm" | "lg" }) {
  return (
    <>
      <LeafDivider className="mb-10 h-6 w-64 max-w-full text-brand-green" />
      <Reveal>
        <SectionHeading>{workingTowards.heading}</SectionHeading>
      </Reveal>
      <ul className={`grid gap-4 ${stackBelow === "lg" ? "lg:grid-cols-2" : "sm:grid-cols-2"}`}>
        {workingTowards.items.map((item, i) => (
          <li key={item}>
            <Reveal delay={i * 0.06} className="h-full">
              <div className="flex h-full items-start gap-4 rounded-2xl bg-cream p-5 text-lg dark:bg-dark-bg">
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
    </>
  );
}
