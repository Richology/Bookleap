import type { FeynmanCardsInput } from "@/lib/feynmanExport/types";

const MAX_PROMPT_CARD_TEXT_LENGTH = 9000;

export function FEYNMAN_PRESENTATION_PROMPT(
  bookTitle: string,
  author: string,
  cards: FeynmanCardsInput
): string {
  const payload = JSON.stringify(cards, null, 2).slice(0, MAX_PROMPT_CARD_TEXT_LENGTH);

  return `你是一个“书籍内容演示设计师”，负责将书跃解析的内容生成一个演示型 PPT。

书名：${bookTitle}
作者：${author || "未知"}

6 张解析卡片：
${payload}

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

{
  "slides": [
    {
      "title": "页面标题",
      "content": "讲解文本，可引用卡片或新生成内容",
      "example": "可选案例或提示"
    }
  ]
}

6. 生成目标：
   - 每页内容既可调用卡片，也可生成新文本
   - 输出内容可直接渲染到 HTML PPT 模板
   - 确保内容风格、结构和可读性稳定

数量要求：slides 8-12 页。`;
}
