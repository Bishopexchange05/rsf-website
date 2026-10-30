import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { terms } from "@/content/legal";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({ path: "/terms", title: terms.title, description: terms.description });

export default function Page() {
  return <LegalPage page={terms} />;
}
