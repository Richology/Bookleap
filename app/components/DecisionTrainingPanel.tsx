"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  DecisionFeedbackBlock,
  DecisionOptionKey,
  DecisionScenario,
} from "@/types/decision";

const FEEDBACK_SECTIONS: Array<{
  key: keyof DecisionFeedbackBlock;
  label: string;
  accentClass: string;
}> = [
  { key: "empathy", label: "共情", accentClass: "before:bg-[rgba(98,102,100,0.42)]" },
  { key: "analysis", label: "分析", accentClass: "before:bg-[rgba(98,102,100,0.42)]" },
  { key: "upgrade", label: "升级", accentClass: "before:bg-[rgba(98,102,100,0.42)]" },
  { key: "action", label: "行动", accentClass: "before:bg-[rgba(75,179,126,0.85)]" },
];

function MetaPill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${
        tone === "accent"
          ? "border border-[rgba(75,179,126,0.22)] bg-[rgba(240,249,243,0.9)] text-[rgba(41,117,74,0.95)]"
          : "border border-[rgba(59,63,60,0.08)] bg-[rgba(246,247,243,0.92)] text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </span>
  );
}

function FeedbackSection({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <section
      className={`relative rounded-[16px] border border-[rgba(59,63,60,0.08)] bg-[rgba(255,255,255,0.78)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] before:absolute before:bottom-5 before:left-0 before:top-5 before:w-px before:rounded-full ${accentClass}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-[var(--ink)]">
        {value}
      </p>
    </section>
  );
}

function FeedbackView({
  scenario,
  selectedOption,
}: {
  scenario: DecisionScenario;
  selectedOption: DecisionOptionKey;
}) {
  const selectedFeedback: DecisionFeedbackBlock = scenario.feedback[selectedOption];

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-[rgba(59,63,60,0.08)] bg-[rgba(255,255,255,0.76)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          你的选择 · {selectedOption}
        </p>
        <p className="mt-2 text-[15px] leading-7 text-[var(--ink)]">
          {scenario.options[selectedOption]}
        </p>
      </section>

      <div className="space-y-3">
        {FEEDBACK_SECTIONS.map((section) => (
          <FeedbackSection
            key={section.key}
            label={section.label}
            accentClass={section.accentClass}
            value={selectedFeedback[section.key]}
          />
        ))}
      </div>
    </div>
  );
}

export function DecisionTrainingPanel({
  scenarios,
  onBackToCards,
  onAnswerComplete,
  onComplete,
  onUpgradeClick,
}: {
  scenarios: DecisionScenario[];
  onBackToCards: () => void;
  onAnswerComplete?: (option: DecisionOptionKey, progress: number) => void;
  onComplete?: () => void;
  onUpgradeClick?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DecisionOptionKey | null>(null);
  const [viewMode, setViewMode] = useState<"scenario" | "feedback" | "done">("scenario");

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setViewMode("scenario");
  }, [scenarios]);

  const currentScenario = scenarios[currentIndex];

  if (!currentScenario) {
    return null;
  }

  const handleSelect = (option: DecisionOptionKey) => {
    setSelectedOption(option);
    setViewMode("feedback");
  };

  const handleNext = () => {
    if (!selectedOption) return;

    const nextProgress = currentIndex + 1;
    onAnswerComplete?.(selectedOption, nextProgress);

    if (currentIndex >= scenarios.length - 1) {
      setViewMode("done");
      onComplete?.();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setViewMode("scenario");
  };

  return (
    <section className="mb-10 overflow-hidden rounded-[18px] border border-[rgba(59,63,60,0.08)] bg-[rgba(250,250,248,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      {viewMode !== "done" && (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(59,63,60,0.08)] bg-[rgba(250,250,248,0.94)] px-5 py-3.5 backdrop-blur-md md:px-7">
          <button
            onClick={onBackToCards}
            className="inline-flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[rgba(240,241,236,0.92)] hover:text-[var(--ink)]"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            返回阅读
          </button>

          <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink-soft)]">
            <span className="tabular-nums text-[var(--ink)]">{currentIndex + 1}</span>
            <span className="text-[var(--ink-faint)]/45">/</span>
            <span className="tabular-nums text-[var(--ink-faint)]">{scenarios.length}</span>
          </div>
        </div>
      )}

      <div className="px-5 py-6 md:px-7 md:py-7">
        {viewMode === "scenario" && (
          <div className="space-y-6 pb-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <MetaPill>{currentScenario.roleType}</MetaPill>
              <MetaPill tone="accent">训练能力</MetaPill>
            </div>

            <p className="max-w-4xl text-[13px] leading-6 text-[var(--ink-faint)] md:text-[14px]">
              {currentScenario.trainingAbility}
            </p>

            <div className="rounded-[16px] border border-[rgba(59,63,60,0.08)] bg-[rgba(246,247,243,0.88)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:px-6 md:py-6">
              <div className="border-l-2 border-[rgba(49,53,50,0.82)] pl-4">
                <p className="whitespace-pre-line text-[15px] leading-8 text-[var(--ink-soft)]">
                  {currentScenario.scene}
                </p>
              </div>

              <div className="mt-6 border-t border-[rgba(59,63,60,0.08)] pt-6">
                <p className="max-w-4xl text-[21px] font-semibold leading-[1.65] tracking-[-0.02em] text-[var(--ink)] md:text-[24px]">
                  {currentScenario.question}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(["A", "B"] as const).map((optionKey) => (
                <button
                  key={optionKey}
                  onClick={() => handleSelect(optionKey)}
                  className="group flex w-full items-start gap-4 rounded-[16px] border border-[rgba(59,63,60,0.08)] bg-[rgba(255,255,255,0.76)] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-colors duration-200 hover:border-[rgba(75,179,126,0.22)] hover:bg-[rgba(247,249,246,0.96)]"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(59,63,60,0.08)] bg-[rgba(244,245,241,0.96)] text-[12px] font-semibold text-[var(--ink-soft)] transition-colors group-hover:border-[rgba(75,179,126,0.28)] group-hover:bg-[rgba(241,249,244,0.98)] group-hover:text-[rgba(41,117,74,0.96)]">
                    {optionKey}
                  </div>
                  <p className="flex-1 pt-0.5 text-[15px] leading-7 text-[var(--ink)]">
                    {currentScenario.options[optionKey]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === "feedback" && selectedOption && (
          <div className="space-y-6 pb-2">
            <FeedbackView scenario={currentScenario} selectedOption={selectedOption} />

            <div className="flex justify-end border-t border-[rgba(59,63,60,0.08)] pt-5">
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--ink)] px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[rgba(35,39,37,0.96)]"
              >
                {currentIndex < scenarios.length - 1 ? "下一题" : "完成训练"}
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {viewMode === "done" && (
          <div className="flex min-h-[460px] flex-col items-center justify-center px-2 py-6 text-center">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-[rgba(75,179,126,0.18)] bg-[linear-gradient(180deg,rgba(245,251,247,0.98)_0%,rgba(255,255,255,0.98)_36%,rgba(249,249,247,0.98)_100%)] px-7 py-12 shadow-[0_22px_56px_rgba(51,87,64,0.08),inset_0_1px_0_rgba(255,255,255,0.82)] md:px-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(75,179,126,0.18),transparent_68%)]" />

              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(75,179,126,0.22)] bg-[rgba(255,255,255,0.92)] text-[rgba(52,126,81,0.96)] shadow-[0_10px_30px_rgba(75,179,126,0.16)]">
                <svg
                  className="h-10 w-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>

              <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(52,126,81,0.72)]">
                训练完成
              </p>
              <h4 className="relative mt-3 text-[30px] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[34px]">
                本轮训练已完成
              </h4>

              <p className="relative mx-auto mt-5 max-w-xl text-[16px] leading-8 text-[var(--ink-soft)]">
                你已经把这本书里的判断逻辑，放进真实情境里走了一遍。
              </p>
              <p className="relative mx-auto mt-3 max-w-xl text-[15px] leading-8 text-[var(--ink-faint)]">
                这不是停留在阅读层面的理解，而是一次真实的决策训练。回到阅读区后，你会更清楚自己哪些判断是惯性，哪些地方已经开始升级。
              </p>

              <button
                onClick={onBackToCards}
                className="relative mt-8 inline-flex items-center justify-center rounded-[12px] bg-[var(--ink)] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[rgba(35,39,37,0.96)]"
              >
                返回阅读
              </button>

              {onUpgradeClick && (
                <div className="relative mx-auto mt-10 max-w-lg border-t border-[rgba(75,179,126,0.14)] pt-7">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(52,126,81,0.7)]">
                    进阶提升
                  </p>
                  <button
                    onClick={onUpgradeClick}
                    className="group mt-4 flex w-full items-start justify-between gap-4 rounded-[20px] border border-[rgba(75,179,126,0.18)] bg-[rgba(255,255,255,0.92)] px-5 py-5 text-left shadow-[0_14px_30px_rgba(75,179,126,0.08),inset_0_1px_0_rgba(255,255,255,0.86)] transition-colors hover:border-[rgba(75,179,126,0.3)] hover:bg-[rgba(248,252,249,0.98)]"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(75,179,126,0.16)] bg-[rgba(241,249,244,0.96)] text-[rgba(52,126,81,0.9)]">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7" />
                          <path d="M12 3v12" />
                          <path d="m7 8 5-5 5 5" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(52,126,81,0.68)]">
                          完成后的下一步
                        </p>
                        <p className="mt-1 text-[17px] font-semibold text-[var(--ink)]">
                        免费获取破局书单
                        </p>
                        <p className="mt-1 text-[13px] leading-6 text-[var(--ink-faint)]">
                          主理人 1v1 答疑，继续把这次训练延伸到你的真实问题里。
                        </p>
                      </div>
                    </div>
                    <span className="mt-0.5 text-[rgba(52,126,81,0.9)] transition-transform group-hover:translate-x-0.5">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
