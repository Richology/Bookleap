import assert from "node:assert/strict";
import test from "node:test";

import { buildCardEvidence } from "./cardEvidence.mjs";

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
