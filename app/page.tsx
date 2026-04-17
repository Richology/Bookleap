"use client";

import { useEffect, useRef, useState } from "react";
import { BookComparison } from "./components/landing/BookComparison";
import { FacetCarousel } from "./components/landing/FacetCarousel";
import { FAQ } from "./components/landing/FAQ";
import { NeedAHand } from "./components/landing/NeedAHand";
import { ScrollSection } from "./components/landing/ScrollSection";
import { Testimonials } from "./components/landing/Testimonials";
import { TopNav } from "./components/landing/TopNav";

const ANALYSIS_FACETS = [
  {
    title: "全书摘要",
    detail: "先抓住整本书到底在讲什么，而不是陷在零散细节里。",
  },
  {
    title: "阅读指南",
    detail: "告诉你先看哪里、重点看什么，让后续阅读更高效。",
  },
  {
    title: "观点地图",
    detail: "把一本书的逻辑骨架摊开，看清它的结构和主线。",
  },
  {
    title: "行动提炼",
    detail: "把书中的判断压缩成可以立刻执行的动作。",
  },
  {
    title: "观点校验",
    detail: "不是照单全收，而是帮你判断哪些观点适合你现在。",
  },
  {
    title: "思想溯源",
    detail: "看到一本书背后的来源、脉络和更深的认知框架。",
  },
];

const WORKBENCH_CARDS = [
  { kicker: "Main Surface", text: "以阅读区为中心，六项分析结果成为真正的主工作面，而不是被一堆功能卡片挤压。" },
  { kicker: "Side Context", text: "侧栏负责上传、状态、历史和动作，不抢主线，只提供清晰的次级上下文。" },
  { kicker: "Action Loop", text: "读完分析后继续训练、导出、分享，让\u201c读过\u201d真正进入可复用状态。" },
  { kicker: "Quiet Interface", text: "用纸面层次、排版和留白定义秩序，不依赖泛滥卡片、渐变或花哨装饰。" },
];

export default function LandingPage() {
  const [heroCardsRevealed, setHeroCardsRevealed] = useState(0);
  const [heroTextPhase, setHeroTextPhase] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const CARD_START = 400;
    const CARD_GAP = 120;
    for (let i = 1; i <= ANALYSIS_FACETS.length; i++) {
      timers.push(setTimeout(() => setHeroCardsRevealed(i), CARD_START + (i - 1) * CARD_GAP));
    }
    const textBase = CARD_START + ANALYSIS_FACETS.length * CARD_GAP + 200;
    timers.push(setTimeout(() => setHeroTextPhase(1), textBase));
    timers.push(setTimeout(() => setHeroTextPhase(2), textBase + 300));
    timers.push(setTimeout(() => setHeroTextPhase(3), textBase + 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const facetsRef = useRef<HTMLDivElement>(null);
  const [facetsVisible, setFacetsVisible] = useState(false);
  const facetsTriggered = useRef(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const [workbenchVisible, setWorkbenchVisible] = useState(false);
  const wbTriggered = useRef(false);

  useEffect(() => {
    const el = facetsRef.current;
    if (!el) return;
    const check = () => {
      if (facetsTriggered.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        facetsTriggered.current = true;
        setFacetsVisible(true);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, []);

  useEffect(() => {
    const el = workbenchRef.current;
    if (!el) return;
    const check = () => {
      if (wbTriggered.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        wbTriggered.current = true;
        setWorkbenchVisible(true);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <>
      <TopNav />

      <main className="archive-atmosphere relative overflow-x-clip text-[var(--ink)]">
        <div className="pointer-events-none absolute -left-40 top-24 h-[360px] w-[360px] rounded-full bg-[rgba(58,111,82,0.08)] blur-3xl" />
        <div className="pointer-events-none absolute right-[-160px] top-[220px] h-[440px] w-[440px] rounded-full bg-[rgba(119,124,123,0.1)] blur-3xl" />
        <section className="px-6 pb-16 pt-28 md:px-10 md:pb-24 md:pt-32">
          <div className="mx-auto grid max-w-[1540px] gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,0.95fr)] lg:items-center">
            <div className="max-w-[760px]">
              <h1 className="font-editorial text-[3.55rem] leading-[0.92] tracking-[-0.055em] text-[var(--ink)] sm:text-[4.5rem] lg:text-[6.7rem]">
                一本好书
                <span className="mt-3 block text-[0.62em] font-normal italic tracking-[-0.035em] text-[var(--ink)]">
                  一次清醒的决策
                </span>
              </h1>
              <p
                className="mt-8 max-w-[620px] text-base leading-8 text-[var(--ink-soft)] md:text-[1.05rem]"
                style={{
                  opacity: heroTextPhase >= 1 ? 1 : 0,
                  transform: heroTextPhase >= 1 ? "none" : "translateY(16px)",
                  filter: heroTextPhase >= 1 ? "blur(0)" : "blur(6px)",
                  transition: "opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease",
                }}
              >
                上传一本电子书，30 秒获取 6 张结构化知识卡片。卡片阅读、模拟训练、精华导出、海报分享即可完成一次跃迁
              </p>
              <div
                className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
                style={{
                  opacity: heroTextPhase >= 2 ? 1 : 0,
                  transform: heroTextPhase >= 2 ? "none" : "translateY(18px) scale(0.95)",
                  transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <a
                  href="/workspace"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--ink)] px-6 py-3.5 text-sm font-medium text-[#faf7f6] transition-all hover:opacity-92 active:scale-[0.98]"
                >
                  进入工作台
                  <span aria-hidden>↗</span>
                </a>
              </div>

              <div
                className="mt-14 max-w-[660px] border-t border-[var(--ghost-border)] pt-6"
                style={{
                  opacity: heroTextPhase >= 3 ? 1 : 0,
                  transform: heroTextPhase >= 3 ? "none" : "translateY(12px)",
                  transition: "opacity 0.6s ease, transform 0.6s ease",
                }}
              >
                <div className="rounded-[20px] bg-[var(--surface-low)] px-4 py-2.5 shadow-[var(--shadow-paper)]">
                  <div className="grid gap-0 sm:grid-cols-3">
                    {["无需注册", "本地存储", "30 秒出结果"].map((item, index) => (
                      <div
                        key={item}
                        className={`flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-[var(--ink)] ${
                          index > 0 ? "border-t border-[var(--ghost-border)] sm:border-l sm:border-t-0" : ""
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="archive-stack rounded-[30px] bg-[var(--surface-low)] p-4 md:p-8 lg:pl-10">
              <div className="grid gap-4 rounded-[26px] bg-[var(--paper-muted)] p-4 md:grid-cols-[minmax(0,1fr)_220px] md:p-7">
                <div className="archive-sheet flex min-h-[420px] flex-col rounded-[22px] p-6 md:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="archive-kicker">Curated Reading Object</p>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                      EPUB / PDF
                    </span>
                  </div>
                  <div className="mt-10 space-y-4">
                    <div className="h-[2px] w-14 bg-[var(--accent)]" />
                    <div className="h-3 w-[72%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                    <div className="h-3 w-[88%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                    <div className="h-3 w-[64%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                  </div>
                  <div className="mt-auto grid gap-3 pt-10 sm:grid-cols-3">
                    {ANALYSIS_FACETS.slice(0, 3).map((item, index) => (
                      <div
                        key={item.title}
                        className={`rounded-[18px] p-4 ${
                          index === 0 ? "archive-callout" : "bg-[var(--surface-low)]"
                        }`}
                      >
                        <p className="archive-kicker">0{index + 1}</p>
                        <p className="mt-3 text-sm font-medium text-[var(--ink)]">{item.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  
                  {ANALYSIS_FACETS.map((item, index) => (
                    <div
                      key={item.title}
                      className={`flex items-center justify-between rounded-[16px] px-4 py-3.5 transition-all duration-500 ${
                        index === 2
                          ? "archive-callout text-[var(--ink)]"
                          : "bg-[var(--paper)] text-[var(--ink-soft)]"
                      }`}
                      style={{
                        opacity: index < heroCardsRevealed ? 1 : 0,
                        transform: index < heroCardsRevealed ? "none" : "translateY(12px)",
                      }}
                    >
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-[11px] uppercase tracking-[0.14em] opacity-60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 六维分析：3D 圆柱旋转展示 ── */}
        <section
          ref={facetsRef}
          className="px-6 py-8 md:px-10 md:py-12"
          style={{
            opacity: facetsVisible ? 1 : 0,
            transform: facetsVisible ? "none" : "translateY(40px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="mx-auto max-w-[1540px] rounded-[32px] bg-[var(--surface-low)] px-6 py-10 md:px-10 md:py-14">
            <div className="mb-12 max-w-[760px]">
              <h2 className="font-editorial text-[2.3rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[3rem]">
                不是复制，是重建这本书的结构
              </h2>
            </div>
            <FacetCarousel items={ANALYSIS_FACETS} visible={facetsVisible} />
          </div>
        </section>

        <BookComparison />

        {/* ── 工作台介绍：左侧即时展示，右侧 4 卡依次入场 ── */}
        <section
          ref={workbenchRef}
          className="px-6 py-8 md:px-10 md:py-12"
          style={{
            opacity: workbenchVisible ? 1 : 0,
            transform: workbenchVisible ? "none" : "translateY(40px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="mx-auto grid max-w-[1540px] gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
            <div className="rounded-[30px] bg-[var(--ink)] px-6 py-8 text-[#faf7f6] md:px-8 md:py-10">
              <h2 className="font-editorial text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
                不是拆书工具，
                <br />
                是你的认知升级工作台
              </h2>
              <p className="mt-6 max-w-[460px] text-sm leading-7 text-white/70">
                上传、解析、阅读、训练、导出、分享，被重新组织成一套连续工作流，而不是彼此孤立的功能点。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {WORKBENCH_CARDS.map((card, i) => (
                <div
                  key={card.kicker}
                  className="rounded-[22px] bg-[var(--paper)] px-5 py-5"
                  style={{
                    opacity: workbenchVisible ? 1 : 0,
                    transform: workbenchVisible ? "none" : "translateY(24px)",
                    transition: `opacity 0.5s ease ${0.2 + i * 0.12}s, transform 0.5s ease ${0.2 + i * 0.12}s`,
                  }}
                >
                  <p className="archive-kicker">{card.kicker}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ScrollSection>
          <Testimonials />
        </ScrollSection>

        <ScrollSection>
          <FAQ />
        </ScrollSection>

        <ScrollSection>
          <section className="px-6 pb-20 pt-8 md:px-10 md:pb-24 md:pt-12">
            <div className="mx-auto grid max-w-[1440px] gap-8 rounded-xl bg-[var(--ink)] px-6 py-8 text-[#faf7f6] md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-10 md:py-12">
              <div>
                <h2 className="font-editorial text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.04em] text-white md:text-[3rem]">
                  把下一本书，整理进你的工作台
                </h2>
                <p className="mt-4 max-w-[560px] text-sm leading-7 text-white/70 md:text-base">
                  不用再等到"完整读完"才开始吸收。先让一本书变得清晰，再决定你要如何继续使用它。
                </p>
              </div>
              <a
                href="/workspace"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-medium text-[var(--ink)] transition-all hover:bg-white/92 active:scale-[0.98]"
              >
                立即开始
                <span aria-hidden>↗</span>
              </a>
            </div>
          </section>
        </ScrollSection>

        <ScrollSection>
          <footer className="px-6 pb-8 md:px-10">
            <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-2 py-6 text-[12px] text-[var(--ink-faint)] md:flex-row md:items-center md:gap-4">
              <p>书跃 · BookLeap</p>
              <span className="hidden md:inline">·</span>
              <a
                href="https://richology.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded-md border border-transparent px-1.5 py-0.5 text-[var(--ink-soft)] underline decoration-[var(--ghost-border)] decoration-1 underline-offset-4 transition-colors hover:border-[var(--ghost-border)] hover:bg-[var(--surface-low)] hover:text-[var(--ink)] hover:decoration-[var(--accent)]"
              >
                由 安瑟A11BERICH构建 · 了解开发者
              </a>
            </div>
          </footer>
        </ScrollSection>
      </main>

      <NeedAHand />
    </>
  );
}
