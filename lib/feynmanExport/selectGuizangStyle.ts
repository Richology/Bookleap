import type { FeynmanCardsInput, GuizangPptStyle } from "./types";

export function selectGuizangPptStyle({
  bookTitle,
  cards,
}: {
  bookTitle: string;
  cards: FeynmanCardsInput;
}): GuizangPptStyle {
  const text = `${bookTitle}\n${Object.values(cards).join("\n")}`;
  const swissScore = [
    /商业|管理|策略|投资|决策|方法|模型|系统|原则|框架|效率|产品|科技|AI|人工智能|工程|数据|心理学|经济|组织|增长/,
    /步骤|清单|工具|执行|路径|流程|指标|KPI|复盘|训练/,
  ].reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
  const magazineScore = [
    /文学|小说|历史|传记|哲学|文化|艺术|故事|人文|写作|生活|旅行|社会|情感|关系/,
    /作者|叙事|人物|时代|阅读|精神|意义/,
  ].reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);

  return swissScore >= magazineScore ? "swiss" : "magazine";
}

export function getGuizangStyleLabel(style: GuizangPptStyle): string {
  return style === "swiss" ? "瑞士国际主义" : "电子杂志 × 电子墨水";
}

export function getGuizangStyleDescription(style: GuizangPptStyle): string {
  return style === "swiss"
    ? "无衬线网格、克莱因蓝高反差、方法论和结构表达更强，适合模型、决策、商业和科技类书籍。"
    : "衬线标题、流体背景和杂志式节奏更强，适合人文、历史、传记、文学和叙事类书籍。";
}
