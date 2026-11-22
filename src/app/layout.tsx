import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
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
  themeColor: "#1d1a18",
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
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
