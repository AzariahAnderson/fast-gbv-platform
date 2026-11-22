import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ChunkFive, the heavy slab used for display headlines and the wordmark */
const chunk = localFont({
  src: "../../public/fonts/ChunkFive-Regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-chunk",
  display: "swap",
});

/* Clash Display, the grotesque used for section headings and UI labels */
const clash = localFont({
  src: [
    { path: "../../public/fonts/ClashDisplay-500.woff2", weight: "500" },
    { path: "../../public/fonts/ClashDisplay-600.woff2", weight: "600" },
    { path: "../../public/fonts/ClashDisplay-700.woff2", weight: "700" },
  ],
  variable: "--font-clash",
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
        className={`${inter.variable} ${geistMono.variable} ${chunk.variable} ${clash.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
