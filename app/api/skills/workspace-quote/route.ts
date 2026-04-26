import { NextResponse } from "next/server";
import { generateWorkspaceQuote } from "@/lib/skills/generateWorkspaceQuote";

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

    const chapterContext = chapters
      .filter((c) => (c.summary || c.text || "").trim())
      .map((c, index) => ({
        index: index + 1,
        title: c.title,
        summary: (c.summary || c.text || "").slice(0, 320),
      }));

    const workspaceQuote = await generateWorkspaceQuote(title, bookSummary, chapterContext);

    return NextResponse.json({ success: true, workspaceQuote });
  } catch (error) {
    console.error("Workspace 金句生成失败:", error);
    return NextResponse.json(
      { success: false, error: "Workspace 金句生成失败" },
      { status: 500 }
    );
  }
}
