import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { privacy } from "@/content/legal";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({ path: "/privacy", title: privacy.title, description: privacy.description });

export default function Page() {
  return <LegalPage page={privacy} />;
}
