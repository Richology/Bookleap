"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatGrowthEvent,
  GROWTH_ABILITIES,
  GROWTH_ABILITY_MAX,
  GROWTH_ABILITY_META,
  GROWTH_STAGE_META,
  getGrowthStage,
  type GrowthStage,
  type GrowthLedger,
} from "@/lib/growthLedger";

function StageIcon({ stage }: { stage: GrowthStage }) {
  const iconClass = "h-3.5 w-3.5";

  if (stage === "dormant") {
    return (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6.7 8.4V6.2a3.3 3.3 0 0 1 6.6 0v2.2" />
        <rect x="5" y="8.1" width="10" height="7.8" rx="2.2" />
        <path d="M10 11.1v1.8" />
      </svg>
    );
  }

  if (stage === "light") {
    return (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3.7l1.2 3.4 3.4 1.2-3.4 1.2L10 12.9 8.8 9.5 5.4 8.3l3.4-1.2L10 3.7Z" />
        <path d="M15 12.6l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" />
      </svg>
    );
  }

  if (stage === "steady") {
    return (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="6.4" />
        <path d="M6.9 10.2 9 12.2l4-4.4" />
      </svg>
    );
  }

  if (stage === "formed") {
    return (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3.3 15.2 5v4.2c0 3.3-2 5.7-5.2 7.5-3.2-1.8-5.2-4.2-5.2-7.5V5L10 3.3Z" />
        <path d="M7.2 10.2 9.2 12l3.8-4" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3.2l1.9 3.8 4.1.6-3 3 .7 4.2-3.7-2-3.7 2 .7-4.2-3-3 4.1-.6L10 3.2Z" />
      <path d="M10 6.8v3.5" />
    </svg>
  );
}

function CircularProgress({
  value,
  max,
  accent,
}: {
  value: number;
  max: number;
  accent: string;
}) {
  const safeValue = Math.min(Math.max(value, 0), max);
  const [animatedValue, setAnimatedValue] = useState(0);
  const animatedValueRef = useRef(0);
  const percent = Math.round((animatedValue / max) * 100);
  const size = 58;
  const stroke = 5.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  useEffect(() => {
    let frameId = 0;
    let startTime: number | null = null;
    const duration = 900;
    const startValue = animatedValueRef.current;
    const delta = safeValue - startValue;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + delta * eased;
      animatedValueRef.current = nextValue;
      setAnimatedValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [safeValue]);

  return (
    <div className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center">
      <svg className="h-[62px] w-[62px] -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(24,29,38,0.09)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[16px] font-semibold leading-none text-[var(--ink)]">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function GrowthLedgerPanel({ ledger }: { ledger: GrowthLedger }) {
  const activeAbilities = GROWTH_ABILITIES.filter((ability) => ledger.counts[ability] > 0).length;
  const hasGrowth = ledger.total > 0;
  const summary = hasGrowth
    ? `已点亮 ${activeAbilities} 项能力`
    : "完成分析、导出海报或 3 题训练后，能力会开始留下印记。";

  return (
    <section className="border-b border-[rgba(24,29,38,0.08)] bg-transparent px-1 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-[1.12rem] font-semibold leading-[1.18] tracking-[0] text-[var(--ink)] sm:text-[1.18rem]">
            能力账本
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">
            {summary}
          </p>
        </div>

        <div className="shrink-0 rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-[#f7f8f9] px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">累计印记</p>
          <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{ledger.total}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-[rgba(24,29,38,0.08)]">
        {GROWTH_ABILITIES.map((ability) => {
          const meta = GROWTH_ABILITY_META[ability];
          const count = ledger.counts[ability];
          const safeCount = Math.min(count, GROWTH_ABILITY_MAX);
          const stage = getGrowthStage(safeCount);
          const stageMeta = GROWTH_STAGE_META[stage];
          const progressAccent = safeCount === 0 ? "rgba(24,29,38,0.16)" : meta.ring;

          return (
            <div
              key={ability}
              className="border-b border-[rgba(24,29,38,0.08)] px-0 py-3 transition-colors"
              style={{ background: stageMeta.rowBg }}
            >
              <div className="flex items-center gap-2.5 px-1">
                <CircularProgress
                  value={safeCount}
                  max={GROWTH_ABILITY_MAX}
                  accent={progressAccent}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold text-[var(--ink)]">{meta.label}</p>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        background: stageMeta.badgeBg,
                        borderColor: stageMeta.badgeBorder,
                        color: stageMeta.badgeFg,
                      }}
                    >
                      <StageIcon stage={stage} />
                      {stageMeta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--ink-faint)]">
                    {meta.description}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <p className="text-[1.05rem] font-semibold leading-none text-[var(--ink)]">
                      {safeCount}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      / {GROWTH_ABILITY_MAX}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 text-xs leading-6 text-[var(--ink-soft)]">
        {ledger.lastEvent ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
              最近成长
            </p>
            <p className="mt-1 break-words text-[13px] text-[var(--ink)]">
              {formatGrowthEvent(ledger.lastEvent)}
            </p>
          </div>
        ) : (
          <p>完成分析、导出海报或 3 题训练后，这里会记录最近一次成长印记。</p>
        )}
      </div>
    </section>
  );
}
