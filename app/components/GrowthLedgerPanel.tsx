"use client";

import { useEffect, useState } from "react";

import {
  formatGrowthEvent,
  GROWTH_ABILITIES,
  GROWTH_ABILITY_MAX,
  GROWTH_ABILITY_META,
  GROWTH_STAGE_META,
  getGrowthStage,
  type GrowthLedger,
} from "@/lib/growthLedger";

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
  const percent = Math.round((animatedValue / max) * 100);
  const size = 70;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  useEffect(() => {
    let frameId = 0;
    let startTime: number | null = null;
    const duration = 900;
    const startValue = animatedValue;
    const delta = safeValue - startValue;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(startValue + delta * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [safeValue]);

  return (
    <div className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center">
      <svg className="h-[74px] w-[74px] -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(47,51,51,0.09)"
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
        <span className="text-[18px] font-semibold leading-none text-[var(--ink)]">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function GrowthLedgerPanel({ ledger }: { ledger: GrowthLedger }) {
  const activeAbilities = GROWTH_ABILITIES.filter((ability) => ledger.counts[ability] > 0).length;
  const hasGrowth = ledger.total > 0;
  const headline = hasGrowth ? "成长正在发生" : "等待第一条成长印记";
  const summary = hasGrowth
    ? `已点亮 ${activeAbilities} 项能力`
    : "完成分析、导出海报或 3 题训练后，能力会开始留下印记。";

  return (
    <section className="rounded-[16px] border border-[rgba(59,63,60,0.07)] bg-[rgba(255,255,255,0.5)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="archive-kicker">能力账本</p>
          <h3 className="font-editorial mt-2 text-[1.45rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)] sm:text-[1.58rem]">
            {headline}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">
            {summary}
          </p>
        </div>

        <div className="shrink-0 rounded-[10px] border border-[rgba(59,63,60,0.06)] bg-[rgba(255,255,255,0.86)] px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">累计印记</p>
          <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{ledger.total}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {GROWTH_ABILITIES.map((ability) => {
          const meta = GROWTH_ABILITY_META[ability];
          const count = ledger.counts[ability];
          const safeCount = Math.min(count, GROWTH_ABILITY_MAX);
          const stage = getGrowthStage(safeCount);
          const stageMeta = GROWTH_STAGE_META[stage];

          return (
            <div
              key={ability}
              className={`rounded-[16px] border px-3.5 py-3 ${
                stage === "evolved"
                  ? "border-[rgba(58,111,82,0.12)] bg-[linear-gradient(180deg,rgba(236,243,238,0.92)_0%,rgba(255,255,255,0.96)_100%)]"
                  : "border-[rgba(59,63,60,0.05)] bg-[rgba(255,255,255,0.82)]"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <CircularProgress
                  value={safeCount}
                  max={GROWTH_ABILITY_MAX}
                  accent="var(--accent)"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-medium text-[var(--ink)]">{meta.label}</p>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-[var(--ink)]"
                      style={{ background: stageMeta.accent }}
                    >
                      {stageMeta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--ink-faint)]">
                    {meta.description}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="flex items-baseline gap-1">
                      <p className="font-editorial text-[1.15rem] leading-none text-[var(--ink)]">
                        {safeCount}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                        / {GROWTH_ABILITY_MAX}
                      </p>
                    </div>
                    <p className="text-[10px] text-[var(--ink-faint)]">
                      {safeCount === 0 ? "尚未点亮" : `${stageMeta.label}中`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 rounded-[14px] border border-[rgba(59,63,60,0.05)] bg-[rgba(255,255,255,0.82)] px-3 py-3 text-xs leading-6 text-[var(--ink-soft)]">
        {ledger.lastEvent ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
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
