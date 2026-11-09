import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: `书跃工作台｜${SITE_NAME}`,
  },
  description:
    "在书跃工作台上传 EPUB、AZW3 或 PDF 电子书，生成全书摘要、阅读指南、观点地图、行动提炼、观点校验和思想溯源。",
  alternates: {
    canonical: `${SITE_URL}/workspace`,
  },
  openGraph: {
    title: `书跃工作台｜${SITE_NAME}`,
    description:
      "在书跃工作台上传 EPUB、AZW3 或 PDF 电子书，生成全书摘要、阅读指南、观点地图、行动提炼、观点校验和思想溯源。",
    url: `${SITE_URL}/workspace`,
  },
};

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <link rel="preload" as="image" href="/textures/quote-paper-texture-v1.webp" fetchPriority="low" />
      {children}
    </>
  );
}
