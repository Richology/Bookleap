import {
  isLifeCapital,
  normalizeRoundBlueprint,
  type DecisionOptionKey,
  type DecisionScenario,
  type LifeCapital,
  type RoundBlueprint,
} from "@/types/decision";

export const LEAP_PRACTICE_GATE_COUNT = 3;
const STORAGE_PREFIX = "bookleap_leap_practice:";
const EVENT_STORAGE_KEY = "bookleap_leap_practice_events";
const MAX_EVENT_COUNT = 120;

export type LeapPracticeGateStatus = "pending" | "generating" | "ready" | "completed" | "error";

export type LeapPracticeRoundSummary = {
  title: string;
  body: string;
  anchors: string[];
};

export type LeapPracticeCompletedRound = {
  roundId: string;
  lifeCapital: LifeCapital | "auto";
  completedAt: string;
  summary: LeapPracticeRoundSummary;
  scenarios: Array<DecisionScenario | null>;
  statuses: LeapPracticeGateStatus[];
  answers: Array<DecisionOptionKey | null>;
};

export type LeapPracticeRound = {
  bookId: string;
  roundId: string;
  requestedLifeCapital: LifeCapital | "auto";
  blueprint: RoundBlueprint | null;
  scenarios: Array<DecisionScenario | null>;
  statuses: LeapPracticeGateStatus[];
  answers: Array<DecisionOptionKey | null>;
  summary?: LeapPracticeRoundSummary;
  growthAwardedAt?: string;
  previousRounds: LeapPracticeCompletedRound[];
  updatedAt: string;
  completedAt?: string;
};

export function createLeapPracticeRound(bookId: string): LeapPracticeRound {
  return {
    bookId,
    roundId: `round-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    requestedLifeCapital: "auto",
    blueprint: null,
    scenarios: Array.from({ length: LEAP_PRACTICE_GATE_COUNT }, () => null),
    statuses: Array.from({ length: LEAP_PRACTICE_GATE_COUNT }, () => "pending"),
    answers: Array.from({ length: LEAP_PRACTICE_GATE_COUNT }, () => null),
    previousRounds: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeGateStatus(value: unknown): LeapPracticeGateStatus | null {
  return value === "pending" ||
    value === "generating" ||
    value === "ready" ||
    value === "completed" ||
    value === "error"
    ? value
    : null;
}

function normalizeAnswer(value: unknown): DecisionOptionKey | null {
  return value === "A" || value === "B" ? value : null;
}

export function normalizeLeapPracticeRound(
  value: Partial<LeapPracticeRound> | null | undefined,
  bookId: string
): LeapPracticeRound {
  if (!value || value.bookId !== bookId) return createLeapPracticeRound(bookId);

  const round = createLeapPracticeRound(bookId);
  round.roundId = typeof value.roundId === "string" && value.roundId.trim()
    ? value.roundId
    : round.roundId;
  round.requestedLifeCapital = value.requestedLifeCapital === "auto" || isLifeCapital(value.requestedLifeCapital)
    ? value.requestedLifeCapital
    : "auto";
  round.blueprint = normalizeRoundBlueprint(value.blueprint, bookId);
  if (round.blueprint) {
    round.roundId = round.blueprint.roundId;
    round.requestedLifeCapital = round.blueprint.lifeCapital;
  }
  round.scenarios = round.scenarios.map((_, index) => value.scenarios?.[index] ?? null);
  round.answers = round.answers.map((_, index) => normalizeAnswer(value.answers?.[index]));
  round.statuses = round.statuses.map((_, index) => {
    const status = normalizeGateStatus(value.statuses?.[index]);
    if (status) return status === "generating" ? "pending" : status;
    if (round.answers[index]) return "completed";
    if (round.scenarios[index]) return "ready";
    return "pending";
  });
  round.updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : round.updatedAt;
  round.completedAt = typeof value.completedAt === "string" ? value.completedAt : undefined;
  round.summary = normalizeRoundSummary(value.summary);
  round.growthAwardedAt = typeof value.growthAwardedAt === "string" ? value.growthAwardedAt : undefined;
  round.previousRounds = Array.isArray(value.previousRounds)
    ? value.previousRounds.map(normalizeCompletedRound).filter((item): item is LeapPracticeCompletedRound => !!item)
    : [];
  return round;
}

export function createLeapPracticeRoundFromScenarios(
  bookId: string,
  scenarios: DecisionScenario[],
  completedProgress = 0,
  answers: DecisionOptionKey[] = []
): LeapPracticeRound {
  const round = createLeapPracticeRound(bookId);
  scenarios.slice(0, LEAP_PRACTICE_GATE_COUNT).forEach((scenario, index) => {
    round.scenarios[index] = scenario;
    round.answers[index] = normalizeAnswer(answers[index]);
    round.statuses[index] = index < completedProgress
      ? "completed"
      : "ready";
  });
  if (round.statuses.every((status) => status === "completed")) {
    round.completedAt = new Date().toISOString();
    round.summary = buildLeapPracticeRoundSummary(round);
  }
  return round;
}

export function loadLeapPracticeRound(bookId: string): LeapPracticeRound {
  if (typeof window === "undefined") return createLeapPracticeRound(bookId);
  try {
    const parsed = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${bookId}`) || "null") as Partial<LeapPracticeRound> | null;
    return normalizeLeapPracticeRound(parsed, bookId);
  } catch { return createLeapPracticeRound(bookId); }
}

export function saveLeapPracticeRound(round: LeapPracticeRound): LeapPracticeRound {
  const next = { ...round, updatedAt: new Date().toISOString() };
  if (typeof window === "undefined") return next;
  try { localStorage.setItem(`${STORAGE_PREFIX}${round.bookId}`, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function updateLeapPracticeGate(
  round: LeapPracticeRound,
  index: number,
  patch: {
    scenario?: DecisionScenario | null;
    status?: LeapPracticeGateStatus;
    answer?: DecisionOptionKey | null;
    blueprint?: RoundBlueprint | null;
  }
): LeapPracticeRound {
  const scenarios = [...round.scenarios];
  const statuses = [...round.statuses];
  const answers = [...round.answers];

  if (index >= 0 && index < LEAP_PRACTICE_GATE_COUNT) {
    if ("scenario" in patch) scenarios[index] = patch.scenario ?? null;
    if (patch.status) statuses[index] = patch.status;
    if ("answer" in patch) answers[index] = patch.answer ?? null;
  }

  const blueprint = "blueprint" in patch ? patch.blueprint ?? null : round.blueprint;
  const roundId = blueprint?.roundId ?? round.roundId;

  const completedAt = statuses.every((status) => status === "completed")
    ? round.completedAt ?? new Date().toISOString()
    : undefined;
  const summary = completedAt ? round.summary ?? buildLeapPracticeRoundSummary({
    ...round,
    scenarios,
    answers,
  }) : undefined;

  return {
    ...round,
    roundId,
    blueprint,
    requestedLifeCapital: blueprint?.lifeCapital ?? round.requestedLifeCapital,
    scenarios,
    statuses,
    answers,
    summary,
    completedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function getLeapPracticeProgress(round: LeapPracticeRound): number {
  return round.statuses.filter((status) => status === "completed").length;
}

export function updateLeapPracticeLifeCapital(
  round: LeapPracticeRound,
  requestedLifeCapital: LifeCapital | "auto"
): LeapPracticeRound {
  return {
    ...round,
    requestedLifeCapital,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeRoundSummary(value: unknown): LeapPracticeRoundSummary | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== "string" || typeof candidate.body !== "string") return undefined;
  return {
    title: candidate.title.trim() || "本轮训练小结",
    body: candidate.body.trim() || "你已经完成了三次真实选择。",
    anchors: Array.isArray(candidate.anchors)
      ? candidate.anchors.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
      : [],
  };
}

function normalizeCompletedRound(value: unknown): LeapPracticeCompletedRound | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const roundId = typeof candidate.roundId === "string" && candidate.roundId.trim()
    ? candidate.roundId.trim()
    : "";
  const completedAt = typeof candidate.completedAt === "string" && candidate.completedAt.trim()
    ? candidate.completedAt.trim()
    : "";
  const summary = normalizeRoundSummary(candidate.summary);
  if (!roundId || !completedAt || !summary) return null;
  const scenariosInput = Array.isArray(candidate.scenarios) ? candidate.scenarios : [];
  const statusesInput = Array.isArray(candidate.statuses) ? candidate.statuses : [];
  const answersInput = Array.isArray(candidate.answers) ? candidate.answers : [];

  return {
    roundId,
    lifeCapital: isLifeCapital(candidate.lifeCapital) || candidate.lifeCapital === "auto"
      ? candidate.lifeCapital
      : "auto",
    completedAt,
    summary,
    scenarios: Array.from({ length: LEAP_PRACTICE_GATE_COUNT }, (_, index) => scenariosInput[index] ?? null),
    statuses: Array.from({ length: LEAP_PRACTICE_GATE_COUNT }, (_, index) => normalizeGateStatus(statusesInput[index]) ?? "completed"),
    answers: Array.from({ length: LEAP_PRACTICE_GATE_COUNT }, (_, index) => normalizeAnswer(answersInput[index])),
  };
}

export function buildLeapPracticeRoundSummary(round: Pick<LeapPracticeRound, "blueprint" | "requestedLifeCapital" | "scenarios" | "answers">): LeapPracticeRoundSummary {
  const lifeCapital = round.blueprint?.lifeCapital ?? round.requestedLifeCapital;
  const anchorNames = round.blueprint?.anchors
    .filter((anchor) => round.blueprint?.gates.some((gate) => gate.principleAnchorIds.includes(anchor.id)))
    .map((anchor) => anchor.methodOrModel)
    .slice(0, 3) ?? [];
  const abilities = round.scenarios
    .filter((scenario): scenario is DecisionScenario => !!scenario)
    .map((scenario) => scenario.trainingAbility)
    .slice(0, 3);
  const answerTrail = round.answers
    .map((answer, index) => answer ? `第 ${index + 1} 关选 ${answer}` : "")
    .filter(Boolean)
    .join("、");

  return {
    title: `${lifeCapital === "auto" ? "本轮" : lifeCapital}训练小结`,
    body: [
      abilities.length > 0
        ? `你完成了 ${abilities.join("、")} 三次判断。`
        : "你完成了三次真实选择。",
      anchorNames.length > 0
        ? `这一轮反复调用的是书中的「${anchorNames.join("」「")}」。`
        : "这一轮的关键不是答对，而是把书里的方法带进自己的处境。",
      answerTrail ? `你的选择轨迹是：${answerTrail}。` : "",
    ].filter(Boolean).join(" "),
    anchors: anchorNames,
  };
}

export function markLeapPracticeGrowthAwarded(round: LeapPracticeRound): LeapPracticeRound {
  return {
    ...round,
    growthAwardedAt: round.growthAwardedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function startNewLeapPracticeRound(round: LeapPracticeRound): LeapPracticeRound {
  const archived: LeapPracticeCompletedRound[] =
    round.completedAt && round.summary
      ? [
          ...round.previousRounds.filter((item) => item.roundId !== round.roundId),
          {
            roundId: round.roundId,
            lifeCapital: round.blueprint?.lifeCapital ?? round.requestedLifeCapital,
            completedAt: round.completedAt,
            summary: round.summary,
            scenarios: round.scenarios,
            statuses: round.statuses,
            answers: round.answers,
          },
        ]
      : round.previousRounds;

  return {
    ...createLeapPracticeRound(round.bookId),
    previousRounds: archived.slice(-6),
  };
}

export type LeapPracticeEventName =
  | "practice_opened"
  | "life_capital_selected"
  | "gate_generation_started"
  | "gate_generation_succeeded"
  | "gate_generation_failed"
  | "gate_completed"
  | "round_completed"
  | "new_round_started"
  | "source_card_opened"
  | "reading_reflection_invited"
  | "reading_reflection_dismissed";

export function recordLeapPracticeEvent(
  bookId: string,
  eventName: LeapPracticeEventName,
  metadata: Record<string, string | number | boolean | null | undefined> = {}
) {
  if (typeof window === "undefined") return;

  try {
    const existing = JSON.parse(localStorage.getItem(EVENT_STORAGE_KEY) || "[]");
    const events = Array.isArray(existing) ? existing : [];
    events.push({
      eventName,
      bookId,
      metadata,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENT_COUNT)));
  } catch {
    /* ignore telemetry storage failures */
  }
}
