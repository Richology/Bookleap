import { NextResponse } from "next/server";
import { selectFeynmanTemplate } from "@/lib/feynmanExport/selectTemplate";
import type { FeynmanCardsInput } from "@/lib/feynmanExport/types";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      bookTitle?: unknown;
      author?: unknown;
      cards?: unknown;
    };

    if (!isNonEmptyText(body.bookTitle) || !hasCompleteCards(body.cards)) {
      return NextResponse.json(
        { success: false, error: "需要完整的书名和 6 张解析卡片后才能匹配模板" },
        { status: 400 }
      );
    }

    const template = selectFeynmanTemplate({
      bookTitle: body.bookTitle,
      author: typeof body.author === "string" ? body.author : "",
      cards: body.cards,
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("[feynman-template] 模板匹配失败:", error);
    return NextResponse.json({ success: false, error: "模板匹配失败" }, { status: 500 });
  }
}
