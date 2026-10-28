import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site } from "@/content/site";
import { shareImage } from "@/lib/share-image";
import { media, meta } from "@/content/home";

// Self-hosted (next/font/local) so fonts load fast, offline and without layout shift.
const baloo = localFont({
  src: "./fonts/baloo-2-latin-800-normal.woff2",
  weight: "800",
  style: "normal",
  variable: "--font-baloo",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

const description = meta.description;
const share = shareImage();

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${meta.title} | ${site.name}`,
    template: `%s | ${site.name}`,
  },
  description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.name,
    description,
    url: site.url,
    images: [{ url: share.src, width: share.width, height: share.height, alt: media.og.alt }],
  },
  twitter: {
    card: share.large ? "summary_large_image" : "summary",
    title: site.name,
    description,
    images: [{ url: share.src, alt: media.og.alt }],
  },
};

export const viewport: Viewport = {
  themeColor: "#143BA2",
};

// Applies the saved or system theme before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${baloo.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        {/* One fixed block holding the header. */}
        <div className="fixed inset-x-0 top-0 z-50">
          <Header />
        </div>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
