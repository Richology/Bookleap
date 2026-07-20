import { NextResponse } from "next/server";
import {
  generateDecisionBlueprintAndFirstScenario,
  generateDecisionScenarioFromBlueprint,
  generateSingleDecisionScenario,
} from "@/lib/skills/generateDecisionScenarios";
import {
  buildDecisionBookId,
  hasCompleteDecisionCards,
  normalizeRoundBlueprint,
} from "@/types/decision";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookTitle, cards, questionIndex, blueprint, lifeCapital } = body;

    if (typeof bookTitle !== "string" || bookTitle.trim().length === 0 || !cards) {
      return NextResponse.json(
        { success: false, error: "缺少书名或卡片内容" },
        { status: 400 }
      );
    }

    if (typeof questionIndex !== "number" || questionIndex < 0 || questionIndex > 2) {
      return NextResponse.json(
        { success: false, error: "questionIndex 必须为 0、1 或 2" },
        { status: 400 }
      );
    }

    if (!hasCompleteDecisionCards(cards)) {
      return NextResponse.json(
        { success: false, error: "需要完整的 6 张分析卡片" },
        { status: 400 }
      );
    }

    const title = bookTitle.trim();

    if (questionIndex === 0 && !blueprint) {
      const result = await generateDecisionBlueprintAndFirstScenario(
        title,
        cards,
        lifeCapital
      );
      return NextResponse.json({
        success: true,
        scenario: result.scenario,
        blueprint: result.blueprint,
      });
    }

    const normalizedBlueprint = normalizeRoundBlueprint(
      blueprint,
      buildDecisionBookId(title)
    );
    const scenario = normalizedBlueprint
      ? await generateDecisionScenarioFromBlueprint(title, normalizedBlueprint, questionIndex)
      : await generateSingleDecisionScenario(title, cards, questionIndex);

    return NextResponse.json({ success: true, scenario });
  } catch (error) {
    console.error("[decision-training] 单题生成失败:", error);

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "决策训练单题生成失败";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
