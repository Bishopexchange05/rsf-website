import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { safeguarding } from "@/content/legal";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({ path: "/safeguarding", title: safeguarding.title, description: safeguarding.description });

export default function Page() {
  return <LegalPage page={safeguarding} />;
}
