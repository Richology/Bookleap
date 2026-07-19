import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardEvidence,
  buildCardEvidenceFromContent,
} from "./cardEvidence.mjs";

const context = {
  evidenceBriefs: [
    {
      sourceId: "S1",
      chapterIndex: 1,
      chapterTitle: "第一章",
      position: "opening",
      preview:
        "前文说明问题背景。真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。后文继续展开这一判断。",
      quoteCandidates: [
        "真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。",
      ],
    },
    {
      sourceId: "S2",
      chapterIndex: 8,
      chapterTitle: "第八章",
      position: "middle",
      preview:
        "作者反复强调，好的方法必须能在压力场景下被使用，而不是只在安静时显得正确。随后给出行动检验方式。",
      quoteCandidates: [
        "作者反复强调，好的方法必须能在压力场景下被使用，而不是只在安静时显得正确。",
      ],
    },
  ],
};

const contextWithCopyright = {
  evidenceBriefs: [
    {
      sourceId: "S1",
      chapterIndex: 1,
      chapterTitle: "版权页",
      position: "full",
      preview:
        "图书在版编目(CIP)数据 物种起源/(英)达尔文著；舒德干等译。北京：北京大学出版社，ISBN 978-7-301-09558-4。",
      quoteCandidates: ["图书在版编目(CIP)数据 物种起源/(英)达尔文著；"],
    },
    {
      sourceId: "S2",
      chapterIndex: 3,
      chapterTitle: "导言",
      position: "middle",
      preview:
        "阅读这本书时，真正应该关注的是达尔文如何在证据不足的地方保持推理克制，并逐步建立解释框架。",
      quoteCandidates: [
        "真正应该关注的是达尔文如何在证据不足的地方保持推理克制，并逐步建立解释框架。",
      ],
    },
  ],
};

test("builds fallback card evidence from evidence briefs", () => {
  const evidence = buildCardEvidence({
    cardKey: "viewMap",
    cardLabel: "观点地图",
    context,
  });

  assert.equal(evidence.cardKey, "viewMap");
  assert.equal(evidence.claims.length, 2);
  assert.equal(evidence.claims[0].sourceIds[0], "S1");
  assert.equal(evidence.claims[0].supportLevel, "direct");
  assert.match(evidence.claims[0].excerpts[0].quote, /真正重要的能力/);
});

test("keeps model quote only when it matches a source candidate", () => {
  const evidence = buildCardEvidence({
    cardKey: "viewMap",
    cardLabel: "观点地图",
    context,
    claims: [
      {
        id: "claim-1",
        claim: "复杂环境中的判断力更重要",
        sourceIds: ["S1"],
        explanation: "这条判断直接来自第一章。",
        excerpts: [
          {
            sourceId: "S1",
            quote: "真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。",
          },
        ],
      },
    ],
  });

  assert.equal(evidence.claims.length, 1);
  assert.equal(evidence.claims[0].id, "claim-1");
  assert.equal(evidence.claims[0].supportLevel, "direct");
  assert.equal(
    evidence.claims[0].excerpts[0].quote,
    "真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。"
  );
});

test("replaces invented model quotes with verified candidates", () => {
  const evidence = buildCardEvidence({
    cardKey: "viewMap",
    cardLabel: "观点地图",
    context,
    claims: [
      {
        claim: "不能被原文逐字证明的判断",
        sourceIds: ["S2"],
        excerpts: [
          {
            sourceId: "S2",
            quote: "这是一句模型编造的原文。",
          },
        ],
      },
    ],
  });

  assert.equal(evidence.claims.length, 1);
  assert.notEqual(evidence.claims[0].excerpts[0].quote, "这是一句模型编造的原文。");
  assert.match(evidence.claims[0].excerpts[0].quote, /好的方法必须能在压力场景下被使用/);
});

test("keeps excerpt context adjacent to the verified quote", () => {
  const evidence = buildCardEvidence({
    cardKey: "viewMap",
    cardLabel: "观点地图",
    context,
    claims: [
      {
        claim: "复杂环境中的判断力更重要",
        sourceIds: ["S1"],
      },
    ],
  });
  const excerpt = evidence.claims[0].excerpts[0];

  assert.match(excerpt.before, /前文说明问题背景/);
  assert.match(excerpt.quote, /真正重要的能力/);
  assert.match(excerpt.after, /后文继续展开这一判断/);
});

test("drops claims whose source ids are not in context", () => {
  const evidence = buildCardEvidence({
    cardKey: "viewMap",
    cardLabel: "观点地图",
    context,
    claims: [
      {
        claim: "无效来源",
        sourceIds: ["S404"],
      },
    ],
  });

  assert.equal(evidence.claims.length, 2);
  assert.equal(evidence.claims[0].sourceIds[0], "S1");
});

test("can reject invalid structured claims without falling back", () => {
  const evidence = buildCardEvidence({
    cardKey: "viewMap",
    cardLabel: "观点地图",
    context,
    claims: [
      {
        claim: "无效来源",
        sourceIds: ["S404"],
      },
    ],
    allowFallback: false,
  });

  assert.equal(evidence, null);
});

test("does not use copyright metadata as card evidence", () => {
  const evidence = buildCardEvidence({
    cardKey: "readingGuide",
    cardLabel: "阅读指南",
    context: contextWithCopyright,
    claims: [
      {
        claim: "阅读指南的核心判断",
        sourceIds: ["S1"],
      },
    ],
  });

  assert.equal(evidence.claims.length, 1);
  assert.equal(evidence.claims[0].sourceIds[0], "S2");
  assert.match(evidence.claims[0].excerpts[0].quote, /达尔文如何/);
});

test("derives claim evidence from generated card content", () => {
  const evidence = buildCardEvidenceFromContent({
    cardKey: "readingGuide",
    cardLabel: "阅读指南",
    content:
      "## 阅读指南\n真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。\n\n作者还提醒，好的方法必须能在压力场景下被使用。",
    context,
  });

  assert.equal(evidence.claims.length >= 1, true);
  assert.match(evidence.claims[0].claim, /真正重要的能力/);
  assert.equal(evidence.claims[0].sourceIds[0], "S1");
});

test("does not fabricate content-derived evidence when no source matches", () => {
  const evidence = buildCardEvidenceFromContent({
    cardKey: "readingGuide",
    cardLabel: "阅读指南",
    content: "这张卡讨论的是完全没有出现在样本里的陌生概念和无关行动建议。",
    context,
  });

  assert.equal(evidence, null);
});
