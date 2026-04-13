import { buildDecisionBookId } from "@/types/decision";

export const GROWTH_ABILITIES = ["thinking", "expression", "decision"] as const;

export const GROWTH_ABILITY_MAX = 100;

export type GrowthAbility = (typeof GROWTH_ABILITIES)[number];

export type GrowthStage = "dormant" | "light" | "steady" | "formed" | "evolved";

export type GrowthSourceAction = "分析完成" | "海报导出" | "训练完成";

export type GrowthEvent = {
  ability: GrowthAbility;
  bookId: string;
  bookTitle: string;
  action: GrowthSourceAction;
  createdAt: string;
};

type GrowthLedgerStored = {
  version: 1;
  awardedBookIds: Record<GrowthAbility, string[]>;
  lastEvent: GrowthEvent | null;
};

export type GrowthLedger = GrowthLedgerStored & {
  counts: Record<GrowthAbility, number>;
  total: number;
};

export const GROWTH_ABILITY_META: Record<
  GrowthAbility,
  { label: string; description: string; accent: string }
> = {
  thinking: {
    label: "思考力",
    description: "完成一次分析",
    accent: "rgba(81,99,90,0.14)",
  },
  expression: {
    label: "表达力",
    description: "导出一次海报",
    accent: "rgba(47,51,51,0.08)",
  },
  decision: {
    label: "决策力",
    description: "完成一轮训练",
    accent: "rgba(119,124,123,0.12)",
  },
};

export const GROWTH_STAGE_META: Record<
  GrowthStage,
  { label: string; description: string; accent: string }
> = {
  dormant: {
    label: "待点亮",
    description: "还没有留下第一条成长印记",
    accent: "rgba(47,51,51,0.06)",
  },
  light: {
    label: "点亮",
    description: "能力开始留下印记",
    accent: "rgba(81,99,90,0.14)",
  },
  steady: {
    label: "稳固",
    description: "能力开始稳定下来",
    accent: "rgba(81,99,90,0.22)",
  },
  formed: {
    label: "成型",
    description: "能力轮廓越来越清晰",
    accent: "rgba(47,51,51,0.18)",
  },
  evolved: {
    label: "进化",
    description: "能力进入高阶状态",
    accent: "rgba(47,51,51,0.3)",
  },
};

export function getGrowthStage(count: number): GrowthStage {
  const safeCount = Math.max(0, Math.min(GROWTH_ABILITY_MAX, Math.floor(count)));
  if (safeCount >= 100) return "evolved";
  if (safeCount >= 50) return "formed";
  if (safeCount >= 10) return "steady";
  if (safeCount >= 1) return "light";
  return "dormant";
}

export function formatGrowthProgress(count: number): string {
  const safeCount = Math.max(0, Math.min(GROWTH_ABILITY_MAX, Math.floor(count)));
  const stage = GROWTH_STAGE_META[getGrowthStage(safeCount)].label;
  return `${stage} · ${safeCount}/${GROWTH_ABILITY_MAX}`;
}

const STORAGE_KEY = "bookleap_growth_ledger_v1";
const HISTORY_KEY = "bookleap_recent_history";
const ADDICTION_PREFIX = "addiction:";

function createEmptyStoredLedger(): GrowthLedgerStored {
  return {
    version: 1,
    awardedBookIds: {
      thinking: [],
      expression: [],
      decision: [],
    },
    lastEvent: null,
  };
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  );
}

function normalizeEvent(value: unknown): GrowthEvent | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const ability = candidate.ability;
  const bookId = candidate.bookId;
  const bookTitle = candidate.bookTitle;
  const action = candidate.action;
  const createdAt = candidate.createdAt;

  if (
    (ability !== "thinking" && ability !== "expression" && ability !== "decision") ||
    typeof bookId !== "string" ||
    typeof bookTitle !== "string" ||
    typeof action !== "string" ||
    (action !== "分析完成" && action !== "海报导出" && action !== "训练完成") ||
    typeof createdAt !== "string"
  ) {
    return null;
  }

  return {
    ability,
    bookId,
    bookTitle,
    action,
    createdAt,
  };
}

function normalizeStoredLedger(value: unknown): GrowthLedgerStored | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1) return null;

  const awardedBookIds = candidate.awardedBookIds as Record<string, unknown> | undefined;
  if (!awardedBookIds) return null;

  return {
    version: 1,
    awardedBookIds: {
      thinking: uniqueStrings(Array.isArray(awardedBookIds.thinking) ? awardedBookIds.thinking : []),
      expression: uniqueStrings(Array.isArray(awardedBookIds.expression) ? awardedBookIds.expression : []),
      decision: uniqueStrings(Array.isArray(awardedBookIds.decision) ? awardedBookIds.decision : []),
    },
    lastEvent: normalizeEvent(candidate.lastEvent),
  };
}

function toView(stored: GrowthLedgerStored): GrowthLedger {
  const counts = {
    thinking: Math.min(stored.awardedBookIds.thinking.length, GROWTH_ABILITY_MAX),
    expression: Math.min(stored.awardedBookIds.expression.length, GROWTH_ABILITY_MAX),
    decision: Math.min(stored.awardedBookIds.decision.length, GROWTH_ABILITY_MAX),
  };

  return {
    ...stored,
    counts,
    total: counts.thinking + counts.expression + counts.decision,
  };
}

export function getEmptyGrowthLedger(): GrowthLedger {
  return toView(createEmptyStoredLedger());
}

function saveStoredLedger(stored: GrowthLedgerStored) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore storage failures
  }
}

function readLegacyHistorySeed(): GrowthLedgerStored {
  const stored = createEmptyStoredLedger();
  if (typeof window === "undefined") return stored;

  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    const history = rawHistory ? JSON.parse(rawHistory) : [];
    const thinkingIds = new Set<string>();
    let latestHistory:
      | { bookId: string; bookTitle: string; createdAt: string }
      | null = null;

    if (Array.isArray(history)) {
      for (const item of history) {
        if (!item || typeof item !== "object") continue;
        const candidate = item as Record<string, unknown>;
        const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
        if (!title) continue;

        const createdAt =
          typeof candidate.createdAt === "string" && !Number.isNaN(Date.parse(candidate.createdAt))
            ? candidate.createdAt
            : new Date().toISOString();
        const bookId = buildDecisionBookId(title);
        thinkingIds.add(bookId);

        if (
          !latestHistory ||
          Date.parse(createdAt) > Date.parse(latestHistory.createdAt)
        ) {
          latestHistory = { bookId, bookTitle: title, createdAt };
        }
      }
    }

    const decisionIds = new Set<string>();
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(ADDICTION_PREFIX)) continue;

      const bookId = key.slice(ADDICTION_PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const progress = Number(parsed.decision_training_progress);
        if (Number.isFinite(progress) && Math.floor(progress) >= 3) {
          decisionIds.add(bookId);
        }
      } catch {
        // ignore invalid legacy state
      }
    }

    return {
      version: 1,
      awardedBookIds: {
        thinking: Array.from(thinkingIds),
        expression: [],
        decision: Array.from(decisionIds),
      },
      lastEvent: latestHistory
        ? {
            ability: "thinking",
            bookId: latestHistory.bookId,
            bookTitle: latestHistory.bookTitle,
            action: "分析完成",
            createdAt: latestHistory.createdAt,
          }
        : null,
    };
  } catch {
    return stored;
  }
}

export function loadGrowthLedger(): GrowthLedger {
  if (typeof window === "undefined") {
    return getEmptyGrowthLedger();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const normalized = raw ? normalizeStoredLedger(JSON.parse(raw)) : null;
    const stored = normalized ?? readLegacyHistorySeed();

    if (!normalized) {
      saveStoredLedger(stored);
    }

    return toView(stored);
  } catch {
    const stored = readLegacyHistorySeed();
    saveStoredLedger(stored);
    return toView(stored);
  }
}

export function awardGrowth(
  ability: GrowthAbility,
  source: Omit<GrowthEvent, "ability" | "createdAt">
): { ledger: GrowthLedger; changed: boolean; event: GrowthEvent | null } {
  if (typeof window === "undefined") {
    return { ledger: getEmptyGrowthLedger(), changed: false, event: null };
  }

  const current = loadGrowthLedger();
  const awardedBookIds = current.awardedBookIds[ability];
  if (current.counts[ability] >= GROWTH_ABILITY_MAX || awardedBookIds.includes(source.bookId)) {
    return { ledger: current, changed: false, event: null };
  }

  const event: GrowthEvent = {
    ability,
    bookId: source.bookId,
    bookTitle: source.bookTitle,
    action: source.action,
    createdAt: new Date().toISOString(),
  };

  const nextStored: GrowthLedgerStored = {
    version: 1,
    awardedBookIds: {
      ...current.awardedBookIds,
      [ability]: [...awardedBookIds, source.bookId],
    },
    lastEvent: event,
  };

  saveStoredLedger(nextStored);
  return { ledger: toView(nextStored), changed: true, event };
}

export function formatGrowthEvent(event: GrowthEvent | null): string {
  if (!event) return "";

  const abilityLabel = GROWTH_ABILITY_META[event.ability].label;
  return `${abilityLabel} · 《${event.bookTitle}》 · ${event.action}`;
}
