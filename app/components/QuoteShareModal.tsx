"use client";

import { useCallback, useEffect, useState } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";

type QuoteShareData = {
  bookTitle: string;
  author: string;
  cardLabel: string;
  text: string;
};

type QuoteImageSize = "portrait" | "xiaoyuzhou";

const PAPER_COLOR = "#d8d3c9";
const INK_COLOR = "#100f0d";
const HIGHLIGHT_COLOR = "rgba(213, 197, 0, 0.9)";
const PAPER_TEXTURE_SRC = "/textures/quote-paper-texture-v1.webp";

let paperTexturePromise: Promise<HTMLImageElement | null> | null = null;
let paperTextureImage: HTMLImageElement | null = null;

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

type WrappedLine = {
  text: string;
  x: number;
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

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function fontStack(size: number, weight = 900) {
  return `${weight} ${size}px "Times New Roman", Georgia, "Songti SC", STSong, serif`;
}

function loadPaperTexture(priority: "low" | "high" = "high") {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (paperTexturePromise) {
    if (priority === "high" && paperTextureImage) paperTextureImage.fetchPriority = "high";
    return paperTexturePromise;
  }

  paperTexturePromise = new Promise((resolve) => {
    const image = new Image();
    paperTextureImage = image;
    image.onload = () => resolve(image);
    image.onerror = () => {
      paperTexturePromise = null;
      paperTextureImage = null;
      resolve(null);
    };
    image.fetchPriority = priority;
    image.src = PAPER_TEXTURE_SRC;
  });

  return paperTexturePromise;
}

export function preloadQuotePaperTexture() {
  void loadPaperTexture("low");
}

function getBodyFontSize(text: string, size: QuoteImageSize) {
  const length = text.replace(/\s/g, "").length;
  if (size === "xiaoyuzhou") {
    if (length > 260) return 42;
    if (length > 160) return 49;
    return 56;
  }

  if (length > 360) return 38;
  if (length > 220) return 44;
  if (length < 70) return 54;
  return 48;
}

function splitTextUnits(text: string) {
  return text.match(/\s+|[A-Za-z0-9]+(?:[’'._:%+-][A-Za-z0-9]+)*|./gu) ?? [];
}

function getListIndent(line: string, fontSize: number) {
  const marker = line.match(
    /^(\s*(?:[-*•·]\s+|\d+[、.]\s+|[（(]?[一二三四五六七八九十]+[）)、.]\s*))/
  );
  if (!marker) return 0;
  return Math.min(
    fontSize * 1.35,
    Math.max(
      fontSize * 0.82,
      fontSize * 0.42 + marker[0].length * fontSize * 0.22
    )
  );
}

function wrapLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  maxWidth: number,
  fontSize: number
) {
  const trimmedLine = text.trimEnd();
  const indent = getListIndent(trimmedLine, fontSize);
  const units = splitTextUnits(trimmedLine).flatMap((unit) =>
    context.measureText(unit).width > maxWidth ? Array.from(unit) : [unit]
  );
  const lines: WrappedLine[] = [];
  let current = "";
  let currentX = x;
  let currentMaxWidth = maxWidth;

  units.forEach((unit) => {
    if (!current && /^\s+$/.test(unit)) return;

    const next = current + unit;
    if (current && context.measureText(next).width > currentMaxWidth) {
      lines.push({ text: current.trimEnd(), x: currentX });
      current = unit.trimStart();
      currentX = x + indent;
      currentMaxWidth = maxWidth - indent;
      return;
    }
    current = next;
  });

  if (current.trim().length > 0) {
    lines.push({ text: current.trimEnd(), x: currentX });
  }
  return lines;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  maxWidth: number,
  fontSize: number
) {
  return text
    .split("\n")
    .flatMap((line) => wrapLine(context, line, x, maxWidth, fontSize));
}

function drawPaperFiber(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  length: number,
  angle: number,
  alpha: number,
  random: () => number
) {
  const bend = length * (-0.08 + random() * 0.16);
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;
  const controlX =
    startX + Math.cos(angle) * length * 0.55 - Math.sin(angle) * bend;
  const controlY =
    startY + Math.sin(angle) * length * 0.55 + Math.cos(angle) * bend;

  context.lineCap = "round";
  context.lineWidth = 0.35 + random() * 0.55;
  context.strokeStyle =
    random() > 0.58
      ? `rgba(255,255,255,${alpha * 1.45})`
      : `rgba(44,39,32,${alpha})`;
  context.beginPath();
  context.moveTo(startX, startY);
  context.quadraticCurveTo(controlX, controlY, endX, endY);
  context.stroke();
}

function drawInkText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) {
  context.save();
  context.fillStyle = "rgba(16,15,13,0.30)";
  context.fillText(text, x + 0.55, y + 0.45);
  context.fillText(text, x - 0.25, y + 0.22);
  context.fillStyle = INK_COLOR;
  context.fillText(text, x, y);
  context.restore();
}

function drawPaperPhotoBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = Math.max(
    1,
    image.naturalHeight - Math.round(image.naturalHeight * 0.1)
  );
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "contrast(1.08) saturate(0.86) brightness(1.03)";
  context.drawImage(
    image,
    0,
    0,
    sourceWidth,
    sourceHeight,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
  context.filter = "none";
  context.restore();
}

function drawPaperTexture(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  textureImage: HTMLImageElement | null
) {
  const random = createRandom(seed);
  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, width, height);

  if (textureImage) {
    drawPaperPhotoBackground(context, textureImage, width, height);

    const photoTone = context.createLinearGradient(0, 0, width, height);
    photoTone.addColorStop(0, "rgba(244, 240, 229, 0.035)");
    photoTone.addColorStop(0.5, "rgba(220, 216, 205, 0)");
    photoTone.addColorStop(1, "rgba(35, 31, 25, 0.055)");
    context.fillStyle = photoTone;
    context.fillRect(0, 0, width, height);

    return;
  }

  const paperLight = context.createLinearGradient(0, 0, width, height);
  paperLight.addColorStop(0, "rgba(238, 235, 226, 0.58)");
  paperLight.addColorStop(0.36, "rgba(223, 219, 209, 0.30)");
  paperLight.addColorStop(1, "rgba(118, 111, 96, 0.24)");
  context.fillStyle = paperLight;
  context.fillRect(0, 0, width, height);

  const sideShade = context.createLinearGradient(0, 0, width, 0);
  sideShade.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  sideShade.addColorStop(0.56, "rgba(255, 255, 255, 0.02)");
  sideShade.addColorStop(1, "rgba(45, 41, 34, 0.22)");
  context.fillStyle = sideShade;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.18;
  for (let index = 0; index < 70; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const radiusX = width * (0.05 + random() * 0.16);
    const radiusY = height * (0.015 + random() * 0.045);
    context.translate(x, y);
    context.rotate(-0.32 + random() * 0.64);
    context.fillStyle =
      random() > 0.48 ? "rgba(255,255,255,0.10)" : "rgba(64,58,47,0.055)";
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
  context.restore();

  const vignette = context.createRadialGradient(
    width * 0.40,
    height * 0.35,
    width * 0.18,
    width * 0.48,
    height * 0.42,
    width * 0.88
  );
  vignette.addColorStop(0, "rgba(255, 255, 255, 0.10)");
  vignette.addColorStop(0.66, "rgba(255, 255, 255, 0)");
  vignette.addColorStop(1, "rgba(31, 28, 22, 0.18)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.24;
  for (let index = 0; index < 18000; index += 1) {
    drawPaperFiber(
      context,
      random() * width,
      random() * height,
      1.5 + random() * 8,
      -0.55 + random() * 1.1,
      0.055 + random() * 0.08,
      random
    );
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.09;
  for (let index = 0; index < 1800; index += 1) {
    context.fillStyle = "rgba(255,255,255,0.55)";
    context.fillRect(random() * width, random() * height, 0.7, 0.7);
  }
  context.restore();
}

function drawHighlightedTitle(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  random: () => number
) {
  const lineHeight = fontSize * 1.22;
  context.font = fontStack(fontSize, 900);
  context.textBaseline = "alphabetic";

  lines.forEach((line, index) => {
    const baseline = y + index * lineHeight;
    const textWidth = context.measureText(line).width;
    const highlightX = x - 13 + random() * 3;
    const highlightY = baseline - fontSize * 0.78 + random() * 2;
    const highlightHeight = fontSize * 0.94;

    context.fillStyle = HIGHLIGHT_COLOR;
    context.fillRect(highlightX, highlightY, textWidth + 28, highlightHeight);
    context.fillStyle = "rgba(150, 136, 0, 0.26)";
    context.fillRect(
      highlightX,
      highlightY + highlightHeight - 5,
      textWidth + 28,
      5
    );

    context.shadowColor = "rgba(16,15,13,0.36)";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0.45;
    context.shadowOffsetY = 0.7;
    drawInkText(context, line, x, baseline);
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  });

  return y + lines.length * lineHeight;
}

function drawBodyText(
  context: CanvasRenderingContext2D,
  lines: WrappedLine[],
  y: number,
  fontSize: number,
  lineHeight: number
) {
  context.font = fontStack(fontSize, 900);
  context.textBaseline = "alphabetic";
  context.shadowColor = "rgba(16,15,13,0.34)";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0.55;
  context.shadowOffsetY = 0.8;

  lines.forEach((line, index) => {
    drawInkText(context, line.text, line.x, y + index * lineHeight);
  });

  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
}

async function renderQuoteCardImage(data: QuoteShareData, size: QuoteImageSize) {
  if ("fonts" in document) await document.fonts.ready;
  const paperTexture = await loadPaperTexture();

  const option = SIZE_OPTIONS[size];
  const canvas = document.createElement("canvas");
  canvas.width = option.width;
  canvas.height = option.height;

  const context = canvas.getContext("2d");
  if (!context) return "";

  const quote = normalizeQuoteText(data.text);
  const titleLine = data.author
    ? `《${data.bookTitle}》 · ${data.author}`
    : `《${data.bookTitle}》`;
  const seed = hashString(`${size}:${titleLine}:${quote}`);
  const random = createRandom(seed);
  const isLandscape = size === "xiaoyuzhou";
  const bodyMaxWidth = isLandscape ? 1120 : 790;
  const contentX = Math.round((option.width - bodyMaxWidth) / 2);
  const layout = isLandscape
    ? {
        x: contentX,
        titleY: 172,
        titleFontSize: 40,
        bodyY: 308,
        bodyMaxWidth,
        bodyMaxHeight: 430,
        footerY: option.height - 76,
      }
    : {
        x: contentX,
        titleY: 276,
        titleFontSize: 50,
        bodyY: 446,
        bodyMaxWidth,
        bodyMaxHeight: 760,
        footerY: option.height - 120,
      };

  drawPaperTexture(context, option.width, option.height, seed, paperTexture);

  context.font = fontStack(layout.titleFontSize, 900);
  const titleLines = wrapText(
    context,
    titleLine,
    layout.x,
    layout.bodyMaxWidth,
    layout.titleFontSize
  ).map((line) => line.text);
  const titleBottom = drawHighlightedTitle(
    context,
    titleLines,
    layout.x,
    layout.titleY,
    layout.titleFontSize,
    random
  );

  let bodyFontSize = getBodyFontSize(quote, size);
  let bodyLineHeight = bodyFontSize * (isLandscape ? 1.38 : 1.44);
  const bodyY = Math.max(layout.bodyY, titleBottom + (isLandscape ? 72 : 86));
  let bodyLines: WrappedLine[] = [];

  while (bodyFontSize >= 30) {
    context.font = fontStack(bodyFontSize, 900);
    bodyLineHeight = bodyFontSize * (isLandscape ? 1.38 : 1.44);
    bodyLines = wrapText(
      context,
      quote,
      layout.x,
      layout.bodyMaxWidth,
      bodyFontSize
    );
    const totalHeight = Math.max(1, bodyLines.length) * bodyLineHeight;
    if (totalHeight <= layout.bodyMaxHeight) break;
    bodyFontSize -= 2;
  }

  drawBodyText(context, bodyLines, bodyY, bodyFontSize, bodyLineHeight);

  context.font = fontStack(isLandscape ? 24 : 27, 800);
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.fillStyle = "#000000";
  context.fillText("@ bookleap.cn", layout.x, layout.footerY);

  return canvas.toDataURL("image/png");
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
  const [isSaving, setIsSaving] = useState(false);
  const [activeSize, setActiveSize] = useState<QuoteImageSize>("portrait");
  const [previewW, setPreviewW] = useState(360);
  const [previewSrc, setPreviewSrc] = useState("");
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);
  const option = SIZE_OPTIONS[activeSize];
  const previewH = Math.round(option.height * (previewW / option.width));

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
    let cancelled = false;
    setPreviewSrc("");

    renderQuoteCardImage(data, activeSize).then((imageSrc) => {
      if (!cancelled) setPreviewSrc(imageSrc);
    });

    return () => {
      cancelled = true;
    };
  }, [activeSize, data]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const imageSrc = previewSrc || (await renderQuoteCardImage(data, activeSize));
      const link = document.createElement("a");
      link.href = imageSrc;
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
            borderRadius: 0,
            background: PAPER_COLOR,
            boxShadow: "0 18px 44px rgba(24,29,38,0.2)",
            position: "relative",
          }}
        >
          {previewSrc ? (
            // The preview and saved file use the exact same generated image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="划线书摘预览"
              src={previewSrc}
              style={{
                display: "block",
                width: previewW,
                height: previewH,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(16,15,13,0.62)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              生成中...
            </div>
          )}
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
            disabled={isSaving || !previewSrc}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: "none",
              background: isSaving || !previewSrc ? "#9297a0" : "#181d26",
              color: "#fbfcfd",
              cursor: isSaving || !previewSrc ? "default" : "pointer",
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
