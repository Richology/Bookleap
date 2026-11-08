"use client";

import Link from "next/link";
import { BrandLogo } from "./components/BrandLogo";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookComparison } from "./components/landing/BookComparison";
import { JsonLd } from "./components/JsonLd";
import { BookLeapCTA } from "./components/landing/BookLeapCTA";
import { FacetCarousel } from "./components/landing/FacetCarousel";
import { FAQ, FAQ_ITEMS } from "./components/landing/FAQ";
import { NeedAHand } from "./components/landing/NeedAHand";
import { ScrollSection } from "./components/landing/ScrollSection";
import { Testimonials } from "./components/landing/Testimonials";
import { WorkbenchStory } from "./components/landing/WorkbenchStory";
import { LibraryArrival } from "./components/landing/LibraryArrival";
import { buildFaqJsonLd, buildHomeJsonLd } from "@/lib/seo";

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

const HERO_TITLE_LINES = ["让一本好书", "变成一次清醒的决策"];

const HERO_FEATURES = [
  { title: "卡片阅读", detail: "把核心观点拆成可回顾的知识卡" },
  { title: "精华导出", detail: "把值得留下的内容整理成文档" },
  { title: "决策训练", detail: "把书中判断转成现实情境练习" },
  { title: "海报分享", detail: "生成适合分享的读书海报" },
];

const NAV_ITEMS = [
  { label: "产品介绍", anchor: "#comparison" },
  { label: "用户评价", anchor: "#testimonials" },
  { label: "常见问题", anchor: "#faq" },
];

function HomeV2Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#faf9f8]/92 backdrop-blur-xl"
          : "bg-[#faf9f8]/82 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-2 px-4 py-4 sm:px-6 md:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            aria-label="书跃 BookLeap 首页"
            className="flex shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          >
            <BrandLogo variant="color" />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-5 md:gap-8">
          <div className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.anchor}
                href={item.anchor}
                className="font-editorial text-[1.02rem] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .querySelector(item.anchor)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
          <a
            href="https://github.com/Richology/Bookleap"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="去 GitHub 给书跃点个 Star（新标签页打开）"
            title="喜欢书跃？去 GitHub 点个 Star"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-black/5 hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
          <Link
            href="/workspace"
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[#faf7f6] transition-all hover:opacity-92 active:scale-[0.97]"
          >
            进入工作台
          </Link>
        </div>
      </div>
    </nav>
  );
}

function ClosingShelfTexture() {
  return <div className="closing-shelf-texture" aria-hidden="true" />;
}

export default function HomeV2Page() {
  const [heroTextPhase, setHeroTextPhase] = useState(0);
  const [introTextStarted, setIntroTextStarted] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const startIntroText = useCallback(() => setIntroTextStarted(true), []);
  const finishIntro = useCallback(() => setIntroComplete(true), []);

  useEffect(() => {
    if (!introTextStarted) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setHeroTextPhase(1), 120));
    return () => timers.forEach(clearTimeout);
  }, [introTextStarted]);

  useEffect(() => {
    if (!introComplete) return;
    const timer = setTimeout(() => setHeroTextPhase(2), 320);
    return () => clearTimeout(timer);
  }, [introComplete]);

  const facetsRef = useRef<HTMLDivElement>(null);
  const [facetsVisible, setFacetsVisible] = useState(false);
  const facetsTriggered = useRef(false);

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

  return (
    <>
      <LibraryArrival
        onTitleReveal={startIntroText}
        onComplete={finishIntro}
      />
      <JsonLd data={buildHomeJsonLd()} />
      <JsonLd data={buildFaqJsonLd(FAQ_ITEMS)} />
      <HomeV2Nav />

      <main className="archive-atmosphere relative overflow-x-clip text-[var(--ink)]">
        <section className="relative min-h-[calc(100vh-72px)] px-6 pb-16 pt-24 md:px-10 md:pb-20 md:pt-28">
          <div className="relative mx-auto flex min-h-[calc(100vh-144px)] max-w-[1540px] flex-col items-center justify-center text-center">
            <div className="max-w-[980px]">
              <h1
                className={`font-editorial text-[2.45rem] font-semibold leading-[1.06] text-[var(--ink)] sm:text-[4rem] lg:text-[5.4rem] ${introTextStarted ? "relative z-[101]" : ""}`}
                aria-label="让一本好书 变成一次清醒的决策"
                style={{
                  color: introTextStarted && !introComplete ? "oklch(93% 0.014 85)" : "var(--ink)",
                  transition: "color 640ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {HERO_TITLE_LINES.map((line, lineIndex) => {
                  const offset = HERO_TITLE_LINES.slice(0, lineIndex).join("").length;
                  return (
                    <span
                      key={line}
                      className={`block ${lineIndex === 1 ? "mt-3" : ""}`}
                      aria-hidden="true"
                    >
                      {Array.from(line).map((char, charIndex) => (
                        <span
                          key={`${line}-${charIndex}`}
                          className="inline-block"
                          style={{
                            opacity: heroTextPhase >= 1 ? 1 : 0,
                            transform: heroTextPhase >= 1 ? "none" : "translateY(0.18em)",
                            filter: heroTextPhase >= 1 ? "blur(0)" : "blur(4px)",
                            transition:
                              "opacity 0.42s ease, transform 0.42s ease, filter 0.42s ease",
                            transitionDelay: `${(offset + charIndex) * 72}ms`,
                          }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  );
                })}
              </h1>
              <p
                className="mx-auto mt-7 max-w-[660px] text-base leading-8 text-[var(--ink-soft)] md:text-[1.08rem]"
                style={{
                  opacity: heroTextPhase >= 2 ? 1 : 0,
                  transform: heroTextPhase >= 2 ? "none" : "translateY(16px)",
                  filter: heroTextPhase >= 2 ? "blur(0)" : "blur(6px)",
                  transition: "opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease",
                }}
              >
                上传一本电子书，30 秒获取 6 张结构化的内容精华卡片
              </p>
              <div
                className="mt-8 flex flex-col items-center gap-4"
                style={{
                  opacity: heroTextPhase >= 2 ? 1 : 0,
                  transform: heroTextPhase >= 2 ? "none" : "translateY(18px) scale(0.95)",
                  transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <BookLeapCTA href="/workspace">上传一本书，开始体验</BookLeapCTA>
              </div>
            </div>

          </div>
        </section>

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
            <div className="mb-12 max-w-[980px]">
              <h2 className="font-editorial text-[2.1rem] font-semibold leading-[1.12] tracking-[-0.035em] text-[var(--ink)] md:text-[2.65rem]">
                6 张内容精华卡片，重建一本好书
              </h2>
            </div>
            <FacetCarousel items={ANALYSIS_FACETS} visible={facetsVisible} />
          </div>
        </section>

        <BookComparison />

        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto max-w-[1440px] rounded-[32px] bg-[var(--surface-low)] px-6 py-10 md:px-10 md:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <h2 className="mt-4 font-editorial text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-[3.1rem]">
                  把一本书，
                  <br />
                  用到你的真实问题里
                </h2>
                <p className="mt-5 max-w-[520px] text-sm leading-7 text-[var(--ink-soft)] md:text-base md:leading-8">
                  书跃不是把内容切碎给你看，而是把阅读后的理解、复用、训练和表达串成一个连续工作流。
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {HERO_FEATURES.map((item, index) => (
                  <div key={item.title} className="rounded-[18px] bg-[var(--paper)] p-5 shadow-[var(--shadow-paper)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--accent)]">
                        0{index + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-[var(--ink)]">{item.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <WorkbenchStory />

        <ScrollSection>
          <Testimonials />
        </ScrollSection>

        <ScrollSection>
          <FAQ />
        </ScrollSection>

        <ScrollSection>
          <section className="px-6 pb-20 pt-8 md:px-10 md:pb-24 md:pt-12">
            <div className="bookleap-closing-cta relative mx-auto flex min-h-[380px] max-w-[1440px] flex-col items-center justify-center overflow-hidden rounded-xl bg-[var(--ink)] px-6 pb-16 pt-28 text-center text-[#faf7f6] md:min-h-[460px] md:px-10 md:pb-20 md:pt-32">
              <ClosingShelfTexture />
              <div className="relative z-10 max-w-[900px]">
                <h2 className="font-editorial text-[2.5rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white md:text-[3.25rem]">
                  「时间才是我们成长时付出的最大成本」
                </h2>
                <p className="mx-auto mt-5 max-w-[560px] text-sm leading-7 text-white/75 md:text-base">
                  现在就把一本书，整理进你的工作台
                </p>
              </div>
              <div className="relative z-10 mt-8">
                <BookLeapCTA href="/workspace" tone="paper">
                  立即开始
                </BookLeapCTA>
              </div>
            </div>
          </section>
        </ScrollSection>

        <ScrollSection>
          <footer className="px-6 pb-8 md:px-10">
            <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-2 py-6 text-[12px] text-[var(--ink-faint)] md:flex-row md:items-center">
              <p>书跃 · BookLeap · 从好书中完成认知跃迁</p>
              <a href="https://github.com/Richology/Bookleap" target="_blank" rel="noreferrer" className="underline underline-offset-4">源码 · AGPL-3.0</a>
              <a
                href="https://richology.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded-md border border-transparent px-1.5 py-0.5 pr-20 text-[var(--ink-soft)] underline decoration-[var(--ghost-border)] decoration-1 underline-offset-4 transition-colors hover:border-[var(--ghost-border)] hover:bg-[var(--surface-low)] hover:text-[var(--ink)] hover:decoration-[var(--accent)] md:pr-24"
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
