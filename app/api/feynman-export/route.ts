import { NextResponse } from "next/server";
import { createFeynmanExportHtml } from "@/lib/feynmanExport/exportService";
import type {
  FeynmanCardsInput,
  FeynmanExportMode,
  FeynmanExportRequest,
  GuizangPptStyle,
} from "@/lib/feynmanExport/types";

const FEYNMAN_EXPORT_MODES: FeynmanExportMode[] = ["all", "core", "methods", "decision"];
const GUIZANG_PPT_STYLES: GuizangPptStyle[] = ["magazine", "swiss"];

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasCompleteCards(cards: unknown): cards is FeynmanCardsInput {
  if (!cards || typeof cards !== "object") return false;
  const candidate = cards as Record<string, unknown>;
  return [
    "summary",
    "readingGuide",
    "viewMap",
    "actionPrinciples",
    "models",
    "insights",
  ].every((key) => isNonEmptyText(candidate[key]));
}

function normalizeMode(value: unknown): FeynmanExportMode {
  return typeof value === "string" && FEYNMAN_EXPORT_MODES.includes(value as FeynmanExportMode)
    ? (value as FeynmanExportMode)
    : "all";
}

function normalizeStyle(value: unknown): GuizangPptStyle | undefined {
  return typeof value === "string" && GUIZANG_PPT_STYLES.includes(value as GuizangPptStyle)
    ? (value as GuizangPptStyle)
    : undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<FeynmanExportRequest>;

    if (!isNonEmptyText(body.bookTitle) || !hasCompleteCards(body.cards)) {
      return NextResponse.json(
        { success: false, error: "需要完整的书名和 6 张解析卡片后才能生成讲书演示" },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const { html, filename } = await createFeynmanExportHtml(
      {
        bookTitle: body.bookTitle,
        author: typeof body.author === "string" ? body.author : "",
        coverImageUrl: typeof body.coverImageUrl === "string" ? body.coverImageUrl : "",
        mode: normalizeMode(body.mode),
        style: normalizeStyle(body.style),
        cards: body.cards,
        decisionExercises: Array.isArray(body.decisionExercises)
          ? body.decisionExercises
          : undefined,
      },
      { origin }
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("[feynman-export] 导出失败:", error);
    return NextResponse.json({ success: false, error: "讲书演示生成失败" }, { status: 500 });
  }
}
