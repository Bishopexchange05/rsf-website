import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// Add each public page here as it is built. The date is when the page's content last REALLY changed
// (YYYY-MM-DD). Change it by hand when you edit a page, so search engines are not told that
// everything changes every day.
const routes: { path: string; lastModified: string }[] = [
  { path: "", lastModified: "2026-10-16" },
  { path: "/about", lastModified: "2026-10-16" },
  { path: "/tech-and-space", lastModified: "2026-10-16" },
  { path: "/events", lastModified: "2026-10-16" },
  { path: "/get-involved", lastModified: "2026-10-16" },
  { path: "/contact", lastModified: "2026-10-16" },
  { path: "/privacy", lastModified: "2026-10-16" },
  { path: "/terms", lastModified: "2026-10-16" },
  { path: "/safeguarding", lastModified: "2026-10-16" },
  { path: "/data-protection", lastModified: "2026-10-16" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((r) => ({ url: `${site.url}${r.path}`, lastModified: new Date(`${r.lastModified}T00:00:00Z`) }));
}
