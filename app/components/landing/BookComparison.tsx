"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BOOK_TITLE = "原则";
const BOOK_AUTHOR = "瑞·达利欧";

/* Dense raw text fragments to simulate a full book */
const RAW_FRAGMENTS = [
  "把人生当作一个可以不断优化的系统。",
  "成功不是靠感觉，而是靠一套可复用的决策原则。",
  "记录错误、不断反馈、建立自己的决策系统，才是长期胜出的关键。",
  "痛苦加反思等于进步。",
  "大多数人在遇到痛苦时选择逃避，但真正的成长来自于直面痛苦并从中学习。",
  "每一次失败都是一个数据点，关键是你能否把它转化为可复用的原则。",
  "不要相信感觉，要建立原则。",
  "人类的直觉在复杂决策中往往不可靠。",
  "达利欧建议我们把每一个重要决策都记录下来，事后复盘，找出规律。",
  "错误不是问题，不复盘才是。",
  "在桥水基金，每一个错误都会被记录和分析。",
  "这不是为了追责，而是为了让整个系统变得更好。",
  "用系统看问题，而不是情绪。",
  "当你把人生看作一台机器，你就能更客观地分析问题出在哪里。",
  "是设计有问题？还是执行有问题？还是人的问题？",
  "每个人都应该有自己的决策模型。",
  "你不需要照搬他的原则，但你需要开始建立属于自己的。",
  "从记录每一个重要决策开始。",
  "极度透明和极度真实是组织成功的基础。",
  "所有会议都会被录音，所有人都可以对任何人提出批评。",
  "这种文化虽然让人不舒服，但它消除了办公室政治。",
  "生活中最重要的选择是：你愿意承受多大的痛苦来换取多大的成长？",
  "大多数人低估了自己能承受的痛苦，也低估了痛苦带来的成长价值。",
  "原则是应对现实的方法，让你得到生活中想要的东西。",
  "拥抱现实，应对现实。做一个超级现实的人。",
  "梦想加现实加决心等于成功的生活。",
  "做到头脑极度开放。你能认识到自己的盲区吗？",
  "理解人与人大不相同。每个人的思维方式都不一样。",
  "学会如何有效地做决策。最大的威胁是有害的情绪。",
  "综合分析眼前的形势。你需要的信息是什么？",
  "综合分析变化中的形势。不断地回顾和调整。",
  "高效地综合考虑各个层次。保持宏观和微观的平衡。",
  "做到极度透明。让阳光照进来，把问题暴露出来。",
  "有意义的工作和有意义的人际关系是最重要的。",
  "打造允许犯错但不容忍罔顾教训的文化。",
  "求取共识并坚持。分歧是好事，但要有解决分歧的机制。",
  "做决策时要从观点的可信度出发。不是所有人的意见都同等重要。",
  "知道如何超越分歧。当你们无法达成一致时该怎么办？",
];

// Repeat to fill more space
const DENSE_TEXT = [...RAW_FRAGMENTS, ...RAW_FRAGMENTS, ...RAW_FRAGMENTS];

const CARDS = [
  {
    icon: "📖",
    title: "全书摘要",
    desc: "把人生当作可优化的系统，用可复用的决策原则长期胜出",
  },
  {
    icon: "🧭",
    title: "阅读指南",
    desc: "先抓旧习惯，再看关键判断，最后挑一条动作立刻用",
  },
  {
    icon: "🗺️",
    title: "观点地图",
    desc: "痛苦+反思=进步 · 不信感觉信原则 · 错误是最好的数据",
  },
  {
    icon: "⚡",
    title: "行动提炼",
    desc: "记录决策 · 写下错因 · 建立原则清单 · 定期复盘",
  },
  {
    icon: "🔍",
    title: "观点校验",
    desc: "这些判断在你当前阶段，哪些成立，哪些需要调整？",
  },
  {
    icon: "🌊",
    title: "思想溯源",
    desc: "底层命题：让人生变成可优化系统",
  },
];

export function BookComparison() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [sliderPos, setSliderPos] = useState(82);
  const isDragging = useRef(false);
  const hasAnimated = useRef(false);
  const [showHint, setShowHint] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
    setShowHint(false); // hide hint once user interacts
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => handleMove(e.clientX);
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handleMove]);

  // Auto-animate slider from 82 → 35 when section enters viewport
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          // Smooth animation using requestAnimationFrame
          const start = 82;
          const end = 35;
          const duration = 1800; // ms
          const startTime = performance.now();

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = start + (end - start) * eased;
            setSliderPos(current);
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setShowHint(true);
            }
          };
          // Small delay before starting
          setTimeout(() => requestAnimationFrame(animate), 400);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Dynamic font size: when slider moves left, left text gets bigger
  // sliderPos 5 → fontSize 14px (big), sliderPos 95 → fontSize 7px (tiny dense)
  const leftFontSize = 7 + (95 - sliderPos) * (7 / 90); // 7px ~ 14px
  const leftOpacity = 0.25 + (sliderPos / 95) * 0.35; // more opaque when dense
  // Right side cards opacity: more visible as slider moves left
  const rightOpacity = 0.4 + ((95 - sliderPos) / 90) * 0.6;

  return (
    <section id="comparison" ref={sectionRef} className="px-6 py-14 md:px-10 md:py-20">
      <div className="mx-auto grid max-w-[1540px] gap-12 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-center">
        <div
          ref={containerRef}
          className="archive-stack archive-paper relative select-none overflow-hidden rounded-[30px]"
          style={{ touchAction: "none" }}
        >
          <div className="relative flex" style={{ minHeight: 480 }}>
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <div className="h-full bg-[var(--surface-low)] p-5 md:p-8">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-md bg-[rgba(119,124,123,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                    原书
                  </span>
                  <span className="text-[10px] text-[var(--ink-faint)]">
                    《{BOOK_TITLE}》· {BOOK_AUTHOR} · 约 48,000 字
                  </span>
                </div>
                <div
                  className="leading-tight transition-all duration-150 ease-out pr-6"
                  style={{
                    fontSize: `${leftFontSize}px`,
                    lineHeight: `${leftFontSize + 4}px`,
                    opacity: leftOpacity,
                    color: "var(--ink-faint)",
                  }}
                >
                  {DENSE_TEXT.map((t, i) => (
                    <span key={i}>
                      {t}
                      {i % 5 === 4 ? " " : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <div className="flex h-full flex-col justify-center bg-[var(--paper)] p-5 md:p-8">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-md bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#faf7f6]">
                    书跃
                  </span>
                  <span className="text-[10px] text-[var(--ink-faint)]">
                    6 张结构化知识卡片 · 30 秒生成
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-3 transition-opacity duration-200"
                  style={{ opacity: rightOpacity }}
                >
                  {CARDS.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-lg bg-[var(--surface-low)]/92 p-3.5 shadow-[var(--shadow-paper)]"
                    >
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="text-base opacity-70">{card.icon}</span>
                        <span className="font-editorial text-base font-semibold text-[var(--ink)]">
                          {card.title}
                        </span>
                      </div>
                      <p className="text-[11px] leading-5 text-[var(--ink-soft)]">
                        {card.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="absolute top-0 bottom-0 z-10 flex w-10 -translate-x-1/2 cursor-col-resize items-center justify-center"
              style={{ left: `${sliderPos}%` }}
              onPointerDown={() => { isDragging.current = true; }}
            >
              <div className="h-full w-px bg-[rgba(81,99,90,0.35)]" />
              <div className="absolute flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--paper)] shadow-[var(--shadow-paper-strong)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-[var(--ink-faint)]"
                >
                  <path
                    d="M5 3L2 8L5 13M11 3L14 8L11 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[360px]">
          <p className="archive-kicker">Before / After</p>
          <h2 className="font-editorial mt-4 text-[2.45rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-[3.05rem]">
            一本书，6 张卡片，30 秒
          </h2>
          <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)] md:text-base">
            拖动滑块，看看《{BOOK_TITLE}》如何从几万字变成结构化知识
          </p>
          <div className="mt-8 space-y-3">
            <div className="rounded-[18px] bg-[var(--paper)] px-4 py-4">
              <p className="archive-kicker">Condense</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                从密集原文中抽出真正值得反复调用的判断。
              </p>
            </div>
            <div className="rounded-[18px] bg-[var(--surface-low)] px-4 py-4">
              <p className="archive-kicker">Navigate</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                先建立结构，再决定哪些部分值得你深读和训练。
              </p>
            </div>
          </div>
          {showHint && (
            <p className="mt-5 text-xs text-[var(--ink-faint)] animate-pulse">
              ← 左右拖动滑块试试 →
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
