"use client";

import { useEffect, useRef, useState } from "react";

/* ── Book data ────────────────────────────────────────────────────────────────── */

interface BookData {
  title: string;
  author: string;
  wordCount: string;
  rawFragments: string[];
  cards: { icon: string; title: string; desc: string }[];
}

const BOOKS: BookData[] = [
  {
    title: "原则",
    author: "瑞·达利欧",
    wordCount: "约 48,000 字",
    rawFragments: [
      "把人生当作一个可以不断优化的系统。",
      "成功不是靠感觉，而是靠一套可复用的决策原则。",
      "记录错误、不断反馈、建立自己的决策系统，才是长期胜出的关键。",
      "痛苦加反思等于进步。",
      "大多数人在遇到痛苦时选择逃避，但真正的成长来自于直面痛苦并从中学习。",
      "每一次失败都是一个数据点，关键是你能否把它转化为可复用的原则。",
      "不要相信感觉，要建立原则。人类的直觉在复杂决策中往往不可靠。",
      "达利欧建议我们把每一个重要决策都记录下来，事后复盘，找出规律。",
      "错误不是问题，不复盘才是。在桥水基金，每一个错误都会被记录和分析。",
      "这不是为了追责，而是为了让整个系统变得更好。",
      "用系统看问题，而不是情绪。当你把人生看作一台机器，你就能更客观地分析问题出在哪里。",
      "是设计有问题？还是执行有问题？还是人的问题？",
      "每个人都应该有自己的决策模型。你不需要照搬他的原则，但你需要开始建立属于自己的。",
      "极度透明和极度真实是组织成功的基础。",
      "所有会议都会被录音，所有人都可以对任何人提出批评。这种文化虽然让人不舒服，但它消除了办公室政治。",
      "生活中最重要的选择是：你愿意承受多大的痛苦来换取多大的成长？",
      "原则是应对现实的方法，让你得到生活中想要的东西。",
      "拥抱现实，应对现实。做一个超级现实的人。",
      "梦想加现实加决心等于成功的生活。做到头脑极度开放。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "把人生当作可优化的系统，用可复用的决策原则长期胜出" },
      { icon: "🧭", title: "阅读指南", desc: "先抓旧习惯，再看关键判断，最后挑一条动作立刻用" },
      { icon: "🗺️", title: "观点地图", desc: "痛苦+反思=进步 · 不信感觉信原则 · 错误是最好的数据" },
      { icon: "⚡", title: "行动提炼", desc: "记录决策 · 写下错因 · 建立原则清单 · 定期复盘" },
      { icon: "🔍", title: "观点校验", desc: "这些判断在你当前阶段，哪些成立，哪些需要调整？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：让人生变成可优化系统" },
    ],
  },
  {
    title: "思考，快与慢",
    author: "丹尼尔·卡尼曼",
    wordCount: "约 52,000 字",
    rawFragments: [
      "我们的大脑有两个系统：系统1快速、直觉、自动；系统2缓慢、理性、费力。",
      "大多数时候我们以为自己在理性思考，其实是系统1在替你做决定。",
      "锚定效应：你看到的第一个数字会影响你之后的所有判断。",
      "可得性偏差：你越容易想到某件事，就越觉得它经常发生。",
      "损失厌恶：失去100元的痛苦是得到100元快乐的两倍。",
      "过度自信是人类判断中最普遍的偏差之一。",
      "框架效应：同样的信息，不同的表达方式会导致完全不同的决策。",
      "峰终定律：人们对一段体验的记忆主要取决于高峰和结尾时的感受。",
      "前景理论：人们在面对收益时倾向规避风险，在面对损失时倾向追求风险。",
      "光环效应让我们因为一个人某方面的优点而高估他所有方面的能力。",
      "叙事谬误：我们总是为随机事件编造合理的解释，让世界看起来比实际更有序。",
      "统计思维与直觉思维的冲突是大量决策错误的根源。",
      "眼见即为事实：系统1只根据已有信息做判断，不会主动寻找缺失的信息。",
      "均值回归是一个基本的统计现象，但我们总是为它寻找因果解释。",
      "替换效应：当一个问题太难时，系统1会悄悄把它替换成一个更容易的问题。",
      "计划谬误让人们系统性地低估完成任务所需的时间和资源。",
      "禀赋效应：人们对自己拥有的东西赋予更高的价值。",
      "沉没成本谬误：已经投入的成本不应影响未来的决策，但大多数人无法做到。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "人有两套思维系统，快思考省力但充满偏差，慢思考理性但懒于启动" },
      { icon: "🧭", title: "阅读指南", desc: "先读Part I建立双系统框架，再逐个认识偏差，最后看前景理论" },
      { icon: "🗺️", title: "观点地图", desc: "锚定效应 · 损失厌恶 · 过度自信 · 框架效应 · 峰终定律" },
      { icon: "⚡", title: "行动提炼", desc: "决策前问：这是系统1还是系统2？有哪些信息我没看到？" },
      { icon: "🔍", title: "观点校验", desc: "实验室偏差在真实决策中的影响是否被高估了？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：人类理性的边界比我们以为的窄得多" },
    ],
  },
  {
    title: "穷查理宝典",
    author: "查理·芒格",
    wordCount: "约 45,000 字",
    rawFragments: [
      "如果我知道我会死在哪里，那我一辈子都不会去那个地方。",
      "反过来想，总是反过来想。把问题反转，你往往就能看到答案。",
      "多元思维模型：你不能只用一种工具看世界。手里只有锤子的人，看什么都像钉子。",
      "在我的一生中，我认识的各行各业的聪明人，没有不每天阅读的——没有，一个都没有。",
      "跨学科思维是解决复杂问题的唯一可靠方法。",
      "能力圈：知道自己的能力边界，比拥有多大的能力更重要。",
      "Lollapalooza效应：当多个心理倾向同时作用时，会产生极端结果。",
      "激励机制超级重要。永远不要低估激励的力量。",
      "告诉我激励机制是什么，我就能告诉你结果是什么。",
      "避免极端的意识形态。当你对某个观点极度热情时，小心。",
      "简单是长期投资成功的关键。在芒格的投资哲学中，复杂性是敌人。",
      "耐心和纪律是投资中最被低估的品质。",
      "嫉妒是七宗罪中最愚蠢的一个，因为它只会让你痛苦，不会给你任何东西。",
      "认知偏误清单是芒格最著名的贡献之一。",
      "社会认同倾向：人们倾向于跟随他人的行为，尤其在不确定的情况下。",
      "回馈倾向：人们倾向于回报善意，也倾向于报复恶意，这是合作的基础。",
      "剥夺超级反应：人们对失去的东西反应比获得同等东西的反应更强烈。",
      "自视过高倾向：每个人都倾向于高估自己和自己拥有的东西。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "用跨学科思维模型武装大脑，通过逆向思考避开人生大坑" },
      { icon: "🧭", title: "阅读指南", desc: "先读第四讲建立多元思维模型框架，再看演讲实录中的实战案例" },
      { icon: "🗺️", title: "观点地图", desc: "逆向思维 · 能力圈 · 多元模型 · 激励超级力量 · Lollapalooza效应" },
      { icon: "⚡", title: "行动提炼", desc: "建立自己的思维模型清单 · 每个决策先想如何避免失败" },
      { icon: "🔍", title: "观点校验", desc: "跨学科方法在专业化时代是否被过度理想化了？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：避免愚蠢比追求聪明更重要" },
    ],
  },
  {
    title: "认知觉醒",
    author: "周岭",
    wordCount: "约 38,000 字",
    rawFragments: [
      "人生的根本问题是认知问题。你的认知水平决定了你能看到什么样的世界。",
      "焦虑的根源是想同时做很多事，又想立刻看到效果。",
      "元认知：能够观察自己思考过程的能力，是人与人之间最大的差距。",
      "成长的本质是大脑神经元之间建立新的连接，这需要反复练习。",
      "舒适区边缘是成长效率最高的地带。太简单没挑战，太难直接放弃。",
      "专注力是这个时代最稀缺的能力。注意力在哪里，成长就在哪里。",
      "习惯的本质是大脑的自动化程序，改变习惯就是重写大脑程序。",
      "深度学习 = 获取高质量知识 + 深度关联 + 反复练习。",
      "被动学习和主动学习的效率差距是数量级的。",
      "情绪脑总是比理性脑快一步做出反应，所以自控的关键是拉长反应时间。",
      "知识的本质不是信息，而是关联。散落的知识点没有力量，编织成网的知识才有。",
      "反馈是成长的加速器。没有反馈的练习是低效的重复。",
      "早起的核心不是早起本身，而是通过它建立对生活的掌控感。",
      "阅读的意义不是记住内容，而是改变你看问题的方式。",
      "间歇性满足比持续满足更能驱动行为。游戏化的底层逻辑就是这个。",
      "模糊是一切低效和焦虑的根源。想要高效，先把事情想清楚。",
      "输出倒逼输入是最有效的学习策略之一。",
      "复利效应在个人成长中同样成立：微小的进步持续积累，最终产生巨大的差距。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "用脑科学和元认知视角理解成长，找到舒适区边缘持续精进" },
      { icon: "🧭", title: "阅读指南", desc: "先建立元认知概念，再理解成长底层逻辑，最后看行动方法" },
      { icon: "🗺️", title: "观点地图", desc: "元认知 · 舒适区边缘 · 深度学习 · 习惯改写 · 专注力管理" },
      { icon: "⚡", title: "行动提炼", desc: "每天反思10分钟 · 聚焦一件事 · 在舒适区边缘刻意练习" },
      { icon: "🔍", title: "观点校验", desc: "脑科学解释是否过于简化了行为改变的真实难度？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：觉察是改变的起点" },
    ],
  },
  {
    title: "纳瓦尔宝典",
    author: "埃里克·乔根森",
    wordCount: "约 32,000 字",
    rawFragments: [
      "追求财富，而不是金钱或地位。财富是在你睡觉时仍能为你赚钱的资产。",
      "你不会通过出租时间来变富。你必须拥有股权——一个企业的一部分。",
      "特定知识是你通过追随自己天生的好奇心和热情而获得的知识。",
      "杠杆是财富创造的关键。有三种杠杆：劳动力、资本和无边际复制成本的产品。",
      "编程和写作是新时代最强大的杠杆，因为它们的边际成本趋近于零。",
      "给社会提供它还不知道如何获得的东西。如果你能规模化地解决问题，社会会回报你。",
      "长期博弈：和你信任的人玩长期游戏。复利在所有事情中都有效。",
      "阅读不是为了记住内容，而是为了建立思维模型。",
      "幸福是一种技能，可以通过训练获得。它本质上是对当下的满足。",
      "欲望是与你选择的另一个自我的契约。减少欲望比实现欲望更容易让你快乐。",
      "冥想不是为了停止思考，而是为了观察思考。",
      "最好的工作是创造性工作，它看起来更像是玩耍。",
      "判断力比勤奋更重要。在正确的方向上努力。",
      "具体知识通常具有高度的创造性或技术性。它不能被训练出来。",
      "自由职业者和企业家的区别在于：一个出售时间，另一个出售产出。",
      "身体健康、精神健康、精神自由是金钱买不到的三大财富。",
      "诚实是长期成功最被低估的策略。",
      "如果你不能决定要做什么，答案就是不做。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "通过杠杆和特定知识创造财富，通过减少欲望获得幸福" },
      { icon: "🧭", title: "阅读指南", desc: "先理解财富的定义和杠杆，再看特定知识，最后读幸福哲学" },
      { icon: "🗺️", title: "观点地图", desc: "特定知识 · 三种杠杆 · 长期博弈 · 幸福是技能 · 欲望管理" },
      { icon: "⚡", title: "行动提炼", desc: "找到你的特定知识 · 建立杠杆 · 和信任的人玩长期游戏" },
      { icon: "🔍", title: "观点校验", desc: "\"不出租时间\"的建议对大多数人是否过于理想化？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：财富来自杠杆，幸福来自放下" },
    ],
  },
  {
    title: "财富自由之路",
    author: "李笑来",
    wordCount: "约 35,000 字",
    rawFragments: [
      "所谓个人财富自由，是指某个人再也不用为了满足生活必需而出售自己的时间了。",
      "注意力才是你最宝贵的资源，而不是时间，更不是金钱。",
      "你必须把最宝贵的注意力放在自己的成长上。",
      "很多人一辈子都在用错误的方法努力：用勤奋的身体掩盖懒惰的大脑。",
      "活在未来的人，比活在当下的人有天然的优势，因为他们的行动有方向。",
      "复利效应不只适用于金钱，它适用于知识、技能和人脉的每一个领域。",
      "长期持有的核心障碍不是耐心，而是你对所持标的的真正理解深度。",
      "元认知能力是一切学习和自我提升的起点：你能不能意识到自己在想什么。",
      "选择比努力更重要。你在什么赛道上，决定了你努力的天花板在哪里。",
      "大多数人的问题不是不够努力，而是不肯花时间想清楚什么最重要。",
      "耐心是一切成长策略的基石。没有耐心的人会反复推翻自己的长期计划。",
      "所有的人生困境，本质上都是选择困境：你不知道什么对你真正重要。",
      "写作是把自己的思考产品化的过程，它强迫你整理混乱的想法。",
      "付费就是捡便宜。凡是能用钱买到的时间，就别用命去换。",
      "万能钥匙：当你遇到一个困难时，想想有没有人已经解决了这个问题。",
      "操作系统升级：你需要不断更新自己的概念，因为概念就是思维的操作系统。",
      "刚需幻觉：很多你觉得非做不可的事情，其实只是习惯和从众。",
      "别用你的现状限制你的想象力。你今天的局限不代表明天的边界。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "财富自由的本质是不再被迫出售时间，关键是注意力管理和持续成长" },
      { icon: "🧭", title: "阅读指南", desc: "先理解注意力 > 时间 > 金钱，再看复利思维，最后看行动方法论" },
      { icon: "🗺️", title: "观点地图", desc: "注意力优先 · 活在未来 · 复利效应 · 元认知 · 选择大于努力" },
      { icon: "⚡", title: "行动提炼", desc: "审计注意力去向 · 定义个人刚需 · 每天写作整理思维 · 为时间付费" },
      { icon: "🔍", title: "观点校验", desc: "\"注意力 > 时间 > 金钱\"的优先级在资源匮乏时是否成立？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：升级你的概念就是升级你的人生操作系统" },
    ],
  },
  {
    title: "10x Is Easier Than 2x",
    author: "丹·沙利文 / 本杰明·哈迪",
    wordCount: "约 40,000 字",
    rawFragments: [
      "追求10倍增长反而比2倍增长更简单，因为它迫使你放弃80%不重要的事情。",
      "2倍增长让你优化现有路径，10倍增长逼你重新发明路径。",
      "你过去的每一次重大突破，回头看都是一次10倍跳跃，而不是渐进式改进。",
      "10倍思维的核心不是做更多，而是做更少——只做那20%真正创造结果的事。",
      "大多数人困在2倍陷阱里，因为放弃已有的东西比获得新东西更难。",
      "每一次10倍跳跃都要求你成为一个不同的人，放下旧身份才能拥抱新身份。",
      "你的独特能力是你做起来毫不费力、但别人觉得极其困难的事情。",
      "把时间花在独特能力上，把其他一切委托、自动化或直接删除。",
      "质量比数量更能带来10倍增长。做更少但更好的事情。",
      "2倍思维是竞争逻辑：做得比别人更好。10倍思维是创造逻辑：做别人没做的事。",
      "恐惧和兴奋的生理反应几乎完全一样，区别只在于你的解读。",
      "自由时间不是奢侈品，而是10倍增长的必需品。最好的想法来自空间和休息。",
      "衡量进步应该看你离起点多远，而不是离终点多远。",
      "10倍目标是一个过滤器：它帮你立刻看清什么值得做，什么应该放弃。",
      "不可能是一种观点，不是事实。当你真正想要10倍的结果，方法会自己出现。",
      "团队不是用来帮你执行你的想法的，是用来实现他们自己的10倍目标的。",
      "每做一次减法，你的能量密度就会增加。专注是有复利效应的。",
      "过去的成功模式是未来10倍增长的最大障碍。",
    ],
    cards: [
      { icon: "📖", title: "全书摘要", desc: "10倍增长的秘密是激进地做减法，只保留20%最重要的事" },
      { icon: "🧭", title: "阅读指南", desc: "先理解10x vs 2x的本质区别，再看独特能力框架，最后做减法练习" },
      { icon: "🗺️", title: "观点地图", desc: "10倍做减法 · 独特能力 · 身份跃迁 · 质量胜数量 · 自由时间是必需品" },
      { icon: "⚡", title: "行动提炼", desc: "列出80%可以放弃的事 · 找到独特能力 · 设定一个10倍目标做过滤器" },
      { icon: "🔍", title: "观点校验", desc: "激进做减法在资源有限的早期阶段是否适用？" },
      { icon: "🌊", title: "思想溯源", desc: "底层命题：增长的瓶颈不是能力不够，而是放不下" },
    ],
  },
];

const N = BOOKS.length;
const PANEL_MAX_WIDTH = 500; // px, desktop panel cap
const DESKTOP_SCROLL_QUERY = "(min-width: 1024px)";

/* ── Readable dense text (left side) ─────────────────────────────────────────── */
function DenseWall({ fragments }: { fragments: string[] }) {
  const text = [...fragments, ...fragments, ...fragments].join("　");
  return (
    <div className="absolute inset-0 overflow-hidden select-none" aria-hidden>
      <p
        className="absolute inset-0 px-4 py-3"
        style={{
          fontSize: "10.5px",
          lineHeight: "18px",
          color: "var(--ink-soft)",
          opacity: 0.6,
          wordBreak: "break-word",
        }}
      >
        {text}
      </p>
      <div className="pointer-events-none absolute inset-0" style={{
        background: `
          linear-gradient(180deg, rgba(234,232,229,0.85) 0%, transparent 6%, transparent 92%, rgba(234,232,229,1) 100%),
          linear-gradient(90deg, rgba(234,232,229,0.5) 0%, transparent 5%, transparent 95%, rgba(234,232,229,0.5) 100%)
        `,
      }} />
    </div>
  );
}

function MobileComparison() {
  return (
    <div className="lg:hidden px-6 py-10">
      <div className="mx-auto max-w-[640px]">
        <p className="mb-5 text-center text-[1.05rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink)]">
          Before / After
        </p>
        <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
          {BOOKS.slice(0, 4).map((book) => {
            const featuredCard = book.cards[0];

            return (
              <article
                key={book.title}
                className="min-w-[82vw] max-w-[340px] snap-center rounded-[24px] bg-[var(--surface-low)] p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 font-editorial text-xs italic text-[var(--ink-faint)]">
                      原书
                    </p>
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-[#eae8e5]">
                      <DenseWall fragments={book.rawFragments.slice(0, 6)} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 font-editorial text-xs italic text-[var(--ink-faint)]">
                      书跃
                    </p>
                    <div className="flex aspect-square flex-col rounded-xl bg-[var(--paper)] p-2 shadow-[var(--shadow-paper)]">
                      <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,246,241,0.98)_100%)] p-2">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-[10px] opacity-80">{featuredCard.icon}</span>
                          <span className="font-editorial text-[10px] font-semibold text-[var(--ink)]">
                            {featuredCard.title}
                          </span>
                        </div>
                        <p className="text-[8px] leading-[11px] text-[var(--ink-soft)]">
                          {featuredCard.desc}
                        </p>
                      </div>
                      <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
                        {book.cards.slice(1, 5).map((card) => (
                          <div
                            key={card.title}
                            className="rounded-lg bg-[var(--surface-low)] p-1.5 text-left"
                          >
                            <span className="font-editorial text-[9px] font-semibold text-[var(--ink)]">
                              {card.icon} {card.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-[var(--accent)]">
                  《{book.title}》· {book.author}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/*
 * JS-controlled position: absolute → fixed → absolute
 * Doesn't depend on CSS sticky (which breaks with parent overflow).
 *
 * Three states:
 *   BEFORE  rect.top > 0       content = absolute top:0, fading in
 *   FIXED   rect.top ≤ 0 && rect.bottom > vh   content = fixed, cycling books
 *   AFTER   rect.bottom ≤ vh   content = absolute bottom:0, fading out
 */
const WRAPPER_VH = 500;

export function BookComparison() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionOpacity, setSectionOpacity] = useState(0);
  const [contentKey, setContentKey] = useState(0);
  const [isScrollSceneEnabled, setIsScrollSceneEnabled] = useState(false);
  const prevIndexRef = useRef(0);
  const [pinState, setPinState] = useState<"before" | "fixed" | "after">(
    "before",
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_SCROLL_QUERY);
    const update = () => setIsScrollSceneEnabled(mediaQuery.matches);

    update();
    mediaQuery.addEventListener?.("change", update);
    mediaQuery.addListener?.(update);

    return () => {
      mediaQuery.removeEventListener?.("change", update);
      mediaQuery.removeListener?.(update);
    };
  }, []);

  useEffect(() => {
    if (!isScrollSceneEnabled) {
      return;
    }

    const onScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const wrapperH = el.offsetHeight;
      const maxScroll = wrapperH - vh;

      if (rect.top > 0) {
        /* BEFORE: wrapper hasn't reached viewport top */
        setPinState("before");
        const t = Math.max(0, 1 - rect.top / vh);
        setSectionOpacity(t * t);
        if (prevIndexRef.current !== 0) {
          prevIndexRef.current = 0;
          setContentKey((k) => k + 1);
          setActiveIndex(0);
        }
      } else if (rect.bottom > vh) {
        /* FIXED: pin content to viewport */
        setPinState("fixed");
        setSectionOpacity(1);
        const scrolled = -rect.top;
        const progress = Math.min(scrolled / maxScroll, 1);
        const newIndex = Math.min(N - 1, Math.floor(progress * N));
        if (newIndex !== prevIndexRef.current) {
          prevIndexRef.current = newIndex;
          setContentKey((k) => k + 1);
          setActiveIndex(newIndex);
        }
      } else {
        /* AFTER: release, scroll out with wrapper */
        setPinState("after");
        const t = Math.max(0, rect.bottom / vh);
        setSectionOpacity(t * t);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isScrollSceneEnabled]);

  const scrollToBook = (index: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    const wrapperTop = el.offsetTop;
    const maxScroll = el.offsetHeight - window.innerHeight;
    const targetScroll = wrapperTop + (index + 0.5) / N * maxScroll;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  const book = BOOKS[activeIndex];
  const featuredCard = book.cards[0];
  const secondaryCards = book.cards.slice(1);

  const contentPositionStyle: React.CSSProperties =
    pinState === "before"
      ? { position: "absolute", top: 0, left: 0, right: 0 }
      : pinState === "fixed"
        ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 40 }
        : { position: "absolute", bottom: 0, left: 0, right: 0 };

  return (
    <section id="comparison">
      <MobileComparison />
      <div
        ref={wrapperRef}
        className="hidden lg:block"
        style={{ height: `${WRAPPER_VH}vh`, position: "relative" }}
      >
        <div
          className="flex h-screen flex-col items-center justify-center overflow-hidden"
          style={{
            ...contentPositionStyle,
            opacity: sectionOpacity,
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="mx-auto w-full max-w-[1560px] px-6 md:px-10">
          {/* ── Header ──────────────────── */}
          <p className="mb-8 text-center text-[1.5rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] md:mb-10 md:text-[1.75rem]">
            Before / After
          </p>

          {/* ── Three-column layout ───────────────────────── */}
          <div className="hidden items-center gap-8 lg:grid lg:grid-cols-[minmax(430px,1fr)_220px_minmax(430px,1fr)] xl:gap-12">

            {/* LEFT COLUMN */}
            <div className="flex w-full max-w-[500px] flex-col items-center justify-self-center">
              {/* Label above panel */}
              <p className="mb-3 font-editorial text-sm italic text-[var(--ink-faint)]">原书</p>
              {/* Square panel */}
              <div
                key={`left-${contentKey}`}
                className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#eae8e5]"
                style={{
                  maxWidth: `${PANEL_MAX_WIDTH}px`,
                  animation: "fadeSlideIn 0.4s ease-out both",
                }}
              >
                <DenseWall fragments={book.rawFragments} />
              </div>
              {/* Caption below panel */}
              <p className="mt-3 text-center text-sm leading-relaxed text-[var(--accent)]">
                《{book.title}》· {book.author} · {book.wordCount}
              </p>
            </div>

            {/* CENTER COLUMN — book name list */}
            <div className="flex min-w-[220px] flex-col items-center gap-1.5 py-4">
              {BOOKS.map((b, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={b.title}
                    className="cursor-pointer whitespace-nowrap rounded-full text-center transition-all duration-500"
                    style={{
                      fontFamily: "var(--font-serif), 'Songti SC', serif",
                      fontSize: isActive ? "1.5rem" : "1rem",
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: isActive ? "-0.02em" : "0",
                      color: isActive ? "var(--ink)" : "var(--ink-faint)",
                      opacity: isActive ? 1 : 0.25,
                      padding: isActive ? "0.5rem 1.4rem" : "0.3rem 0.8rem",
                      backgroundColor: isActive ? "var(--accent-soft)" : "transparent",
                    }}
                    onClick={() => scrollToBook(i)}
                  >
                    {b.title}
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex w-full max-w-[500px] flex-col items-center justify-self-center">
              {/* Label above panel */}
              <p className="mb-3 font-editorial text-sm italic text-[var(--ink-faint)]">书跃</p>
              {/* Square panel */}
              <div
                key={`right-${contentKey}`}
                className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[var(--paper)] shadow-[var(--shadow-paper)]"
                style={{
                  maxWidth: `${PANEL_MAX_WIDTH}px`,
                  animation: "fadeSlideIn 0.4s ease-out 0.06s both",
                }}
              >
                <div className="flex h-full flex-col px-4 py-4">
                  <div
                    className="rounded-[20px] border border-[rgba(81,99,90,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,246,241,0.98)_100%)] px-4 py-4 shadow-[0_18px_36px_rgba(47,51,51,0.06)]"
                    style={{ animation: "fadeSlideIn 0.38s ease-out 0.05s both" }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(186,221,200,0.42)] px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-[var(--accent)]">
                        <span className="text-sm leading-none">{featuredCard.icon}</span>
                        <span>{featuredCard.title}</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                        BookLeap Card
                      </span>
                    </div>
                    <p className="font-editorial text-[1.02rem] font-semibold leading-[1.58] tracking-[-0.012em] text-[var(--ink)]">
                      {featuredCard.desc}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(81,99,90,0.1)] pt-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                        结构化主卡
                      </p>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <span
                            key={index}
                            className="h-2 w-2 rounded-full bg-[rgba(81,99,90,0.18)]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid flex-1 auto-rows-fr grid-cols-2 gap-2">
                    {secondaryCards.map((card, ci) => {
                      const shouldSpan =
                        secondaryCards.length % 2 === 1 && ci === secondaryCards.length - 1;

                      return (
                        <div
                          key={card.title}
                          className={`group rounded-[14px] border border-transparent bg-[var(--surface-low)] px-3 py-2.5 text-left transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.015] hover:border-[rgba(81,99,90,0.22)] hover:bg-[rgba(186,221,200,0.46)] hover:shadow-[0_16px_28px_rgba(81,99,90,0.14)] ${
                            shouldSpan ? "col-span-2 flex flex-col justify-center text-center" : ""
                          }`}
                          style={{
                            animation: `fadeSlideIn 0.3s ease-out ${0.1 + ci * 0.045}s both`,
                          }}
                        >
                          <div
                            className={`mb-1 flex items-center gap-1.5 ${
                              shouldSpan ? "justify-center" : ""
                            }`}
                          >
                            <span className="text-xs opacity-70 transition-transform duration-300 group-hover:scale-110">
                              {card.icon}
                            </span>
                            <span className="font-editorial text-[13px] font-semibold text-[var(--ink)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                              {card.title}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] leading-[16px] text-[var(--ink-soft)] transition-colors duration-300 group-hover:text-[var(--ink)] ${
                              shouldSpan ? "mx-auto max-w-[80%]" : ""
                            }`}
                          >
                            {card.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Caption below panel */}
              <p className="mt-3 text-center text-sm leading-relaxed text-[var(--accent)]">
                6 张结构化知识卡片 · 30 秒生成
              </p>
            </div>
          </div>

          </div>
        </div>
      </div>
    </section>
  );
}
