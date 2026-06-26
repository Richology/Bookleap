import { NextResponse } from "next/server";
import { generateOriginalReadingValue } from "@/lib/skills/generateOriginalReadingValue";

type Chapter = {
  title: string;
  summary?: string;
};

type RequestBody = {
  title: string;
  bookSummary: string;
  readingGuide: string;
  chapters: Chapter[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, readingGuide, chapters } = body;

    const originalReadingValue = await generateOriginalReadingValue(
      title,
      bookSummary,
      readingGuide,
      chapters
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
