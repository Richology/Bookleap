"use client";

import { useEffect, useRef, useState } from "react";

type HotspotId = "main" | "sidebar" | "actions" | "ledger";

type WorkbenchHotspot = {
  id: HotspotId;
  badge: string;
  title: string;
  text: string;
  cardPosition: string;
  areaPosition: string;
  pulseDelay: string;
};

const HOTSPOTS: WorkbenchHotspot[] = [
  {
    id: "main",
    badge: "02",
    title: "阅读区",
    text: "书名、阅读状态和正文被放进中心阅读区，进入后立刻知道自己正在读什么、当前处在什么模式。",
    cardPosition:
      "left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2",
    areaPosition: "left-[28%] top-[26%] h-[34%] w-[40%]",
    pulseDelay: "0s",
  },
  {
    id: "sidebar",
    badge: "01",
    title: "上传区",
    text: "上传入口和上传进度保持清晰可见，开始分析前就能知道文件是否已接收、解析走到哪一步。",
    cardPosition: "left-5 bottom-5",
    areaPosition: "left-[4%] top-[22%] h-[58%] w-[18%]",
    pulseDelay: "0.25s",
  },
  {
    id: "actions",
    badge: "03",
    title: "功能区",
    text: "卡片阅读、沉浸阅读、导出、分享收进顶部动作区，读完之后立刻进入训练与复用。",
    cardPosition: "right-5 top-[72px]",
    areaPosition: "right-[6%] top-[6%] h-[18%] w-[26%]",
    pulseDelay: "0.45s",
  },
  {
    id: "ledger",
    badge: "04",
    title: "成长记录区",
    text: "能力账本把思考力、表达力、决策力记录成可回看的真实成长印记，而不是一套空洞积分。",
    cardPosition: "right-5 bottom-5",
    areaPosition: "right-[3%] top-[24%] h-[60%] w-[19%]",
    pulseDelay: "0.65s",
  },
];

const LEDGER_ROWS = [
  { label: "思考力", value: 64, accent: "rgba(186,221,200,0.92)" },
  { label: "表达力", value: 38, accent: "rgba(211,231,219,0.84)" },
  { label: "决策力", value: 52, accent: "rgba(255,255,255,0.72)" },
];

function FloatingCard({
  hotspot,
  mobile = false,
  visible = true,
}: {
  hotspot: WorkbenchHotspot;
  mobile?: boolean;
  visible?: boolean;
}) {
  if (hotspot.id === "ledger") {
    return (
      <div
        className={`${
          mobile
            ? "w-full"
            : `pointer-events-none absolute w-[288px] ${hotspot.cardPosition}`
        }`}
      >
        <div
          className={`rounded-[24px] border border-white/10 bg-[rgba(47,51,51,0.96)] p-4 text-white shadow-[0_28px_60px_rgba(47,51,51,0.28)] transition-[opacity,transform] duration-220 ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-editorial text-[1.28rem] font-semibold tracking-[-0.03em] text-white">
                {hotspot.title}
              </h3>
            </div>
            <span className="rounded-full bg-[rgba(186,221,200,0.14)] px-2.5 py-1 text-[11px] font-medium text-[rgba(186,221,200,0.92)]">
              {hotspot.badge}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-white/72">
            {hotspot.text}
          </p>
          <div className="mt-4 h-px w-14 bg-[rgba(186,221,200,0.32)]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        mobile
          ? "w-full"
          : `pointer-events-none absolute w-[276px] ${hotspot.cardPosition}`
      }`}
    >
      <div
        className={`rounded-[24px] border border-white/10 bg-[rgba(47,51,51,0.96)] p-4 text-white shadow-[0_28px_60px_rgba(47,51,51,0.28)] transition-[opacity,transform] duration-220 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-editorial text-[1.18rem] font-semibold tracking-[-0.03em] text-white">
              {hotspot.title}
            </h3>
          </div>
          <span className="rounded-full bg-[rgba(186,221,200,0.14)] px-2.5 py-1 text-[11px] font-medium text-[rgba(186,221,200,0.92)]">
            {hotspot.badge}
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-white/72">
          {hotspot.text}
        </p>
        <div className="mt-4 h-px w-14 bg-[rgba(186,221,200,0.32)]" />
      </div>
    </div>
  );
}

export function WorkbenchStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);
  const [mobileHotspot, setMobileHotspot] = useState<HotspotId | null>(null);
  const [renderHotspot, setRenderHotspot] = useState<HotspotId | null>(null);
  const [isHotspotCardVisible, setIsHotspotCardVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.intersectionRatio > 0.22);
      },
      { threshold: [0.12, 0.22, 0.4, 0.6] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeHotspot) {
      setRenderHotspot(activeHotspot);
      const raf = window.requestAnimationFrame(() => {
        setIsHotspotCardVisible(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }

    setIsHotspotCardVisible(false);

    if (!renderHotspot) return;

    const timeout = window.setTimeout(() => {
      setRenderHotspot(null);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [activeHotspot, renderHotspot]);

  const hoveredFeature =
    HOTSPOTS.find((hotspot) => hotspot.id === renderHotspot) ?? null;
  const mobileFeature =
    HOTSPOTS.find((hotspot) => hotspot.id === mobileHotspot) ?? null;

  return (
    <section
      ref={sectionRef}
      className="px-6 py-10 md:px-10 md:py-12"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="hidden min-h-[calc(100svh-112px)] items-center gap-12 xl:grid xl:grid-cols-[340px_minmax(0,1fr)]">
          <div
            className={`transition-all duration-700 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <h2 className="font-editorial text-[3rem] font-semibold leading-[0.94] tracking-[-0.05em] text-[var(--ink)] 2xl:text-[3.35rem]">
              不是拆书工具，
              <br />
              是你的认知升级工作台
            </h2>
            <p className="mt-6 max-w-[320px] text-[1rem] leading-8 text-[var(--ink-soft)]">
              上传、解析、阅读、训练、导出、分享，被重新组织成一套连续工作流，而不是彼此孤立的功能点。
            </p>
          </div>

          <div
            className={`transition-all duration-700 delay-100 ${
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-10 scale-[0.97] opacity-0"
            }`}
          >
            <div
              className="relative h-[min(68vh,560px)] min-h-[470px] overflow-hidden rounded-[34px] bg-[var(--ink)] p-4 shadow-[0_28px_72px_rgba(47,51,51,0.16)]"
              onMouseLeave={() => setActiveHotspot(null)}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(186,221,200,0.08)_0%,rgba(186,221,200,0)_32%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_22%)]" />

              <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(47,51,51,0.08)] bg-[linear-gradient(180deg,rgba(248,247,244,0.98)_0%,rgba(240,239,235,0.98)_100%)] p-4 text-[var(--ink)]">
                <div className="flex items-center justify-between gap-3 border-b border-[rgba(47,51,51,0.08)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(47,51,51,0.18)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(47,51,51,0.12)]" />
                  </div>
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition-all duration-300 ${
                      activeHotspot === "actions"
                        ? "bg-[rgba(186,221,200,0.22)] shadow-[0_0_0_8px_rgba(186,221,200,0.12)]"
                        : ""
                    }`}
                  >
                    {["卡片阅读", "沉浸阅读", "导出", "分享"].map((item) => (
                      <span
                        key={item}
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] transition-all duration-300 ${
                          activeHotspot === "actions"
                            ? "border-[rgba(81,99,90,0.26)] bg-[rgba(186,221,200,0.28)] text-[var(--accent)]"
                            : "border-[rgba(47,51,51,0.08)] bg-white/74 text-[var(--ink-faint)]"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid min-h-0 flex-1 grid-cols-[164px_minmax(0,1fr)_184px] gap-3">
                  <aside
                    className={`rounded-[22px] border bg-white/74 p-3 transition-all duration-300 ${
                      activeHotspot === "sidebar"
                        ? "border-[rgba(81,99,90,0.26)] shadow-[0_0_0_10px_rgba(186,221,200,0.14)]"
                        : "border-[rgba(47,51,51,0.05)]"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="rounded-[16px] bg-[var(--surface-low)] p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="h-2 w-16 rounded-full bg-[rgba(47,51,51,0.18)]" />
                          <div className="rounded-full bg-white/86 px-2 py-1 text-[9px] font-medium text-[var(--ink-faint)]">
                            EPUB
                          </div>
                        </div>
                        <div className="relative rounded-[12px] border border-dashed border-[rgba(81,99,90,0.2)] bg-white/88 px-3 py-4">
                          <span className="absolute left-3 top-3 h-2 w-2 rounded-full bg-[rgba(186,221,200,0.62)]" />
                          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[rgba(186,221,200,0.62)]" />
                          <span className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-[rgba(186,221,200,0.62)]" />
                          <span className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-[rgba(186,221,200,0.62)]" />
                          <div className="flex flex-col items-center justify-center text-center">
                            <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(186,221,200,0.18)]">
                              <span className="absolute top-1.5 h-1.5 w-1.5 rounded-full bg-[#f29f97]" />
                              <span className="h-3.5 w-4 rounded-[2px_2px_5px_5px] bg-[linear-gradient(180deg,#f3f4f3_0%,#d5dde0_100%)]" />
                              <span className="absolute bottom-[9px] h-2 w-5 rounded-b-[5px] bg-[rgba(93,145,222,0.6)]" />
                            </span>
                            <div className="mt-3 space-y-1.5">
                              <div className="mx-auto h-2.5 w-[88px] rounded-full bg-[rgba(47,51,51,0.16)]" />
                              <div className="mx-auto h-2.5 w-[76px] rounded-full bg-[rgba(47,51,51,0.16)]" />
                              <div className="mx-auto h-2 w-[94px] rounded-full bg-[rgba(47,51,51,0.08)]" />
                              <div className="mx-auto h-2 w-[68px] rounded-full bg-[rgba(47,51,51,0.08)]" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[var(--surface-low)] p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="h-2 w-14 rounded-full bg-[rgba(47,51,51,0.18)]" />
                          <div className="rounded-full bg-[rgba(186,221,200,0.22)] px-2 py-1 text-[9px] font-medium text-[var(--accent)]">
                            72%
                          </div>
                        </div>
                        <div className="rounded-[12px] bg-white/92 px-3 py-3">
                          <div className="h-2.5 w-[76%] rounded-full bg-[rgba(47,51,51,0.14)]" />
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(47,51,51,0.08)]">
                            <div className="h-full w-[72%] rounded-full bg-[rgba(81,99,90,0.48)]" />
                          </div>
                          <div className="mt-2.5 space-y-1.5">
                            <div className="h-2 w-[92%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                            <div className="h-2 w-[68%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[var(--surface-low)] p-3">
                        <div className="mb-2 h-2 w-14 rounded-full bg-[rgba(47,51,51,0.18)]" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-11 rounded-[12px] bg-white/88" />
                          <div className="h-11 rounded-[12px] bg-white/88" />
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="grid min-h-0 grid-rows-[minmax(0,0.54fr)_minmax(0,0.46fr)] gap-3">
                    <section
                      className={`rounded-[24px] border bg-white/82 p-4 transition-all duration-300 ${
                        activeHotspot === "main"
                          ? "border-[rgba(81,99,90,0.26)] shadow-[0_0_0_10px_rgba(186,221,200,0.14)]"
                          : "border-[rgba(47,51,51,0.05)]"
                      }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="h-3 w-28 rounded-full bg-[rgba(47,51,51,0.14)]" />
                            <div className="mt-2 h-2 w-[4.5rem] rounded-full bg-[rgba(47,51,51,0.08)]" />
                          </div>
                          <div className="flex gap-1.5">
                            <span
                              className={`h-8 w-[88px] rounded-full border transition-all duration-300 ${
                                activeHotspot === "main"
                                  ? "border-[rgba(81,99,90,0.24)] bg-[rgba(186,221,200,0.28)]"
                                  : "border-[rgba(47,51,51,0.06)] bg-[var(--surface-low)]"
                              }`}
                            />
                            <span className="h-8 w-[68px] rounded-full border border-[rgba(47,51,51,0.06)] bg-[var(--surface-low)]" />
                          </div>
                        </div>
                        <div className="mt-4 rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(245,244,240,0.86)_100%)] p-4">
                          <div className="mb-3 h-4 w-[54%] rounded-full bg-[rgba(47,51,51,0.16)]" />
                          <div className="mb-4 h-2.5 w-[24%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                          <div className="space-y-2">
                            <div className="h-2.5 w-[96%] rounded-full bg-[rgba(47,51,51,0.1)]" />
                            <div className="h-2.5 w-[91%] rounded-full bg-[rgba(47,51,51,0.1)]" />
                          <div className="h-2.5 w-[88%] rounded-full bg-[rgba(47,51,51,0.1)]" />
                          <div className="h-2.5 w-[74%] rounded-full bg-[rgba(47,51,51,0.1)]" />
                        </div>
                      </div>
                    </section>

                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-[18px] bg-white/74 p-3 shadow-[inset_0_0_0_1px_rgba(47,51,51,0.03)]"
                        >
                          <div className="mb-2 h-2 w-10 rounded-full bg-[rgba(47,51,51,0.16)]" />
                          <div className="space-y-1.5">
                            <div className="h-2 rounded-full bg-[rgba(47,51,51,0.08)]" />
                            <div className="h-2 w-[84%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <aside
                    className={`rounded-[22px] border bg-[rgba(47,51,51,0.96)] p-3.5 text-white transition-all duration-300 ${
                      activeHotspot === "ledger"
                        ? "border-[rgba(186,221,200,0.34)] shadow-[0_0_0_10px_rgba(186,221,200,0.12)]"
                        : "border-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="archive-kicker text-white/46">能力账本</p>
                      <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-medium text-white/62">
                        持续进化中
                      </span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {LEDGER_ROWS.map((row) => (
                        <div
                          key={row.label}
                          className="rounded-[16px] bg-white/6 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[12px] font-medium text-white/82">
                              {row.label}
                            </p>
                            <p className="text-[10px] text-white/50">
                              {row.value}/100
                            </p>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${row.value}%`,
                                background: row.accent,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>

              {HOTSPOTS.map((hotspot) => {
                const isActive = hotspot.id === activeHotspot;

                return (
                  <button
                    key={hotspot.id}
                    type="button"
                    aria-label={hotspot.title}
                    onMouseEnter={() => setActiveHotspot(hotspot.id)}
                    onMouseLeave={() => setActiveHotspot(null)}
                    onFocus={() => setActiveHotspot(hotspot.id)}
                    onBlur={() => setActiveHotspot(null)}
                    className={`group absolute z-20 cursor-pointer rounded-[28px] transition-transform duration-300 focus:outline-none ${
                      isActive ? "scale-[1.02]" : "hover:scale-[1.02]"
                    } ${hotspot.areaPosition}`}
                  >
                    <span
                      className={`absolute inset-0 rounded-[28px] transition-all duration-300 ${
                        isActive
                          ? "bg-[radial-gradient(circle_at_center,rgba(186,221,200,0.22)_0%,rgba(186,221,200,0.08)_34%,rgba(186,221,200,0)_72%)]"
                          : "bg-[radial-gradient(circle_at_center,rgba(186,221,200,0.12)_0%,rgba(186,221,200,0.04)_34%,rgba(186,221,200,0)_72%)] opacity-80 group-hover:bg-[radial-gradient(circle_at_center,rgba(186,221,200,0.18)_0%,rgba(186,221,200,0.06)_38%,rgba(186,221,200,0)_72%)]"
                      }`}
                    />
                    <span
                      className={`absolute inset-[10%] rounded-[24px] transition-opacity duration-300 ${
                        isActive
                          ? "opacity-100"
                          : "opacity-35 group-hover:opacity-65"
                      }`}
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)",
                      }}
                    />
                    <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                      <span
                        className={`absolute rounded-full border border-[rgba(186,221,200,0.3)] ${
                          isVisible ? "animate-ping" : ""
                        }`}
                        style={{
                          width: isActive ? "56px" : "48px",
                          height: isActive ? "56px" : "48px",
                          animationDelay: hotspot.pulseDelay,
                          animationDuration: "1.9s",
                        }}
                      />
                      <span
                        className={`absolute rounded-full border transition-all duration-300 ${
                          isActive
                            ? "h-10 w-10 border-[rgba(186,221,200,0.82)] bg-[rgba(58,111,82,0.22)] shadow-[0_0_0_14px_rgba(186,221,200,0.22)]"
                            : "h-8 w-8 border-[rgba(81,99,90,0.34)] bg-white/92 shadow-[0_0_0_12px_rgba(255,255,255,0.12)] group-hover:h-9 group-hover:w-9 group-hover:border-[rgba(186,221,200,0.72)] group-hover:bg-[rgba(58,111,82,0.16)]"
                        }`}
                      />
                      <span
                        className={`relative rounded-full transition-all duration-300 ${
                          isActive
                            ? "h-3.5 w-3.5 bg-white"
                            : "h-3 w-3 bg-[var(--accent)] group-hover:h-3.5 group-hover:w-3.5"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}

              {hoveredFeature ? (
                <FloatingCard
                  hotspot={hoveredFeature}
                  visible={isHotspotCardVisible}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="xl:hidden">
          <div
            className={`transition-all duration-700 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <h2 className="font-editorial text-[2.35rem] font-semibold leading-[0.96] tracking-[-0.045em] text-[var(--ink)]">
              不是拆书工具，
              <br />
              是你的认知升级工作台
            </h2>
            <p className="mt-5 max-w-[620px] text-[0.98rem] leading-7 text-[var(--ink-soft)]">
              上传、解析、阅读、训练、导出、分享，被重新组织成一套连续工作流，而不是彼此孤立的功能点。
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] bg-[var(--ink)] p-3.5 shadow-[0_24px_56px_rgba(47,51,51,0.14)]">
            <div className="overflow-hidden rounded-[22px] border border-[rgba(47,51,51,0.08)] bg-[linear-gradient(180deg,rgba(248,247,244,0.98)_0%,rgba(240,239,235,0.98)_100%)] p-3">
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(47,51,51,0.08)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="h-2 w-2 rounded-full bg-[rgba(47,51,51,0.18)]" />
                  <span className="h-2 w-2 rounded-full bg-[rgba(47,51,51,0.12)]" />
                </div>
                <div className="flex items-center gap-1">
                  {["卡片阅读", "沉浸阅读", "导出", "分享"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[rgba(47,51,51,0.08)] bg-white/74 px-2 py-0.5 text-[8px] font-medium tracking-[0.08em] text-[var(--ink-faint)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] gap-2.5">
                <div className="space-y-2 rounded-[16px] bg-white/72 p-2.5">
                  <div className="h-10 rounded-[12px] bg-[var(--surface-low)]" />
                  <div className="h-10 rounded-[12px] bg-[var(--surface-low)]" />
                  <div className="h-10 rounded-[12px] bg-[var(--surface-low)]" />
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-[18px] bg-white/82 p-3">
                    <div className="mb-3 h-3 w-20 rounded-full bg-[rgba(47,51,51,0.16)]" />
                    <div className="space-y-2">
                      <div className="h-2.5 rounded-full bg-[rgba(47,51,51,0.08)]" />
                      <div className="h-2.5 w-[88%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                      <div className="h-2.5 w-[74%] rounded-full bg-[rgba(47,51,51,0.08)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[14px] bg-white/72 p-2.5"
                      >
                        <div className="mb-2 h-2 w-10 rounded-full bg-[rgba(47,51,51,0.16)]" />
                        <div className="h-2 rounded-full bg-[rgba(47,51,51,0.08)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {HOTSPOTS.map((hotspot) => {
              const isActive = hotspot.id === mobileHotspot;

              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() =>
                    setMobileHotspot((current) =>
                      current === hotspot.id ? null : hotspot.id
                    )
                  }
                  className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-all duration-300 ${
                    isActive
                      ? "border-[rgba(81,99,90,0.24)] bg-[rgba(186,221,200,0.16)]"
                      : "border-[var(--ghost-border)] bg-[var(--paper)]"
                  }`}
                >
                  <div>
                    <p className="archive-kicker text-[var(--ink-faint)]">
                      {hotspot.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink)]">
                      {hotspot.badge}
                    </p>
                  </div>
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span
                      className={`absolute h-5 w-5 rounded-full ${
                        isActive
                          ? "bg-[rgba(186,221,200,0.38)]"
                          : "bg-[rgba(186,221,200,0.18)]"
                      }`}
                    />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  </span>
                </button>
              );
            })}
          </div>

          {mobileFeature ? (
            <div className="mt-4">
              <FloatingCard hotspot={mobileFeature} mobile />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
