import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { dataProtection } from "@/content/legal";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({ path: "/data-protection", title: dataProtection.title, description: dataProtection.description });

export default function Page() {
  return <LegalPage page={dataProtection} />;
}
