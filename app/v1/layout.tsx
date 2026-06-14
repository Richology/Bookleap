import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function V1Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
