"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";

type QuoteShareData = {
  bookTitle: string;
  author: string;
  cardLabel: string;
  text: string;
};

type QuoteImageSize = "portrait" | "xiaoyuzhou";

const SIZE_OPTIONS: Record<
  QuoteImageSize,
  { label: string; width: number; height: number; previewMaxWidth: number }
> = {
  portrait: {
    label: "3:4",
    width: 1080,
    height: 1440,
    previewMaxWidth: 430,
  },
  xiaoyuzhou: {
    label: "16:9",
    width: 1566,
    height: 886,
    previewMaxWidth: 700,
  },
};

function sanitizeFilename(value: string) {
  return value.replace(/[/\\:*?"<>|]/g, "").trim() || "BookLeap";
}

function normalizeQuoteText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

function getBodyFontSize(text: string, size: QuoteImageSize) {
  const length = text.replace(/\s/g, "").length;
  if (size === "xiaoyuzhou") {
    if (length > 260) return 44;
    if (length > 160) return 52;
    return 60;
  }

  if (length > 360) return 40;
  if (length > 220) return 46;
  if (length < 70) return 56;
  return 51;
}

function QuoteCard({
  data,
  size,
}: {
  data: QuoteShareData;
  size: QuoteImageSize;
}) {
  const option = SIZE_OPTIONS[size];
  const quote = normalizeQuoteText(data.text);
  const titleLine = data.author
    ? `《${data.bookTitle}》 · ${data.author}`
    : `《${data.bookTitle}》`;
  const isLandscape = size === "xiaoyuzhou";
  const bodyFontSize = getBodyFontSize(quote, size);

  return (
    <div
      style={{
        width: option.width,
        height: option.height,
        position: "relative",
        overflow: "hidden",
        color: "#15120e",
        backgroundColor: "#e6dec9",
        backgroundImage:
          "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.50) 0 1px, transparent 1.4px), radial-gradient(circle at 74% 36%, rgba(84,70,46,0.12) 0 1px, transparent 1.3px), radial-gradient(circle at 46% 78%, rgba(44,35,23,0.08) 0 1px, transparent 1.2px), linear-gradient(100deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.08) 34%, rgba(103,84,50,0.13) 100%), linear-gradient(180deg, #eee8d8 0%, #dfd5bd 100%)",
        backgroundSize: "7px 7px, 11px 11px, 13px 13px, 100% 100%, 100% 100%",
        fontFamily:
          "Georgia, 'Times New Roman', var(--font-serif), 'Songti SC', STSong, serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(34,24,14,0.12), transparent 18%, transparent 82%, rgba(34,24,14,0.16)), radial-gradient(circle at 44% 34%, rgba(255,255,255,0.22), transparent 38%)",
          boxShadow:
            "inset 0 0 120px rgba(47,35,19,0.20), inset 0 0 22px rgba(47,35,19,0.16)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          minHeight: "100%",
          flexDirection: "column",
          padding: isLandscape ? "122px 148px 72px" : "184px 140px 116px",
        }}
      >
        <div>
          <span
            style={{
              display: "inline",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              background:
                "linear-gradient(180deg, transparent 18%, rgba(219,196,18,0.88) 18%, rgba(219,196,18,0.88) 84%, transparent 84%)",
              padding: "0 9px 0 8px",
              fontSize: isLandscape ? 36 : 42,
              fontWeight: 700,
              lineHeight: 1.36,
              letterSpacing: 0,
              textShadow: "0.35px 0 rgba(21,18,14,0.62)",
            }}
          >
            {titleLine}
          </span>
        </div>

        <div
          style={{
            marginTop: isLandscape ? 62 : 82,
            maxWidth: isLandscape ? 1180 : 790,
            fontSize: bodyFontSize,
            fontWeight: 700,
            lineHeight: isLandscape ? 1.48 : 1.54,
            letterSpacing: 0,
            textShadow: "0.42px 0 rgba(21,18,14,0.74)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {quote}
        </div>

        <p
          style={{
            margin: "auto 0 0",
            paddingTop: isLandscape ? 54 : 70,
            fontFamily:
              "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: isLandscape ? 23 : 25,
            fontWeight: 600,
            letterSpacing: 0,
            color: "rgba(21,18,14,0.58)",
          }}
        >
          @ bookleap.cn
        </p>
      </div>
    </div>
  );
}

export function QuoteShareModal({
  data,
  onClose,
  onSaveSuccess,
}: {
  data: QuoteShareData;
  onClose: () => void;
  onSaveSuccess?: () => void;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSize, setActiveSize] = useState<QuoteImageSize>("portrait");
  const [previewW, setPreviewW] = useState(360);
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);
  const option = SIZE_OPTIONS[activeSize];
  const scale = previewW / option.width;
  const previewH = Math.round(option.height * scale);

  const measure = useCallback(() => {
    const currentOption = SIZE_OPTIONS[activeSize];
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const widthLimit = Math.max(
      280,
      Math.min(currentOption.previewMaxWidth, viewportW - 40)
    );
    const heightLimit = Math.max(320, viewportH - 184);
    const nextScale = Math.min(
      widthLimit / currentOption.width,
      heightLimit / currentOption.height
    );
    setPreviewW(Math.round(currentOption.width * Math.max(0.2, nextScale)));
  }, [activeSize]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleSave = async () => {
    const node = exportRef.current;
    if (!node) return;
    setIsSaving(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      if ("fonts" in document) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#e6dec9",
        logging: false,
        width: option.width,
        height: option.height,
        windowWidth: option.width,
        windowHeight: option.height,
        scrollX: 0,
        scrollY: 0,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${sanitizeFilename(data.bookTitle.slice(0, 18))}-${SIZE_OPTIONS[activeSize].label}-BookLeap.png`;
      link.click();
      onSaveSuccess?.();
    } catch (error) {
      console.error("划线书摘导出失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(24,29,38,0.42)",
        backdropFilter: "blur(2px)",
        padding: 20,
        ...overlayStyle,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="划线书摘分享图"
        onClick={(event) => event.stopPropagation()}
        style={{
          display: "flex",
          maxHeight: "96vh",
          width: "100%",
          maxWidth: Math.max(previewW + 40, 360),
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          ...panelStyle,
        }}
      >
        <div
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            width: option.width,
            height: option.height,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <div ref={exportRef}>
            <QuoteCard data={data} size={activeSize} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: previewW,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#fbfcfd",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0,
            }}
          >
            划线书摘
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              borderRadius: 10,
              background: "rgba(251,252,253,0.14)",
              padding: 3,
            }}
          >
            {(Object.keys(SIZE_OPTIONS) as QuoteImageSize[]).map((size) => {
              const isActive = size === activeSize;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setActiveSize(size)}
                  style={{
                    height: 30,
                    borderRadius: 8,
                    border: "none",
                    background: isActive ? "#fbfcfd" : "transparent",
                    color: isActive ? "#181d26" : "#fbfcfd",
                    cursor: "pointer",
                    padding: "0 10px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {SIZE_OPTIONS[size].label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            width: previewW,
            height: previewH,
            overflow: "hidden",
            borderRadius: 10,
            background: "#e6dec9",
            boxShadow: "0 18px 44px rgba(24,29,38,0.2)",
            position: "relative",
          }}
        >
          <div
            style={{
              width: option.width,
              height: option.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            <QuoteCard data={data} size={activeSize} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: previewW,
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: "1px solid #dfe4e8",
              background: "#fbfcfd",
              color: "#41454d",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            关闭
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: "none",
              background: isSaving ? "#9297a0" : "#181d26",
              color: "#fbfcfd",
              cursor: isSaving ? "default" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isSaving ? "保存中..." : "保存图片"}
          </button>
        </div>
      </div>
    </div>
  );
}
