import { NextResponse } from "next/server";
import { generateCriticalExamination } from "@/lib/skills/generateCriticalExamination";
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
    const viewValidation = await generateCriticalExamination(title, bookSummary, analysisContext);
    const evidence = buildCardEvidenceFromContent({
      cardKey: "criticalExamination",
      cardLabel: "观点校验",
      content: viewValidation,
      context,
    });

    return NextResponse.json({ success: true, viewValidation, evidence });
  } catch (error) {
    console.error("观点校验生成失败:", error);
    return NextResponse.json(
      { success: false, error: "观点校验生成失败" },
      { status: 500 }
    );
  }
}
