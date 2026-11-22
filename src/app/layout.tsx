import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  openGraph: {
    title: "Fast. Help that answers. Fast.",
    description:
      "South Africa's gender-based violence support hub. Free, confidential, 24/7. One call, real humans, real help.",
    type: "website",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fast. Help that answers. Fast.",
    description:
      "Free, confidential, 24/7 GBV support for South Africa. Call 0800 428 428.",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
