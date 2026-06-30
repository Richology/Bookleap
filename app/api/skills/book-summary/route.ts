import { NextResponse } from "next/server";
import { generateBookSummary } from "@/lib/skills/generateBookSummary";

type ChapterInput = {
  id: string;
  title: string;
  text: string;
};

type RequestBody = {
  title: string;
  chapters: ChapterInput[];
};

export async function POST(request: Request) {
  let title = "";
  let chapters: ChapterInput[] = [];

  try {
    const body = (await request.json()) as RequestBody;
    title = typeof body.title === "string" ? body.title : "";
    chapters = Array.isArray(body.chapters) ? body.chapters : [];

    const chapterContextForSummary = chapters.map((c, index) => ({
      index: index + 1,
      title: typeof c.title === "string" ? c.title : "",
      summary: typeof c.text === "string" ? c.text.slice(0, 800) : "",
    }));

    const bookSummary = await generateBookSummary(title, chapterContextForSummary);

    return NextResponse.json({ success: true, bookSummary });
  } catch (error) {
    console.error("全书摘要生成失败:", error);
    if (title || chapters.length > 0) {
      return NextResponse.json({
        success: true,
        bookSummary: buildFallbackBookSummary(title || "这本书", chapters),
      });
    }

    return NextResponse.json(
      { success: false, error: "全书摘要生成失败" },
      { status: 500 }
    );
  }
}

function buildFallbackBookSummary(title: string, chapters: ChapterInput[]): string {
  const chapterTitles = chapters
    .map((chapter) => (typeof chapter.title === "string" ? chapter.title.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);

  const chapterSnippets = chapters
    .map((chapter) =>
      typeof chapter.text === "string"
        ? chapter.text.replace(/\s+/g, " ").trim()
        : ""
    )
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => text.slice(0, 48));

  const titleLine = chapterTitles.length > 0
    ? `《${title}》当前已提取出 ${chapters.length} 个核心章节，内容主要围绕 ${chapterTitles.join("、")} 展开。`
    : `《${title}》当前已提取出 ${chapters.length} 个核心章节，已经可以进入阅读与后续分析。`;

  const excerptLine = chapterSnippets.length > 0
    ? `先给你一版提取摘要：${chapterSnippets.join(" / ")}。`
    : "当前摘要服务暂时不可用，但正文内容已经成功提取。";

  return `${titleLine}${excerptLine}`.slice(0, 220);
}
