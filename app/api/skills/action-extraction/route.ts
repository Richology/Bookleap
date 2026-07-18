import { NextResponse } from "next/server";
import { generateActionExtraction } from "@/lib/skills/generateActionExtraction";
import {
  buildBookContext,
  formatBookContextForPrompt,
} from "@/lib/bookAnalysis/context.mjs";
import {
  buildCardEvidenceFromContent,
} from "@/lib/bookAnalysis/cardEvidence.mjs";

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
    const actionExtraction = await generateActionExtraction(title, bookSummary, analysisContext);
    const evidence = buildCardEvidenceFromContent({
      cardKey: "actionExtraction",
      cardLabel: "行动提炼",
      content: actionExtraction,
      context,
    });

    return NextResponse.json({ success: true, actionExtraction, evidence });
  } catch (error) {
    console.error("行动提炼生成失败:", error);
    return NextResponse.json(
      { success: false, error: "行动提炼生成失败" },
      { status: 500 }
    );
  }
}
