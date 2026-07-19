import { generateWithOllama } from "@/lib/ollama";

type GenerateCardEvidenceClaimsInput = {
  title: string;
  cardLabel: string;
  cardContent: string;
  analysisContext: string;
  maxClaims?: number;
};

function stripCodeFence(value: string) {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonArray(value: string) {
  const clean = stripCodeFence(value);
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start < 0 || end <= start) return "";
  return clean.slice(start, end + 1);
}

function normalizeClaims(value: unknown, maxClaims: number): unknown[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const claim = typeof record.claim === "string" ? record.claim.trim() : "";
      const sourceIds = Array.isArray(record.sourceIds)
        ? record.sourceIds.filter((sourceId): sourceId is string => typeof sourceId === "string")
        : [];
      const explanation =
        typeof record.explanation === "string" ? record.explanation.trim() : "";
      const excerpts = Array.isArray(record.excerpts) ? record.excerpts : [];

      if (!claim || sourceIds.length === 0) return null;

      return {
        claim,
        sourceIds: sourceIds.slice(0, 3),
        explanation,
        excerpts,
      };
    })
    .filter(Boolean)
    .slice(0, maxClaims);
}

export async function generateCardEvidenceClaims({
  title,
  cardLabel,
  cardContent,
  analysisContext,
  maxClaims = 4,
}: GenerateCardEvidenceClaimsInput): Promise<unknown[]> {
  if (!cardContent.trim() || !analysisContext.includes("## 证据片段索引")) return [];

  const prompt = `
你是严谨的原文依据标注器。请为一张拆书卡片生成结构化 CardEvidence claims。

硬性规则：
1. 只能依据「分析上下文」里的 [S1]、[S2] 这类证据片段编号。
2. sourceIds 必须来自分析上下文，不得发明编号。
3. excerpts.quote 如果填写，必须逐字复制分析上下文里的原文候选或依据预览片段；不能改写、概括或补全。
4. 如果某条卡片判断找不到可靠 sourceId，就不要输出这条 claim。
5. 最多输出 ${maxClaims} 条。
6. 只输出 JSON 数组，不要 Markdown，不要解释。

JSON 格式：
[
  {
    "claim": "卡片中的一个具体判断",
    "sourceIds": ["S1"],
    "explanation": "为什么这些原文能支撑该判断",
    "excerpts": [
      { "sourceId": "S1", "quote": "可选，必须逐字来自原文候选或依据预览" }
    ]
  }
]

书名：
${title}

卡片名称：
${cardLabel}

卡片正文：
${cardContent}

分析上下文：
${analysisContext}
`;

  try {
    const result = await generateWithOllama(prompt);
    const json = extractJsonArray(result);
    if (!json) return [];
    return normalizeClaims(JSON.parse(json), maxClaims);
  } catch (error) {
    console.error("结构化原文依据生成失败:", error);
    return [];
  }
}
