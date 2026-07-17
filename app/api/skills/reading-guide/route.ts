import { NextResponse } from "next/server";
import { generateReadingGuide } from "@/lib/skills/generateReadingGuide";
import {
  buildBookContext,
  formatBookContextForPrompt,
} from "@/lib/bookAnalysis/context.mjs";

type ChapterInput = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

type RequestBody = {
  title: string;
  bookSummary: string;
  chapters: ChapterInput[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, chapters } = body;

    const context = buildBookContext({ title, chapters });
    const analysisContext = formatBookContextForPrompt(context);
    const readingGuide = await generateReadingGuide(title, bookSummary, analysisContext);

    return NextResponse.json({ success: true, readingGuide });
  } catch (error) {
    console.error("阅读指南生成失败:", error);
    return NextResponse.json(
      { success: false, error: "阅读指南生成失败" },
      { status: 500 }
    );
  }
}
