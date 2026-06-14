"use client";

import { useState } from "react";

export const FAQ_ITEMS = [
  {
    q: "为什么推荐上传 EPUB 或 AZW3，而不是 PDF？",
    a: "EPUB 和 AZW3 通常包含更完整的目录与章节结构，书跃可以更稳定地做深度结构化解析。PDF 文件缺少稳定章节元数据，只能按固定字数分块处理，通常会进入简化分析模式。如果你手里只有 PDF，也可以上传；若希望效果更完整，建议优先使用 EPUB 或无 DRM 的 AZW3。单文件目前最多支持 50MB。",
  },
  {
    q: "上传的文件安全吗？",
    a: "你上传的电子书文件仅用于本次分析，分析完成后不会在服务器上长期存储。我们不会将你的文件分享给任何第三方。所有分析结果保存在你的浏览器本地存储中，只有你自己可以访问。",
  },
  {
    q: "分析结果可以导出吗？",
    a: "可以。书跃支持三种导出格式：Markdown、纯文本和 JSON。你可以选择导出全部 6 张卡片或单独导出某几张，也可以选择合并为单文件或分文件导出。Markdown 格式可以直接导入 Obsidian、Notion 等知识库工具。",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="px-6 py-14 md:px-10 md:py-20">
      <div className="mx-auto grid max-w-[1540px] gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="max-w-[320px] xl:pt-3">
          <h2 className="font-editorial text-[2.2rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[2.9rem]">
            常见问题
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-[22px] bg-[var(--paper)]"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left md:px-7"
                >
                  <span className="pr-4 text-base font-medium text-[var(--ink)] md:text-[1.05rem]">
                    {item.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-[var(--ink-faint)] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-sm leading-7 text-[var(--ink-soft)] md:px-7">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
