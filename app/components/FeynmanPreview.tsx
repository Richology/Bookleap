"use client";

import { useEffect, useState } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";
import { CloseIcon } from "./icons/AdminIcons";
import type {
  FeynmanCardsInput,
  FeynmanDecisionExerciseInput,
} from "@/lib/feynmanExport/types";
import {
  selectGuizangPptStyle,
} from "@/lib/feynmanExport/selectGuizangStyle";

type FeynmanPreviewProps = {
  bookTitle: string;
  author: string;
  coverImageUrl: string;
  cards: FeynmanCardsInput;
  decisionExercises: FeynmanDecisionExerciseInput[];
  starterBookId?: string | null;
  onClose: () => void;
  onGenerated?: () => void;
};

const GUIZANG_UPSTREAM_URL = "https://github.com/op7418/guizang-ppt-skill";

function sanitizeFilename(value: string) {
  return value.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

export function FeynmanPreview({
  bookTitle,
  author,
  coverImageUrl,
  cards,
  decisionExercises,
  starterBookId,
  onClose,
  onGenerated,
}: FeynmanPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState("");
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);
  const selectedStyle = selectGuizangPptStyle({ bookTitle, cards });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!isDownloading) {
      setGenerationProgress(0);
      return;
    }

    setGenerationProgress(8);
    const intervalId = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current >= 94) return current;
        const step = current < 40 ? 8 : current < 76 ? 5 : 2;
        return Math.min(94, current + step);
      });
    }, 520);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isDownloading]);

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
          style: selectedStyle,
          cards,
          decisionExercises,
          starterBookId: starterBookId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("讲书演示生成失败，请稍后重试。");
      }

      const html = await response.text();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const safeTitle = sanitizeFilename(bookTitle) || "未知书名";
      const a = document.createElement("a");
      a.href = url;
      a.download = `BookLeap-${safeTitle}-讲书演示.html`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerationProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      onGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "讲书演示生成失败，请稍后重试。");
    } finally {
      setIsDownloading(false);
    }
  };

  const generationStatus =
    generationProgress >= 96
      ? "生成完成，正在下载"
      : generationProgress >= 72
        ? "正在打包离线 HTML"
        : generationProgress >= 38
          ? "正在编排演示页面"
          : "正在生成讲书内容";

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
        <div className="flex items-start justify-between gap-5 border-b border-[#e2e6ea] px-6 pb-5 pt-5">
          <div className="min-w-0">
            <p id="feynman-export-title" className="text-lg font-semibold leading-7 text-[var(--ink)]">
              生成讲书演示
            </p>
            <p className="mt-1 truncate text-sm leading-5 text-[var(--ink-faint)]">
              《{bookTitle}》{author ? ` · ${author}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDownloading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#dfe4e8] bg-[#f8fafc] text-sm text-[var(--ink-faint)] transition hover:border-[#9297a0] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={isDownloading ? "生成中，暂时不能关闭" : "关闭"}
            title={isDownloading ? "生成中，请稍候，完成后会自动下载" : "关闭"}
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <section className="space-y-4">
            <div>
              <p className="w-full text-sm leading-6 text-[var(--ink-faint)]">
                基于全部解析内容生成 8-12 页横向翻页演示，下载后可离线打开、投屏展示，也适合自己复盘这本书。
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-[9px] border border-[#e2e6ea] bg-[#fbfcfd] px-3 py-3">
                <p className="text-xs font-semibold text-[var(--ink)]">重新讲述</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--ink-faint)]">
                  不照搬卡片，生成适合口头讲解的内容。
                </p>
              </div>
              <div className="rounded-[9px] border border-[#e2e6ea] bg-[#fbfcfd] px-3 py-3">
                <p className="text-xs font-semibold text-[var(--ink)]">自动排版</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--ink-faint)]">
                  自动选择视觉风格，生成可演示页面。
                </p>
              </div>
              <div className="rounded-[9px] border border-[#e2e6ea] bg-[#fbfcfd] px-3 py-3">
                <p className="text-xs font-semibold text-[var(--ink)]">离线下载</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--ink-faint)]">
                  一个 HTML 文件，下载后即可打开。
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#edf0f2] pt-2 text-[10px] leading-4 text-[var(--ink-faint)]">
            <span>技术说明：本功能为 Beta，使用开源演示生成组件，遵循 AGPL-3.0。</span>
            <span className="text-[#c4c9cf]" aria-hidden="true">·</span>
            <a className="font-medium text-[var(--ink-faint)] underline underline-offset-2" href={GUIZANG_UPSTREAM_URL} target="_blank" rel="noreferrer">
              开源项目
            </a>
          </section>

          {error && (
            <p className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-[#dfe4e8] px-6 py-3">
          <div className="space-y-3">
            {isDownloading && (
              <div className="rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-[var(--ink)]">{generationStatus}</span>
                  <span className="tabular-nums text-[var(--ink-faint)]">{generationProgress}%</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3e8ed]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={generationProgress}
                  aria-label="生成讲书演示进度"
                >
                  <div
                    className="h-full rounded-full bg-[#181d26] transition-[width] duration-500 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-4 text-[var(--ink-faint)]">
                  生成期间请保持弹窗打开，完成后会自动下载 HTML 文件。
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="ml-auto flex h-9 min-w-[132px] items-center justify-center rounded-[9px] bg-[#181d26] px-4 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? "生成中" : "下载 HTML"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
