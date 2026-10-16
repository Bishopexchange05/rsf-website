import { cn } from "@/lib/cn";

type Tone = "cream" | "white" | "navy" | "purple";

const tones: Record<Tone, string> = {
  cream: "bg-cream text-slate-navy dark:bg-dark-bg dark:text-dark-text",
  white: "bg-white text-slate-navy dark:bg-dark-card dark:text-dark-text",
  navy: "bg-navy text-white dark:border-y dark:border-white/10 dark:bg-dark-bg",
  purple: "bg-gradient-to-br from-navy to-purple text-white",
};

export function Section({
  tone = "cream",
  id,
  className,
  children,
}: {
  tone?: Tone;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(tones[tone], className)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:py-28">
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl md:mb-12">
      <h2>{children}</h2>
      {sub && <p className="mt-4 opacity-80">{sub}</p>}
    </div>
  );
}
