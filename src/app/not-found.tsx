import type { Metadata } from "next";
import { NotFound } from "@/components/site/not-found";

export const metadata: Metadata = {
  title: "Page not found | Fast",
  description:
    "The page you were looking for isn't here. Fast's free, confidential, 24/7 GBV support is still one tap away.",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return <NotFound />;
}
