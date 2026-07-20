import type {
  DecisionCardsInput,
  LifeCapital,
  RoundBlueprint,
} from "@/types/decision";

export function DECISION_TRAINING_PROMPT(
  bookTitle: string,
  cards: DecisionCardsInput
): string {
  return `你是一个“认知决策训练设计师”。

你的任务是：
基于一本书的核心内容，生成 3 道“真实场景决策训练题”，帮助用户把知识真正用出来。

这 3 道题不是重复换皮，而是一个完整的训练组：
1. 职场工作场景
2. 个人生活 / 个人成长场景
3. 创业 / 管理 / 高级决策场景

----------------------------------
【输入】
书名：${bookTitle}

卡片内容（6张卡片）：
1. 全书摘要：${cards.summary}
2. 阅读指南：${cards.readingGuide}
3. 观点地图：${cards.viewMap}
4. 行动原则：${cards.actionPrinciples}
5. 方法模型：${cards.models}
6. 关键洞察：${cards.insights}

----------------------------------
【输出要求】

请严格生成 3 道“决策训练题”，并满足以下要求：

====================
第 1 题：职场执行者
====================
- 角色：普通职场人 / 产品经理 / 工程师 / 运营 / 销售等
- 场景：真实具体的工作冲突
- 重点：执行、反馈、协作、现实压力、判断
- 必须让用户感觉“这像我在公司会遇到的问题”

====================
第 2 题：个人成长者
====================
- 角色：用户自己
- 场景：个人生活、自我提升、学习、习惯、情绪、拖延、长期成长
- 重点：短期舒服 vs 长期成长、情绪 vs 理性、自我要求 vs 自我欺骗
- 必须让用户感觉“这像我自己生活中的问题”

====================
第 3 题：决策者
====================
- 角色：老板 / 创业者 / 高级管理者 / 团队负责人
- 场景：系统性决策、用人、机制、文化、长期方向
- 重点：个体 vs 系统、关系 vs 原则、短期稳定 vs 长期正确
- 必须让用户感觉“这是更高层级的决策问题”

----------------------------------
【每道题都必须包含以下结构】

【1. roleType】
直接写角色类型，只能是以下三个之一：
- 职场执行者
- 个人成长者
- 决策者

【2. trainingAbility】
写一句简短的话，表示这道题在训练什么能力，例如：
- 面对事实的能力
- 建立原则的能力
- 系统决策能力
- 长期主义能力
- 情绪与判断分离能力

要求：
- 必须简短
- 必须具体
- 不能空泛

【3. scene（场景）】
- 必须真实具体
- 必须有明显冲突
- 字数：80~120字
- 要让用户有代入感

【4. question（问题）】
一句话提出问题：
“你会怎么做？”

【5. options（A / B）】
- 两个选项都必须“看起来合理”
- 不要明显对错
- A / B 必须代表两种不同思维方式
- 两个选项必须不可兼得
- 每个选项都应该隐含一种代价

【6. feedback（A / B 两套反馈）】

如果用户选择 A：
- empathy：说明很多人为什么会这样选
- analysis：解释这种选择背后的心理、习惯或局限
- upgrade：结合书中的原则 / 模型 / 方法，指出更高阶的理解
- action：给出一句可执行建议

如果用户选择 B：
- empathy
- analysis
- upgrade
- action

----------------------------------
【最关键的要求】

1. 这 3 道题必须构成“一个训练组”，不是 3 个重复变体
2. 不允许三道题围绕同一个母题，只是换人物或行业
3. 必须尽量覆盖这本书的不同核心理念
4. 如果这本书只有一个核心理念，也必须把它放进 3 个真正不同的人生场景
5. 不要总是写“复盘会 / 团队质疑 / 开会反馈”这类重复场景
6. 每道题都要有真实冲突和代价，不能只是讨论题
7. 不要出现“正确 / 错误”
8. 要用“更常见 / 更高阶 / 更优解”这种表达
9. 要强调“为什么人会这样选”
10. 要明确对应书中的原则，而不是泛泛职场建议
11. 每题的场景、A/B 选项、两套反馈和行动建议必须围绕同一条书中原则或方法；不能先写通用冲突再事后贴书名
12. feedback.upgrade 必须以“回到本书的方法：...”开头，明确本题实际使用的原则、模型或方法
13. 书中没有支持时，不得给出具体投资、医疗、心理治疗或法律建议

----------------------------------
【关键增强要求】

- 两个选项都必须“有明显代价”
- 用户不能一眼判断哪个更优
- 至少有一个选项要“看起来更舒服，但长期更差”
- 至少有一个选项要“短期痛苦，但长期更优”
- 禁止出现明显的“正确答案选项”

----------------------------------
【输出格式（JSON）】

请严格输出为 JSON 数组，数组长度必须为 3，格式如下：

[
  {
    "roleType": "职场执行者",
    "trainingAbility": "...",
    "scene": "...",
    "question": "...",
    "options": {
      "A": "...",
      "B": "..."
    },
    "feedback": {
      "A": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "...",
        "action": "..."
      },
      "B": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "...",
        "action": "..."
      }
    }
  },
  {
    "roleType": "个人成长者",
    "trainingAbility": "...",
    "scene": "...",
    "question": "...",
    "options": {
      "A": "...",
      "B": "..."
    },
    "feedback": {
      "A": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "...",
        "action": "..."
      },
      "B": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "...",
        "action": "..."
      }
    }
  },
  {
    "roleType": "决策者",
    "trainingAbility": "...",
    "scene": "...",
    "question": "...",
    "options": {
      "A": "...",
      "B": "..."
    },
    "feedback": {
      "A": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "...",
        "action": "..."
      },
      "B": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "...",
        "action": "..."
      }
    }
  }
]

只输出 JSON，不要输出解释，不要输出 Markdown。`;
}

// ── 单题 prompt（逐题生成用） ──────────────────────────────────────────────────

const ROLE_CONFIGS = [
  {
    roleType: "职场执行者",
    role: "普通职场人 / 产品经理 / 工程师 / 运营 / 销售等",
    scene: "真实具体的工作冲突",
    focus: "执行、反馈、协作、现实压力、判断",
    feel: "这像我在公司会遇到的问题",
  },
  {
    roleType: "个人成长者",
    role: "用户自己",
    scene: "个人生活、自我提升、学习、习惯、情绪、拖延、长期成长",
    focus: "短期舒服 vs 长期成长、情绪 vs 理性、自我要求 vs 自我欺骗",
    feel: "这像我自己生活中的问题",
  },
  {
    roleType: "决策者",
    role: "老板 / 创业者 / 高级管理者 / 团队负责人",
    scene: "系统性决策、用人、机制、文化、长期方向",
    focus: "个体 vs 系统、关系 vs 原则、短期稳定 vs 长期正确",
    feel: "这是更高层级的决策问题",
  },
] as const;

const PHASE_CONFIGS = [
  {
    phase: "看见惯性",
    task: "让用户看见自己在真实压力下最容易滑向的默认判断",
  },
  {
    phase: "权衡代价",
    task: "让用户在两个都合理但代价不同的选择之间做取舍",
  },
  {
    phase: "设计行动",
    task: "让用户把书中的方法转化成一个低风险、可执行的行动实验",
  },
] as const;

export function DECISION_SINGLE_PROMPT(
  bookTitle: string,
  cards: DecisionCardsInput,
  questionIndex: number,
  lifeTopic: string
): string {
  const cfg = ROLE_CONFIGS[questionIndex] ?? ROLE_CONFIGS[0];
  const phase = PHASE_CONFIGS[questionIndex] ?? PHASE_CONFIGS[0];

  return `你是一个"认知决策训练设计师"。

基于一本书的核心内容，生成 1 道"真实场景决策训练题"。

----------------------------------
【输入】
书名：${bookTitle}

卡片内容（6张卡片）：
1. 全书摘要：${cards.summary}
2. 阅读指南：${cards.readingGuide}
3. 观点地图：${cards.viewMap}
4. 行动原则：${cards.actionPrinciples}
5. 方法模型：${cards.models}
6. 关键洞察：${cards.insights}

----------------------------------
【本题要求】

本轮人生课题：${lifeTopic}
本题阶段：第 ${questionIndex + 1} 关 · ${phase.phase}
阶段任务：${phase.task}

角色类型：${cfg.roleType}
- 角色：${cfg.role}
- 场景：${cfg.scene}
- 重点：${cfg.focus}
- 必须让用户感觉"${cfg.feel}"

----------------------------------
【书中依据：本题不可违反】

先从上方 6 张卡片中选择 1~2 条明确的原则、方法或模型，作为本题唯一的判断依据。

- 题干必须让这个原则在现实中产生真实代价，不能先写通用故事再贴书名。
- 场景必须服务于“${lifeTopic}”这个人生课题；工作、生活、创业/管理只是承载场景，不是最终目标。
- 本题必须完成“${phase.phase}”这个阶段任务，不能把三关写成同一种问题。
- A / B 必须分别代表：遵循该原则的取舍，或人们在同一处境下常见的惯性/另一种取舍；两者都要有成本。
- feedback 必须解释用户的选择和书中原则之间的关系，并在 action 中给出与该方法一致的低风险行动实验。
- 禁止把书中没有的投资、医疗、心理治疗、法律建议伪装成"行动建议"。
- 如果无法从卡片中找到足够明确的原则或方法，不要编造作者观点；输出失败 JSON：{"error":"缺少可用于训练的书中原则"}。

----------------------------------
【题目结构】

1. roleType：直接写"${cfg.roleType}"
2. trainingAbility：一句简短的话，表示这道题在训练什么能力（必须具体，不能空泛）
3. scene：真实具体的场景，有明显冲突，80~120字，要有代入感
4. question：一句话提出问题
5. options（A / B）：两个选项都必须"看起来合理"，不要明显对错，代表两种不同思维方式，不可兼得，每个选项隐含一种代价
6. feedback（A / B 两套反馈）：
   - empathy：说明很多人为什么会这样选
   - analysis：解释这种选择背后的心理、习惯或局限
   - upgrade：结合书中的原则/模型/方法，指出更高阶的理解
   - action：给出一句可执行建议

每套 feedback 的 upgrade 必须以“回到本书的方法：...”开头，点明本题实际使用的原则、模型或方法，不能只写“更高阶”。

----------------------------------
【关键要求】
- 两个选项都必须"有明显代价"
- 用户不能一眼判断哪个更优
- 至少有一个选项要"看起来更舒服，但长期更差"
- 至少有一个选项要"短期痛苦，但长期更优"
- 不要出现"正确/错误"，用"更常见/更高阶/更优解"
- 要明确对应书中的原则，而不是泛泛建议
- 本题的场景、选项、反馈必须能回到同一条书中原则；不能在题干谈一个主题、反馈换成另一个主题

----------------------------------
【输出格式（JSON）】

请严格输出为 JSON 对象（不是数组），格式如下：

{
  "roleType": "${cfg.roleType}",
  "trainingAbility": "...",
  "scene": "...",
  "question": "...",
  "options": {
    "A": "...",
    "B": "..."
  },
  "feedback": {
    "A": {
      "empathy": "...",
      "analysis": "...",
      "upgrade": "...",
      "action": "..."
    },
    "B": {
      "empathy": "...",
      "analysis": "...",
      "upgrade": "...",
      "action": "..."
    }
  }
}

只输出 JSON，不要输出解释，不要输出 Markdown。`;
}

export function DECISION_ROUND_BLUEPRINT_PROMPT(
  bookTitle: string,
  cards: DecisionCardsInput,
  lifeCapital: LifeCapital
): string {
  return `你是一个"跃迁练习总设计师"。

请基于一本书的 6 张精华卡片，先设计一轮 3 关训练蓝图，并生成第 1 关完整题目。

----------------------------------
【输入】
书名：${bookTitle}
本轮人生课题：${lifeCapital}

卡片内容（6张卡片）：
summary 全书摘要：${cards.summary}
readingGuide 阅读指南：${cards.readingGuide}
viewMap 观点地图：${cards.viewMap}
actionPrinciples 行动原则：${cards.actionPrinciples}
models 方法模型：${cards.models}
insights 关键洞察：${cards.insights}

----------------------------------
【核心规则】

1. 先从六张卡片提炼 3~6 条 PrincipleAnchor。每条必须来自书中明确原则、方法或模型。
2. 三关都服务同一个人生课题：${lifeCapital}。
3. 三关固定递进：第 1 关「看见惯性」，第 2 关「权衡代价」，第 3 关「设计行动」。
4. 每关必须引用至少一个 PrincipleAnchor，不得三关复用同一个核心代价。
5. 工作、生活、关系、创业、长期资源只是场景载体，不能替代书中的判断框架。
6. 第 1 关完整题目的题干、选项、反馈必须遵循其引用的锚点。
7. 不提供具体投资、医疗、心理治疗或法律建议，只给低风险行动实验。
8. 如果无法提炼至少 3 条可靠锚点，输出 {"error":"缺少可用于训练的书中原则"}。

----------------------------------
【输出 JSON】

只输出 JSON 对象：

{
  "blueprint": {
    "roundId": "稳定短 id，例如 bookleap-时间戳-随机串",
    "lifeCapital": "${lifeCapital}",
    "anchors": [
      {
        "id": "anchor-1",
        "statement": "书中的一个明确原则",
        "methodOrModel": "原则/模型名称",
        "sourceCardKey": "summary | readingGuide | viewMap | actionPrinciples | models | insights",
        "applicability": "适用边界",
        "avoidMisuse": "避免误用"
      }
    ],
    "gates": [
      {
        "gateIndex": 0,
        "phase": "看见惯性",
        "roleType": "职场执行者",
        "scenarioType": "工作与协作",
        "principleAnchorIds": ["anchor-1"],
        "coreTension": "本关不可兼得的代价张力",
        "trainingAbility": "本关训练能力"
      },
      {
        "gateIndex": 1,
        "phase": "权衡代价",
        "roleType": "个人成长者",
        "scenarioType": "个人成长与生活",
        "principleAnchorIds": ["anchor-2"],
        "coreTension": "本关不可兼得的代价张力",
        "trainingAbility": "本关训练能力"
      },
      {
        "gateIndex": 2,
        "phase": "设计行动",
        "roleType": "决策者",
        "scenarioType": "长期资源与人生选择",
        "principleAnchorIds": ["anchor-3"],
        "coreTension": "本关不可兼得的代价张力",
        "trainingAbility": "本关训练能力"
      }
    ]
  },
  "scenario": {
    "roundId": "与 blueprint.roundId 相同",
    "lifeCapital": "${lifeCapital}",
    "scenarioType": "与第 1 关 blueprint 一致",
    "phase": "看见惯性",
    "principleAnchorIds": ["第 1 关引用的 anchor id"],
    "sourceCardKey": "主要来源卡片 key",
    "roleType": "与第 1 关 blueprint 一致",
    "trainingAbility": "与第 1 关 blueprint 一致",
    "scene": "80~120 字，真实具体，有明显冲突",
    "question": "一句话提出问题",
    "options": {
      "A": "合理但有代价的选项",
      "B": "另一种合理但有代价的选项"
    },
    "optionRationales": {
      "A": "A 如何对应书中原则或常见惯性",
      "B": "B 如何对应书中原则或常见惯性"
    },
    "feedback": {
      "A": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "回到本书的方法：...",
        "action": "一个低风险行动实验"
      },
      "B": {
        "empathy": "...",
        "analysis": "...",
        "upgrade": "回到本书的方法：...",
        "action": "一个低风险行动实验"
      }
    }
  }
}

只输出 JSON，不要输出 Markdown。`;
}

export function DECISION_BLUEPRINT_GATE_PROMPT(
  bookTitle: string,
  blueprint: RoundBlueprint,
  questionIndex: number
): string {
  const gate = blueprint.gates[questionIndex] ?? blueprint.gates[0];
  const anchors = blueprint.anchors.filter((anchor) =>
    gate.principleAnchorIds.includes(anchor.id)
  );

  return `你是一个"跃迁练习单题设计师"。

请只根据给定蓝图，生成第 ${questionIndex + 1} 关完整题目。不得改写蓝图，不得临时换原则。

----------------------------------
书名：${bookTitle}
本轮人生课题：${blueprint.lifeCapital}
本题阶段：${gate.phase}
场景类型：${gate.scenarioType}
题内角色：${gate.roleType}
训练能力：${gate.trainingAbility}
核心代价：${gate.coreTension}

允许使用的原则锚点：
${anchors.map((anchor) => `- ${anchor.id}｜${anchor.statement}｜方法：${anchor.methodOrModel}｜来源：${anchor.sourceCardKey}｜适用：${anchor.applicability}｜误用：${anchor.avoidMisuse}`).join("\n")}

已规划的其他关卡（用于避免重复，不要生成这些题）：
${blueprint.gates.map((item) => `第 ${item.gateIndex + 1} 关：${item.phase}｜${item.scenarioType}｜${item.coreTension}`).join("\n")}

----------------------------------
【要求】

1. 题干、A/B 选项、两套反馈和行动建议都必须回到上方锚点。
2. 两个选项都合理、都不可兼得、都有代价；不要明显正确/错误。
3. 不给投资、医疗、心理治疗、法律处方；只给低风险行动实验。
4. feedback.upgrade 必须以“回到本书的方法：”开头。

----------------------------------
【输出 JSON】

{
  "roundId": "${blueprint.roundId}",
  "lifeCapital": "${blueprint.lifeCapital}",
  "scenarioType": "${gate.scenarioType}",
  "phase": "${gate.phase}",
  "principleAnchorIds": ${JSON.stringify(gate.principleAnchorIds)},
  "sourceCardKey": "主要来源卡片 key",
  "roleType": "${gate.roleType}",
  "trainingAbility": "${gate.trainingAbility}",
  "scene": "80~120 字，真实具体，有明显冲突",
  "question": "一句话提出问题",
  "options": {
    "A": "...",
    "B": "..."
  },
  "optionRationales": {
    "A": "...",
    "B": "..."
  },
  "feedback": {
    "A": {
      "empathy": "...",
      "analysis": "...",
      "upgrade": "回到本书的方法：...",
      "action": "..."
    },
    "B": {
      "empathy": "...",
      "analysis": "...",
      "upgrade": "回到本书的方法：...",
      "action": "..."
    }
  }
}

只输出 JSON，不要输出 Markdown。`;
}
