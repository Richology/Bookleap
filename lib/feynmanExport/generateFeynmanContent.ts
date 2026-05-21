import { generateWithLLM } from "@/lib/llm";
import { FEYNMAN_PRESENTATION_PROMPT } from "@/lib/prompts/feynmanPresentation";
import type {
  FeynmanCardsInput,
  FeynmanDecisionExerciseInput,
  FeynmanHtmlContent,
  FeynmanTemplateChoice,
} from "./types";

function compactText(value: string, maxLength = 900): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function firstSentence(value: string, maxLength = 150): string {
  const text = compactText(value, maxLength * 2);
  const match = text.match(/^(.{24,}?[。！？!?])/);
  return (match?.[1] ?? text.slice(0, maxLength)).trim();
}

function extractNamedItems(value: string, count: number): Array<{ title: string; body: string }> {
  const lines = value
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\s*[-*+]\s*/, "")
        .replace(/^\s*\d+[.)、]\s*/, "")
        .trim()
    )
    .filter((line) => line.length >= 8);

  const items: Array<{ title: string; body: string }> = [];
  for (const line of lines) {
    const split = line.split(/[：:]/);
    const title = (split.length > 1 ? split[0] : line.slice(0, 18)).trim();
    const body = (split.length > 1 ? split.slice(1).join("：") : line).trim();
    if (title && body && !items.some((item) => item.title === title)) {
      items.push({ title: title.slice(0, 28), body: compactText(body, 220) });
    }
    if (items.length >= count) break;
  }

  return items;
}

function extractJsonObject(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new Error("模型未返回 JSON 对象");
  }
  return JSON.parse(objectMatch[0]);
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePresentationSlides(value: unknown, fallback: FeynmanHtmlContent["presentationSlides"]) {
  if (!Array.isArray(value)) return fallback;

  const slides = value
    .map((item) => {
      const record = item as {
        title?: unknown;
        body?: unknown;
        content?: unknown;
        note?: unknown;
        example?: unknown;
        sourceCardTitle?: unknown;
      };

      return {
        title: asText(record.title, ""),
        body: asText(record.body, asText(record.content, "")),
        note: asText(record.note, asText(record.example, "")),
        sourceCardTitle: asText(record.sourceCardTitle, ""),
      };
    })
    .filter((item) => item.title && item.body)
    .slice(0, 12);

  return slides.length >= 4 ? slides : fallback;
}

function normalizeContent(
  value: unknown,
  fallback: FeynmanHtmlContent
): FeynmanHtmlContent {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<FeynmanHtmlContent>;

  const coreIdeas = Array.isArray(candidate.coreIdeas)
    ? candidate.coreIdeas
        .map((item) => ({
          title: asText((item as { title?: unknown })?.title, ""),
          explanation: asText((item as { explanation?: unknown })?.explanation, ""),
        }))
        .filter((item) => item.title && item.explanation)
        .slice(0, 5)
    : fallback.coreIdeas;

  const keyModels = Array.isArray(candidate.keyModels)
    ? candidate.keyModels
        .map((item) => ({
          name: asText((item as { name?: unknown })?.name, ""),
          description: asText((item as { description?: unknown })?.description, ""),
        }))
        .filter((item) => item.name && item.description)
        .slice(0, 5)
    : fallback.keyModels;

  const examples = Array.isArray(candidate.examples)
    ? candidate.examples
        .map((item) => ({
          scenario: asText((item as { scenario?: unknown })?.scenario, ""),
          insight: asText((item as { insight?: unknown })?.insight, ""),
        }))
        .filter((item) => item.scenario && item.insight)
        .slice(0, 4)
    : fallback.examples;

  const presentationSlides = normalizePresentationSlides(
    (candidate as { slides?: unknown }).slides ?? candidate.presentationSlides,
    fallback.presentationSlides
  );

  return {
    ...fallback,
    presentationSlides,
    overview: asText(candidate.overview, fallback.overview),
    coreIdeas: coreIdeas.length > 0 ? coreIdeas : fallback.coreIdeas,
    methodsSummary: asText(candidate.methodsSummary, fallback.methodsSummary),
    keyModels: keyModels.length > 0 ? keyModels : fallback.keyModels,
    examples: examples.length > 0 ? examples : fallback.examples,
    finalTakeaway: asText(candidate.finalTakeaway, fallback.finalTakeaway),
  };
}

export function buildFallbackFeynmanContent({
  bookTitle,
  author,
  coverImageUrl,
  cards,
  decisionExercises,
}: {
  bookTitle: string;
  author: string;
  coverImageUrl?: string;
  cards: FeynmanCardsInput;
  decisionExercises?: FeynmanDecisionExerciseInput[];
}): FeynmanHtmlContent {
  const coreIdeas = extractNamedItems(`${cards.readingGuide}\n${cards.viewMap}`, 4).map((item) => ({
    title: item.title,
    explanation: item.body,
  }));
  const keyModels = extractNamedItems(`${cards.models}\n${cards.actionPrinciples}`, 4).map((item) => ({
    name: item.title,
    description: item.body,
  }));
  const examples = extractNamedItems(`${cards.insights}\n${cards.actionPrinciples}`, 3).map((item) => ({
    scenario: item.title,
    insight: item.body,
  }));
  const fallbackOverview =
    firstSentence(cards.summary, 260) ||
    "这本书的价值，不在于记住几个概念，而是帮你把一个复杂问题讲清楚，并在真实选择里用起来。";
  const fallbackMethods =
    firstSentence(cards.actionPrinciples, 240) ||
    "这本书的方法可以概括成三步：先把问题说清楚，再找到背后的判断模型，最后把模型放进具体场景里验证。";
  const fallbackTakeaway =
    firstSentence(cards.insights, 140) ||
    "读完这本书之后，最重要的不是多记一个观点，而是多一种能在现实里反复使用的判断方式。";

  return {
    bookTitle,
    author,
    coverImageUrl,
    presentationSlides: [
      {
        title: "这本书到底在解决什么问题",
        body: fallbackOverview,
        note: "先把问题讲清楚，听众才知道后面的观点为什么重要。",
        sourceCardTitle: "内容综述",
      },
      {
        title: "先用一句话讲明白",
        body: firstSentence(cards.readingGuide, 150) || "如果只能带走一个判断，就先抓住这本书反复提醒你的那个底层问题。",
        note: "这一页负责把听众带进主题。",
        sourceCardTitle: "阅读指南",
      },
      {
        title: "核心观点怎么落到判断里",
        body: firstSentence(cards.viewMap, 150) || "真正有用的观点，不是漂亮句子，而是能帮你在现实里做区分和取舍。",
        note: "",
        sourceCardTitle: "观点地图",
      },
      {
        title: "读完以后可以怎么做",
        body: fallbackMethods,
        note: "把书里的观点转成下一次选择前可以使用的动作。",
        sourceCardTitle: "行动提炼",
      },
      {
        title: "把概念变成模型",
        body: firstSentence(cards.models, 150) || "模型的作用是让你下次遇到相似问题时，不必重新从零开始思考。",
        note: "",
        sourceCardTitle: "模型拆解",
      },
      {
        title: "放进真实场景里检验",
        body: firstSentence(cards.insights, 150) || "如果一个观点讲得通，也要能放进工作、关系或选择里经得住检验。",
        note: "",
        sourceCardTitle: "观点校验",
      },
      {
        title: "最后带走什么",
        body: fallbackTakeaway,
        note: "这一页收束成一个可以复述给别人的结论。",
        sourceCardTitle: "思想溯源",
      },
    ],
    overview: fallbackOverview,
    coreIdeas:
      coreIdeas.length > 0
        ? coreIdeas
        : [
            {
              title: "先抓住主问题",
              explanation: firstSentence(cards.readingGuide, 180) || "先问这本书到底想解决什么问题，再去看每个章节和观点的位置。",
            },
            {
              title: "把观点变成判断",
              explanation: firstSentence(cards.viewMap, 180) || "真正有用的观点，不是漂亮句子，而是能帮你在现实里做区分和取舍。",
            },
            {
              title: "用行动检验理解",
              explanation: firstSentence(cards.actionPrinciples, 180) || "如果一个观点不能改变你的下一步行动，它大概率还停留在概念层。",
            },
          ],
    methodsSummary: fallbackMethods,
    keyModels:
      keyModels.length > 0
        ? keyModels
        : [
            {
              name: "问题复述",
              description: "先用自己的话复述问题，确认你理解的不是名词，而是这个问题在现实中造成的具体困扰。",
            },
            {
              name: "因果链",
              description: "把观点拆成原因、机制和结果，看看中间哪一环最容易被忽略。",
            },
            {
              name: "行动闭环",
              description: "为每个重要观点配一个可执行动作，用结果反过来检查理解是否可靠。",
            },
          ],
    examples:
      examples.length > 0
        ? examples
        : [
            {
              scenario: "做一个重要选择前",
              insight: "不要急着问哪个选项更好，先问自己正在用什么标准判断好坏。",
            },
            {
              scenario: "读到一个很有冲击力的观点时",
              insight: "先不要收藏，试着解释给别人听。如果解释不顺，说明还没有真正内化。",
            },
          ],
    finalTakeaway: fallbackTakeaway,
    decisionExercises,
  };
}

export async function generateFeynmanContent({
  bookTitle,
  author,
  coverImageUrl,
  cards,
  decisionExercises,
  template,
}: {
  bookTitle: string;
  author: string;
  coverImageUrl?: string;
  cards: FeynmanCardsInput;
  decisionExercises?: FeynmanDecisionExerciseInput[];
  template?: FeynmanTemplateChoice;
}): Promise<FeynmanHtmlContent> {
  const fallback = buildFallbackFeynmanContent({
    bookTitle,
    author,
    coverImageUrl,
    cards,
    decisionExercises,
  });

  try {
    const raw = await generateWithLLM(FEYNMAN_PRESENTATION_PROMPT(bookTitle, author, cards, template));
    const parsed = extractJsonObject(raw);
    return {
      ...normalizeContent(parsed, fallback),
      bookTitle,
      author,
      coverImageUrl,
      decisionExercises,
    };
  } catch (error) {
    console.error("[feynman-export] 内容生成失败，使用规则兜底:", error);
    return fallback;
  }
}
