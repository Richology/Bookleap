import { NextResponse } from "next/server";
import { generateOriginalReadingValue } from "@/lib/skills/generateOriginalReadingValue";
import {
  buildBookContext,
  formatBookContextForPrompt,
} from "@/lib/bookAnalysis/context.mjs";

type Chapter = {
  id?: string;
  title: string;
  text?: string;
  summary?: string;
};

type RequestBody = {
  title: string;
  bookSummary: string;
  readingGuide: string;
  chapters?: Chapter[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, readingGuide, chapters } = body;

    const context = buildBookContext({
      title,
      chapters: Array.isArray(chapters)
        ? chapters.map((chapter, index) => ({
            id: chapter.id || `chapter-${index + 1}`,
            title: chapter.title,
            text: chapter.text || chapter.summary || "",
            summary: chapter.summary,
          }))
        : [],
    });
    const analysisContext = formatBookContextForPrompt(context);
    const originalReadingValue = await generateOriginalReadingValue(
      title,
      bookSummary,
      readingGuide,
      analysisContext
    );

    return NextResponse.json({ success: true, originalReadingValue });
  } catch (error) {
    console.error("原书阅读价值判断生成失败:", error);
    return NextResponse.json(
      { success: false, error: "原书阅读价值判断生成失败" },
      { status: 500 }
    );
  }
}
