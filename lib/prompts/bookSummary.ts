export function BOOK_SUMMARY_PROMPT(
  title: string,
  analysisContext: string
): string {
  return `
你是一位严谨的阅读分析专家。

请根据下面提供的全书结构、抽样章节摘要和依据提示，生成一本书的全书摘要。

要求：
1. 使用中文
2. 控制在 200-300 字
3. 提炼整本书最核心的问题、主要观点和整体方向
4. 不要逐章复述
5. 输出像知识笔记，不像聊天回答
6. 不要写空话套话
7. 不要输出行动建议、阅读建议或批判意见

书名：
${title}

分析上下文：
${analysisContext}
`;
}
