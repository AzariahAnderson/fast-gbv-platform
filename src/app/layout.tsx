import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/site";

/**
 * Inter is the single family for the whole site. The variable font carries
 * every weight from 100 to 900, so display headlines run at 900 while
 * labels run at 500 and 600 without loading a second file.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Fast | Free, 24/7 GBV Support for South Africa",
  description:
    "Fast routes survivors, witnesses and those who cause harm to South Africa's free, confidential 24/7 gender-based-violence services: counselling, shelters, legal protection and behaviour-change programmes. In danger now? Call 0800 428 428.",
  keywords: [
    "GBV South Africa",
    "gender-based violence help",
    "GBV Command Centre",
    "domestic violence South Africa",
    "abuse helpline",
    "protection order",
    "survivor support",
    "behaviour change programme",
  ],
  authors: [{ name: "Fast" }],
  creator: "Fast",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fast",
  },
  openGraph: {
    title: "Fast | Help that answers, fast",
    description:
      "South Africa's gender-based violence support hub. Free, confidential, 24/7. One call, real humans, real help.",
    type: "website",
    locale: "en_ZA",
    siteName: "Fast",
    url: "/",
    images: [
      {
        url: "/images/you-are-loved-banner.jpg",
        width: 1600,
        height: 600,
        alt: "You are loved. United in hope.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fast | Help that answers, fast",
    description:
      "Free, confidential, 24/7 GBV support for South Africa. Call 0800 428 428.",
    images: ["/images/you-are-loved-banner.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#454040",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // en-ZA: the site is written in English for a South African audience,
    // and future locales swap this per route when i18n lands.
    <html lang="en-ZA" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
