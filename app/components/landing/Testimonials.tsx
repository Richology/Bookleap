"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TESTIMONIALS = [
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
      "作为一个教育工作者，我会向学生强力推荐这个网站。不同于NotebookLM和ima这样的知识库，书跃展示了一种思维方式，为阅读者提供了地图而非答案。对\u201cAI时代如何读书\u201d这个问题，书跃给出了具有启发性的回答。",
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
];

export function Testimonials() {
  const [isRailPaused, setIsRailPaused] = useState(false);
  const railViewportRef = useRef<HTMLDivElement>(null);

  const { featured, notes } = useMemo(() => {
    const idx = Math.floor(Math.random() * TESTIMONIALS.length);
    const f = TESTIMONIALS[idx];
    const rest = [...TESTIMONIALS.slice(0, idx), ...TESTIMONIALS.slice(idx + 1)];
    return { featured: f, notes: rest };
  }, []);

  const loopedNotes = notes.length > 1 ? [...notes, ...notes] : notes;

  useEffect(() => {
    const rail = railViewportRef.current;
    if (!rail || notes.length <= 1) return;

    let frameId = 0;
    let lastTs = 0;
    const pixelsPerSecond = 28;

    const tick = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;

      const loopHeight = rail.scrollHeight / 2;
      if (!isRailPaused && loopHeight > 0) {
        rail.scrollTop += (pixelsPerSecond * delta) / 1000;
        if (rail.scrollTop >= loopHeight) {
          rail.scrollTop -= loopHeight;
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isRailPaused, notes.length]);

  return (
    <section id="testimonials" className="px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1540px] rounded-[32px] border border-[var(--ghost-border)] bg-[var(--paper)] px-6 py-6 md:px-10 md:py-8">
        <div className="flex flex-col gap-2 border-b border-[var(--ghost-border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-editorial text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--ink)] md:text-[2.5rem]">
              他们已经在用<span className="text-[var(--accent)]">书跃</span>
            </h2>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Featured quote */}
          <article className="self-start rounded-[20px] border border-[var(--ink)] bg-[var(--ink)] px-5 py-5 md:px-6 md:py-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_140px]">
              <div className="min-w-0">
                <svg
                  className="mb-3 h-5 w-5 text-[var(--accent)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.3 2.6C6.1 5.1 3 9.8 3 15v6h8v-8H7c0-3.3 2-6.1 4.8-7.4L11.3 2.6zM23.3 2.6C18.1 5.1 15 9.8 15 15v6h8v-8h-4c0-3.3 2-6.1 4.8-7.4L23.3 2.6z" />
                </svg>
                <p className="font-editorial text-[1.1rem] font-semibold leading-[1.55] tracking-[-0.01em] text-white md:text-[1.25rem]">
                  {featured.quote}
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[var(--accent)] text-xs font-semibold text-white">
                    {featured.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{featured.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">{featured.title}</p>
                  </div>
                </div>
              </div>

              <div className="hidden border-l border-white/10 pl-5 lg:flex lg:flex-col lg:justify-between">
                <p className="archive-kicker text-[var(--accent)]">Featured</p>
                <p className="font-editorial text-[2rem] font-semibold tracking-[-0.06em] text-white/14">
                  01
                </p>
              </div>
            </div>
          </article>

          {/* Auto-scrolling rail */}
          <div className="flex flex-col rounded-[20px] border border-[var(--ghost-border)] bg-[var(--surface-low)] p-2.5">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="archive-kicker text-[var(--accent)]">More Notes</p>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                {notes.length}
              </span>
            </div>

            <div
              ref={railViewportRef}
              className="no-scrollbar min-h-0 max-h-[320px] flex-1 space-y-2 overflow-y-auto pr-1"
              onMouseEnter={() => setIsRailPaused(true)}
              onMouseLeave={() => setIsRailPaused(false)}
            >
              {loopedNotes.map((t, index) => (
                <article
                  key={`${t.name}-${index}`}
                  className="rounded-[14px] border border-[var(--ghost-border)] bg-[var(--paper)] px-3.5 py-3"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--accent-soft)] text-[10px] font-semibold text-[var(--accent)]">
                      {t.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--ink)]">{t.name}</p>
                      <p className="truncate text-[9px] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{t.title}</p>
                    </div>
                  </div>
                  <p className="text-[12px] leading-[18px] text-[var(--ink-soft)]">
                    {t.quote}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
