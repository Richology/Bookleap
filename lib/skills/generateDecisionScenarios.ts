import { generateWithOllama } from "@/lib/ollama";
import {
  DECISION_BLUEPRINT_GATE_PROMPT,
  DECISION_ROUND_BLUEPRINT_PROMPT,
  DECISION_TRAINING_PROMPT,
  DECISION_SINGLE_PROMPT,
} from "@/lib/prompts/decisionTraining";
import {
  buildDecisionBookId,
  isLifeCapital,
  normalizeDecisionScenario,
  normalizeRoundBlueprint,
  parseDecisionScenarioListOrThrow,
  type DecisionCardsInput,
  type DecisionScenario,
  type LifeCapital,
  type RoundBlueprint,
} from "@/types/decision";
import { jsonrepair } from "jsonrepair";

const MAX_ATTEMPTS = 3;
const LIFE_TOPIC_KEYWORDS: Array<{ label: LifeCapital; keywords: string[] }> = [
  {
    label: "财富积累",
    keywords: ["财富", "金钱", "投资", "商业", "创业", "公司", "增长", "资产", "收入", "效率", "生产力", "市场"],
  },
  {
    label: "健康增值",
    keywords: ["健康", "身体", "睡眠", "情绪", "压力", "习惯", "精力", "运动", "饮食", "自律", "拖延"],
  },
  {
    label: "关系丰盈",
    keywords: ["关系", "沟通", "家庭", "亲密", "团队", "协作", "信任", "冲突", "表达", "倾听", "文化"],
  },
] as const;

export function chooseLifeCapital(cards: DecisionCardsInput): LifeCapital {
  const corpus = Object.values(cards).join("\n");
  const scores = LIFE_TOPIC_KEYWORDS.map((topic) => ({
    label: topic.label,
    score: topic.keywords.reduce(
      (total, keyword) => total + (corpus.match(new RegExp(keyword, "g"))?.length ?? 0),
      0
    ),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].label : "关系丰盈";
}

function extractJsonArray(raw: string): unknown {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error("模型未返回 JSON 数组");
  }

  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    try {
      return JSON.parse(jsonrepair(match[0])) as unknown;
    } catch {
      throw new Error("模型返回的 JSON 数组无法解析");
    }
  }
}

export async function generateDecisionScenarios(
  bookTitle: string,
  cards: DecisionCardsInput
): Promise<DecisionScenario[]> {
  const prompt = DECISION_TRAINING_PROMPT(bookTitle, cards);
  const bookId = buildDecisionBookId(bookTitle);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateWithOllama(prompt);
      const parsed = extractJsonArray(raw);
      return parseDecisionScenarioListOrThrow(parsed, bookId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("决策训练生成失败");
    }
  }

  throw lastError ?? new Error("未生成有效的决策训练题");
}

// ── 单题生成（逐题调用用） ──────────────────────────────────────────────────────

function extractJsonObject(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("模型未返回 JSON 对象");
  }
  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    try {
      return JSON.parse(jsonrepair(match[0])) as unknown;
    } catch {
      throw new Error("模型返回的 JSON 对象无法解析");
    }
  }
}

export async function generateSingleDecisionScenario(
  bookTitle: string,
  cards: DecisionCardsInput,
  questionIndex: number
): Promise<DecisionScenario> {
  const prompt = DECISION_SINGLE_PROMPT(bookTitle, cards, questionIndex, chooseLifeCapital(cards));
  const bookId = buildDecisionBookId(bookTitle);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateWithOllama(prompt);
      const parsed = extractJsonObject(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
      ) {
        throw new Error((parsed as { error: string }).error);
      }
      const scenario = normalizeDecisionScenario(parsed, {
        id: `${bookId}-${questionIndex + 1}`,
        bookId,
      });
      if (!scenario) {
        throw new Error(`第 ${questionIndex + 1} 题格式不完整`);
      }
      return scenario;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("单题生成失败");
    }
  }

  throw lastError ?? new Error(`第 ${questionIndex + 1} 题生成失败`);
}

export type GenerateBlueprintScenarioResult = {
  blueprint: RoundBlueprint;
  scenario: DecisionScenario;
};

export async function generateDecisionBlueprintAndFirstScenario(
  bookTitle: string,
  cards: DecisionCardsInput,
  requestedLifeCapital?: unknown
): Promise<GenerateBlueprintScenarioResult> {
  const bookId = buildDecisionBookId(bookTitle);
  const lifeCapital = isLifeCapital(requestedLifeCapital)
    ? requestedLifeCapital
    : chooseLifeCapital(cards);
  const prompt = DECISION_ROUND_BLUEPRINT_PROMPT(bookTitle, cards, lifeCapital);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateWithOllama(prompt);
      const parsed = extractJsonObject(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
      ) {
        throw new Error((parsed as { error: string }).error);
      }

      const payload = parsed as Record<string, unknown>;
      const blueprint = normalizeRoundBlueprint(payload.blueprint, bookId);
      if (!blueprint) throw new Error("训练蓝图格式不完整");

      const scenario = normalizeDecisionScenario(payload.scenario, {
        id: `${bookId}-${blueprint.roundId}-1`,
        bookId,
      });
      if (!scenario) throw new Error("第 1 题格式不完整");

      return {
        blueprint,
        scenario: {
          ...scenario,
          roundId: blueprint.roundId,
          lifeCapital: scenario.lifeCapital ?? blueprint.lifeCapital,
          phase: scenario.phase ?? blueprint.gates[0]?.phase,
          scenarioType: scenario.scenarioType ?? blueprint.gates[0]?.scenarioType,
          principleAnchorIds: scenario.principleAnchorIds?.length
            ? scenario.principleAnchorIds
            : blueprint.gates[0]?.principleAnchorIds,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("训练蓝图生成失败");
    }
  }

  throw lastError ?? new Error("训练蓝图生成失败");
}

export async function generateDecisionScenarioFromBlueprint(
  bookTitle: string,
  blueprint: RoundBlueprint,
  questionIndex: number
): Promise<DecisionScenario> {
  const bookId = buildDecisionBookId(bookTitle);
  const prompt = DECISION_BLUEPRINT_GATE_PROMPT(bookTitle, blueprint, questionIndex);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateWithOllama(prompt);
      const parsed = extractJsonObject(raw);
      const scenario = normalizeDecisionScenario(parsed, {
        id: `${bookId}-${blueprint.roundId}-${questionIndex + 1}`,
        bookId,
      });
      const gate = blueprint.gates[questionIndex];
      if (!scenario || !gate) {
        throw new Error(`第 ${questionIndex + 1} 题格式不完整`);
      }

      return {
        ...scenario,
        roundId: blueprint.roundId,
        lifeCapital: scenario.lifeCapital ?? blueprint.lifeCapital,
        phase: scenario.phase ?? gate.phase,
        scenarioType: scenario.scenarioType ?? gate.scenarioType,
        principleAnchorIds: scenario.principleAnchorIds?.length
          ? scenario.principleAnchorIds
          : gate.principleAnchorIds,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("单题生成失败");
    }
  }

  throw lastError ?? new Error(`第 ${questionIndex + 1} 题生成失败`);
}
