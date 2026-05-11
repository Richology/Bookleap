"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PosterData, PosterTemplate } from "./types";
import { MinimalWhitePoster } from "./MinimalWhitePoster";
import { AICodePoster } from "./AICodePoster";
import { CutePoster } from "./CutePoster";
import { MagazinePoster } from "./MagazinePoster";
import { useModalTransition } from "@/app/hooks/useModalTransition";

/** Design width of all poster templates */
const POSTER_W = 1080;
const PREVIEW_MAX_W = 600;
const DESKTOP_SIDE_W = 168;

const TEMPLATES: { id: PosterTemplate; label: string }[] = [
  { id: "minimal-white", label: "Notion风格" },
  { id: "ai-code", label: "Claude风格" },
  { id: "cute", label: "RED风格" },
  { id: "magazine", label: "Monocle风格" },
];

function bgForTemplate(t: PosterTemplate): string {
  switch (t) {
    case "ai-code":
      return "#0d1117";
    case "cute":
      return "#fef6f0";
    case "magazine":
      return "#faf9f6";
    default:
      return "#ffffff";
  }
}

export function PosterPreviewModal({
  data,
  onClose,
  onRegenerate,
  onSaveSuccess,
}: {
  data: PosterData;
  onClose: () => void;
  onRegenerate?: () => void;
  onSaveSuccess?: () => void;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [previewW, setPreviewW] = useState(520);
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);

  const activeTemplate = TEMPLATES[activeIdx].id;
  const scale = previewW / POSTER_W;

  const renderTemplate = (tmpl: PosterTemplate) => {
    switch (tmpl) {
      case "ai-code":
        return <AICodePoster data={data} />;
      case "cute":
        return <CutePoster data={data} />;
      case "magazine":
        return <MagazinePoster data={data} />;
      case "minimal-white":
      default:
        return <MinimalWhitePoster data={data} />;
    }
  };

  /* ── Measure export node for preview height ── */
  const [previewH, setPreviewH] = useState(0);
  const measure = useCallback(() => {
    if (!exportRef.current) return;

    const fullHeight = exportRef.current.scrollHeight;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const desktop = viewportW >= 1024;
    const widthLimit = desktop
      ? Math.max(460, Math.min(PREVIEW_MAX_W, viewportW - DESKTOP_SIDE_W - 220))
      : Math.max(300, Math.min(520, viewportW - 40));
    const heightLimit = desktop
      ? Math.max(420, viewportH - 110)
      : Math.max(280, viewportH - 220);
    const nextScale = Math.min(widthLimit / POSTER_W, heightLimit / fullHeight);
    const safeScale = Math.max(0.22, nextScale);

    setIsDesktopLayout(desktop);
    setPreviewW(Math.round(POSTER_W * safeScale));
    setPreviewH(Math.round(fullHeight * safeScale));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    measure();
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [measure, data, activeIdx]);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setActiveIdx((i) => (i - 1 + TEMPLATES.length) % TEMPLATES.length);
      if (e.key === "ArrowRight")
        setActiveIdx((i) => (i + 1) % TEMPLATES.length);
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  /* ── Stable image export ── */
  const handleSave = async () => {
    const node = exportRef.current;
    if (!node) return;
    setIsSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      if ("fonts" in document) await document.fonts.ready;
      const imgs = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete ||
            new Promise<void>((r) => {
              img.onload = () => r();
              img.onerror = () => r();
            })
        )
      );
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const w = node.scrollWidth;
      const h = node.scrollHeight;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: bgForTemplate(activeTemplate),
        logging: false,
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
        scrollX: 0,
        scrollY: 0,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.bookTitle || "BookLeap"}-海报.png`;
      a.click();
      onSaveSuccess?.();
    } catch (err) {
      console.error("海报导出失败:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const THUMB_W = 132;
  const THUMB_SCALE = THUMB_W / POSTER_W;

  const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 10,
    border: "1px solid #dddddd",
    background: "#f8fafc",
    fontSize: 14,
    fontWeight: 600,
    color: "#41454d",
    cursor: "pointer",
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: isSaving ? "#9297a0" : "#181d26",
    fontSize: 14,
    fontWeight: 600,
    color: "#fbfbfa",
    cursor: isSaving ? "default" : "pointer",
  };

  const renderThumb = (tmpl: { id: PosterTemplate; label: string }, idx: number) => {
    const isActive = idx === activeIdx;

    return (
      <button
        key={tmpl.id}
        onClick={() => setActiveIdx(idx)}
        style={{
          width: THUMB_W,
          height: 74,
          borderRadius: 10,
          overflow: "hidden",
          cursor: "pointer",
          border: isActive
            ? "2px solid #9297a0"
            : "1px solid #dddddd",
          boxShadow: isActive
            ? "0 4px 14px rgba(24,29,38,0.14)"
            : "0 1px 2px rgba(24,29,38,0.08)",
          opacity: isActive ? 1 : 0.72,
          background: bgForTemplate(tmpl.id),
          transition: "opacity 180ms ease, transform 180ms ease, border-color 180ms ease",
          transform: isActive ? "scale(1)" : "scale(0.98)",
        }}
      >
        <div
          style={{
            transformOrigin: "top left",
            transform: `scale(${THUMB_SCALE})`,
            width: POSTER_W,
            position: "relative",
          }}
        >
          {renderTemplate(tmpl.id)}
        </div>
      </button>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(24,29,38,0.34)",
        backdropFilter: "blur(2px)",
        ...overlayStyle,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxHeight: "96vh",
          gap: 14,
          width: "100%",
          maxWidth: isDesktopLayout ? previewW + DESKTOP_SIDE_W + 24 : previewW + 40,
          ...panelStyle,
        }}
      >
        {/* ── Hidden full-size export node ── */}
        <div
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            width: POSTER_W,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <div ref={exportRef}>{renderTemplate(activeTemplate)}</div>
        </div>

        {isDesktopLayout ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${previewW}px ${DESKTOP_SIDE_W}px`,
              gap: 16,
              alignItems: "start",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fbfbfa",
                  letterSpacing: 1,
                  margin: 0,
                }}
              >
                {TEMPLATES[activeIdx].label}
              </p>

              <div
                style={{
                  overflow: "hidden",
                  borderRadius: 12,
                  boxShadow: "0 18px 44px rgba(24,29,38,0.18)",
                  background: bgForTemplate(activeTemplate),
                }}
              >
                <div
                  style={{
                    width: previewW,
                    height: previewH || "auto",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      transformOrigin: "top left",
                      transform: `scale(${scale})`,
                      width: POSTER_W,
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  >
                    {renderTemplate(activeTemplate)}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                minHeight: previewH || undefined,
                flexDirection: "column",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                {TEMPLATES.map(renderThumb)}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <button onClick={handleClose} style={secondaryButtonStyle}>
                  关闭
                </button>
                {onRegenerate && (
                  <button onClick={onRegenerate} style={secondaryButtonStyle}>
                    重新生成内容
                  </button>
                )}
                <button onClick={handleSave} disabled={isSaving} style={primaryButtonStyle}>
                  {isSaving ? "保存中…" : "保存海报"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fbfbfa",
                letterSpacing: 1,
                margin: 0,
              }}
            >
              {TEMPLATES[activeIdx].label}
            </p>

            <div
              style={{
                overflow: "hidden",
                borderRadius: 12,
                boxShadow: "0 18px 44px rgba(24,29,38,0.18)",
                background: bgForTemplate(activeTemplate),
              }}
            >
              <div
                style={{
                  width: previewW,
                  height: previewH || "auto",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    transformOrigin: "top left",
                    transform: `scale(${scale})`,
                    width: POSTER_W,
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  {renderTemplate(activeTemplate)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                overflowX: "auto",
                justifyContent: "center",
                paddingBottom: 2,
              }}
            >
              {TEMPLATES.map(renderThumb)}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={handleClose} style={secondaryButtonStyle}>
                关闭
              </button>
              {onRegenerate && (
                <button onClick={onRegenerate} style={secondaryButtonStyle}>
                  重新生成内容
                </button>
              )}
              <button onClick={handleSave} disabled={isSaving} style={primaryButtonStyle}>
                {isSaving ? "保存中…" : "保存海报"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
