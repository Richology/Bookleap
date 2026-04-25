"use client";

import {
  formatGrowthEvent,
  GROWTH_ABILITIES,
  GROWTH_ABILITY_MAX,
  GROWTH_ABILITY_META,
  GROWTH_STAGE_META,
  getGrowthStage,
  type GrowthLedger,
} from "@/lib/growthLedger";

export function GrowthLedgerPanel({ ledger }: { ledger: GrowthLedger }) {
  const activeAbilities = GROWTH_ABILITIES.filter((ability) => ledger.counts[ability] > 0).length;
  const hasGrowth = ledger.total > 0;
  const headline = hasGrowth ? "成长正在发生" : "等待第一条成长印记";
  const summary = hasGrowth
    ? `已点亮 ${activeAbilities} 项能力`
    : "完成分析、导出海报或 3 题训练后，能力会开始留下印记。";

  return (
    <section className="rounded-[16px] border border-[rgba(59,63,60,0.07)] bg-[rgba(255,255,255,0.5)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="archive-kicker">能力账本</p>
          <h3 className="font-editorial mt-2 whitespace-nowrap text-[1.45rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)] sm:text-[1.58rem]">
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

      <div className="mt-4 space-y-1.5">
        {GROWTH_ABILITIES.map((ability) => {
          const meta = GROWTH_ABILITY_META[ability];
          const count = ledger.counts[ability];
          const safeCount = Math.min(count, GROWTH_ABILITY_MAX);
          const stage = getGrowthStage(safeCount);
          const stageMeta = GROWTH_STAGE_META[stage];
          const progressWidth =
            safeCount === 0 ? 0 : Math.max(6, (safeCount / GROWTH_ABILITY_MAX) * 100);

          return (
            <div
              key={ability}
              className={`rounded-[14px] border px-3 py-2.5 ${
                stage === "evolved"
                  ? "border-[rgba(58,111,82,0.12)] bg-[linear-gradient(180deg,rgba(236,243,238,0.92)_0%,rgba(255,255,255,0.96)_100%)]"
                  : "border-[rgba(59,63,60,0.05)] bg-[rgba(255,255,255,0.82)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
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
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <p className="font-editorial text-[1.28rem] leading-none text-[var(--ink)]">
                      {safeCount}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      / {GROWTH_ABILITY_MAX}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--ink-faint)]">
                    {safeCount === 0 ? "尚未点亮" : `${stageMeta.label}中`}
                  </p>
                </div>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(47,51,51,0.06)]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressWidth}%`,
                    background: stageMeta.accent,
                  }}
                />
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
