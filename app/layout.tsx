import type { Metadata } from "next";
import { Inter, Newsreader, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "书跃 · BookLeap",
  description: "从好书中完成认知跃迁",
  other: {
    "deploy-probe": "private-repo-sync-test-20260422-094848",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} ${newsreader.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
