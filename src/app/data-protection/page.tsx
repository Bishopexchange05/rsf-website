import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { dataProtection } from "@/content/legal";

export const metadata: Metadata = {
  title: dataProtection.title,
  description: dataProtection.description,
};

export default function Page() {
  return <LegalPage page={dataProtection} />;
}
