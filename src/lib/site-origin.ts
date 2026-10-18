import "server-only";
import { headers } from "next/headers";
import { site } from "@/content/site";

// The address this request came in on, used for links inside emails (verify
// email, reset password). The Host header can be forged, so only known hosts
// are accepted; anything else falls back to the real site address. Supabase
// also refuses redirect addresses that are not on its allow-list.
function allowedHost(host: string): boolean {
  const h = host.toLowerCase();
  const name = h.replace(/:\d+$/, "");
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name === "rafaelsupportfoundation.org" ||
    name.endsWith(".rafaelsupportfoundation.org") ||
    (name.endsWith(".vercel.app") && /^[a-z0-9.-]+$/.test(name))
  );
}

export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (host && allowedHost(host)) {
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const proto = local ? "http" : "https";
    return `${proto}://${host}`;
  }
  return site.url;
}
