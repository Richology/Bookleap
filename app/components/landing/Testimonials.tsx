"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Testimonial = {
  name: string;
  title: string;
  quote: string;
};

type OrbitLayout = {
  x: number;
  y: number;
  ring: 0 | 1 | 2;
  delay: number;
};

type RingShape = {
  width: number;
  height: number;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "臧心昊",
    title: "运动博主",
    quote:
      "书跃不仅可以快速概括书籍内容，还会给出阅读指南，让你带着问题去阅读，根据书籍的观点给出可执行的行动，打通知识到行动的壁垒。并且它不会一味迎合书籍内容，观点校验功能会提出可能存在的问题与反例，让你多方位思考。",
  },
  {
    name: "华华",
    title: "投资专家",
    quote:
      "我想知道这本书讲什么，但我不想看书；我想看看书中的观点换个角度辩证，是否有失偏颇；我想把书的内容放到实际场景，但我不想被评判对错；我想把喜欢的金句分享给朋友，但希望漂亮又有格调；书跃，6张卡解读，让读书不止是读书…",
  },
  {
    name: "科学怪熊",
    title: "全科老师，素质教育工作者",
    quote:
      "作为一个教育工作者，我会向学生强力推荐这个网站。不同于NotebookLM和ima这样的知识库，书跃展示了一种思维方式，为阅读者提供了地图而非答案。对“AI时代如何读书”这个问题，书跃给出了具有启发性的回答。",
  },
  {
    name: "宇宇",
    title: "社群运营",
    quote:
      "以 AI 为匙，解锁书籍的深层价值，书跃值得所有求知者入手！智能拆解全书内容，凝练成 6 张精华知识卡片，脉络清晰、重点突出，既能快速把握书籍精髓，又能轻松落地实践，还能无缝导入知识库，让每一次阅读都有迹可循，认知成长稳步向前。",
  },
  {
    name: "老K",
    title: "产品经理 · 5 年经验",
    quote:
      "以前一本书要读两周，现在 30 秒就能抓到核心。不是替代阅读，而是让我知道该重点读哪里。观点地图特别好用，一眼就能看清整本书的逻辑脉络，省了大量时间。",
  },
  {
    name: "薇薇安",
    title: "创业者 · 教育行业",
    quote:
      "决策训练功能太惊艳了，不只是告诉你书里说了什么，还让你在真实场景里用起来。我把《原则》传上去以后，做了三道决策题，感觉比读完整本书收获还大。",
  },
  {
    name: "浩子",
    title: "咨询顾问 · 战略方向",
    quote:
      "我把团队必读的 5 本书都传了上去，导出的知识卡片直接变成了内部培训材料。行动提炼这张卡片特别实用，每本书都能提炼出可以立刻执行的动作清单。",
  },
  {
    name: "小鱼",
    title: "自由职业者 · 写作",
    quote:
      "观点地图帮我快速理清一本书的逻辑脉络，写书评的效率提升了不止一倍。思想溯源功能也很有意思，能看到一本书背后更深层的思考框架。",
  },
  {
    name: "磊哥",
    title: "技术总监 · 互联网",
    quote:
      "终于不用再为读不完书焦虑了。6 张卡片就是一本书的精华，随时可以回顾。最喜欢的是沉浸式阅读模式，左右滑动卡片的体验很流畅，像在翻一本精简版的书。",
  },
  {
    name: "文博",
    title: "互联网产品增长专家",
    quote:
      "书跃不只是帮我快速看懂一本书，更能把书里的核心结构、重点观点和后续可执行的方向梳理出来。对我来说，它最大的价值是把这本书里更适合我的内容提炼出来，引导我变成自身的行动。它是适合当下时代的高效率工具。",
  },
  {
    name: "祥仔",
    title: "Builder",
    quote:
      "我是一个很爱读书的人，过去几年每年也能读几十本书，读书是一个很好的事情，但是可惜的是如果要学会书中的内容，一是要花较多的时间去阅读，二是需要有足够多的练习；书跃这款产品提供了一个很好的探索，帮助你从多个维度帮你拆解一本书，既可以作为阅读后的补充和回顾，也可以作为一本新书阅读前的引导；同时，结合书中的内容，书跃提供多个真实的决策点，这是一个非常好的练习方法",
  },
];

const ORBIT_LAYOUT: OrbitLayout[] = [
  { x: -408, y: -24, ring: 2, delay: 0.04 },
  { x: -232, y: -128, ring: 1, delay: 0.08 },
  { x: 0, y: -166, ring: 0, delay: 0.12 },
  { x: 238, y: -126, ring: 1, delay: 0.16 },
  { x: 414, y: -18, ring: 2, delay: 0.2 },
  { x: 384, y: 116, ring: 2, delay: 0.24 },
  { x: 210, y: 164, ring: 1, delay: 0.28 },
  { x: 0, y: 188, ring: 0, delay: 0.32 },
  { x: -226, y: 158, ring: 1, delay: 0.36 },
  { x: -404, y: 94, ring: 2, delay: 0.4 },
  { x: -536, y: -142, ring: 2, delay: 0.44 },
];

const RING_SHAPES: RingShape[] = [
  { width: 436, height: 208 },
  { width: 664, height: 292 },
  { width: 892, height: 356 },
];
const AUTOPLAY_MS = 4800;

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isLocked = selectedIndex !== null;
  const isEngaged = hoveredIndex !== null || selectedIndex !== null;
  const displayIndex = isLocked ? selectedIndex : hoveredIndex ?? autoIndex;
  const activeTestimonial = TESTIMONIALS[displayIndex];
  const activeLayout = ORBIT_LAYOUT[displayIndex % ORBIT_LAYOUT.length];

  const handleActivate = (index: number) => {
    setIsPaused(true);
    setSelectedIndex(index);
    setHoveredIndex(null);
  };

  const handlePreviewStart = (index: number) => {
    if (selectedIndex !== null) return;
    setIsPaused(true);
    setHoveredIndex(index);
  };

  const handlePreviewEnd = () => {
    if (selectedIndex !== null) return;
    setHoveredIndex(null);
    setIsPaused(false);
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isPaused || selectedIndex !== null) return;

    const timer = window.setInterval(() => {
      setAutoIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, isVisible, selectedIndex]);

  const activeLine = useMemo(() => {
    const angle = (Math.atan2(activeLayout.y, activeLayout.x) * 180) / Math.PI;
    const distance = Math.sqrt(activeLayout.x ** 2 + activeLayout.y ** 2);

    return {
      angle,
      width: Math.max(0, distance - 150),
    };
  }, [activeLayout]);

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="px-6 py-5 md:px-10 md:py-7"
    >
      <div className="mx-auto max-w-[1540px] rounded-[32px] border border-[var(--ghost-border)] bg-[var(--paper)] px-5 py-4 md:px-8 md:py-5">
        <div className="flex flex-col gap-2 border-b border-[var(--ghost-border)] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[500px]">
            <h2 className="font-editorial text-[1.62rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-[2rem]">
              他们已经在用<span className="text-[var(--accent)]">书跃</span>
            </h2>
          </div>

        </div>

        <div
          className="relative mt-3 overflow-hidden rounded-[28px] border border-[var(--ghost-border)] bg-[linear-gradient(180deg,rgba(243,244,243,0.74)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 md:px-5 md:py-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            if (selectedIndex === null) {
              setHoveredIndex(null);
              setIsPaused(false);
            }
          }}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(211,231,219,0.22)] blur-3xl" />
          <div className="pointer-events-none absolute right-[-10%] top-[8%] h-[160px] w-[160px] rounded-full bg-[rgba(81,99,90,0.05)] blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(81,99,90,0.12)_0%,rgba(81,99,90,0.04)_42%,rgba(81,99,90,0)_72%)]" />

          <div className="hidden lg:block">
            <div className="relative h-[390px]">
              <div className="pointer-events-none absolute inset-0">
                {RING_SHAPES.map((shape, index) => {
                  const isActiveRing = activeLayout.ring === index;
                  return (
                    <div
                      key={`${shape.width}-${shape.height}`}
                      className="absolute left-1/2 top-1/2 rounded-full border transition-all duration-500"
                      style={{
                        width: `${shape.width}px`,
                        height: `${shape.height}px`,
                        transform: "translate(-50%, -50%)",
                        borderColor: isActiveRing
                          ? "rgba(81,99,90,0.26)"
                          : "rgba(47,51,51,0.06)",
                        boxShadow: isActiveRing
                          ? "0 0 0 10px rgba(211,231,219,0.12)"
                          : "none",
                        opacity: isEngaged && !isActiveRing ? 0.56 : 1,
                      }}
                    />
                  );
                })}

                <div
                  className="absolute left-1/2 top-1/2 h-[10px] origin-left rounded-full blur-[10px] transition-all duration-500"
                  style={{
                    width: `${Math.max(0, activeLine.width + 24)}px`,
                    transform: `translateY(-4px) rotate(${activeLine.angle}deg)`,
                    opacity: isEngaged ? 0.92 : 0.52,
                    background: isEngaged
                      ? "linear-gradient(90deg, rgba(186,221,200,0.58) 0%, rgba(186,221,200,0.38) 36%, rgba(81,99,90,0.08) 72%, rgba(81,99,90,0) 100%)"
                      : "linear-gradient(90deg, rgba(186,221,200,0.18) 0%, rgba(81,99,90,0) 100%)",
                  }}
                />

                <div
                  className="absolute left-1/2 top-1/2 h-[2.5px] origin-left rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0, activeLine.width)}px`,
                    transform: `translateY(-1px) rotate(${activeLine.angle}deg)`,
                    opacity: isEngaged ? 1 : 0.82,
                    background: isEngaged
                      ? "linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(186,221,200,0.9) 22%, rgba(81,99,90,0.5) 68%, rgba(81,99,90,0) 100%)"
                      : "linear-gradient(90deg, rgba(81,99,90,0.28) 0%, rgba(81,99,90,0.02) 100%)",
                  }}
                />

                <div
                  className="absolute z-[1] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 transition-all duration-500"
                  style={{
                    left: `calc(50% + ${activeLayout.x}px)`,
                    top: `calc(50% + ${activeLayout.y}px)`,
                    background: isEngaged
                      ? "radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(186,221,200,0.92) 48%, rgba(186,221,200,0.12) 100%)"
                      : "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(186,221,200,0.4) 60%, rgba(186,221,200,0) 100%)",
                    boxShadow: isEngaged
                      ? "0 0 0 9px rgba(186,221,200,0.14), 0 0 26px rgba(186,221,200,0.42)"
                      : "0 0 0 6px rgba(186,221,200,0.08)",
                  }}
                />
              </div>

              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                <article
                  key={displayIndex}
                  className="pointer-events-auto relative w-[420px] max-w-[calc(100%-2.5rem)] overflow-hidden rounded-[26px] border border-[rgba(47,51,51,0.06)] bg-[var(--ink)] px-5 py-3.5 text-white shadow-[0_26px_58px_rgba(47,51,51,0.22)] transition-all duration-500"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible
                      ? "scale(1)"
                      : "translateY(14px) scale(0.97)",
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_100%)]" />
                  <p className="relative font-editorial text-[1rem] font-semibold leading-[1.55] tracking-[-0.012em] text-white">
                    {activeTestimonial.quote}
                  </p>

                  <div className="relative mt-3.5 flex items-center gap-3 border-t border-white/10 pt-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(211,231,219,0.22)] text-sm font-semibold text-[var(--accent)] shadow-[0_0_0_6px_rgba(186,221,200,0.08)]">
                      {activeTestimonial.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">{activeTestimonial.name}</p>
                      <p className="truncate text-[10px] uppercase tracking-[0.12em] text-white/50">
                        {activeTestimonial.title}
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              {TESTIMONIALS.map((item, index) => {
                const layout = ORBIT_LAYOUT[index % ORBIT_LAYOUT.length];
                const isActive = index === displayIndex;

                return (
                  <div
                    key={item.name}
                    className="absolute left-1/2 top-1/2 z-10 transition-all duration-700"
                    style={{
                      left: `calc(50% + ${layout.x}px)`,
                      top: `calc(50% + ${layout.y}px)`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible
                        ? "translate(-50%, -50%) scale(1)"
                        : "translate(-50%, calc(-50% + 16px)) scale(0.94)",
                      transitionDelay: `${layout.delay}s`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleActivate(index)}
                      onMouseEnter={() => handlePreviewStart(index)}
                      onMouseLeave={handlePreviewEnd}
                      onFocus={() => handlePreviewStart(index)}
                      onBlur={handlePreviewEnd}
                      className={`testimonial-orbit-float group relative cursor-pointer overflow-hidden rounded-[21px] border px-4 py-3 text-left transition-all duration-300 ${
                        isActive
                          ? "border-[rgba(81,99,90,0.34)] bg-[rgba(255,255,255,0.99)] shadow-[0_22px_48px_rgba(47,51,51,0.16)]"
                          : "border-[rgba(47,51,51,0.08)] bg-[rgba(255,255,255,0.9)] shadow-[0_16px_36px_rgba(47,51,51,0.1)] hover:-translate-y-1 hover:border-[rgba(81,99,90,0.28)] hover:bg-white hover:shadow-[0_22px_48px_rgba(47,51,51,0.14)]"
                      }`}
                      style={{
                        animationDelay: `${layout.delay}s`,
                        opacity: isEngaged && !isActive ? 0.76 : 1,
                        transform: isActive ? "scale(1.06) translateY(-2px)" : undefined,
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 rounded-[21px] bg-[radial-gradient(circle_at_12%_18%,rgba(186,221,200,0.36)_0%,rgba(186,221,200,0.14)_28%,rgba(186,221,200,0)_64%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      {isActive ? (
                        <span className="absolute inset-0 rounded-[21px] shadow-[0_0_0_7px_rgba(186,221,200,0.22)]" />
                      ) : null}
                      <span
                        className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                          isActive
                            ? "bg-[var(--accent)] shadow-[0_0_0_7px_rgba(186,221,200,0.18)]"
                            : "bg-[rgba(81,99,90,0.18)] group-hover:bg-[var(--accent)] group-hover:shadow-[0_0_0_6px_rgba(186,221,200,0.16)]"
                        }`}
                      />

                      <div className="relative flex items-start gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                            isActive
                              ? "bg-[rgba(211,231,219,0.36)] text-[var(--accent)]"
                              : "bg-[var(--surface-low)] text-[var(--ink-soft)] group-hover:bg-[rgba(211,231,219,0.24)] group-hover:text-[var(--accent)]"
                          }`}
                        >
                          {item.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--ink)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                            {item.name}
                          </p>
                          <p className="mt-0.5 max-w-[118px] text-[9px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:hidden">
            <article className="relative overflow-hidden rounded-[24px] border border-[var(--ink)] bg-[var(--ink)] px-5 py-4 text-white shadow-[0_22px_48px_rgba(47,51,51,0.18)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_100%)]" />
              <p className="relative font-editorial text-[1.05rem] font-semibold leading-[1.62] tracking-[-0.01em] text-white">
                {activeTestimonial.quote}
              </p>

              <div className="relative mt-4 flex items-center gap-3 border-t border-white/10 pt-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(211,231,219,0.18)] text-sm font-semibold text-[var(--accent)]">
                  {activeTestimonial.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{activeTestimonial.name}</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.12em] text-white/50">
                    {activeTestimonial.title}
                  </p>
                </div>
              </div>
            </article>

            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
              {TESTIMONIALS.map((item, index) => {
                const isActive = index === displayIndex;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleActivate(index)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-left transition-all ${
                      index === displayIndex
                        ? "border-[rgba(81,99,90,0.22)] bg-[rgba(211,231,219,0.28)] text-[var(--ink)]"
                        : "border-[var(--ghost-border)] bg-white text-[var(--ink-soft)]"
                    }`}
                  >
                    <p className="text-[13px] font-semibold">{item.name}</p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      {item.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
