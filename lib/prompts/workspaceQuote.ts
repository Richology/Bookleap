export function WORKSPACE_QUOTE_PROMPT(
  title: string,
  bookSummary: string,
  context: string
): string {
  return `
你是一位擅长提炼书籍金句的中文编辑。

请基于以下内容，为这本书提炼一句适合显示在 Workspace 首页卡片上的金句。

要求：
1. 只输出一句中文，不要标题，不要解释，不要 Markdown，不要引号
2. 长度控制在 18-36 个中文字符之间
3. 语气要像“可被记住的一句话”，有力量，但不要鸡汤
4. 必须忠于这本书的核心观点，不能编造书里没有的意思
5. 尽量避免过于抽象、空泛的大词

书名：
${title}

全书摘要：
${bookSummary || "暂无全书摘要"}

章节内容参考：
${context}
`;
}
