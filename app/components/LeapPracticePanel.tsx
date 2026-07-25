"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  DecisionCardsInput,
  DecisionFeedbackBlock,
  DecisionOptionKey,
  DecisionScenario,
  LifeCapital,
  PrincipleAnchor,
} from "@/types/decision";
import type { LeapPracticeRound } from "@/lib/leapPractice";

const LIFE_CAPITAL_OPTIONS: Array<{ id: LifeCapital | "auto"; label: string }> = [
  { id: "auto", label: "自动匹配" },
  { id: "财富积累", label: "财富积累" },
  { id: "健康增值", label: "健康增值" },
  { id: "关系丰盈", label: "关系丰盈" },
];

const CARD_LABELS: Record<keyof DecisionCardsInput, string> = {
  summary: "全书摘要",
  readingGuide: "阅读指南",
  viewMap: "观点地图",
  actionPrinciples: "行动原则",
  models: "观点校验",
  insights: "思想溯源",
};

const GATES = [
  {
    title: "看见惯性",
    subtitle: "先看见自己会怎样自然反应",
    focus: "财富积累 · 健康增值 · 关系丰盈",
  },
  {
    title: "权衡代价",
    subtitle: "把短期舒服和长期增益摆上桌面",
    focus: "选择有成本，成长也有成本",
  },
  {
    title: "设计行动",
    subtitle: "把书里的方法落到一个低风险实验",
    focus: "从理解走向行动",
  },
] as const;

const FEEDBACK_SECTIONS: Array<{
  key: keyof DecisionFeedbackBlock;
  label: string;
}> = [
  { key: "empathy", label: "看见惯性" },
  { key: "upgrade", label: "回到书中的方法" },
  { key: "action", label: "下一步行动" },
];

type LeapPracticeView = "map" | "loading" | "scenario" | "feedback" | "done";

export type LeapPracticeReturnState = {
  gateIndex: number;
  view: Exclude<LeapPracticeView, "loading">;
  selectedOption: DecisionOptionKey | null;
};

function normalizeRestoreState(
  restoreState: LeapPracticeReturnState | null | undefined,
  round: LeapPracticeRound
): LeapPracticeReturnState {
  if (!restoreState) {
    return { gateIndex: 0, view: "map", selectedOption: null };
  }

  const gateIndex = Math.max(0, Math.min(GATES.length - 1, restoreState.gateIndex));
  const restoredScenario = round.scenarios[gateIndex];
  if ((restoreState.view === "scenario" || restoreState.view === "feedback") && !restoredScenario) {
    return { gateIndex, view: "map", selectedOption: null };
  }
  if (restoreState.view === "feedback" && !restoreState.selectedOption) {
    return { gateIndex, view: "scenario", selectedOption: null };
  }

  return {
    gateIndex,
    view: restoreState.view,
    selectedOption: restoreState.selectedOption,
  };
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 5.5 8 14l-4.5-4.5" />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10h12" />
      <path d="m11 5 5 5-5 5" />
    </svg>
  );
}

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5 11.7 7l4.6 1.7-4.6 1.7L10 15l-1.7-4.6-4.6-1.7L8.3 7 10 2.5Z" />
      <path d="M15.5 13.5 16.2 15l1.3.5-1.3.5-.7 1.5-.7-1.5-1.3-.5 1.3-.5.7-1.5Z" />
    </svg>
  );
}

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "green" | "dark" }) {
  const classes =
    tone === "green"
      ? "border-[rgba(41,117,74,0.18)] bg-[rgba(241,249,244,0.96)] text-[rgba(41,117,74,0.96)]"
      : tone === "dark"
      ? "border-[rgba(24,29,38,0.10)] bg-[#181d26] text-[#fbfcfd]"
      : "border-[rgba(24,29,38,0.08)] bg-[rgba(255,255,255,0.72)] text-[var(--ink-soft)]";

  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-semibold ${classes}`}>
      {children}
    </span>
  );
}

function GateLoader({ gateIndex, bookTitle }: { gateIndex: number; bookTitle: string }) {
  const gate = GATES[gateIndex] ?? GATES[0];

  return (
    <section className="mx-auto flex min-h-[620px] max-w-4xl flex-col items-center justify-center px-5 py-12 text-center">
      <div className="leap-loader-stage relative flex h-64 w-full max-w-2xl items-center justify-center overflow-hidden rounded-[28px] border border-[rgba(41,117,74,0.12)] bg-[radial-gradient(circle_at_center,rgba(241,249,244,0.98),rgba(251,252,253,0.86)_52%,rgba(255,255,255,0.72))] shadow-[0_26px_80px_rgba(24,29,38,0.08)]">
        <span className="leap-scan-line leap-scan-line-one" />
        <span className="leap-scan-line leap-scan-line-two" />
        <span className="leap-scan-line leap-scan-line-three" />
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="leap-orbit absolute inset-0 rounded-full border border-[rgba(41,117,74,0.26)]" />
          <span className="leap-orbit leap-orbit-delay absolute inset-3 rounded-full border border-[rgba(41,117,74,0.18)]" />
          <span className="leap-loader-ring absolute inset-5 rounded-full border border-[rgba(24,29,38,0.10)]" />
          <span className="leap-loader-core relative flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(41,117,74,0.22)] bg-[#fbfcfd] text-[rgba(41,117,74,0.96)] shadow-[0_18px_44px_rgba(41,117,74,0.18)]">
            <SparkIcon className="h-8 w-8" />
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-5 left-1/2 grid w-[min(92%,520px)] -translate-x-1/2 grid-cols-3 gap-2">
          {["抽取原则", "生成场景", "校准选项"].map((label, index) => (
            <div
              key={label}
              className="leap-loader-step rounded-full border border-[rgba(41,117,74,0.12)] bg-white/72 px-3 py-2 text-[11px] font-semibold text-[rgba(41,117,74,0.88)] shadow-[0_6px_18px_rgba(24,29,38,0.05)]"
              style={{ animationDelay: `${index * 360}ms` }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        第 {gateIndex + 1} 关 · {gate.title}
      </p>
      <h3 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)] md:text-[40px]">
        正在把《{bookTitle}》放进真实场景
      </h3>
      <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[var(--ink-soft)]">
        这一关会从书中的原则出题，不是通用鸡汤。生成稍慢时，你会一直停在这里，不会突然从别处弹出题目。
      </p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-3 gap-2">
        {GATES.map((item, index) => (
          <div
            key={item.title}
            className={`rounded-[10px] border px-3 py-3 text-left transition-all ${
              index === gateIndex
                ? "border-[rgba(41,117,74,0.24)] bg-[rgba(241,249,244,0.96)]"
                : "border-[rgba(24,29,38,0.06)] bg-[rgba(255,255,255,0.64)]"
            }`}
          >
            <p className="text-[11px] font-semibold text-[var(--ink)]">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--ink-faint)]">{item.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeedbackView({
  scenario,
  selectedOption,
  anchors,
  onOpenSourceCard,
  getReturnState,
}: {
  scenario: DecisionScenario;
  selectedOption: DecisionOptionKey;
  anchors: PrincipleAnchor[];
  onOpenSourceCard?: (cardKey: keyof DecisionCardsInput, returnState: LeapPracticeReturnState) => void;
  getReturnState: () => LeapPracticeReturnState;
}) {
  const feedback = scenario.feedback[selectedOption];
  const [activeSection, setActiveSection] = useState<keyof DecisionFeedbackBlock>("upgrade");
  const activeSectionLabel = FEEDBACK_SECTIONS.find((section) => section.key === activeSection)?.label ?? "回到书中的方法";
  const activeSectionBody =
    activeSection === "empathy"
      ? `${feedback.empathy}\n\n${feedback.analysis}`
      : feedback[activeSection];
  const primaryAnchor = anchors[0] ?? null;

  return (
    <div className="space-y-4">
      <section className="rounded-[18px] border border-[rgba(24,29,38,0.07)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(241,249,244,0.76))] px-5 py-5 shadow-[0_14px_34px_rgba(24,29,38,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(41,117,74,0.78)]">你的选择 · {selectedOption}</p>
            <p className="mt-2 max-w-3xl text-[18px] font-semibold leading-8 tracking-[-0.01em] text-[var(--ink)]">
              {scenario.options[selectedOption]}
            </p>
          </div>
          <span className="inline-flex rounded-full border border-[rgba(41,117,74,0.16)] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[rgba(41,117,74,0.92)]">
            已完成一次真实判断
          </span>
        </div>
        {feedback.empathy && (
          <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[var(--ink-soft)]">
            {feedback.empathy}
          </p>
        )}
      </section>
      {anchors.length > 0 && (
        <section className="rounded-[18px] border border-[rgba(41,117,74,0.14)] bg-[rgba(241,249,244,0.78)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(41,117,74,0.74)]">来自本书的方法</p>
              <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
                {primaryAnchor?.methodOrModel}
                {primaryAnchor && <span className="ml-2 text-[12px] font-medium text-[var(--ink-faint)]">{CARD_LABELS[primaryAnchor.sourceCardKey]}</span>}
              </h3>
              <p className="mt-2 max-w-3xl text-[14px] leading-7 text-[var(--ink-soft)]">{primaryAnchor?.statement}</p>
            </div>
            {primaryAnchor && (
              <button
                type="button"
                onClick={() => onOpenSourceCard?.(primaryAnchor.sourceCardKey, getReturnState())}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[rgba(41,117,74,0.18)] bg-white/72 px-3.5 text-[12px] font-medium text-[rgba(41,117,74,0.96)] transition-all hover:bg-white active:scale-[0.98]"
              >
                查看原书卡片
              </button>
            )}
          </div>
          {anchors.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {anchors.slice(1).map((anchor) => (
                <button
                  key={anchor.id}
                  type="button"
                  onClick={() => onOpenSourceCard?.(anchor.sourceCardKey, getReturnState())}
                  className="rounded-full border border-[rgba(41,117,74,0.12)] bg-white/58 px-3 py-1.5 text-[11px] font-medium text-[rgba(41,117,74,0.88)] transition-all hover:bg-white active:scale-[0.98]"
                >
                  {anchor.methodOrModel}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="rounded-[18px] border border-[rgba(24,29,38,0.07)] bg-white/76 px-5 py-5 shadow-[0_12px_30px_rgba(24,29,38,0.045)]">
        <div className="inline-flex rounded-full border border-[rgba(24,29,38,0.08)] bg-[rgba(248,250,252,0.82)] p-1">
        {FEEDBACK_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveSection(section.key)}
            className={`h-8 rounded-full px-3 text-[12px] font-medium transition-all active:scale-[0.98] ${
              activeSection === section.key
                ? "bg-[#181d26] text-[#fbfcfd] shadow-[0_4px_12px_rgba(24,29,38,0.12)]"
                : "text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]"
            }`}
          >
            {section.label}
          </button>
        ))}
        </div>
        <div className="mt-5 max-w-3xl">
          <p className="text-[12px] font-semibold text-[var(--ink-faint)]">{activeSectionLabel}</p>
          <p className="mt-2 whitespace-pre-line text-[16px] leading-8 tracking-[-0.005em] text-[var(--ink)]">
            {activeSectionBody}
          </p>
        </div>
      </section>
    </div>
  );
}

export function LeapPracticePanel({
  bookTitle,
  round,
  error,
  onGenerateGate,
  onAnswerComplete,
  onComplete,
  onUpgradeClick,
  onLifeCapitalChange,
  onOpenSourceCard,
  onStartNewRound,
  restoreState,
  onRestoreConsumed,
}: {
  bookTitle: string;
  round: LeapPracticeRound;
  error?: string;
  onGenerateGate: (gateIndex: number) => Promise<DecisionScenario | null>;
  onAnswerComplete: (gateIndex: number, option: DecisionOptionKey) => void;
  onComplete?: () => void;
  onUpgradeClick?: () => void;
  onLifeCapitalChange?: (lifeCapital: LifeCapital | "auto") => void;
  onOpenSourceCard?: (cardKey: keyof DecisionCardsInput, returnState: LeapPracticeReturnState) => void;
  onStartNewRound?: () => void;
  restoreState?: LeapPracticeReturnState | null;
  onRestoreConsumed?: () => void;
}) {
  const initialRestoreState = normalizeRestoreState(restoreState, round);
  const [activeGate, setActiveGate] = useState(initialRestoreState.gateIndex);
  const [selectedOption, setSelectedOption] = useState<DecisionOptionKey | null>(initialRestoreState.selectedOption);
  const [view, setView] = useState<LeapPracticeView>(initialRestoreState.view);
  const [isPrincipleDrawerOpen, setIsPrincipleDrawerOpen] = useState(false);
  const currentScenario = round.scenarios[activeGate];
  const currentGate = round.blueprint?.gates[activeGate] ?? null;
  const currentAnchors = currentGate
    ? round.blueprint?.anchors.filter((anchor) => currentGate.principleAnchorIds.includes(anchor.id)) ?? []
    : [];
  const canChangeLifeCapital = !round.blueprint && round.scenarios.every((scenario) => !scenario);
  const nextGateIndex = useMemo(() => {
    const index = round.statuses.findIndex((status) => status !== "completed");
    return index < 0 ? GATES.length - 1 : index;
  }, [round.statuses]);

  useEffect(() => {
    if (!restoreState) return;
    onRestoreConsumed?.();
  }, [onRestoreConsumed, restoreState]);

  const getCurrentReturnState = (): LeapPracticeReturnState => ({
    gateIndex: activeGate,
    view: view === "loading" ? "map" : view,
    selectedOption,
  });

  const openGate = async (gateIndex: number) => {
    const isCompleted = round.statuses[gateIndex] === "completed";
    const isReady = round.statuses[gateIndex] === "ready";
    const isUnlocked = gateIndex === 0 || round.statuses[gateIndex - 1] === "completed";

    if (!isUnlocked && !isCompleted) return;

    setActiveGate(gateIndex);
    setIsPrincipleDrawerOpen(false);
    if (isCompleted && round.answers[gateIndex] && round.scenarios[gateIndex]) {
      setSelectedOption(round.answers[gateIndex]);
      setView("feedback");
      return;
    }

    if (isReady && round.scenarios[gateIndex]) {
      setSelectedOption(null);
      setView("scenario");
      return;
    }

    setSelectedOption(null);
    setView("loading");
    const generatedScenario = await onGenerateGate(gateIndex);
    setView(generatedScenario ? "scenario" : "map");
  };

  const selectOption = (option: DecisionOptionKey) => {
    setIsPrincipleDrawerOpen(false);
    setSelectedOption(option);
    setView("feedback");
  };

  const commitFeedback = () => {
    if (!selectedOption) return;

    if (round.statuses[activeGate] !== "completed") {
      onAnswerComplete(activeGate, selectedOption);
      if (activeGate >= GATES.length - 1) {
        setView("done");
        onComplete?.();
        return;
      }
    }

    setView("map");
  };

  if (view === "loading") {
    return <GateLoader gateIndex={activeGate} bookTitle={bookTitle} />;
  }

  if (view === "done") {
    const summary = round.summary;

    return (
      <section className="mx-auto mb-10 max-w-4xl px-4 py-8">
        <div className="overflow-hidden rounded-[14px] border border-[rgba(41,117,74,0.20)] bg-[linear-gradient(180deg,#f4fbf6_0%,#fbfcfd_55%,#f8fafc_100%)] px-6 py-10 text-center shadow-[0_18px_44px_rgba(41,117,74,0.10)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(41,117,74,0.22)] bg-[#fbfcfd] text-[rgba(41,117,74,0.96)] shadow-[0_12px_30px_rgba(41,117,74,0.14)]">
            <CheckIcon className="h-8 w-8" />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(41,117,74,0.74)]">训练完成</p>
          <h3 className="mt-3 text-[30px] font-semibold leading-tight tracking-[0] text-[var(--ink)]">本轮训练已完成</h3>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-8 text-[var(--ink-soft)]">
            你已经把这本书里的方法，经过三个真实选择走了一遍。回到地图后，三关都会保留为可回看的绿色状态。
          </p>
          {summary && (
            <div className="mx-auto mt-6 max-w-2xl rounded-[12px] border border-[rgba(41,117,74,0.16)] bg-[rgba(255,255,255,0.72)] px-4 py-4 text-left">
              <p className="text-[13px] font-semibold text-[var(--ink)]">{summary.title}</p>
              <p className="mt-2 text-[13px] leading-7 text-[var(--ink-soft)]">{summary.body}</p>
            </div>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setView("map")}
              className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#181d26] px-4 text-sm font-medium text-[#fbfcfd] transition-all hover:bg-[#0d1218] active:scale-[0.98]"
            >
              回到训练地图
            </button>
            {onStartNewRound && (
              <button
                type="button"
                onClick={onStartNewRound}
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] px-4 text-sm font-medium text-[var(--ink-soft)] transition-all hover:border-[#9297a0] hover:text-[var(--ink)] active:scale-[0.98]"
              >
                开启另一轮
              </button>
            )}
            {onUpgradeClick && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="inline-flex h-10 items-center justify-center rounded-[10px] px-3 text-sm font-medium text-[var(--ink-faint)] underline-offset-4 transition-all hover:text-[var(--ink)] hover:underline active:scale-[0.98]"
              >
                获取破局书单
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (view === "scenario" && currentScenario) {
    const gate = GATES[activeGate] ?? GATES[0];
    const hasPrinciples = currentAnchors.length > 0;

    return (
      <section className="relative mx-auto mb-10 max-w-5xl px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView("map")}
            className="rounded-[9px] px-3 py-2 text-[12px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#eef2f4] hover:text-[var(--ink)] active:scale-[0.98]"
          >
            返回训练地图
          </button>
          <Pill tone="green">第 {activeGate + 1} 关 · {currentScenario.phase ?? gate.title}</Pill>
        </div>

        <div className="space-y-4">
          <section className="rounded-[18px] border border-[rgba(24,29,38,0.07)] bg-[rgba(248,250,252,0.78)] px-5 py-5 shadow-[0_12px_30px_rgba(24,29,38,0.045)] md:px-7">
            <div className="flex flex-wrap gap-2">
              <Pill>{currentScenario.roleType}</Pill>
              {currentScenario.lifeCapital && <Pill tone="green">{currentScenario.lifeCapital}</Pill>}
              {currentScenario.scenarioType && <Pill>{currentScenario.scenarioType}</Pill>}
              <Pill tone="green">{currentScenario.trainingAbility}</Pill>
            </div>
            <p className="mt-5 whitespace-pre-line text-[15px] leading-8 text-[var(--ink-soft)]">{currentScenario.scene}</p>
          </section>

          <section className="rounded-[20px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] px-5 py-6 shadow-[0_18px_48px_rgba(24,29,38,0.07)] md:px-7 md:py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              你的判断
            </p>
            <h3 className="mt-3 text-[27px] font-semibold leading-[1.42] tracking-[-0.02em] text-[var(--ink)] md:text-[36px]">
              {currentScenario.question}
            </h3>
            <div className="mt-7 space-y-3">
              {(["A", "B"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  aria-label={`选择 ${option}：${currentScenario.options[option]}`}
                  className="group flex w-full items-start gap-4 rounded-[16px] border border-[#dfe4e8] bg-[rgba(248,250,252,0.72)] px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[rgba(24,29,38,0.22)] hover:bg-white hover:shadow-[0_12px_28px_rgba(24,29,38,0.07)] active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(24,29,38,0.10)] bg-[#fbfcfd] text-[14px] font-semibold text-[var(--ink-soft)] transition-all group-hover:bg-[#181d26] group-hover:text-[#fbfcfd]">
                    {option}
                  </span>
                  <span className="pt-0.5 text-[16px] leading-8 text-[var(--ink)]">{currentScenario.options[option]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 hidden lg:block">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setIsPrincipleDrawerOpen((open) => !open)}
              aria-expanded={isPrincipleDrawerOpen}
              className="flex h-24 w-9 items-center justify-center rounded-[14px] border border-[rgba(41,117,74,0.16)] bg-[rgba(241,249,244,0.92)] text-[12px] font-semibold text-[rgba(41,117,74,0.96)] shadow-[0_12px_28px_rgba(24,29,38,0.08)] backdrop-blur transition-all hover:bg-[#f1f9f4] active:scale-[0.98]"
            >
              <span className="[writing-mode:vertical-rl]">{isPrincipleDrawerOpen ? "收起原则" : "本题原则"}</span>
            </button>
            <aside className={`w-72 rounded-[18px] border border-[rgba(24,29,38,0.08)] bg-[rgba(251,252,253,0.92)] px-4 py-5 shadow-[0_20px_54px_rgba(24,29,38,0.14)] backdrop-blur-xl ${isPrincipleDrawerOpen ? "" : "hidden"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-[var(--ink)]">本题原则</p>
                <button
                  type="button"
                  onClick={() => setIsPrincipleDrawerOpen(false)}
                  className="rounded-full px-2 py-1 text-[11px] font-medium text-[var(--ink-faint)] transition-all hover:bg-[#eef2f4] hover:text-[var(--ink)] active:scale-[0.98]"
                >
                  收起
                </button>
              </div>
              {hasPrinciples ? (
                <div className="mt-3 space-y-2">
                  {currentAnchors.map((anchor) => (
                    <button
                      key={anchor.id}
                      type="button"
                      onClick={() => onOpenSourceCard?.(anchor.sourceCardKey, getCurrentReturnState())}
                      className="block w-full rounded-[12px] border border-[#dfe4e8] bg-[#fbfcfd] px-3 py-3 text-left transition-all hover:border-[rgba(41,117,74,0.24)] hover:bg-white active:scale-[0.99]"
                    >
                      <span className="text-[12px] font-semibold text-[var(--ink)]">{anchor.methodOrModel}</span>
                      <span className="ml-2 text-[11px] text-[var(--ink-faint)]">{CARD_LABELS[anchor.sourceCardKey]}</span>
                      <span className="mt-1 block text-[12px] leading-5 text-[var(--ink-soft)]">{anchor.statement}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">
                  两个选项都不是标准答案。这里训练的是把书中的方法带进真实代价里，先选你最可能做的那一个。
                </p>
              )}
              <div className="mt-4 rounded-[12px] border border-[rgba(41,117,74,0.14)] bg-[rgba(241,249,244,0.72)] px-3 py-3">
                <p className="text-[12px] font-semibold text-[rgba(41,117,74,0.96)]">{currentGate?.coreTension ?? gate.focus}</p>
                <p className="mt-2 text-[12px] leading-6 text-[var(--ink-faint)]">{gate.subtitle}</p>
              </div>
            </aside>
          </div>
        </div>

        <div className="mt-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsPrincipleDrawerOpen((open) => !open)}
            aria-expanded={isPrincipleDrawerOpen}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(41,117,74,0.16)] bg-[rgba(241,249,244,0.82)] px-3.5 text-[12px] font-medium text-[rgba(41,117,74,0.96)] transition-all active:scale-[0.98]"
          >
            {isPrincipleDrawerOpen ? "收起本题原则" : "查看本题原则"}
          </button>
          {isPrincipleDrawerOpen && (
            <aside className="mt-3 rounded-[16px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] px-4 py-4 shadow-[0_12px_28px_rgba(24,29,38,0.07)]">
              {hasPrinciples ? (
                <div className="space-y-2">
                  {currentAnchors.map((anchor) => (
                    <button
                      key={anchor.id}
                      type="button"
                      onClick={() => onOpenSourceCard?.(anchor.sourceCardKey, getCurrentReturnState())}
                      className="block w-full rounded-[12px] border border-[#dfe4e8] bg-[#fbfcfd] px-3 py-3 text-left transition-all hover:border-[rgba(41,117,74,0.24)] active:scale-[0.99]"
                    >
                      <span className="text-[12px] font-semibold text-[var(--ink)]">{anchor.methodOrModel}</span>
                      <span className="ml-2 text-[11px] text-[var(--ink-faint)]">{CARD_LABELS[anchor.sourceCardKey]}</span>
                      <span className="mt-1 block text-[12px] leading-5 text-[var(--ink-soft)]">{anchor.statement}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] leading-6 text-[var(--ink-soft)]">
                  两个选项都不是标准答案。这里训练的是把书中的方法带进真实代价里，先选你最可能做的那一个。
                </p>
              )}
            </aside>
          )}
        </div>
      </section>
    );
  }

  if (view === "feedback" && currentScenario && selectedOption) {
    const alreadyCompleted = round.statuses[activeGate] === "completed";
    const isLastGate = activeGate >= GATES.length - 1;

    return (
      <section className="mx-auto mb-10 max-w-5xl px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView("map")}
            className="rounded-[9px] px-3 py-2 text-[12px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#eef2f4] hover:text-[var(--ink)] active:scale-[0.98]"
          >
            返回训练地图
          </button>
          <Pill tone="green">{alreadyCompleted ? "回看反馈" : "完成这一关"}</Pill>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] px-5 py-6 shadow-[0_16px_38px_rgba(24,29,38,0.07)] md:px-7">
          <FeedbackView
            scenario={currentScenario}
            selectedOption={selectedOption}
            anchors={currentAnchors}
            onOpenSourceCard={onOpenSourceCard}
            getReturnState={getCurrentReturnState}
          />
          <div className="mt-6 flex justify-end border-t border-[#dfe4e8] pt-5">
            <button
              type="button"
              onClick={commitFeedback}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#181d26] px-5 text-sm font-medium text-[#fbfcfd] transition-all hover:bg-[#0d1218] active:scale-[0.98]"
            >
              {alreadyCompleted ? "回到地图" : isLastGate ? "完成本轮训练" : "继续下一关"}
              <ArrowIcon />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mb-10 max-w-6xl px-1 py-2">
      <div className="overflow-hidden rounded-[18px] border border-[rgba(24,29,38,0.08)] bg-[rgba(251,252,253,0.82)] shadow-[0_12px_34px_rgba(24,29,38,0.06)]">
        <div className="border-b border-[#dfe4e8] px-5 py-6 md:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)]">跃迁练习</p>
                <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-[0] text-[var(--ink)] md:text-[34px]">把这本书练成 3 次选择</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--ink-soft)]">
                  基于《{bookTitle}》的 6 张精华卡片，进入一轮 3 关的判断训练。
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
              一轮只选一个人生课题，拆成三个阶段：看见惯性、权衡代价、设计行动。题目、选项和反馈都会回到 6 张卡片里的书中原则。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {LIFE_CAPITAL_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onLifeCapitalChange?.(item.id)}
                  disabled={!canChangeLifeCapital}
                  className={`inline-flex h-8 items-center rounded-[8px] border px-3 text-[12px] font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${
                    round.requestedLifeCapital === item.id
                      ? "border-[#9297a0] bg-[#181d26] text-[#fbfcfd]"
                      : "border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-soft)] hover:border-[#9297a0] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {round.blueprint && (
              <p className="mt-3 text-[12px] leading-5 text-[var(--ink-faint)]">
                本轮已锁定为「{round.blueprint.lifeCapital}」。
              </p>
            )}
            {round.previousRounds.length > 0 && (
              <p className="mt-2 text-[12px] leading-5 text-[var(--ink-faint)]">
                已完成 {round.previousRounds.length} 轮历史训练；开启新一轮不会覆盖旧记录。
              </p>
            )}
        </div>

        {error && (
          <div className="border-b border-[rgba(154,52,18,0.16)] bg-[rgba(255,247,237,0.86)] px-5 py-3 text-[13px] leading-6 text-[#9a3412] md:px-7">
            {error}
          </div>
        )}

        <div className="grid gap-3 px-5 py-5 md:grid-cols-3 md:px-7 md:py-7">
          {GATES.map((gate, index) => {
            const status = round.statuses[index];
            const scenario = round.scenarios[index];
            const answer = round.answers[index];
            const completed = status === "completed";
            const generating = status === "generating";
            const ready = status === "ready";
            const failed = status === "error";
            const unlocked = index === 0 || round.statuses[index - 1] === "completed" || completed;
            const isNext = index === nextGateIndex && !completed;
            const icon = completed ? <CheckIcon /> : generating ? <span className="leap-dot" /> : ready || unlocked ? "?" : "·";
            const stateText = completed
              ? "已完成"
              : failed
              ? "这一关暂时没准备好"
              : ready
              ? "待练习"
              : unlocked
              ? "待练习"
              : `完成第 ${index} 关后解锁`;

            return (
              <article
                key={gate.title}
                className={`flex min-h-[230px] flex-col rounded-[12px] border px-4 py-4 transition-all ${
                  completed
                    ? "border-[rgba(41,117,74,0.22)] bg-[rgba(241,249,244,0.86)]"
                    : isNext
                    ? "border-[rgba(24,29,38,0.14)] bg-[#fbfcfd] shadow-[0_10px_24px_rgba(24,29,38,0.06)]"
                    : "border-[#dfe4e8] bg-[#f8fafc]"
                } ${!unlocked && !completed ? "opacity-55" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-label={`第 ${index + 1} 关，${stateText}`}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[14px] font-semibold ${
                      completed
                        ? "border-[rgba(41,117,74,0.18)] bg-[#fbfcfd] text-[rgba(41,117,74,0.96)]"
                        : "border-[rgba(24,29,38,0.10)] bg-[#fbfcfd] text-[var(--ink-soft)]"
                    }`}
                  >
                    {icon}
                  </span>
                  <span className="pt-1 text-[11px] font-semibold text-[var(--ink-faint)] tabular-nums">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-[19px] font-semibold tracking-[0] text-[var(--ink)]">{gate.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">{gate.subtitle}</p>
                <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[var(--ink-faint)]">
                  {completed && answer
                    ? `已完成 · 我的选择 ${answer}`
                    : failed
                    ? "这一关暂时没准备好，可以重试。"
                    : ready && scenario
                    ? scenario.trainingAbility
                    : stateText === "待练习"
                    ? gate.focus
                    : stateText}
                </p>
                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    onClick={() => void openGate(index)}
                    disabled={!unlocked || generating}
                    aria-label={`第 ${index + 1} 关，${failed ? "重试这一关" : completed ? "回看" : ready ? "开始" : unlocked ? "生成题目" : stateText}`}
                    className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                      completed
                        ? "border border-[rgba(41,117,74,0.18)] bg-[#fbfcfd] text-[rgba(41,117,74,0.96)] hover:bg-white"
                        : "bg-[#181d26] text-[#fbfcfd] hover:bg-[#0d1218]"
                    }`}
                  >
                    {completed ? "回看" : generating ? "生成中" : failed ? "重试这一关" : ready ? "开始" : unlocked ? "生成题目" : "未解锁"}
                    {!completed && !generating && <ArrowIcon />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
