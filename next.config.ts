import type { NextConfig } from "next";
import path from "path";

// Files in /public keep their names when real photos replace the placeholders,
// so they get a day of caching plus background refresh, not "immutable".
// Next.js already caches its own hashed files (/_next/static) for a year.
const publicCache = [
  { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ["image/avif", "image/webp"],
    // Live site: optimised copies are kept for a day. Development: the default 60 seconds,
    // so a photo swapped in under the same file name shows up straight away.
    minimumCacheTTL: process.env.NODE_ENV === "production" ? 86400 : 60,
  },
  async headers() {
    return [
      { source: "/media/:path*", headers: publicCache },
      { source: "/images/:path*", headers: publicCache },
      { source: "/icons/:path*", headers: publicCache },
    ];
  },
};

export default nextConfig;
