import { site } from "@/content/site";
import { formsCommon } from "@/content/techspace";

// Opens WhatsApp chat. The number comes from NEXT_PUBLIC_WHATSAPP_NUMBER via site.ts.
export function WhatsAppButton() {
  return (
    <a
      href={site.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition hover:brightness-110 dark:bg-dark-green dark:text-dark-bg"
    >
      {formsCommon.whatsappButton}
    </a>
  );
}
