import { NextResponse } from "next/server";
import { generateIdeaSourceTracing } from "@/lib/skills/generateIdeaSourceTracing";
import {
  buildBookContext,
  formatBookContextForPrompt,
} from "@/lib/bookAnalysis/context.mjs";
import {
  buildCardEvidence,
  buildCardEvidenceFromContent,
} from "@/lib/bookAnalysis/cardEvidence.mjs";
import { generateCardEvidenceClaims } from "@/lib/skills/generateCardEvidenceClaims";

type RequestBody = {
  title: string;
  bookSummary: string;
  viewMap: string;
  chapters?: Array<{
    id?: string;
    title?: string;
    text?: string;
    summary?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, viewMap, chapters } = body;
    const context = buildBookContext({
      title,
      chapters: Array.isArray(chapters)
        ? chapters.map((chapter, index) => ({
            id: chapter.id || `chapter-${index + 1}`,
            title: chapter.title || `第 ${index + 1} 部分`,
            text: chapter.text || chapter.summary || "",
            summary: chapter.summary,
          }))
        : [],
    });
    const analysisContext = formatBookContextForPrompt(context);

    const ideaSourceTracing = await generateIdeaSourceTracing(
      title,
      bookSummary,
      viewMap,
      analysisContext
    );
    const evidenceClaims = await generateCardEvidenceClaims({
      title,
      cardLabel: "思想溯源",
      cardContent: ideaSourceTracing,
      analysisContext,
    });
    const evidence = (
      evidenceClaims.length > 0
        ? buildCardEvidence({
            cardKey: "ideaSourceTracing",
            cardLabel: "思想溯源",
            context,
            claims: evidenceClaims,
            allowFallback: false,
          })
        : null
    ) ?? buildCardEvidenceFromContent({
      cardKey: "ideaSourceTracing",
      cardLabel: "思想溯源",
      content: ideaSourceTracing,
      context,
    });

    return NextResponse.json({ success: true, ideaSourceTracing, evidence });
  } catch (error) {
    console.error("思想溯源生成失败:", error);
    return NextResponse.json(
      { success: false, error: "思想溯源生成失败" },
      { status: 500 }
    );
  }
}
