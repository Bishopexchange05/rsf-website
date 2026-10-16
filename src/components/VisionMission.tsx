import { Card } from "@/components/Card";
import { Reveal } from "@/components/Reveal";
import { visionMission } from "@/content/home";

// Vision and Mission cards, shared by the Home and About pages.
export function VisionMission({ stackBelow = "md" }: { stackBelow?: "md" | "lg" }) {
  return (
    <div className={`grid gap-6 ${stackBelow === "lg" ? "lg:grid-cols-2" : "md:grid-cols-2"}`}>
      {visionMission.map((v, i) => (
        <Reveal key={v.label} delay={i * 0.08} className="h-full">
          <Card className="h-full text-slate-navy dark:text-dark-text">
            <h3 className="text-navy dark:text-dark-green">{v.label}</h3>
            <p className="mt-3 text-lg">{v.text}</p>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}
