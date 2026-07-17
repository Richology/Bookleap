import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

async function loadPromptModule(filename) {
  const filePath = path.join(process.cwd(), "lib/prompts", filename);
  const source = await fs.readFile(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const promptModule = { exports: {} };
  const context = vm.createContext({
    exports: promptModule.exports,
    module: promptModule,
  });

  vm.runInContext(outputText, context, { filename: filePath });

  return promptModule.exports;
}

function assertContains(text, values) {
  values.forEach((value) => {
    assert.match(text, value instanceof RegExp ? value : new RegExp(value));
  });
}

test("book summary prompt keeps summary-only contract", async () => {
  const { BOOK_SUMMARY_PROMPT } = await loadPromptModule("bookSummary.ts");
  const prompt = BOOK_SUMMARY_PROMPT("测试书", "测试上下文");

  assertContains(prompt, [
    /最核心的问题、主要观点和整体方向/,
    /不要逐章复述/,
    /不要输出行动建议、阅读建议或批判意见/,
  ]);
});

test("reading guide prompt keeps required sections and boundaries", async () => {
  const { READING_GUIDE_PROMPT } = await loadPromptModule("readingGuide.ts");
  const prompt = READING_GUIDE_PROMPT("测试书", "全书摘要", "分析上下文");

  assertContains(prompt, [
    /## 阅读定位/,
    /## 阅读三问/,
    /## 阅读路径/,
    /## 重点章节/,
    /## 当代意义/,
    /不要把「阅读定位」写成全书摘要/,
    /不要使用行内 Markdown 加粗语法/,
  ]);
});

test("view map prompt keeps structure and excludes noise/action advice", async () => {
  const { VIEW_MAP_PROMPT } = await loadPromptModule("viewMap.ts");
  const prompt = VIEW_MAP_PROMPT("测试书", "全书摘要", "分析上下文");

  assertContains(prompt, [
    /## 中心观点/,
    /## 关键观点/,
    /## 观点关系/,
    /## 关键依据/,
    /## 结构判断/,
    /不要输出行动建议/,
    /不要包含「信息噪声」/,
  ]);
});

test("action extraction prompt keeps trigger-condition contract", async () => {
  const { ACTION_EXTRACTION_PROMPT } = await loadPromptModule("actionExtraction.ts");
  const prompt = ACTION_EXTRACTION_PROMPT("测试书", "全书摘要", "分析上下文");

  assertContains(prompt, [
    /## 核心原则/,
    /## 可执行行动/,
    /## 触发条件/,
    /## 适用场景/,
    /每条都以"当你\.\.\."开头/,
    /不要重复观点地图里的观点结构/,
  ]);
});

test("critical examination prompt keeps noise and boundary sections", async () => {
  const { CRITICAL_EXAMINATION_PROMPT } = await loadPromptModule("criticalExamination.ts");
  const prompt = CRITICAL_EXAMINATION_PROMPT("测试书", "全书摘要", "分析上下文");

  assertContains(prompt, [
    /## 核心观点复述/,
    /## 可能存在的问题/,
    /## 信息噪声/,
    /## 反例或不同视角/,
    /## 适用边界/,
    /### 适用场景/,
    /### 不适用场景/,
    /不要输出行动建议/,
  ]);
});

test("idea source prompt keeps current product headings and exact quote constraints", async () => {
  const { IDEA_SOURCE_TRACING_PROMPT } = await loadPromptModule("ideaSourceTracing.ts");
  const prompt = IDEA_SOURCE_TRACING_PROMPT(
    "测试书",
    "全书摘要",
    "观点地图",
    "分析上下文"
  );

  assertContains(prompt, [
    /## 核心思想来源/,
    /## 思想来源拆解/,
    /## 作者处理方式/,
    /## 原创程度判断/,
    /## 原文金句/,
    /## 总结/,
    /金句只能从「原文金句候选」中逐字选择/,
    /必须逐字复制候选句/,
    /如果候选不足 5 条，就少给/,
  ]);
  assert.doesNotMatch(prompt, /## 关键思想谱系/);
  assert.doesNotMatch(prompt, /## 可能来源/);
});

test("original reading value prompt keeps single five-level recommendation contract", async () => {
  const { ORIGINAL_READING_VALUE_PROMPT } = await loadPromptModule("originalReadingValue.ts");
  const prompt = ORIGINAL_READING_VALUE_PROMPT(
    "测试书",
    "全书摘要",
    "阅读指南",
    "分析上下文"
  );

  assertContains(prompt, [
    /你必须从下面 5 档中选择且只选择一档/,
    /第一行：\*\*阅读原书建议：五档之一\*\*/,
    /除第一行外，不要再次使用/,
  ]);
});
