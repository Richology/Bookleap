"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";
import type {
  FeynmanCardsInput,
  FeynmanDecisionExerciseInput,
  FeynmanTemplateChoice,
} from "@/lib/feynmanExport/types";

type FeynmanPreviewProps = {
  bookTitle: string;
  author: string;
  coverImageUrl: string;
  cards: FeynmanCardsInput;
  decisionExercises: FeynmanDecisionExerciseInput[];
  onClose: () => void;
  onGenerated?: () => void;
};

function sanitizeFilename(value: string) {
  return value.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function fallbackTemplate(): FeynmanTemplateChoice {
  return {
    slug: "editorial-forest",
    name: "Editorial Forest",
    nameZh: "森林编辑风",
    tagline: "Forest green, dusty pink, and warm cream meet Source Serif 4 in a quiet, intentional quarterly-review deck.",
    taglineZh: "森林绿、灰粉色和温暖奶油纸色组合，像一份安静、克制、带书卷气的编辑型演示稿。",
    bestFor: "Anything that should feel like a considered editorial: research recaps, book or program announcements, and thoughtful readouts.",
    bestForZh: "适合需要被认真阅读和温和讲述的内容：读书分享、研究复盘、团队回顾、项目介绍、课程或计划发布。",
    thumbnailUrls: [
      "/feynman-templates/screenshots/editorial-forest-1.png",
      "/feynman-templates/screenshots/editorial-forest-2.png",
      "/feynman-templates/screenshots/editorial-forest-5.png",
    ],
    reason: "默认书籍讲解模板，兼顾书卷气和演示可读性。",
    mood: ["editorial", "quiet", "warm"],
    scheme: "light",
    density: "medium",
    colors: {
      paper: "#f7f4ec",
      panel: "#fbfaf6",
      ink: "#181d1a",
      muted: "#636862",
      faint: "#8b918a",
      line: "rgba(24, 29, 26, 0.12)",
      primary: "#243f2b",
      accent: "#d89aa4",
      accentSoft: "#f2d9dc",
      finalBg: "#243f2b",
      finalText: "#f2d9dc",
    },
  };
}

export function FeynmanPreview({
  bookTitle,
  author,
  coverImageUrl,
  cards,
  decisionExercises,
  onClose,
  onGenerated,
}: FeynmanPreviewProps) {
  const [template, setTemplate] = useState<FeynmanTemplateChoice | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTemplate = async () => {
      setIsTemplateLoading(true);
      setError("");
      try {
        const response = await fetch("/api/feynman-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookTitle, author, cards }),
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.template) {
          throw new Error(data.error || "模板匹配失败");
        }
        if (!cancelled) setTemplate(data.template);
      } catch (err) {
        console.error("费曼分享页模板匹配失败:", err);
        if (!cancelled) setTemplate(fallbackTemplate());
      } finally {
        if (!cancelled) setIsTemplateLoading(false);
      }
    };

    void fetchTemplate();

    return () => {
      cancelled = true;
    };
  }, [author, bookTitle, cards]);

  const handleDownload = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setError("");
      const response = await fetch("/api/export-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          author,
          coverImageUrl,
          mode: "all",
          templateSlug: template?.slug,
          cards,
          decisionExercises,
        }),
      });

      if (!response.ok) {
        throw new Error("分享页生成失败，请稍后重试。");
      }

      const html = await response.text();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const safeTitle = sanitizeFilename(bookTitle) || "未知书名";
      const a = document.createElement("a");
      a.href = url;
      a.download = `BookLeap-${safeTitle}-费曼分享页.html`;
      a.click();
      URL.revokeObjectURL(url);
      onGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享页生成失败，请稍后重试。");
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedTemplate = template ?? fallbackTemplate();

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(24,29,38,0.34)] px-5 py-6 backdrop-blur-[2px]"
      style={overlayStyle}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDownloading) handleClose();
      }}
    >
      <section
        className="flex w-full max-w-[760px] flex-col overflow-hidden rounded-[12px] border border-[#9297a0] bg-[#fbfcfd] shadow-[0_18px_44px_rgba(24,29,38,0.18)]"
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feynman-export-title"
      >
        <div className="flex items-start justify-between gap-5 border-b border-[#dfe4e8] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <p id="feynman-export-title" className="text-base font-semibold leading-6 text-[var(--ink)]">
              生成分享 HTML
            </p>
            <p className="mt-1 truncate text-xs leading-5 text-[var(--ink-faint)]">
              《{bookTitle}》{author ? ` · ${author}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDownloading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#dfe4e8] bg-[#f8fafc] text-sm text-[var(--ink-faint)] transition hover:border-[#9297a0] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="关闭"
          >
            x
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <ol className="space-y-4">
            <li className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c9d0d6] bg-[#f8fafc] text-xs font-semibold text-[var(--ink-muted)]">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  即将生成一个给别人讲述的 HTML
                </p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--ink-faint)]">
                  内容就是这本书的全部解析结果，会被重新组织成适合讲述、演示和离线打开的分享页。
                </p>
              </div>
            </li>

            <li className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c9d0d6] bg-[#f8fafc] text-xs font-semibold text-[var(--ink-muted)]">
                2
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    模板风格：{isTemplateLoading ? "正在匹配..." : selectedTemplate.nameZh ?? selectedTemplate.name}
                  </p>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: selectedTemplate.colors.accent }}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[var(--ink-faint)]">
                  {selectedTemplate.taglineZh ?? selectedTemplate.tagline}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                  {selectedTemplate.bestForZh ?? selectedTemplate.bestFor}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(selectedTemplate.thumbnailUrls ?? []).slice(0, 3).map((url, index) => (
                    <figure
                      key={url}
                      className="overflow-hidden rounded-[7px] border border-[#dfe4e8] bg-[#eef1f4]"
                    >
                      <Image
                        src={url}
                        alt={`${selectedTemplate.nameZh ?? selectedTemplate.name} 模板预览 ${index + 1}`}
                        width={320}
                        height={180}
                        className="block aspect-[16/9] w-full object-cover"
                        loading="lazy"
                      />
                    </figure>
                  ))}
                </div>
              </div>
            </li>
          </ol>

          {error && (
            <p className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-[28px_1fr] gap-3 border-t border-[#dfe4e8] px-6 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c9d0d6] bg-[#f8fafc] text-xs font-semibold text-[var(--ink-muted)]">
            3
          </span>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="flex h-11 w-full items-center justify-center rounded-[10px] bg-[#181d26] px-4 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? "正在生成..." : "下载 HTML"}
          </button>
        </div>
      </section>
    </div>
  );
}
