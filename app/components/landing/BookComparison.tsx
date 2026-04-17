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
];

const N = BOOKS.length;
const PANEL_SIZE = 360; // px, square panels

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

/*
 * JS-controlled position: absolute → fixed → absolute
 * Doesn't depend on CSS sticky (which breaks with parent overflow).
 *
 * Three states:
 *   BEFORE  rect.top > 0       content = absolute top:0, fading in
 *   FIXED   rect.top ≤ 0 && rect.bottom > vh   content = fixed, cycling books
 *   AFTER   rect.bottom ≤ vh   content = absolute bottom:0, fading out
 */
const WRAPPER_VH = 380;

export function BookComparison() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionOpacity, setSectionOpacity] = useState(0);
  const [contentKey, setContentKey] = useState(0);
  const prevIndexRef = useRef(0);
  const [pinState, setPinState] = useState<"before" | "fixed" | "after">(
    "before",
  );

  useEffect(() => {
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
  }, []);

  const book = BOOKS[activeIndex];

  const contentPositionStyle: React.CSSProperties =
    pinState === "before"
      ? { position: "absolute", top: 0, left: 0, right: 0 }
      : pinState === "fixed"
        ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 40 }
        : { position: "absolute", bottom: 0, left: 0, right: 0 };

  return (
    <div
      ref={wrapperRef}
      id="comparison"
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
        <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10">
          {/* ── Compact header (one line) ──────────────────── */}
          <p className="mb-8 text-center text-sm tracking-wide text-[var(--ink-faint)] md:mb-10">
            <span className="font-semibold uppercase tracking-[0.12em]">Before / After</span>
            <span className="mx-3 text-[var(--ghost-border)]">|</span>
            一本书，6 张卡片，30 秒
          </p>

          {/* ── Three-column layout ───────────────────────── */}
          <div className="flex items-center justify-center gap-6 md:gap-10 lg:gap-14">

            {/* LEFT COLUMN */}
            <div className="hidden flex-col items-center lg:flex" style={{ width: PANEL_SIZE }}>
              {/* Label above panel */}
              <p className="mb-3 font-editorial text-sm italic text-[var(--ink-faint)]">原书</p>
              {/* Square panel */}
              <div
                key={`left-${contentKey}`}
                className="relative overflow-hidden rounded-2xl bg-[#eae8e5]"
                style={{ width: PANEL_SIZE, height: PANEL_SIZE, animation: "fadeSlideIn 0.4s ease-out both" }}
              >
                <DenseWall fragments={book.rawFragments} />
              </div>
              {/* Caption below panel */}
              <p className="mt-3 text-center text-xs leading-relaxed text-[var(--ink-faint)]">
                《{book.title}》· {book.author} · {book.wordCount}
              </p>
            </div>

            {/* CENTER COLUMN — book name list */}
            <div className="flex flex-col items-center gap-1 py-4">
              {BOOKS.map((b, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={b.title}
                    className="whitespace-nowrap text-center transition-all duration-500"
                    style={{
                      fontFamily: "var(--font-serif), 'Songti SC', serif",
                      fontSize: isActive ? "1.5rem" : "1rem",
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: isActive ? "-0.02em" : "0",
                      color: isActive ? "var(--ink)" : "var(--ink-faint)",
                      opacity: isActive ? 1 : 0.25,
                      padding: isActive ? "0.5rem 0" : "0.3rem 0",
                    }}
                  >
                    {b.title}
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN */}
            <div className="hidden flex-col items-center lg:flex" style={{ width: PANEL_SIZE }}>
              {/* Label above panel */}
              <p className="mb-3 font-editorial text-sm italic text-[var(--ink-faint)]">书跃</p>
              {/* Square panel */}
              <div
                key={`right-${contentKey}`}
                className="relative overflow-hidden rounded-2xl bg-[var(--paper)] shadow-[var(--shadow-paper)]"
                style={{ width: PANEL_SIZE, height: PANEL_SIZE, animation: "fadeSlideIn 0.4s ease-out 0.06s both" }}
              >
                <div className="flex h-full flex-col justify-center px-4 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    {book.cards.map((card, ci) => (
                      <div
                        key={card.title}
                        className="rounded-[10px] bg-[var(--surface-low)] px-2.5 py-2.5"
                        style={{ animation: `fadeSlideIn 0.3s ease-out ${0.08 + ci * 0.045}s both` }}
                      >
                        <div className="mb-0.5 flex items-center gap-1">
                          <span className="text-xs opacity-70">{card.icon}</span>
                          <span className="font-editorial text-xs font-semibold text-[var(--ink)]">{card.title}</span>
                        </div>
                        <p className="text-[10px] leading-[14px] text-[var(--ink-soft)]">{card.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Caption below panel */}
              <p className="mt-3 text-center text-xs leading-relaxed text-[var(--ink-faint)]">
                6 张结构化知识卡片 · 30 秒生成
              </p>
            </div>
          </div>

          {/* ── Mobile fallback (below lg) ────────────────── */}
          <div className="mt-6 lg:hidden">
            <div className="grid grid-cols-2 gap-3">
              {/* Mobile left */}
              <div className="flex flex-col items-center">
                <p className="mb-2 font-editorial text-xs italic text-[var(--ink-faint)]">原书</p>
                <div
                  key={`ml-${contentKey}`}
                  className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#eae8e5]"
                  style={{ animation: "fadeSlideIn 0.4s ease-out both" }}
                >
                  <DenseWall fragments={book.rawFragments} />
                </div>
                <p className="mt-2 text-center text-[10px] text-[var(--ink-faint)]">
                  《{book.title}》· {book.author}
                </p>
              </div>
              {/* Mobile right */}
              <div className="flex flex-col items-center">
                <p className="mb-2 font-editorial text-xs italic text-[var(--ink-faint)]">书跃</p>
                <div
                  key={`mr-${contentKey}`}
                  className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--paper)] shadow-[var(--shadow-paper)]"
                  style={{ animation: "fadeSlideIn 0.4s ease-out 0.06s both" }}
                >
                  <div className="flex h-full flex-col justify-center px-2 py-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {book.cards.map((card) => (
                        <div key={card.title} className="rounded-lg bg-[var(--surface-low)] p-1.5">
                          <span className="font-editorial text-[9px] font-semibold text-[var(--ink)]">{card.icon} {card.title}</span>
                          <p className="text-[7.5px] leading-[10px] text-[var(--ink-soft)]">{card.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] text-[var(--ink-faint)]">
                  6 张卡片 · 30 秒
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
