import type { Metadata } from "next";
import { site } from "@/content/site";
import { shareImage } from "@/lib/share-image";

// Search and sharing details for one public page: its own canonical address, and its own
// title, description and address for link previews (Open Graph and Twitter). Without this, a
// shared link to any page would preview as the home page.
//   path: "/about" (the home page is "/")
//   title: the page title WITHOUT the site name (the layout adds " | Rafael Support Foundation")
export function pageMeta({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  const share = shareImage();
  const url = path === "/" ? site.url : `${site.url}${path}`;
  const fullTitle = `${title} | ${site.name}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: fullTitle,
      description,
      url,
      images: [{ url: share.src, width: share.width, height: share.height }],
    },
    twitter: {
      card: share.large ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: [{ url: share.src }],
    },
  };
}
