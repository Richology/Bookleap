import type { PosterContent } from "@/app/components/poster/types";
import type { CardEvidence } from "@/lib/bookAnalysis/cardEvidence";
import {
  DECISION_ROLE_TYPES,
  buildDecisionBookId,
  type DecisionRoleType,
  type DecisionScenario,
  type LifeCapital,
  type RoundBlueprint,
} from "@/types/decision";
import cognitiveAwakeningSource from "./cognitive-awakening.json";
import poorCharliesSource from "./poor-charlies-almanack.json";
import principlesSource from "./principles.json";

type StarterBookSource = {
  id: string;
  title: string;
  author: string;
  cover: string;
  recommendation: string;
  analysis: {
    summary: string;
    insights: string[];
    actions: string[];
  };
  decisionTraining: Array<{
    roleType?: DecisionRoleType;
    trainingAbility?: string;
    scene: string;
    question: string;
    options: {
      A: string;
      B: string;
    };
    feedback: {
      A: {
        empathy: string;
        analysis: string;
        upgrade: string;
        action: string;
      };
      B: {
        empathy: string;
        analysis: string;
        upgrade: string;
        action: string;
      };
    };
  }>;
  posterContent: {
    title: string;
    hook: string;
    summary: string;
    insights: string[];
    actions: string[];
    highlight: string;
  };
};

export type StarterBookData = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  recommendation: string;
  isStarterBook: true;
  analysis: {
    summary: string;
    readingGuide: string;
    viewMap: string;
    actionExtraction: string;
    viewValidation: string;
    ideaSourceTracing: string;
    originalReadingValue: string;
    workspaceQuote: string;
  };
  decisionTraining: DecisionScenario[];
  practiceRounds: Record<LifeCapital, { blueprint: RoundBlueprint; scenarios: DecisionScenario[] }>;
  posterContent: PosterContent;
  cardEvidence: Record<string, CardEvidence>;
  contentVersion: string;
  contentOriginLabel: "内容来自网络";
  metadata?: {
    category?: string;
    badge?: string;
  };
};

const CAPITAL_SCENES: Record<LifeCapital, Array<{ scene: string; question: string; optionA: string; optionB: string }>> = {
  财富积累: [
    { scene: "你准备为一个看似很有机会的选择投入时间和钱，但还没有写清判断依据。", question: "你会怎样推进？", optionA: "凭当下感觉尽快下注", optionB: "先写下标准、风险和一个可验证的小步骤" },
    { scene: "一个短期回报很快的机会出现，但它会挤占你长期积累的时间。", question: "你会怎样取舍？", optionA: "先拿到眼前回报再说", optionB: "把短期收益和长期代价放进同一张清单" },
    { scene: "你发现自己连续几次在同类选择上结果不佳。", question: "下一步更值得做什么？", optionA: "换一个更激进的做法", optionB: "复盘共同原因，再设计一次低风险实验" },
  ],
  健康增值: [
    { scene: "工作很忙时，你原定的休息和运动计划最容易被打断。", question: "你会怎样安排？", optionA: "等不忙了再恢复", optionB: "把目标降到可执行的最小动作并固定触发条件" },
    { scene: "你想靠一次性用力扭转状态，却已经连续几天感到疲惫。", question: "你会怎样判断？", optionA: "继续硬扛，证明自己能坚持", optionB: "记录状态与诱因，调整系统而不是只责怪意志力" },
    { scene: "一个让你即时舒服的习惯，正在反复侵蚀第二天的精力。", question: "你会怎样处理？", optionA: "先享受，明天再补救", optionB: "为这个习惯设置边界，并用替代动作降低摩擦" },
  ],
  关系丰盈: [
    { scene: "一次合作或亲密关系中的分歧让你很不舒服。", question: "你会怎么回应？", optionA: "先证明自己是对的", optionB: "先确认双方的事实、目标和各自忽略的部分" },
    { scene: "你对一个人的判断很快形成了，但新的信息与原有印象不完全一致。", question: "你会怎样做？", optionA: "只挑支持原判断的信息", optionB: "主动寻找反例，再更新自己的解释" },
    { scene: "一段重要关系反复出现同一种摩擦。", question: "下一步是什么？", optionA: "期待对方自然改变", optionB: "把触发点写下来，协商一个可观察的小改变" },
  ],
};

function buildPracticeRounds(source: StarterBookSource): StarterBookData["practiceRounds"] {
  const bookId = buildDecisionBookId(source.title);
  const roles = DECISION_ROLE_TYPES;
  const phases = ["看见惯性", "权衡代价", "设计行动"] as const;

  return (Object.keys(CAPITAL_SCENES) as LifeCapital[]).reduce((rounds, lifeCapital) => {
    const anchorId = `${source.id}-${lifeCapital}-anchor`;
    const blueprint: RoundBlueprint = {
      roundId: `${source.id}-${lifeCapital}-v1`,
      bookId,
      lifeCapital,
      createdAt: "2026-07-24T00:00:00.000Z",
      anchors: [{
        id: anchorId,
        statement: source.analysis.insights[0],
        methodOrModel: `${source.title}的核心判断`,
        sourceCardKey: "insights",
        applicability: "用于在真实选择前看见惯性、代价与下一步。",
        avoidMisuse: "它不是标准答案；应结合自己的事实和边界使用。",
      }],
      gates: CAPITAL_SCENES[lifeCapital].map((item, index) => ({
        gateIndex: index,
        phase: phases[index],
        roleType: roles[index],
        scenarioType: index === 0 ? "个人成长与生活" : index === 1 ? "长期资源与人生选择" : "工作与协作",
        principleAnchorIds: [anchorId],
        coreTension: item.question,
        trainingAbility: source.analysis.actions[index] || "把判断落到下一步行动",
      })),
    };
    rounds[lifeCapital] = {
      blueprint,
      scenarios: CAPITAL_SCENES[lifeCapital].map((item, index) => ({
        id: `${source.id}-${lifeCapital}-${index + 1}`,
        bookId,
        roundId: blueprint.roundId,
        lifeCapital,
        roleType: roles[index],
        phase: phases[index],
        scenarioType: blueprint.gates[index].scenarioType,
        principleAnchorIds: [anchorId],
        sourceCardKey: "insights",
        trainingAbility: source.analysis.actions[index] || "把判断落到下一步行动",
        scene: item.scene,
        question: item.question,
        options: { A: item.optionA, B: item.optionB },
        feedback: {
          A: { empathy: "这是很自然的即时反应。", analysis: `它容易让你忽略「${source.analysis.insights[0]}」所提醒的长期结构。`, upgrade: `回到书中的提醒：${source.analysis.insights[0]}。`, action: source.analysis.actions[index] || "把这次选择写下来，先做一个低风险验证。" },
          B: { empathy: "这需要你先停下来，而不是马上反应。", analysis: "你在把一次选择变成可复盘的过程。", upgrade: `这更接近《${source.title}》反复强调的做法：${source.analysis.insights[0]}。`, action: source.analysis.actions[index] || "把下一步写成一个今天能开始的小动作。" },
        },
      })),
    };
    return rounds;
  }, {} as StarterBookData["practiceRounds"]);
}

const FALLBACK_ROLE_TRAINING: Record<DecisionRoleType, string> = {
  职场执行者: "把原则用进现实协作的能力",
  个人成长者: "在真实生活里做长期选择的能力",
  决策者: "在复杂系统里做长期决策的能力",
};

function toDecisionTraining(source: StarterBookSource): DecisionScenario[] {
  const bookId = buildDecisionBookId(source.title);

  return source.decisionTraining
    .slice(0, DECISION_ROLE_TYPES.length)
    .map((scenario, index) => {
      const fallbackRoleType = DECISION_ROLE_TYPES[index] ?? DECISION_ROLE_TYPES[0];
      const roleType = scenario.roleType ?? fallbackRoleType;
      const trainingAbility =
        scenario.trainingAbility?.trim() || FALLBACK_ROLE_TRAINING[roleType];

      return {
        id: `${source.id}-decision-${index + 1}`,
        bookId,
        roleType,
        trainingAbility,
        scene: scenario.scene,
        question: scenario.question,
        options: scenario.options,
        feedback: scenario.feedback,
      };
    });
}

function adaptStarterBook(source: StarterBookSource): StarterBookData {
  return {
    id: source.id,
    title: source.title,
    author: source.author,
    coverImage: source.cover,
    recommendation: source.recommendation,
    isStarterBook: true,
    analysis: {
      summary: source.analysis.summary,
      readingGuide: source.analysis.insights.join("\n"),
      viewMap: source.analysis.insights.join("\n"),
      actionExtraction: source.analysis.actions.join("\n"),
      viewValidation: source.analysis.insights.join("\n"),
      ideaSourceTracing: source.analysis.insights.join("\n"),
      originalReadingValue: source.analysis.summary,
      workspaceQuote: source.analysis.insights[0] || source.analysis.summary,
    },
    decisionTraining: toDecisionTraining(source),
    practiceRounds: buildPracticeRounds(source),
    posterContent: source.posterContent as PosterContent,
    cardEvidence: {},
    contentVersion: "2026-07-24.1",
    contentOriginLabel: "内容来自网络",
    metadata: {
      category: "认知入门",
    },
  };
}

const starterBookSources: StarterBookSource[] = [
  cognitiveAwakeningSource,
  principlesSource,
  poorCharliesSource,
];

export const starterBooks = starterBookSources.map(adaptStarterBook);

export const starterBooksById = Object.fromEntries(
  starterBooks.map((book) => [book.id, book])
) as Record<string, StarterBookData>;

export async function loadStarterBook(id: string): Promise<StarterBookData> {
  const fallback = starterBooksById[id];
  if (!fallback) throw new Error("未找到示例书");

  const manifestResponse = await fetch("/starter-books/manifest.json", { cache: "force-cache" });
  if (!manifestResponse.ok) throw new Error("示例内容清单暂不可用");
  const manifest = await manifestResponse.json() as {
    schemaVersion?: number;
    books?: Array<{ id: string; contentVersion: string; packageUrl: string }>;
  };
  const manifestBook = manifest.schemaVersion === 1
    ? manifest.books?.find((book) => book.id === id)
    : undefined;
  if (!manifestBook?.packageUrl) throw new Error("未找到示例内容包");

  const response = await fetch(manifestBook.packageUrl, { cache: "force-cache" });
  if (!response.ok) throw new Error("示例内容包暂不可用");
  const pack = await response.json() as {
    schemaVersion?: number;
    book?: { id?: string; contentVersion?: string };
    contentVersion?: string;
    analysis?: StarterBookData["analysis"];
    evidence?: Record<string, CardEvidence>;
    posterContent?: PosterContent;
    practiceRounds?: StarterBookData["practiceRounds"];
    feynman?: { magazine?: string; swiss?: string };
    contentOriginLabel?: "内容来自网络";
  };

  if (
    pack.schemaVersion !== 1 ||
    pack.book?.id !== id ||
    pack.book.contentVersion !== manifestBook.contentVersion ||
    !pack.analysis?.summary ||
    !pack.analysis.readingGuide ||
    !pack.analysis.viewMap ||
    !pack.analysis.actionExtraction ||
    !pack.analysis.viewValidation ||
    !pack.analysis.ideaSourceTracing ||
    !pack.analysis.originalReadingValue ||
    !pack.analysis.workspaceQuote ||
    !pack.posterContent ||
    !pack.evidence ||
    !pack.practiceRounds ||
    !pack.feynman?.magazine ||
    !pack.feynman.swiss ||
    Object.values(pack.practiceRounds).some((round) => round.scenarios?.length !== 3)
  ) {
    throw new Error("示例内容包不完整");
  }

  if (pack.contentVersion !== manifestBook.contentVersion) {
    throw new Error("示例内容包版本不匹配");
  }

  return {
    ...fallback,
    contentVersion: pack.contentVersion,
    analysis: pack.analysis,
    cardEvidence: pack.evidence,
    posterContent: pack.posterContent,
    practiceRounds: pack.practiceRounds,
    contentOriginLabel: pack.contentOriginLabel || fallback.contentOriginLabel,
  };
}
