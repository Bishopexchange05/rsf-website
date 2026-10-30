import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// The five sign-in pages (/login, /register, /verify-email, /forgot-password, /reset-password) are NOT blocked
// here on purpose: each carries "noindex", and search engines can only see that if they may read the page.
// Pages with private content stay blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/account", "/auth/", "/two-factor", "/book"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
