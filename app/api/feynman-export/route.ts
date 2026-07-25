import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createFeynmanExportHtml } from "@/lib/feynmanExport/exportService";
import { starterBooksById } from "@/src/data/starterBooks";
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
    const body = (await request.json()) as Partial<FeynmanExportRequest> & { starterBookId?: string };

    if (!isNonEmptyText(body.bookTitle) || !hasCompleteCards(body.cards)) {
      return NextResponse.json(
        { success: false, error: "需要完整的书名和 6 张解析卡片后才能生成讲书演示" },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const starterBookId = typeof body.starterBookId === "string" ? body.starterBookId : "";
    const starterBook = starterBooksById[starterBookId];
    const author = typeof body.author === "string" ? body.author : "";
    const coverImageUrl = typeof body.coverImageUrl === "string" ? body.coverImageUrl : "";
    const decisionExercises = Array.isArray(body.decisionExercises)
      ? body.decisionExercises
      : undefined;
    const cards = body.cards as FeynmanCardsInput;
    const style = normalizeStyle(body.style) ?? "magazine";

    if (starterBook) {
      const filename = `BookLeap-${starterBook.title}-讲书演示.html`;
      const staticHtml = await readFile(
        path.join(process.cwd(), "public", "starter-books", `${starterBook.id}.${style}.html`),
        "utf8"
      );
      return new NextResponse(staticHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    const { html, filename } = await createFeynmanExportHtml(
      {
        bookTitle: body.bookTitle,
        author,
        coverImageUrl,
        mode: normalizeMode(body.mode),
        style,
        cards,
        decisionExercises,
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
