import fs from "node:fs";
import path from "node:path";
import { site } from "@/content/site";

// Image for Open Graph / Twitter link previews: /public/media/og-image.jpg
// (1200x630). Falls back to the logo if that file is ever removed.
export function shareImage() {
  const og = "/media/og-image.jpg";
  if (fs.existsSync(path.join(process.cwd(), "public", og))) {
    return { src: og, width: 1200, height: 630, large: true };
  }
  return { src: site.logo, width: 600, height: 600, large: false };
}
