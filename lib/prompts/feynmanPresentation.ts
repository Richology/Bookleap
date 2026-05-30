import type { FeynmanCardsInput, GuizangPptStyle } from "@/lib/feynmanExport/types";

const MAX_PROMPT_CARD_TEXT_LENGTH = 9000;

export function FEYNMAN_PRESENTATION_PROMPT(
  bookTitle: string,
  author: string,
  cards: FeynmanCardsInput,
  style: GuizangPptStyle
): string {
  const payload = JSON.stringify(cards, null, 2).slice(0, MAX_PROMPT_CARD_TEXT_LENGTH);
  const styleGuidance =
    style === "swiss"
      ? [
          "已选择 Guizang PPT Skill 的 Style B：瑞士国际主义。",
          "写法要冷静、结构化、方法论感强，适合事实、模型、判断、行动建议。",
          "多生成 method / list / idea / case 类型页面，正文可以自然拆成 2-4 个短要点。",
          "layout 只能从 S03、S08、S09、S10、S11、S14、S15、S16、S17、S19 中选择，并且 8-12 页至少使用 5 种不同 layout。",
          "layout 用法：S03=一句核心判断或金句；S08/S09=对比、转折、现实场景；S10/S19=单个观点深讲；S11=递进步骤或时间线；S14/S17=模型、层级、系统关系；S15/S16=清单、方法、多个要点。",
        ].join("\n")
      : [
          "已选择 Guizang PPT Skill 的 Style A：电子杂志 × 电子墨水。",
          "写法要有叙事感、阅读感和观点节奏，适合人文、故事、洞察和讲述。",
          "多生成 problem / quote / idea / case / summary 类型页面，标题要像一篇讲书文章的小标题。",
          "layout 只能从 hero、divider、statement、two-column、grid、pipeline、quote、comparison、mixed 中选择，并且 8-12 页至少使用 5 种不同 layout。",
          "layout 用法：statement/quote=观点或金句；two-column/comparison=观点与解释、前后对比；grid=多个要点；pipeline=步骤或方法；mixed=案例讲述；divider=章节转场。",
        ].join("\n");

  return `你是一个“书籍内容演示设计师”，负责将书跃解析的内容生成一份可直接演示的 HTML PPT 讲书稿。

书名：${bookTitle}
作者：${author || "未知"}

6 张解析卡片：
${payload}

视觉系统：
${styleGuidance}

要求如下：

1. PPT 页面结构：
   - 每页对应一个逻辑主题或模块
   - 页面必须包含标题和主要讲解文本
   - 可以包含可选案例或提示

2. 内容来源：
   - 可以直接引用书跃的 6 张解析卡片的 title + explanation
   - 可以生成全新的讲解文本、拓展案例或总结
   - 每页文本可综合引用卡片和新生成内容，但必须保证通俗易懂、逻辑清晰

3. 讲解风格：
   - 大白话、易理解
   - 强调关键方法、核心理念、行动建议
   - 每页内容 80-150 字左右
   - 保证每页内容完整，适合单页演示

4. 逻辑流：
   - PPT 页面顺序要自然衔接
   - 可适当分段展示核心观点、方法模型、案例、总结等
   - 建议总页数 8-12 页，不受限于卡片数量

5. 输出格式：
   - 只输出 JSON，不要 Markdown 代码块，不要解释
   - 必须严格输出如下结构，字段名不能改
   - type 只能从 problem、idea、method、case、list、quote、summary 中选择
   - layout 必须从上面的 Guizang layout 列表中选择

{
  "slides": [
    {
      "type": "problem",
      "layout": "${style === "swiss" ? "S08" : "two-column"}",
      "title": "页面标题",
      "content": "讲解文本，可引用卡片或新生成内容",
      "example": "可选案例或提示"
    }
  ]
}

6. 生成目标：
   - 每页内容既可调用卡片，也可生成新文本
   - 输出内容可直接渲染到 Guizang HTML PPT 模板
   - 确保内容风格、结构和可读性稳定
   - 不同页面要有明确类型：开场问题、核心观点、方法模型、案例场景、清单步骤、金句判断、总结收束要交替出现

数量要求：slides 8-12 页。`;
}
