import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { safeguarding } from "@/content/legal";

export const metadata: Metadata = {
  title: safeguarding.title,
  description: safeguarding.description,
};

export default function Page() {
  return <LegalPage page={safeguarding} />;
}
