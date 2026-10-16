import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// Add each Phase 1 page here as it is built.
const routes = [
  "",
  "/about",
  "/tech-and-space",
  "/events",
  "/get-involved",
  "/contact",
  "/privacy",
  "/terms",
  "/safeguarding",
  "/data-protection",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
  }));
}
