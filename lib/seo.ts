import type { Metadata } from "next";

export const SITE_URL = "https://www.bookleap.cn";
export const SITE_NAME = "书跃 BookLeap";
export const SITE_TITLE =
  "书跃 BookLeap｜免费 AI 拆书工具，高效读书与电子书拆解";
export const SITE_DESCRIPTION =
  "书跃 BookLeap 是面向中文读者的免费 AI 拆书工具，支持 EPUB、AZW3 与 PDF 电子书拆解，生成全书摘要、阅读指南、观点地图、行动提炼、观点校验和思想溯源，帮助你高效读书、认知升级。";
export const OG_IMAGE = "/opengraph-image";

export const SEO_KEYWORDS = [
  "书跃",
  "BookLeap",
  "免费拆书",
  "免费读书",
  "拆书工具",
  "电子书拆解",
  "AI读书工具",
  "AI拆书工具",
  "高效读书",
  "高效学习",
  "认知升级",
  "电子书解析",
  "书籍摘要",
  "读书笔记",
];

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "书跃 BookLeap - 免费 AI 拆书工具",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export function buildHomeJsonLd() {
  const appId = `${SITE_URL}/#webapp`;
  const orgId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        alternateName: ["书跃", "BookLeap"],
        url: SITE_URL,
        logo: `${SITE_URL}/richology-logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        alternateName: ["书跃", "BookLeap"],
        url: SITE_URL,
        inLanguage: "zh-CN",
        publisher: {
          "@id": orgId,
        },
      },
      {
        "@type": "WebApplication",
        "@id": appId,
        name: SITE_NAME,
        alternateName: ["书跃", "BookLeap"],
        url: SITE_URL,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "zh-CN",
        isAccessibleForFree: true,
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "CNY",
        },
        featureList: [
          "免费拆书",
          "电子书拆解",
          "全书摘要",
          "阅读指南",
          "观点地图",
          "行动提炼",
          "观点校验",
          "思想溯源",
        ],
        publisher: {
          "@id": orgId,
        },
      },
    ],
  };
}

export function buildFaqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
