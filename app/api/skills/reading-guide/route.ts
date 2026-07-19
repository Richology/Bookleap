import { NextResponse } from "next/server";
import { generateReadingGuide } from "@/lib/skills/generateReadingGuide";
import {
  buildBookContext,
  formatBookContextForPrompt,
} from "@/lib/bookAnalysis/context.mjs";
import {
  buildCardEvidence,
  buildCardEvidenceFromContent,
} from "@/lib/bookAnalysis/cardEvidence.mjs";
import { generateCardEvidenceClaims } from "@/lib/skills/generateCardEvidenceClaims";

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
    const evidenceClaims = await generateCardEvidenceClaims({
      title,
      cardLabel: "阅读指南",
      cardContent: readingGuide,
      analysisContext,
    });
    const evidence = (
      evidenceClaims.length > 0
        ? buildCardEvidence({
            cardKey: "readingGuide",
            cardLabel: "阅读指南",
            context,
            claims: evidenceClaims,
            allowFallback: false,
          })
        : null
    ) ?? buildCardEvidenceFromContent({
      cardKey: "readingGuide",
      cardLabel: "阅读指南",
      content: readingGuide,
      context,
    });

    return NextResponse.json({ success: true, readingGuide, evidence });
  } catch (error) {
    console.error("阅读指南生成失败:", error);
    return NextResponse.json(
      { success: false, error: "阅读指南生成失败" },
      { status: 500 }
    );
  }
}
