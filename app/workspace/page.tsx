"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  ExportModal,
  type ExportParams,
  type ExportSection,
} from "../components/ExportModal";
import { GrowthLedgerPanel } from "../components/GrowthLedgerPanel";
import { PosterPreviewModal } from "../components/poster/PosterPreviewModal";
import type { PosterContent } from "../components/poster/types";
import {
  LeapPracticePanel,
  type LeapPracticeReturnState,
} from "../components/LeapPracticePanel";
import { FeynmanPreview } from "../components/FeynmanPreview";
import { UpgradeReadingModal } from "../components/UpgradeReadingModal";
import { WorkspaceDisclaimerModal } from "../components/WorkspaceDisclaimerModal";
import { SupportCoffeeModal } from "../components/SupportCoffeeModal";
import { Toast } from "../components/Toast";
import { FabMenu, type FabMenuHandle } from "../components/FabMenu";
import { QuoteShareModal } from "../components/QuoteShareModal";
import {
  CloseIcon,
  ExternalLinkIcon,
  HelpIcon,
  PlusCircleIcon,
  RefreshIcon,
  SearchIcon,
  UploadIcon,
} from "../components/icons/AdminIcons";
import { WorkspaceBookItem } from "../components/workspace/WorkspaceBookItem";
import { WorkspaceGrowthSidebar } from "../components/workspace/WorkspaceGrowthSidebar";
import { WorkspaceLibraryGroup } from "../components/workspace/WorkspaceLibraryGroup";
import { WorkspaceLibrarySidebar } from "../components/workspace/WorkspaceLibrarySidebar";
import { WorkspaceReaderHeader } from "../components/workspace/WorkspaceReaderHeader";
import { WorkspaceReaderPane } from "../components/workspace/WorkspaceReaderPane";
import { WorkspaceShell } from "../components/workspace/WorkspaceShell";
import { WorkspaceToolRail } from "../components/workspace/WorkspaceToolRail";
import { WorkspaceTopBar } from "../components/workspace/WorkspaceTopBar";
import type { WorkspaceTabItem } from "../components/workspace/WorkspaceTabs";
import {
  buildDecisionBookId,
  getDecisionCacheKey,
  getLegacyDecisionCacheKey,
  hasCompleteDecisionCards,
  normalizeDecisionScenarioList,
  type DecisionCardsInput,
  type DecisionScenario,
  type LifeCapital,
} from "@/types/decision";
import {
  getOnboardingStep,
  isBeforeOnboardingStep,
  setOnboardingStep as persistOnboardingStep,
  type OnboardingProgress,
} from "@/lib/onboarding";
import {
  loadStarterBook,
  starterBooks,
  starterBooksById,
  type StarterBookData,
} from "@/src/data/starterBooks";
import {
  DEFAULT_ADDICTION_STATE,
  getAddictionState,
  inferDecisionPattern,
  setAddictionState,
  type AddictionState,
} from "@/lib/addictionSystem";
import {
  awardGrowth,
  formatGrowthEvent,
  getEmptyGrowthLedger,
  loadGrowthLedger,
  type GrowthLedger,
} from "@/lib/growthLedger";
import {
  MAX_UPLOAD_SIZE_BYTES,
  getFileTypeFromName,
  getFileTypeLabel,
  stripSupportedFileExtension,
  type SupportedFileType,
} from "@/lib/fileFormats";
import {
  extractFallbackWorkspaceQuote,
  hasWorkspaceQuoteArtifacts,
  sanitizeWorkspaceQuote,
} from "@/lib/workspaceQuote";
import {
  getIndexedDbHistoryRecords,
  migrateLegacyHistoryRecordsToIndexedDb,
  mirrorHistoryRecordsToIndexedDb,
} from "@/lib/workspaceStorage";
import {
  createSearchExcerpt,
  createSearchExcerptAt,
  getSearchTokens,
  getTextSearchMatch,
} from "@/lib/workspaceSearch.mjs";
import { recordWorkspaceSearchEvent } from "@/lib/workspaceSearchEvents.mjs";
import {
  buildStoredBookContext,
} from "@/lib/bookAnalysis/context.mjs";
import {
  buildCardEvidence,
} from "@/lib/bookAnalysis/cardEvidence.mjs";
import type {
  CardEvidence,
  EvidenceExcerpt,
} from "@/lib/bookAnalysis/cardEvidence";
import {
  addBookHighlight,
  deleteBookHighlight,
  hashHighlightContent,
  loadBookHighlights,
  normalizeHighlightText,
  type BookHighlight,
} from "@/lib/highlights";
import { shouldPromptCoffeeSupport } from "@/lib/supportCoffee.mjs";
import type { DecisionOptionKey } from "@/types/decision";
import {
  createLeapPracticeRoundFromScenarios,
  loadLeapPracticeRound,
  markLeapPracticeGrowthAwarded,
  recordLeapPracticeEvent,
  saveLeapPracticeRound,
  startNewLeapPracticeRound,
  updateLeapPracticeGate,
  updateLeapPracticeLifeCapital,
  type LeapPracticeRound,
} from "@/lib/leapPractice";
import {
  dismissReadingReflectionPrompt,
  hasDismissedReadingReflectionPrompt,
  loadReadingCompletion,
  saveReadingCompletion,
  type ReadingCompletionStatus,
} from "@/lib/readingCompletion";
import {
  type GuidanceToast,
  TOAST_PRIORITY,
  shouldPreempt,
  insertIntoQueue,
  findEligibleIndex,
} from "@/app/lib/toastScheduler";

type Chapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
  analysisMeta?: {
    chapterIndex?: number;
    totalChapters?: number;
    positionRatio?: number;
    samplePosition?: "opening" | "middle" | "ending" | "full";
  };
};

type BgAnalysisData = {
  title: string;
  author: string;
  coverImage: string;
  bookSummary: string;
  chapters: Chapter[];
  readingGuide: string;
  originalReadingValue: string;
  viewMap: string;
  actionExtraction: string;
  viewValidation: string;
  ideaSourceTracing: string;
  workspaceQuote: string;
  cardEvidence: Record<string, CardEvidence>;
  liteMode: boolean;
  fileType: string;
  starterBookId: string | null;
};

type BgAnalysisStatus =
  | { active: false }
  | { active: true; title: string; step: string; stepsCompleted: number; totalSteps: number };

type ImmersiveCardDef = {
  key: string;
  label: string;
  orderLabel: string;
  content: string;
  isLoading: boolean;
  loadingText: string;
};

type WorkspaceSearchResult = {
  id: string;
  label: string;
  title: string;
  excerpt: string;
  targetKey: string;
  score: number;
  matchCount: number;
};

type WorkspaceBookSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  record: HistoryRecord;
  score: number;
};

type WorkspaceLibraryContentSearchResult = {
  id: string;
  bookTitle: string;
  label: string;
  excerpt: string;
  targetKey: string;
  record: HistoryRecord;
  matchCount: number;
  score: number;
};

type WorkspaceCombinedSearchResult =
  | { kind: "book"; id: string; result: WorkspaceBookSearchResult }
  | { kind: "libraryContent"; id: string; result: WorkspaceLibraryContentSearchResult }
  | { kind: "currentContent"; id: string; result: WorkspaceSearchResult };

type WorkspaceSearchFilter =
  | "all"
  | "books"
  | "insights"
  | (typeof SEARCHABLE_CARD_FIELDS)[number]["key"];

type WorkspaceSearchWorkerMatch = {
  score: number;
  firstMatchIndex: number;
  matchCount: number;
};

type WorkspaceTab = WorkspaceTabItem & {
  source: "starter" | "history" | "current" | "analysis";
  starterBookId?: string;
  starterContentVersion?: string;
  recordId?: string;
  analysisTitle?: string;
};

type WorkspaceReadMode = "overview" | "immersive" | "evidence";
type WorkspaceContentMode = "cards" | "practice";

type PendingQuoteSelection = {
  text: string;
  startOffset: number;
  endOffset: number;
  x: number;
  y: number;
};

type QuoteShareSelection = {
  text: string;
  cardLabel: string;
};

type HomeQuoteShareSelection = {
  bookTitle: string;
  author: string;
  text: string;
  cardLabel: string;
};

type HighlightActionBubble = {
  highlightId: string;
  x: number;
  y: number;
};

type UploadFailureStage = "upload" | "analyze" | "parse" | "request" | null;

type BlobUploadCallbacks = {
  onProgress?: (percentage: number) => void;
  onUploaded?: () => void;
};

type CssHighlightRegistry = {
  set: (name: string, highlight: unknown) => void;
  delete: (name: string) => void;
};

type RenderedHighlightRange = {
  highlight: BookHighlight;
  range: Range;
};

// ── Share card content helpers ─────────────────────────────────────────────────

// ── Recent history (localStorage) ─────────────────────────────────────────────
const HISTORY_KEY = "bookleap_recent_history";
const HAS_UPLOADED_BOOK_KEY = "bookleap_has_uploaded_book";
const LAST_ANALYZED_BOOK_TITLE_KEY = "bookleap_last_analyzed_book_title";
const ANALYSIS_INTRO_DURATION_MS = 3600;
const STARTER_MODE_SEEN_KEY = "bookleap_has_seen_starter_mode";
const STARTER_SELECTED_BOOK_KEY = "bookleap_selected_starter_book";
const STARTER_EXPERIENCED_KEY = "bookleap_experienced_starter_books";
const WORKSPACE_DISCLAIMER_ACCEPTED_KEY = "bookleap_workspace_disclaimer_accepted_v1";
const LEGACY_BOOK_DOMAIN = "book.richology.cn";
const CANONICAL_WORKSPACE_URL = "https://bookleap.cn/workspace";
const BACKUP_STORAGE_PREFIXES = [
  "bookleap_",
  "decision_scenarios_",
  "addiction:",
  "poster_content_",
] as const;

/* ── Track which starter books have been experienced ── */
function getExperiencedStarterBooks(): string[] {
  try {
    const raw = localStorage.getItem(STARTER_EXPERIENCED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markStarterBookExperienced(bookId: string) {
  try {
    const list = getExperiencedStarterBooks();
    if (!list.includes(bookId)) {
      list.push(bookId);
      localStorage.setItem(STARTER_EXPERIENCED_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}
const RETURNING_USER_TOAST_SESSION_KEY = "bookleap_returning_user_toast_seen";
const HISTORY_REORGANIZED_KEY = "bookleap_history_reorganized_shown";
const FAB_HISTORY_SEEN_KEY = "bookleap_fab_history_seen";
const SUPPORT_COFFEE_PROMPT_SEEN_KEY = "bookleap_support_coffee_prompt_seen";
const READING_REFLECTION_PREFIX = "bookleap_reading_reflection:";
const STARTER_LOADING_STEPS = [
  { text: "正在解析全书结构…", duration: 700 },
  { text: "正在提炼核心观点…", duration: 800 },
  { text: "正在生成认知卡片…", duration: 900 },
  { text: "正在整理分析结果…", duration: 600 },
] as const;
const BLOB_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const BLOB_MULTIPART_MIN_BYTES = 5 * 1024 * 1024;
const DECISION_STEP_LABELS = [
  "正在生成第 1 题（职场场景）…",
  "正在生成第 2 题（个人成长）…",
  "正在生成第 3 题（高级决策）…",
] as const;
const SEARCHABLE_CARD_FIELDS = [
  { key: "bookSummary", label: "全书摘要" },
  { key: "readingGuide", label: "阅读指南" },
  { key: "viewMap", label: "观点地图" },
  { key: "actionExtraction", label: "行动提炼" },
  { key: "criticalExamination", label: "观点校验" },
  { key: "ideaSourceTracing", label: "思想溯源" },
] as const;
const SAMPLE_POSITION_LABELS: Record<EvidenceExcerpt["samplePosition"], string> = {
  opening: "开头样本",
  middle: "中段样本",
  ending: "结尾样本",
  full: "完整片段",
};
const CARD_HIGHLIGHT_CSS_NAME = "bookleap-card-highlight";
const CARD_HIGHLIGHT_STYLE_ID = "bookleap-card-highlight-style";
const SEARCH_MATCH_HIGHLIGHT_CSS_NAME = "bookleap-search-match-highlight";
const MIN_QUOTE_SELECTION_LENGTH = 2;
const MAX_QUOTE_SELECTION_LENGTH = 600;

type HistoryRecord = {
  id: string;
  title: string;
  fileType: SupportedFileType;
  mode: "full" | "lite";
  createdAt: string;
  bookSummary: string;
  readingGuide: string;
  originalReadingValue?: string;
  viewMap: string;
  actionExtraction: string;
  viewValidation: string;
  ideaSourceTracing: string;
  bookRecommendation: string;
  workspaceQuote?: string;
  coverImage?: string;
  posterContent?: PosterContent | null;
  isStarterBook?: boolean;
  starterBookId?: string;
  starterContentVersion?: string;
  author?: string;
  analysisContext?: StoredBookContext;
  cardEvidence?: Record<string, CardEvidence>;
};

type StoredBookContext = ReturnType<typeof buildStoredBookContext>;

function getTextNodes(root: HTMLElement) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  return nodes;
}

function createTextRange(root: HTMLElement, start: number, end: number) {
  const nodes = getTextNodes(root);
  let cursor = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;

  for (const node of nodes) {
    const nextCursor = cursor + node.data.length;
    if (!startNode && start >= cursor && start <= nextCursor) {
      startNode = node;
      startOffset = start - cursor;
    }
    if (!endNode && end >= cursor && end <= nextCursor) {
      endNode = node;
      endOffset = end - cursor;
      break;
    }
    cursor = nextCursor;
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function renderSearchMatchHighlights(root: HTMLElement | null, tokens: string[]) {
  const registry = getCssHighlightRegistry();
  if (!root || !registry || tokens.length === 0) {
    registry?.delete(SEARCH_MATCH_HIGHLIGHT_CSS_NAME);
    return [] as Range[];
  }

  const content = root.textContent?.toLowerCase() ?? "";
  const ranges = tokens.flatMap((token) => {
    const matches: Range[] = [];
    let index = content.indexOf(token);
    while (index >= 0) {
      const range = createTextRange(root, index, index + token.length);
      if (range) matches.push(range);
      index = content.indexOf(token, index + token.length);
    }
    return matches;
  });
  const highlight = createCssHighlight(ranges);
  if (highlight) registry.set(SEARCH_MATCH_HIGHLIGHT_CSS_NAME, highlight);
  return ranges;
}

function getTextOffset(root: HTMLElement, targetNode: Node, targetOffset: number) {
  let offset = 0;
  let foundBoundary = false;

  const getNodeTextLength = (node: Node): number => {
    if (node.nodeType === Node.TEXT_NODE) return (node as Text).data.length;
    return Array.from(node.childNodes).reduce(
      (sum, child) => sum + getNodeTextLength(child),
      0
    );
  };

  const walk = (node: Node) => {
    if (foundBoundary) return;

    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += Math.max(0, Math.min((node as Text).data.length, targetOffset));
      } else {
        const childrenBeforeBoundary = Array.from(node.childNodes).slice(
          0,
          Math.max(0, targetOffset)
        );
        offset += childrenBeforeBoundary.reduce(
          (sum, child) => sum + getNodeTextLength(child),
          0
        );
      }
      foundBoundary = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node as Text).data.length;
      return;
    }

    node.childNodes.forEach(walk);
  };

  walk(root);
  return offset;
}

function getRangeOffsets(root: HTMLElement, range: Range) {
  const startOffset = getTextOffset(root, range.startContainer, range.startOffset);
  const endOffset = getTextOffset(root, range.endContainer, range.endOffset);
  return {
    startOffset: Math.min(startOffset, endOffset),
    endOffset: Math.max(startOffset, endOffset),
  };
}

function getListItemMarker(item: HTMLLIElement) {
  const parent = item.parentElement;
  if (parent?.tagName === "OL") {
    const start = Number(parent.getAttribute("start") ?? "1");
    const siblings = Array.from(parent.children).filter(
      (child): child is HTMLLIElement => child.tagName === "LI"
    );
    const index = siblings.indexOf(item);
    return `${Number.isFinite(start) ? start + Math.max(index, 0) : index + 1}. `;
  }

  return "• ";
}

function getStructuredSelectionText(root: HTMLElement, range: Range, fallback: string) {
  const selectedBlocks = Array.from(
    root.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote")
  ).filter((item) => {
      try {
        return range.intersectsNode(item);
      } catch {
        return false;
      }
    });
  const hasSelectedListItem = selectedBlocks.some((item) => item.tagName === "LI");

  if (!hasSelectedListItem) return fallback;

  return selectedBlocks
    .map((item) => {
      const content = (item as HTMLElement).innerText.trim();
      if (!content) return "";
      return item.tagName === "LI"
        ? `${getListItemMarker(item as HTMLLIElement)}${content}`
        : content;
    })
    .filter(Boolean)
    .join("\n");
}

function findTextPosition(root: HTMLElement, targetOffset: number) {
  let cursor = 0;

  for (const node of getTextNodes(root)) {
    const next = cursor + node.data.length;
    if (targetOffset <= next) {
      return {
        node,
        offset: Math.max(0, Math.min(node.data.length, targetOffset - cursor)),
      };
    }
    cursor = next;
  }

  return null;
}

function createRangeFromOffsets(root: HTMLElement, startOffset: number, endOffset: number) {
  const start = findTextPosition(root, startOffset);
  const end = findTextPosition(root, endOffset);
  if (!start || !end) return null;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range.collapsed ? null : range;
}

function findFallbackHighlightRange(root: HTMLElement, text: string) {
  const trimmed = text
    .trim()
    .replace(/(^|\n)\s*(?:[-*•]|\d+[.)])\s+/g, "$1");
  if (!trimmed) return null;

  const fullText = root.innerText;
  const index = fullText.indexOf(trimmed);
  if (index < 0) return null;

  return createRangeFromOffsets(root, index, index + trimmed.length);
}

function getCssHighlightRegistry(): CssHighlightRegistry | null {
  if (typeof window === "undefined") return null;
  const cssWithHighlights = CSS as unknown as { highlights?: CssHighlightRegistry };
  return cssWithHighlights.highlights ?? null;
}

function createCssHighlight(ranges: Range[]) {
  const highlightCtor = (window as unknown as {
    Highlight?: new (...ranges: Range[]) => unknown;
  }).Highlight;
  return highlightCtor ? new highlightCtor(...ranges) : null;
}

function ensureCardHighlightStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CARD_HIGHLIGHT_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = CARD_HIGHLIGHT_STYLE_ID;
  style.textContent = `
    ::highlight(${CARD_HIGHLIGHT_CSS_NAME}) {
      background: rgba(230, 205, 23, 0.46);
      color: inherit;
    }
    ::highlight(${SEARCH_MATCH_HIGHLIGHT_CSS_NAME}) {
      background: rgba(186, 221, 200, 0.78);
      color: inherit;
    }
  `;
  document.head.appendChild(style);
}

function renderCardHighlights(
  root: HTMLElement | null,
  highlights: BookHighlight[],
  contentHash: number
): RenderedHighlightRange[] {
  const registry = getCssHighlightRegistry();
  registry?.delete(CARD_HIGHLIGHT_CSS_NAME);
  if (!root || highlights.length === 0 || !registry) return [];

  ensureCardHighlightStyle();
  const rendered = highlights
    .map((highlight) => {
      const range =
        highlight.contentHash === contentHash
          ? createRangeFromOffsets(root, highlight.startOffset, highlight.endOffset)
          : findFallbackHighlightRange(root, highlight.selectedText);
      return range ? { highlight, range } : null;
    })
    .filter((item): item is RenderedHighlightRange => !!item);

  const cssHighlight = createCssHighlight(rendered.map((item) => item.range));
  if (cssHighlight && rendered.length > 0) {
    registry.set(CARD_HIGHLIGHT_CSS_NAME, cssHighlight);
  }

  return rendered;
}

function isPointInsideRange(range: Range, x: number, y: number) {
  return Array.from(range.getClientRects()).some(
    (rect) =>
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
  );
}

function getPointerActionPoint(pointerX: number, pointerY: number) {
  const bubbleWidth = 184;
  const bubbleHeight = 44;
  const gap = 6;
  const x =
    pointerX + bubbleWidth + gap > window.innerWidth
      ? pointerX - bubbleWidth - gap
      : pointerX + gap;
  const y =
    pointerY - bubbleHeight - gap < 16
      ? pointerY + gap
      : pointerY - bubbleHeight - gap;

  return {
    x: Math.min(window.innerWidth - bubbleWidth - 16, Math.max(16, x)),
    y: Math.min(window.innerHeight - bubbleHeight - 16, Math.max(16, y)),
  };
}

type LocalDataBackup = {
  app: "bookleap";
  version: 1;
  exportedAt: string;
  source: "browser-localStorage";
  historyCount: number;
  history: HistoryRecord[];
  localStorage: Record<string, string>;
};

type IndexedDbDataBackup = {
  app: "bookleap";
  version: 2;
  exportedAt: string;
  source: "indexedDB";
  historyCount: number;
  historyRecords: HistoryRecord[];
  localStorage: Record<string, string>;
};

type BookleapDataBackup = LocalDataBackup | IndexedDbDataBackup;

type BackupImportPreview = {
  backup: BookleapDataBackup;
  fileName: string;
  historyCount: number;
  storageKeyCount: number;
  newHistoryCount: number;
  updatedHistoryCount: number;
  keptCurrentCount: number;
};

type WorkspaceMemoryCard = {
  id: string;
  title: string;
  author: string;
  quote: string;
};

type ReadingReflection = {
  insight: string;
  question: string;
  scene: string;
};

function shouldIncludeBackupStorageKey(key: string) {
  return BACKUP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function collectBookleapLocalStorage(options: { includeHistory?: boolean } = {}): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const includeHistory = options.includeHistory ?? true;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !shouldIncludeBackupStorageKey(key)) continue;
      if (!includeHistory && key === HISTORY_KEY) continue;

      const value = localStorage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }
  } catch {
    // ignore unavailable browser storage
  }

  return snapshot;
}

async function createIndexedDbDataBackup(): Promise<IndexedDbDataBackup> {
  let historyRecords: HistoryRecord[];

  try {
    historyRecords = await getIndexedDbHistoryRecords<HistoryRecord>();
  } catch {
    historyRecords = loadHistory();
  }

  if (historyRecords.length === 0) {
    historyRecords = loadHistory();
  }

  return {
    app: "bookleap",
    version: 2,
    exportedAt: new Date().toISOString(),
    source: "indexedDB",
    historyCount: historyRecords.length,
    historyRecords,
    localStorage: collectBookleapLocalStorage({ includeHistory: false }),
  };
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCardEvidence(value: unknown): value is CardEvidence {
  if (!isRecordObject(value)) return false;
  return (
    typeof value.cardKey === "string" &&
    typeof value.cardLabel === "string" &&
    Array.isArray(value.claims)
  );
}

function normalizeCardEvidenceMap(value: unknown): Record<string, CardEvidence> {
  if (!isRecordObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, CardEvidence] =>
      typeof entry[0] === "string" && isCardEvidence(entry[1])
    )
  );
}

function isSupportedHistoryRecord(value: unknown): value is HistoryRecord {
  if (!isRecordObject(value)) return false;

  const fileType = value.fileType;
  const mode = value.mode;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (fileType === "epub" || fileType === "pdf" || fileType === "azw3" || fileType === "txt") &&
    (mode === "full" || mode === "lite") &&
    typeof value.createdAt === "string" &&
    typeof value.bookSummary === "string" &&
    typeof value.readingGuide === "string" &&
    (value.originalReadingValue === undefined || typeof value.originalReadingValue === "string") &&
    typeof value.viewMap === "string" &&
    typeof value.actionExtraction === "string" &&
    typeof value.viewValidation === "string" &&
    typeof value.ideaSourceTracing === "string" &&
    typeof value.bookRecommendation === "string"
  );
}

function normalizeBookleapDataBackup(value: unknown): BookleapDataBackup | null {
  if (!isRecordObject(value)) return null;

  const localStorageSnapshot: Record<string, string> = {};
  if (isRecordObject(value.localStorage)) {
    for (const [key, item] of Object.entries(value.localStorage)) {
      if (typeof item === "string" && shouldIncludeBackupStorageKey(key)) {
        localStorageSnapshot[key] = item;
      }
    }
  }

  const legacyHistory = Array.isArray(value.history)
    ? value.history.filter(isSupportedHistoryRecord)
    : [];
  const indexedDbHistory = Array.isArray(value.historyRecords)
    ? value.historyRecords.filter(isSupportedHistoryRecord)
    : [];

  if (
    value.app === "bookleap" &&
    value.version === 2 &&
    typeof value.exportedAt === "string" &&
    value.source === "indexedDB" &&
    (Array.isArray(value.historyRecords) || Object.keys(localStorageSnapshot).length > 0)
  ) {
    return {
      app: "bookleap",
      version: 2,
      exportedAt: value.exportedAt,
      source: "indexedDB",
      historyCount: indexedDbHistory.length,
      historyRecords: indexedDbHistory,
      localStorage: localStorageSnapshot,
    };
  }

  if (
    value.app === "bookleap" &&
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    value.source === "browser-localStorage" &&
    (Array.isArray(value.history) || Object.keys(localStorageSnapshot).length > 0)
  ) {
    return {
      app: "bookleap",
      version: 1,
      exportedAt: value.exportedAt,
      source: "browser-localStorage",
      historyCount: legacyHistory.length,
      history: legacyHistory,
      localStorage: localStorageSnapshot,
    };
  }

  return null;
}

function getBackupHistoryRecords(backup: BookleapDataBackup): HistoryRecord[] {
  return backup.version === 2 ? backup.historyRecords : backup.history;
}

function getHistoryRecordTime(record: HistoryRecord): number {
  const time = Date.parse(record.createdAt);
  return Number.isFinite(time) ? time : 0;
}

function mergeHistoryRecords(current: HistoryRecord[], incoming: HistoryRecord[]) {
  const byId = new Map(current.map((record) => [record.id, record]));
  let newHistoryCount = 0;
  let updatedHistoryCount = 0;

  for (const record of incoming) {
    const existing = byId.get(record.id);
    const nextRecord = existing && !record.coverImage && existing.coverImage
      ? { ...record, coverImage: existing.coverImage }
      : record;
    if (!existing) {
      byId.set(record.id, nextRecord);
      newHistoryCount += 1;
      continue;
    }

    if (getHistoryRecordTime(record) >= getHistoryRecordTime(existing)) {
      byId.set(record.id, nextRecord);
      updatedHistoryCount += 1;
    }
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => getHistoryRecordTime(b) - getHistoryRecordTime(a)
  );

  return {
    merged,
    newHistoryCount,
    updatedHistoryCount,
    keptCurrentCount: current.length - updatedHistoryCount,
  };
}

function analyzeBackupImport(backup: BookleapDataBackup): BackupImportPreview {
  const current = loadHistory();
  const backupHistory = getBackupHistoryRecords(backup);
  const mergeStats = mergeHistoryRecords(current, backupHistory);

  return {
    backup,
    fileName: "",
    historyCount: backupHistory.length,
    storageKeyCount: Object.keys(backup.localStorage).length,
    newHistoryCount: mergeStats.newHistoryCount,
    updatedHistoryCount: mergeStats.updatedHistoryCount,
    keptCurrentCount: mergeStats.keptCurrentCount,
  };
}

function pickWorkspaceQuote(record: HistoryRecord): string {
  const candidates = [
    record.workspaceQuote?.trim() || "",
    record.posterContent?.highlight?.trim() || "",
  ];

  for (const candidate of candidates) {
    const quote = sanitizeWorkspaceQuote(candidate, { title: record.title });
    if (quote && !hasWorkspaceQuoteArtifacts(quote, { title: record.title })) {
      return quote;
    }
  }

  const fallback = extractFallbackWorkspaceQuote(record.bookSummary, { title: record.title });
  return hasWorkspaceQuoteArtifacts(fallback, { title: record.title }) ? "" : fallback;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

let historyCache: HistoryRecord[] | null = null;

function setHistoryCache(records: HistoryRecord[]) {
  historyCache = records;
}

function loadLegacyHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function loadHistory(): HistoryRecord[] {
  return historyCache ?? loadLegacyHistory();
}

function compactHistoryForStorage(
  records: HistoryRecord[],
  options: {
    stripPosterContent?: boolean;
    stripAnalysisContext?: boolean;
    maxRecords?: number;
  } = {}
) {
  const nextRecords = options.maxRecords ? records.slice(0, options.maxRecords) : records;

  return nextRecords.map((record) => ({
    ...record,
    posterContent: options.stripPosterContent ? null : record.posterContent,
    analysisContext: options.stripAnalysisContext ? undefined : record.analysisContext,
  }));
}

function buildHistoryAnalysisContext({
  title,
  author,
  chapters,
}: {
  title: string;
  author?: string;
  chapters: Chapter[];
}): StoredBookContext | undefined {
  if (!chapters.length) return undefined;

  try {
    return buildStoredBookContext({
      title,
      author: author || "",
      chapters,
    });
  } catch {
    return undefined;
  }
}

function getAnalysisCoverageMeta(context?: StoredBookContext) {
  if (!context) return undefined;

  const { coverage, samples, outline } = context;
  const hasEndingSample = samples.some((sample) => sample.position === "ending");
  const hasLateChapter = outline.some((item) => item.positionRatio >= 0.75);
  const spreadLabel = hasEndingSample || hasLateChapter ? "覆盖结尾" : "代表性分布";

  return {
    totalChapters: coverage.totalChapters,
    sampledChapters: coverage.sampledChapters,
    totalSamples: coverage.totalSamples,
    spreadLabel,
  };
}

function tryWriteHistory(records: HistoryRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function saveHistory(records: HistoryRecord[]) {
  setHistoryCache(records);
  void mirrorHistoryRecordsToIndexedDb(records).catch((error) => {
    console.warn("IndexedDB 历史保存失败，尝试使用 localStorage 兜底:", error);

    if (tryWriteHistory(records)) return;

    const attempts = [
      compactHistoryForStorage(records, { stripPosterContent: true }),
      compactHistoryForStorage(records, { stripPosterContent: true, stripAnalysisContext: true }),
      compactHistoryForStorage(records, { stripPosterContent: true, stripAnalysisContext: true, maxRecords: 30 }),
      compactHistoryForStorage(records, { stripPosterContent: true, stripAnalysisContext: true, maxRecords: 15 }),
      compactHistoryForStorage(records, { stripPosterContent: true, stripAnalysisContext: true, maxRecords: 8 }),
    ];

    for (const attempt of attempts) {
      if (tryWriteHistory(attempt)) return;
    }

    console.warn("历史记录保存失败：IndexedDB 和 localStorage 均不可用");
  });
  return true;
}

function hasSeenStarterMode(): boolean {
  try {
    return localStorage.getItem(STARTER_MODE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markStarterModeSeen() {
  try {
    localStorage.setItem(STARTER_MODE_SEEN_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function hasAcceptedWorkspaceDisclaimer(): boolean {
  try {
    return localStorage.getItem(WORKSPACE_DISCLAIMER_ACCEPTED_KEY) === "1";
  } catch {
    return false;
  }
}

function markWorkspaceDisclaimerAccepted() {
  try {
    localStorage.setItem(WORKSPACE_DISCLAIMER_ACCEPTED_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function compactSearchText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getHistoryRecordCardContent(
  record: HistoryRecord,
  key: (typeof SEARCHABLE_CARD_FIELDS)[number]["key"]
) {
  if (key === "criticalExamination") return record.viewValidation;
  return record[key] ?? "";
}

function createOverviewExcerpt(content: string, maxLength = 128) {
  const withoutMarkdown = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~#>|]/g, " ");
  const compact = compactSearchText(withoutMarkdown);
  if (!compact) return "";
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trim()}...` : compact;
}

function normalizeBookLookupText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function isBookTitleMatch(returned: string, query: string) {
  const a = normalizeBookLookupText(returned);
  const b = normalizeBookLookupText(query);
  return a.includes(b) || b.includes(a);
}

async function fetchBookCoverFromCatalog(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=3`
    );
    if (res.ok) {
      const data = await res.json();
      const items = data.items ?? [];
      for (const item of items) {
        const info = item.volumeInfo;
        if (!info?.imageLinks?.thumbnail) continue;
        if (isBookTitleMatch(info.title ?? "", title)) {
          return info.imageLinks.thumbnail.replace("http://", "https://");
        }
      }
      if (items[0]?.volumeInfo?.imageLinks?.thumbnail) {
        return items[0].volumeInfo.imageLinks.thumbnail.replace("http://", "https://");
      }
    }
  } catch { /* ignore catalog miss */ }

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=3&fields=title,cover_i`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const docs = data.docs ?? [];
    for (const doc of docs) {
      if (!doc.cover_i) continue;
      if (isBookTitleMatch(doc.title ?? "", title)) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
    }
    if (docs[0]?.cover_i) {
      return `https://covers.openlibrary.org/b/id/${docs[0].cover_i}-L.jpg`;
    }
  } catch { /* ignore catalog miss */ }

  return null;
}

const ORIGINAL_READING_LEVELS = [
  { label: "不必读原书", hint: "不必读", description: "拆书已经覆盖核心观点，原书主要是重复论证或案例铺陈" },
  { label: "精华后跳读", hint: "跳读", description: "核心方法已够用，只需要翻看关键章节、案例或工具表" },
  { label: "按需查阅", hint: "查阅", description: "先用拆书结果，遇到具体问题时再回原书找细节和上下文" },
  { label: "值得通读", hint: "通读", description: "原书有明显增量，案例、推理过程或结构比精华版更有价值" },
  { label: "强烈推荐读原书", hint: "强烈读", description: "原书体验不可替代，文本、思想密度、论证过程或案例本身值得完整阅读" },
] as const;

const ORIGINAL_READING_LEVEL_HELP = ORIGINAL_READING_LEVELS
  .map((level, index) => `${index + 1}. ${level.label}：${level.description}`)
  .join("\n");

function getOriginalReadingLevelIndex(content: string) {
  const primaryLine = content
    .split(/\r?\n/)
    .find((line) => /阅读原书建议\s*[:：]/.test(line));
  const primaryText = primaryLine
    ? primaryLine.replace(/[*_~#>|`]/g, " ")
    : "";
  const matchedIndex = ORIGINAL_READING_LEVELS.findIndex((level) =>
    primaryText.includes(level.label)
  );
  if (matchedIndex >= 0) return matchedIndex;

  const compact = createOverviewExcerpt(content, 360);
  const fallbackIndex = ORIGINAL_READING_LEVELS.findIndex((level) =>
    compact.includes(level.label)
  );
  return fallbackIndex >= 0 ? fallbackIndex : 2;
}

function normalizeOriginalReadingAdviceMarkdown(content: string, levelIndex: number) {
  const level = ORIGINAL_READING_LEVELS[levelIndex];
  if (!content.trim() || !level) return content;

  const otherLevelPattern = ORIGINAL_READING_LEVELS
    .filter((item) => item.label !== level.label)
    .map((item) => item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const canonicalFirstLine = `**阅读原书建议：${level.label}**`;
  const lines = content.split(/\r?\n/);
  let hasPrimaryLine = false;

  const normalizedLines = lines.map((line) => {
    if (/阅读原书建议\s*[:：]/.test(line)) {
      hasPrimaryLine = true;
      return canonicalFirstLine;
    }

    if (!otherLevelPattern || !/读法\s*[:：]/.test(line)) return line;

    return line
      .replace(new RegExp(`(读法\\s*[:：]\\s*(?:\\*\\*)?\\s*)(${otherLevelPattern})[。；;，,、\\s]*`), "$1")
      .replace(new RegExp(`^\\s*(${otherLevelPattern})[。；;，,、\\s]*`), "");
  });

  return hasPrimaryLine
    ? normalizedLines.join("\n")
    : [canonicalFirstLine, ...normalizedLines].join("\n");
}

function createOriginalReadingAdviceSummary(content: string, levelIndex?: number) {
  const level = typeof levelIndex === "number" ? ORIGINAL_READING_LEVELS[levelIndex] : null;
  const withoutPrimaryLine = content
    .split(/\r?\n/)
    .filter((line) => !/阅读原书建议\s*[:：]/.test(line))
    .join("\n");
  const withoutLevelLabels = level
    ? ORIGINAL_READING_LEVELS.reduce(
        (text, item) =>
          item.label === level.label
            ? text
            : text.replace(new RegExp(`${item.label}[。；;，,、\\s]*`, "g"), ""),
        withoutPrimaryLine
      )
    : withoutPrimaryLine;

  return createOverviewExcerpt(
    withoutLevelLabels
      .replace(/\*\*阅读原书建议[:：][^*\n]+?\*\*/g, " ")
      .replace(/阅读原书建议[:：]\s*\S+/g, " "),
    58
  );
}

function isTextInputTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    element?.isContentEditable
  );
}

function isInteractiveShortcutTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return Boolean(element.closest("input, textarea, select, button, a, [role='button'], [contenteditable='true']"));
}

function renderHighlightedSearchText(text: string, tokens: string[]) {
  if (tokens.length === 0) return text;

  const lowerText = text.toLowerCase();
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchedToken = sortedTokens.find((token) => lowerText.startsWith(token, cursor));

    if (!matchedToken) {
      const nextIndex = sortedTokens.reduce((next, token) => {
        const index = lowerText.indexOf(token, cursor + 1);
        if (index === -1) return next;
        return Math.min(next, index);
      }, text.length);
      parts.push(text.slice(cursor, nextIndex));
      cursor = nextIndex;
      continue;
    }

    parts.push(
      <mark
        key={`${cursor}-${matchedToken}`}
        className="rounded-[4px] bg-[rgba(186,221,200,0.72)] px-0.5 text-[var(--ink)]"
      >
        {text.slice(cursor, cursor + matchedToken.length)}
      </mark>
    );
    cursor += matchedToken.length;
  }

  return parts;
}

function getSelectedStarterBookId() {
  try {
    return localStorage.getItem(STARTER_SELECTED_BOOK_KEY) ?? "";
  } catch {
    return "";
  }
}

function setSelectedStarterBookId(value: string) {
  try {
    if (!value) {
      localStorage.removeItem(STARTER_SELECTED_BOOK_KEY);
      return;
    }
    localStorage.setItem(STARTER_SELECTED_BOOK_KEY, value);
  } catch {
    // ignore storage failures
  }
}

function hasSeenReturningUserToastThisSession(): boolean {
  try {
    return sessionStorage.getItem(RETURNING_USER_TOAST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markReturningUserToastSeenThisSession() {
  try {
    sessionStorage.setItem(RETURNING_USER_TOAST_SESSION_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function hasUploadedBook(): boolean {
  try {
    return localStorage.getItem(HAS_UPLOADED_BOOK_KEY) === "1";
  } catch {
    return false;
  }
}

function markUploadedBook(title: string) {
  try {
    localStorage.setItem(HAS_UPLOADED_BOOK_KEY, "1");
    localStorage.setItem(LAST_ANALYZED_BOOK_TITLE_KEY, title);
  } catch {
    // ignore storage failures
  }
}

function getLastAnalyzedBookTitle(): string {
  try {
    return localStorage.getItem(LAST_ANALYZED_BOOK_TITLE_KEY) ?? "";
  } catch {
    return "";
  }
}

function hasHistoryReorganizedBeenShown(): boolean {
  try {
    return localStorage.getItem(HISTORY_REORGANIZED_KEY) === "1";
  } catch {
    return false;
  }
}

function markHistoryReorganizedShown() {
  try {
    localStorage.setItem(HISTORY_REORGANIZED_KEY, "1");
  } catch {
    // ignore
  }
}

function hasFabHistoryBeenSeen(): boolean {
  try {
    return localStorage.getItem(FAB_HISTORY_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markFabHistorySeen() {
  try {
    localStorage.setItem(FAB_HISTORY_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

function hasSupportCoffeePromptBeenShown() {
  try {
    return localStorage.getItem(SUPPORT_COFFEE_PROMPT_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSupportCoffeePromptShown() {
  try {
    localStorage.setItem(SUPPORT_COFFEE_PROMPT_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

function loadDecisionScenarioCache(bookId: string): DecisionScenario[] {
  try {
    const raw = localStorage.getItem(getDecisionCacheKey(bookId));
    if (!raw) return [];
    return normalizeDecisionScenarioList(JSON.parse(raw), bookId);
  } catch {
    return [];
  }
}

function saveDecisionScenarioCache(bookId: string, scenarios: DecisionScenario[]) {
  try {
    localStorage.setItem(getDecisionCacheKey(bookId), JSON.stringify(scenarios));
    localStorage.removeItem(getLegacyDecisionCacheKey(bookId));
  } catch {
    // silently ignore cache failures
  }
}

function clearBookDerivedCaches(bookTitle: string) {
  try {
    const bookId = buildDecisionBookId(bookTitle);
    const keys = [
      getDecisionCacheKey(bookId),
      getLegacyDecisionCacheKey(bookId),
      `poster_content_${bookId}`,
      `poster_content_v2_${bookId}`,
    ];

    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage failures
  }
}

function getAnalysisTabId(title: string) {
  return `analysis:${buildDecisionBookId(title || "new-book")}`;
}

/**
 * Extract the core book title from metadata that may contain
 * promotional text, recommendations, subtitles, etc.
 * e.g. "掌控习惯（樊登读书创始人樊登博士倾力推荐）美国获奖无数..." → "掌控习惯"
 */
function cleanBookTitle(raw: string): string {
  if (!raw) return raw;
  let title = raw
    .split(/[（(【\[：:—–\-|｜·•。]/)[0]
    .trim();
  if (title.length > 20) {
    const shorter = title.split(/[,，;；\s]{2,}/)[0].trim();
    if (shorter.length >= 2) title = shorter;
  }
  if (title.length > 20) {
    title = title.slice(0, 20);
  }
  return title || raw.slice(0, 20);
}

function buildFallbackBookSummary(title: string, chapters: Chapter[]): string {
  const chapterTitles = chapters
    .map((chapter) => chapter.title.trim())
    .filter(Boolean)
    .slice(0, 3);

  const chapterSnippets = chapters
    .map((chapter) => chapter.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => text.slice(0, 48));

  const titleLine = chapterTitles.length > 0
    ? `《${title}》当前已提取出 ${chapters.length} 个核心章节，内容主要围绕 ${chapterTitles.join("、")} 展开。`
    : `《${title}》当前已提取出 ${chapters.length} 个核心章节，已经可以进入阅读与后续分析。`;

  const excerptLine = chapterSnippets.length > 0
    ? `先给你一版提取摘要：${chapterSnippets.join(" / ")}。`
    : "当前摘要服务暂时不可用，但正文内容已经成功提取。";

  return `${titleLine}${excerptLine}`.slice(0, 220);
}

function getAnalyzeResponseErrorMessage(): string {
  if (typeof window === "undefined") {
    return "解析服务返回异常。请刷新页面后重试；如果还失败，请稍后再试。";
  }

  const isLocalRuntime = isLocalRuntimeHost(window.location.hostname);

  return isLocalRuntime
    ? "解析服务返回异常。请刷新页面后重试；如果还失败，建议重启本地服务。"
    : "解析服务返回异常。请刷新页面后重试；如果还失败，请稍后再试或联系支持。";
}

function isLocalRuntimeHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0"
  );
}

function isLegacyBookDomainHost(hostname: string): boolean {
  return hostname.toLowerCase() === LEGACY_BOOK_DOMAIN;
}

function getAnalyzeFailureMessage(
  responseOk: boolean,
  serverMessage?: string
): string {
  if (serverMessage?.trim()) {
    return serverMessage.trim();
  }

  return responseOk
    ? "这本书暂时无法完成解析，请重新上传后再试。"
    : "解析服务暂时不可用，请稍后再试。";
}

function getRequestFailureMessage(): string {
  if (typeof window === "undefined") {
    return "上传或解析请求没有完成。请刷新页面后重试；如果还失败，请稍后再试。";
  }

  return isLocalRuntimeHost(window.location.hostname)
    ? "上传或解析请求没有完成。请刷新页面后重试；如果还失败，请检查本地服务后再试。"
    : "上传或解析请求没有完成。请刷新页面后重试；如果还失败，请稍后再试或联系支持。";
}

function getUploadFailureMessage(): string {
  if (typeof window === "undefined") {
    return "上传服务暂时不可用，请稍后重试。";
  }

  return isLocalRuntimeHost(window.location.hostname)
    ? "本地上传服务暂时不可用，请检查本地服务后重试。"
    : "上传请求没有完成。请检查网络后重试；如果文件较大，请保持页面打开后再试一次。";
}

function getBlobUploadContentType(filename: string): string | undefined {
  const fileType = getFileTypeFromName(filename);

  if (fileType === "epub") return "application/epub+zip";
  if (fileType === "pdf") return "application/pdf";
  if (fileType === "txt") return "text/plain";
  if (fileType === "azw3") return "application/octet-stream";

  return undefined;
}

function getBlobUploadPathname(file: File): string {
  const fileType = getFileTypeFromName(file.name) ?? "epub";
  const uniqueId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `uploads/${Date.now()}-${uniqueId}.${fileType}`;
}

async function uploadBookDirectly(file: File): Promise<Response> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });

  if ([413, 502, 503, 504].includes(response.status)) {
    throw new Error(`直接上传被网关拒绝: ${response.status}`);
  }

  return response;
}

async function uploadBookViaBlob(
  file: File,
  callbacks: BlobUploadCallbacks = {}
): Promise<Response> {
  const { upload } = await import("@vercel/blob/client");
  const explicitContentType = getBlobUploadContentType(file.name);
  const pathname = getBlobUploadPathname(file);
  const blob = await withTimeout(
    upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: explicitContentType,
      multipart: file.size >= BLOB_MULTIPART_MIN_BYTES,
      onUploadProgress: ({ percentage }) => {
        callbacks.onProgress?.(percentage);
      },
    }),
    BLOB_UPLOAD_TIMEOUT_MS,
    "Blob 上传超时"
  );

  callbacks.onUploaded?.();

  return fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileUrl: blob.url,
      filename: file.name,
    }),
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), timeoutMs);
    }),
  ]);
}

function BookDisassemblyStage({
  title,
  coverImage,
}: {
  title: string;
  coverImage: string;
}) {
  const displayTitle = title.trim() || "新书";

  return (
    <div className="book-disassembly-stage mx-auto w-full max-w-4xl px-4 py-4 text-center">
      <div className="book-disassembly-scene mx-auto" aria-hidden="true">
        <div className="book-disassembly-desk">
          <div className="book-disassembly-targets">
            {[0, 1, 2, 3, 4, 5].map((slot) => (
              <span key={slot} className="book-disassembly-target">
                <span />
                <span />
                <span />
              </span>
            ))}
          </div>

          <div className="book-disassembly-book">
            <div className="book-disassembly-cover">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div className="book-disassembly-pages">
              <span className="book-disassembly-left-page" />
              <span className="book-disassembly-right-page" />
              {[0, 1, 2, 3, 4].map((page) => (
                <span
                  key={page}
                  className="book-disassembly-page"
                />
              ))}
            </div>
          </div>

          <div className="book-disassembly-output">
            {[0, 1, 2, 3, 4, 5].map((sheet) => (
              <span key={sheet} className="book-disassembly-sheet">
                <span />
                <span />
                <span />
              </span>
            ))}
          </div>

        </div>
      </div>

      <p className="book-disassembly-caption mx-auto mt-4 max-w-[42rem] text-balance text-[15px] font-semibold leading-6 text-[var(--ink)]">
        正在拆解《{displayTitle}》
      </p>
    </div>
  );
}

function AnalysisIntroPendingStage({
  title,
  status,
  progressPercent,
  waitNotice,
}: {
  title: string;
  status: string;
  progressPercent?: number | null;
  waitNotice?: string;
}) {
  const displayTitle = title.trim() || "新书";
  const displayStatus = status.trim() || "正在读取文件...";
  const normalizedProgress =
    typeof progressPercent === "number"
      ? Math.max(3, Math.min(100, Math.round(progressPercent)))
      : null;

  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-3xl items-center justify-center px-4 py-10 text-center">
      <div className="w-full max-w-xl">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[13px] border border-[rgba(10,46,14,0.16)] bg-[#eef7f1] text-[var(--accent)]">
          <span className="analysis-progress-orb relative flex h-5 w-5 items-center justify-center rounded-full">
            <span className="absolute h-4 w-4 rounded-full bg-[rgba(10,46,14,0.12)]" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_16px_rgba(10,46,14,0.42)]" />
          </span>
        </div>

        <p className="mt-4 text-[15px] font-semibold text-[var(--ink)]">
          正在读取《{displayTitle}》
        </p>
        <p className="mt-1 text-[12px] font-medium text-[var(--ink-faint)]">
          {displayStatus}
        </p>

        <div className="mx-auto mt-7 max-w-md overflow-hidden rounded-full bg-[rgba(10,46,14,0.08)]">
          <div
            className="analysis-progress-fill h-2 rounded-full bg-[linear-gradient(90deg,#0a2e0e_0%,#2f8f58_58%,#8bd6aa_100%)] transition-[width] duration-300 ease-out"
            style={{ width: `${normalizedProgress ?? 40}%` }}
          />
        </div>
        {waitNotice && (
          <p className="mx-auto mt-4 max-w-md text-balance text-[12px] font-medium leading-5 text-[var(--ink-soft)]">
            {waitNotice}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDialogRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const immersiveContainerRef = useRef<HTMLDivElement>(null);
  const immersiveContentRef = useRef<HTMLDivElement>(null);
  const renderedHighlightRangesRef = useRef<RenderedHighlightRange[]>([]);
  const renderedSearchMatchRangesRef = useRef<Range[]>([]);
  const readerScrollContainerRef = useRef<HTMLDivElement>(null);
  const immersiveCardsLenRef = useRef(0);
  const shouldScrollToStarterSectionRef = useRef(false);
  const analysisIntroStartedAtRef = useRef(0);

  // ── Background analysis state ──
  const bgAnalysisRef = useRef<BgAnalysisData | null>(null);
  const bgAnalysisTitleRef = useRef<string>("");
  const originalReadingBackfillRef = useRef<Set<string>>(new Set());
  const coverBackfillRef = useRef<Set<string>>(new Set());
  const [bgAnalysisStatus, setBgAnalysisStatus] = useState<BgAnalysisStatus>({ active: false });
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [analysisWaitNotice, setAnalysisWaitNotice] = useState("");
  const [failedUploadFile, setFailedUploadFile] = useState<File | null>(null);
  const [uploadFailureStage, setUploadFailureStage] = useState<UploadFailureStage>(null);
  const [analysisErrorCode, setAnalysisErrorCode] = useState<string | null>(null);
  const [analysisIntroTitle, setAnalysisIntroTitle] = useState("");
  const [analysisIntroCover, setAnalysisIntroCover] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [readingGuide, setReadingGuide] = useState("");
  const [originalReadingValue, setOriginalReadingValue] = useState("");
  const [isOriginalReadingAdviceExpanded, setIsOriginalReadingAdviceExpanded] = useState(false);
  const [viewMap, setViewMap] = useState("");
  const [actionExtraction, setActionExtraction] = useState("");
  const [criticalExamination, setCriticalExamination] = useState("");
  const [ideaSourceTracing, setIdeaSourceTracing] = useState("");
  const [workspaceQuote, setWorkspaceQuote] = useState("");
  const [cardEvidenceByKey, setCardEvidenceByKey] = useState<Record<string, CardEvidence>>({});
  const [bookSummary, setBookSummary] = useState("");
  const [bookCoverImage, setBookCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBookSummary, setIsLoadingBookSummary] = useState(false);
  const [isLoadingReadingGuide, setIsLoadingReadingGuide] = useState(false);
  const [isLoadingOriginalReadingValue, setIsLoadingOriginalReadingValue] = useState(false);
  const [isLoadingViewMap, setIsLoadingViewMap] = useState(false);
  const [isLoadingActionExtraction, setIsLoadingActionExtraction] = useState(false);
  const [isLoadingViewValidation, setIsLoadingViewValidation] = useState(false);
  const [isLoadingIdeaSourceTracing, setIsLoadingIdeaSourceTracing] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success">("idle");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSupportCoffeeModalOpen, setIsSupportCoffeeModalOpen] = useState(false);
  const [showSupportCoffeeCallout, setShowSupportCoffeeCallout] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isLiteUnlocked, setIsLiteUnlocked] = useState(false);
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<WorkspaceReadMode>("overview");
  const [selectedEvidenceCardKey, setSelectedEvidenceCardKey] = useState("");
  const [selectedEvidenceClaimId, setSelectedEvidenceClaimId] = useState("");
  const [evidenceTransitionState, setEvidenceTransitionState] =
    useState<"entering" | "leaving">("entering");
  const [immersiveIndex, setImmersiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterContent, setPosterContent] = useState<PosterContent | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [bookHighlights, setBookHighlights] = useState<BookHighlight[]>([]);
  const [pendingQuoteSelection, setPendingQuoteSelection] =
    useState<PendingQuoteSelection | null>(null);
  const [quoteShareSelection, setQuoteShareSelection] =
    useState<QuoteShareSelection | null>(null);
  const [homeQuoteShareSelection, setHomeQuoteShareSelection] =
    useState<HomeQuoteShareSelection | null>(null);
  const [highlightActionBubble, setHighlightActionBubble] =
    useState<HighlightActionBubble | null>(null);
  const [isFeynmanPreviewOpen, setIsFeynmanPreviewOpen] = useState(false);
  const [decisionScenarios, setDecisionScenarios] = useState<DecisionScenario[]>([]);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);
  const [decisionLoadingStep, setDecisionLoadingStep] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [workspaceContentMode, setWorkspaceContentMode] = useState<WorkspaceContentMode>("cards");
  const [leapPracticeRound, setLeapPracticeRound] = useState<LeapPracticeRound | null>(null);
  const [leapPracticeReturnState, setLeapPracticeReturnState] =
    useState<LeapPracticeReturnState | null>(null);
  const [readingCompletionStatus, setReadingCompletionStatus] =
    useState<ReadingCompletionStatus>("unconfirmed");
  const [isReadingReflectionOpen, setIsReadingReflectionOpen] = useState(false);
  const [isReadingReflectionInvite, setIsReadingReflectionInvite] = useState(false);
  const [readingReflection, setReadingReflection] = useState<ReadingReflection>({
    insight: "",
    question: "",
    scene: "",
  });
  const [activeToast, setActiveToast] = useState<GuidanceToast | null>(null);
  const [toastQueue, setToastQueue] = useState<GuidanceToast[]>([]);
  const [lastToastClosedAt, setLastToastClosedAt] = useState(0);
  const [onboardingProgress, setOnboardingProgressState] = useState<OnboardingProgress>("none");
  const [fallbackUnlocks, setFallbackUnlocks] = useState({ training: false, export: false });
  const [seenCardKeys, setSeenCardKeys] = useState<string[]>([]);
  const [isStarterModeVisible, setIsStarterModeVisible] = useState(false);
  const [, setShowStarterBooks] = useState(true);
  const [experiencedStarterIds, setExperiencedStarterIds] = useState<string[]>([]);
  const [, setSelectedStarterBookIdState] = useState("");
  const [isStarterLoading, setIsStarterLoading] = useState(false);
  const [starterLoadingStep, setStarterLoadingStep] = useState<string>(STARTER_LOADING_STEPS[0].text);
  const [currentStarterBookId, setCurrentStarterBookId] = useState<string | null>(null);
  const [hasShownReturningUserToast, setHasShownReturningUserToast] = useState(false);
  const [showFabRedDot, setShowFabRedDot] = useState(false);
  const fabMenuRef = useRef<FabMenuHandle>(null);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);
  const lastUploadPromptBookIdRef = useRef<string | null>(null);

  const [addictionState, setAddictionStateLocal] = useState<AddictionState>(DEFAULT_ADDICTION_STATE);
  const [growthLedger, setGrowthLedger] = useState<GrowthLedger>(() => getEmptyGrowthLedger());
  const cardSectionRef = useRef<HTMLDivElement>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[]>([]);
  const [workspaceCardSeed] = useState(() => Math.random().toString(36).slice(2));
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [isGrowthPanelCollapsed, setIsGrowthPanelCollapsed] = useState(true);
  const [isLibraryPreviewOpen, setIsLibraryPreviewOpen] = useState(false);
  const [isGrowthPreviewOpen, setIsGrowthPreviewOpen] = useState(false);
  const [isLibraryPreviewSuppressed, setIsLibraryPreviewSuppressed] = useState(false);
  const [isGrowthPreviewSuppressed, setIsGrowthPreviewSuppressed] = useState(false);
  const [hasGrowthUpdateBadge, setHasGrowthUpdateBadge] = useState(false);
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState("");
  const [pendingDeleteCountdown, setPendingDeleteCountdown] = useState(10);
  const [isWorkspaceSearchOpen, setIsWorkspaceSearchOpen] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [workspaceSearchFilter, setWorkspaceSearchFilter] =
    useState<WorkspaceSearchFilter>("all");
  const [workspaceSearchActiveIndex, setWorkspaceSearchActiveIndex] = useState(0);
  const [activeSearchHighlightTokens, setActiveSearchHighlightTokens] = useState<string[]>([]);
  const [activeSearchHighlightCardKey, setActiveSearchHighlightCardKey] = useState("");
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);
  const [activeSearchMatchCount, setActiveSearchMatchCount] = useState(0);
  const [debouncedWorkspaceSearchQuery, setDebouncedWorkspaceSearchQuery] = useState("");
  const [workspaceSearchWorkerMatches, setWorkspaceSearchWorkerMatches] = useState<
    Record<string, WorkspaceSearchWorkerMatch | null> | null
  >(null);
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState(false);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const pendingDeleteCountdownRef = useRef<number | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [isBackupNoticeOpen, setIsBackupNoticeOpen] = useState(false);
  const [backupImportPreview, setBackupImportPreview] = useState<BackupImportPreview | null>(null);
  const [backupImportError, setBackupImportError] = useState("");
  const [isLegacyDomainNoticeVisible, setIsLegacyDomainNoticeVisible] = useState(false);
  const [isCoverageDetailOpen, setIsCoverageDetailOpen] = useState(false);

  const resetAnalysisLoadingStates = useCallback(() => {
    setIsLoading(false);
    setIsLoadingBookSummary(false);
    setIsLoadingReadingGuide(false);
    setIsLoadingOriginalReadingValue(false);
    setIsLoadingViewMap(false);
    setIsLoadingActionExtraction(false);
    setIsLoadingViewValidation(false);
    setIsLoadingIdeaSourceTracing(false);
  }, []);

  const isAnalyzing =
    isLoading ||
    isLoadingBookSummary ||
    isLoadingReadingGuide ||
    isLoadingOriginalReadingValue ||
    isLoadingViewMap ||
    isLoadingActionExtraction ||
    isLoadingViewValidation ||
    isLoadingIdeaSourceTracing;

  useEffect(() => {
    if (!isAnalyzing || bookTitle || uploadProgressPercent !== 100) {
      setAnalysisWaitNotice("");
      return;
    }

    const slowTimer = window.setTimeout(() => {
      setAnalysisWaitNotice("这本书较大，解析会多花一点时间。请保持页面打开，我们会自动继续。");
    }, 20000);
    const verySlowTimer = window.setTimeout(() => {
      setAnalysisWaitNotice("还在处理，不需要重新上传。网络或书籍结构较复杂时会更久。");
    }, 60000);

    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(verySlowTimer);
    };
  }, [bookTitle, isAnalyzing, uploadProgressPercent]);

  const currentBookId = bookTitle ? buildDecisionBookId(bookTitle) : null;
  const workspaceModeScrollRef = useRef<Record<WorkspaceContentMode, number>>({
    cards: 0,
    practice: 0,
  });
  const switchWorkspaceContentMode = useCallback((mode: WorkspaceContentMode) => {
    if (typeof window !== "undefined") {
      workspaceModeScrollRef.current[workspaceContentMode] = window.scrollY;
    }
    setWorkspaceContentMode(mode);
    window.requestAnimationFrame(() => {
      const savedY = workspaceModeScrollRef.current[mode] ?? 0;
      window.scrollTo({ top: savedY, behavior: "auto" });
    });
  }, [workspaceContentMode]);
  const isDecisionPanelOpen = workspaceContentMode === "practice";
  const setIsDecisionPanelOpen = useCallback((open: boolean) => {
    switchWorkspaceContentMode(open ? "practice" : "cards");
  }, [switchWorkspaceContentMode]);
  const hasReadingReflection =
    !!readingReflection.insight.trim() ||
    !!readingReflection.question.trim() ||
    !!readingReflection.scene.trim();
  const currentStarterBook = currentStarterBookId
    ? starterBooksById[currentStarterBookId] ?? null
    : null;
  const currentHistoryRecord = useMemo(
    () => recentHistory.find((record) => record.title === bookTitle) ?? null,
    [bookTitle, recentHistory]
  );
  const [fetchedAuthor, setFetchedAuthor] = useState("");
  const starterCover = currentStarterBook?.coverImage ?? "";
  const currentBookAuthor =
    currentStarterBook?.author ||
    currentHistoryRecord?.author ||
    bookAuthor ||
    fetchedAuthor ||
    "";

  useEffect(() => {
    if (!currentBookId) {
      setReadingReflection({ insight: "", question: "", scene: "" });
      setReadingCompletionStatus("unconfirmed");
      setIsReadingReflectionOpen(false);
      setIsReadingReflectionInvite(false);
      return;
    }

    try {
      const raw = localStorage.getItem(`${READING_REFLECTION_PREFIX}${currentBookId}`);
      if (!raw) {
        setReadingReflection({ insight: "", question: "", scene: "" });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<ReadingReflection>;
      setReadingReflection({
        insight: typeof parsed.insight === "string" ? parsed.insight : "",
        question: typeof parsed.question === "string" ? parsed.question : "",
        scene: typeof parsed.scene === "string" ? parsed.scene : "",
      });
    } catch {
      setReadingReflection({ insight: "", question: "", scene: "" });
    }
    setReadingCompletionStatus(loadReadingCompletion(currentBookId));
    setIsReadingReflectionOpen(false);
    setIsReadingReflectionInvite(false);
  }, [currentBookId]);

  useEffect(() => {
    workspaceModeScrollRef.current = { cards: 0, practice: 0 };
    if (!currentBookId) {
      setLeapPracticeRound(null);
      setDecisionScenarios([]);
      setLeapPracticeReturnState(null);
      setWorkspaceContentMode("cards");
      return;
    }

    const storedRound = loadLeapPracticeRound(currentBookId);
    const legacyScenarios = loadDecisionScenarioCache(currentBookId);
    const legacyAddictionState = getAddictionState(currentBookId);
    const legacyProgress = Math.min(
      3,
      Math.max(0, legacyAddictionState.decision_training_progress)
    );
    const legacyAnswers = legacyAddictionState.decision_history.filter(
      (answer): answer is DecisionOptionKey => answer === "A" || answer === "B"
    );
    const round =
      storedRound.scenarios.some(Boolean) || legacyScenarios.length !== 3
        ? storedRound
        : saveLeapPracticeRound(createLeapPracticeRoundFromScenarios(
            currentBookId,
            legacyScenarios,
            legacyProgress,
            legacyAnswers
          ));

    setLeapPracticeRound(round);
    setDecisionScenarios(round.scenarios.filter((scenario): scenario is DecisionScenario => !!scenario));
    setLeapPracticeReturnState(null);
    setDecisionError("");
  }, [currentBookId]);

  const updateReadingReflection = useCallback(
    (field: keyof ReadingReflection, value: string) => {
      setReadingReflection((current) => {
        const next = { ...current, [field]: value };
        if (currentBookId) {
          try {
            localStorage.setItem(
              `${READING_REFLECTION_PREFIX}${currentBookId}`,
              JSON.stringify(next)
            );
          } catch {
            // ignore local storage failures
          }
        }
        return next;
      });
    },
    [currentBookId]
  );

  const updateReadingCompletionStatus = useCallback((status: ReadingCompletionStatus) => {
    if (!currentBookId) return;

    saveReadingCompletion(currentBookId, status);
    setReadingCompletionStatus(status);
    if (
      status === "completed" &&
      !hasReadingReflection &&
      !hasDismissedReadingReflectionPrompt(currentBookId)
    ) {
      recordLeapPracticeEvent(currentBookId, "reading_reflection_invited");
      setIsReadingReflectionInvite(true);
      setIsReadingReflectionOpen(true);
    }
  }, [currentBookId, hasReadingReflection]);

  const currentAnalysisContext = useMemo(() => {
    if (currentHistoryRecord) {
      return currentHistoryRecord.analysisContext;
    }
    return buildHistoryAnalysisContext({
      title: bookTitle,
      author: currentBookAuthor,
      chapters,
    });
  }, [bookTitle, chapters, currentBookAuthor, currentHistoryRecord]);
  const analysisCoverageMeta = useMemo(
    () => getAnalysisCoverageMeta(currentAnalysisContext),
    [currentAnalysisContext]
  );
  const rememberCardEvidence = useCallback((cardKey: string, evidence: unknown) => {
    if (!cardKey || !isCardEvidence(evidence)) return;
    setCardEvidenceByKey((prev) => ({
      ...prev,
      [cardKey]: evidence,
    }));
  }, []);
  const analysisModeLabel = isLiteMode && !isLiteUnlocked ? "简化分析" : "完整分析";
  const historyCover = currentHistoryRecord?.coverImage ?? "";
  const localCover = starterCover || bookCoverImage || historyCover;

  useEffect(() => {
    setIsCoverageDetailOpen(false);
  }, [bookTitle]);

  useEffect(() => {
    setSelectedEvidenceCardKey("");
    setSelectedEvidenceClaimId("");
  }, [bookTitle]);

  useEffect(() => {
    setIsLegacyDomainNoticeVisible(isLegacyBookDomainHost(window.location.hostname));
  }, []);

  const [fetchedCover, setFetchedCover] = useState("");
  useEffect(() => {
    if (!bookTitle || currentStarterBook?.author || currentHistoryRecord?.author || bookAuthor) {
      setFetchedAuthor("");
      return;
    }

    let cancelled = false;

    const joinAuthors = (authors: unknown): string => {
      if (!Array.isArray(authors)) return "";
      return authors
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join(" / ");
    };

    const fetchAuthor = async () => {
      try {
        const googleRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookTitle)}&maxResults=3`
        );
        if (googleRes.ok) {
          const data = await googleRes.json();
          const items = data.items ?? [];
          const matched = items.find((item: { volumeInfo?: { title?: string; authors?: unknown } }) =>
            item.volumeInfo?.title && isBookTitleMatch(item.volumeInfo.title, bookTitle)
          ) ?? items[0];
          const authors = joinAuthors(matched?.volumeInfo?.authors);
          if (authors && !cancelled) {
            setFetchedAuthor(authors);
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        const openLibraryRes = await fetch(
          `https://openlibrary.org/search.json?title=${encodeURIComponent(bookTitle)}&limit=3&fields=title,author_name`
        );
        if (!openLibraryRes.ok) return;
        const data = await openLibraryRes.json();
        const docs = data.docs ?? [];
        const matched = docs.find((doc: { title?: string; author_name?: unknown }) =>
          doc.title && isBookTitleMatch(doc.title, bookTitle)
        ) ?? docs[0];
        const authors = joinAuthors(matched?.author_name);
        if (authors && !cancelled) setFetchedAuthor(authors);
      } catch { /* ignore */ }
    };

    setFetchedAuthor("");
    void fetchAuthor();

    return () => { cancelled = true; };
  }, [bookAuthor, bookTitle, currentHistoryRecord?.author, currentStarterBook?.author]);

  useEffect(() => {
    if (localCover || !bookTitle) {
      setFetchedCover("");
      return;
    }
    let cancelled = false;

    (async () => {
      const cover = await fetchBookCoverFromCatalog(bookTitle);
      if (cover && !cancelled) setFetchedCover(cover);
    })();

    return () => { cancelled = true; };
  }, [bookTitle, localCover]);

  const currentBookCover = localCover || fetchedCover;
  const selectedFileType = selectedFile ? getFileTypeFromName(selectedFile.name) : null;
  const currentFileTypeLabel = selectedFileType
    ? getFileTypeLabel(selectedFileType)
    : currentHistoryRecord
    ? getFileTypeLabel(currentHistoryRecord.fileType)
    : currentStarterBook
    ? "EPUB"
    : "";
  const currentSessionRecordId = useMemo(() => {
    if (currentHistoryRecord) return currentHistoryRecord.id;
    if (!bookTitle) return null;

    const inferredFileType = selectedFileType ?? "epub";
    return `${bookTitle}-${inferredFileType}`;
  }, [bookTitle, currentHistoryRecord, selectedFileType]);
  const currentBookDisplayTitle =
    bookTitle ||
    (selectedFile ? stripSupportedFileExtension(selectedFile.name) : "") ||
    currentStarterBook?.title ||
    "未知书名";
  const currentHighlightBookRef =
    currentSessionRecordId ||
    (currentStarterBookId ? `starter:${currentStarterBookId}` : "") ||
    (bookTitle ? buildDecisionBookId(bookTitle) : "");
  const isUploadShortcutBlocked =
    isWorkspaceSearchOpen ||
    isExportModalOpen ||
    isSupportCoffeeModalOpen ||
    isPaywallModalOpen ||
    isPosterModalOpen ||
    !!quoteShareSelection ||
    !!homeQuoteShareSelection ||
    isFeynmanPreviewOpen ||
    isUpgradeModalOpen ||
    isDisclaimerModalOpen ||
    isBackupNoticeOpen ||
    isDecisionPanelOpen;

  useEffect(() => {
    if (!hasAcceptedWorkspaceDisclaimer()) {
      setIsDisclaimerModalOpen(true);
    }
  }, []);

  const handleAcceptWorkspaceDisclaimer = useCallback(() => {
    markWorkspaceDisclaimerAccepted();
    setIsDisclaimerModalOpen(false);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsWorkspaceFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const handleOpenWorkspaceSearch = useCallback(() => {
    setWorkspaceSearchQuery("");
    setWorkspaceSearchFilter("all");
    setWorkspaceSearchActiveIndex(0);
    setIsWorkspaceSearchOpen(true);
    recordWorkspaceSearchEvent("search_opened");
  }, []);

  const handleOpenUploadPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void document.documentElement.requestFullscreen?.();
  }, []);

  const markGrowthInspectorUpdated = useCallback(() => {
    setHasGrowthUpdateBadge(true);
  }, []);

  const openLibraryPanel = useCallback(() => {
    setIsLibraryPreviewOpen(false);
    setIsLibraryPreviewSuppressed(false);
    setIsLibraryCollapsed(false);
  }, []);

  const toggleLibraryPanel = useCallback(() => {
    setIsLibraryPreviewOpen(false);
    setIsLibraryCollapsed((prev) => {
      const next = !prev;
      if (next) {
        setIsLibraryPreviewSuppressed(true);
      }
      return next;
    });
  }, []);

  const previewLibraryPanel = useCallback(() => {
    if (isLibraryCollapsed && !isLibraryPreviewSuppressed) {
      setIsLibraryPreviewOpen(true);
    }
  }, [isLibraryCollapsed, isLibraryPreviewSuppressed]);

  const allowLibraryPreview = useCallback(() => {
    setIsLibraryPreviewSuppressed(false);
  }, []);

  const openGrowthInspector = useCallback(() => {
    setIsGrowthPreviewOpen(false);
    setIsGrowthPreviewSuppressed(false);
    setIsGrowthPanelCollapsed(false);
    setHasGrowthUpdateBadge(false);
  }, []);

  const handleToggleGrowthInspector = useCallback(() => {
    setIsGrowthPreviewOpen(false);
    if (isGrowthPanelCollapsed) {
      setHasGrowthUpdateBadge(false);
    }
    setIsGrowthPanelCollapsed((prev) => {
      const next = !prev;
      if (next) {
        setIsGrowthPreviewSuppressed(true);
      }
      return next;
    });
  }, [isGrowthPanelCollapsed]);

  const previewGrowthInspector = useCallback(() => {
    if (isGrowthPanelCollapsed && !isGrowthPreviewSuppressed) {
      setIsGrowthPreviewOpen(true);
    }
  }, [isGrowthPanelCollapsed, isGrowthPreviewSuppressed]);

  const allowGrowthPreview = useCallback(() => {
    setIsGrowthPreviewSuppressed(false);
  }, []);

  useEffect(() => {
    if (
      !isLibraryPreviewOpen &&
      !isGrowthPreviewOpen &&
      !isLibraryPreviewSuppressed &&
      !isGrowthPreviewSuppressed
    ) return;

    const handlePointerMove = (event: PointerEvent) => {
      const isPointerInsidePreviewArea = (side: "library" | "growth") => {
        const previewElements = [
          document.querySelector(`[data-workspace-preview-panel="${side}"]`),
          document.querySelector(`[data-workspace-preview-trigger="${side}"]`),
        ];

        return previewElements.some((element) => {
          if (!element) return false;
          const rect = element.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        });
      };

      const isPointerInsidePreviewTrigger = (side: "library" | "growth") => {
        const trigger = document.querySelector(`[data-workspace-preview-trigger="${side}"]`);
        if (!trigger) return false;
        const rect = trigger.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      };

      if (isLibraryPreviewOpen && !isPointerInsidePreviewArea("library")) {
        setIsLibraryPreviewOpen(false);
      }

      if (isGrowthPreviewOpen && !isPointerInsidePreviewArea("growth")) {
        setIsGrowthPreviewOpen(false);
      }

      if (isLibraryPreviewSuppressed && !isPointerInsidePreviewTrigger("library")) {
        setIsLibraryPreviewSuppressed(false);
      }

      if (isGrowthPreviewSuppressed && !isPointerInsidePreviewTrigger("growth")) {
        setIsGrowthPreviewSuppressed(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [
    isGrowthPreviewOpen,
    isGrowthPreviewSuppressed,
    isLibraryPreviewOpen,
    isLibraryPreviewSuppressed,
  ]);

  useEffect(() => {
    if (!isWorkspaceSearchOpen) return;

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWorkspaceSearchOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const focusable = Array.from(
          searchDialogRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
          ) ?? []
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorkspaceSearchOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedWorkspaceSearchQuery(workspaceSearchQuery);
    }, 140);

    return () => window.clearTimeout(timer);
  }, [workspaceSearchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isTyping = isTextInputTarget(event.target);
      const isShortcutInInteractiveTarget = isInteractiveShortcutTarget(event.target);
      const isPlainKey = !event.metaKey && !event.ctrlKey && !event.altKey;

      if (
        (event.key === " " || event.code === "Space") &&
        isPlainKey &&
        !isShortcutInInteractiveTarget &&
        !isUploadShortcutBlocked
      ) {
        event.preventDefault();
        handleOpenUploadPicker();
      }

      if (event.key.toLowerCase() === "k" && !isTyping && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleOpenWorkspaceSearch();
      }

      if (event.key.toLowerCase() === "f" && !isTyping && isPlainKey) {
        event.preventDefault();
        handleToggleFullscreen();
      }

      if (event.key === "[" && !isTyping && isPlainKey) {
        event.preventDefault();
        toggleLibraryPanel();
      }

      if (event.key === "]" && !isTyping && isPlainKey) {
        event.preventDefault();
        handleToggleGrowthInspector();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleOpenUploadPicker,
    handleOpenWorkspaceSearch,
    handleToggleFullscreen,
    handleToggleGrowthInspector,
    isUploadShortcutBlocked,
    toggleLibraryPanel,
  ]);

  const workspaceMemoryCards = useMemo<WorkspaceMemoryCard[]>(() => {
    const historyCards = recentHistory
      .filter((record) => {
        const quote = pickWorkspaceQuote(record);
        return !!record.title && !!quote;
      })
      .map((record) => ({
        id: record.id,
        title: record.title,
        author: record.author || (record.starterBookId ? starterBooksById[record.starterBookId]?.author ?? "" : ""),
        quote: pickWorkspaceQuote(record),
      }))
      .sort((a, b) => {
        const aScore = hashString(`${workspaceCardSeed}:${a.id}`);
        const bScore = hashString(`${workspaceCardSeed}:${b.id}`);
        return aScore - bScore;
      })
      .slice(0, 2);

    if (historyCards.length >= 2) {
      return historyCards;
    }

    const usedTitles = new Set(historyCards.map((card) => card.title));
    const starterCards = starterBooks
      .filter((book) => !usedTitles.has(book.title))
      .map((book) => ({
        id: `starter-memory-${book.id}`,
        title: book.title,
        author: book.author,
        quote: book.posterContent.highlight,
      }))
      .filter((card) => !!card.quote);

    return [...historyCards, ...starterCards].slice(0, 2);
  }, [recentHistory, workspaceCardSeed]);
  const currentWorkspaceTab = useMemo<WorkspaceTab | null>(() => {
    if (
      bgAnalysisStatus.active &&
      bgAnalysisTitleRef.current &&
      bgAnalysisTitleRef.current === bookTitle
    ) {
      return {
        id: getAnalysisTabId(bgAnalysisTitleRef.current),
        title: bookTitle || bgAnalysisStatus.title || "新书",
        subtitle: currentBookAuthor || currentFileTypeLabel || "解析中",
        source: "analysis",
        analysisTitle: bgAnalysisTitleRef.current,
        closable: false,
        status: "analyzing",
        progressLabel: `${bgAnalysisStatus.stepsCompleted}/${bgAnalysisStatus.totalSteps}`,
      };
    }

    if (!bookTitle) return null;

    if (currentStarterBookId) {
      return {
        id: `starter:${currentStarterBookId}`,
        title: bookTitle,
        subtitle: currentBookAuthor || "赠送书单",
        source: "starter",
        starterBookId: currentStarterBookId,
        closable: !isAnalyzing,
      };
    }

    if (currentHistoryRecord) {
      return {
        id: `history:${currentSessionRecordId ?? currentHistoryRecord.id}`,
        title: currentHistoryRecord.title,
        subtitle: currentHistoryRecord.author || currentFileTypeLabel || "历史记录",
        source: "history",
        recordId: currentHistoryRecord.id,
        closable: !isAnalyzing,
      };
    }

    return {
      id: `history:${currentSessionRecordId ?? buildDecisionBookId(bookTitle)}`,
      title: bookTitle,
      subtitle: currentBookAuthor || currentFileTypeLabel || "当前会话",
      source: "current",
      closable: !isAnalyzing,
    };
  }, [
    bookTitle,
    currentBookAuthor,
    currentFileTypeLabel,
    currentHistoryRecord,
    currentSessionRecordId,
    currentStarterBookId,
    bgAnalysisStatus,
    isAnalyzing,
  ]);

  // Load history + onboarding progress on mount
  useEffect(() => {
    const legacyHistory = loadLegacyHistory();
    setHistoryCache(legacyHistory);
    const ledger = loadGrowthLedger();
    const onboardingStep = getOnboardingStep();
    const starterBookId = getSelectedStarterBookId();

    const returningUserToastSeenThisSession = hasSeenReturningUserToastThisSession();

    setRecentHistory(legacyHistory);
    setGrowthLedger(ledger);
    setOnboardingProgressState(onboardingStep);
    setSelectedStarterBookIdState(starterBookId);
    setExperiencedStarterIds(getExperiencedStarterBooks());
    // Hide floating books if all starter books already experienced
    if (getExperiencedStarterBooks().length >= starterBooks.length) {
      setShowStarterBooks(false);
    }
    setHasShownReturningUserToast(returningUserToastSeenThisSession);
    setShowFabRedDot(
      hasHistoryReorganizedBeenShown() && !hasFabHistoryBeenSeen() && legacyHistory.length >= 3
    );
    // 不再自动进入 starter mode，新用户默认看到上传区
    setIsStarterModeVisible(false);

    let cancelled = false;
    void (async () => {
      try {
        if (legacyHistory.length > 0) {
          await migrateLegacyHistoryRecordsToIndexedDb(legacyHistory);
        }

        const indexedDbHistory = await getIndexedDbHistoryRecords<HistoryRecord>();
        const nextHistory = indexedDbHistory.length > 0 ? indexedDbHistory : legacyHistory;
        setHistoryCache(nextHistory);

        if (!cancelled) {
          setRecentHistory(nextHistory);
          setShowFabRedDot(
            hasHistoryReorganizedBeenShown() && !hasFabHistoryBeenSeen() && nextHistory.length >= 3
          );
        }
      } catch (error) {
        console.warn("IndexedDB 历史加载失败，将继续使用 localStorage:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      shouldPromptCoffeeSupport(recentHistory, hasSupportCoffeePromptBeenShown())
    ) {
      markSupportCoffeePromptShown();
      setShowSupportCoffeeCallout(true);
    }
  }, [recentHistory]);

  useEffect(() => {
    if (!currentBookId) {
      setAddictionStateLocal(DEFAULT_ADDICTION_STATE);
      return;
    }

    setAddictionStateLocal(getAddictionState(currentBookId));
  }, [currentBookId]);

  useEffect(() => {
    setBookHighlights(currentHighlightBookRef ? loadBookHighlights(currentHighlightBookRef) : []);
    setPendingQuoteSelection(null);
    setHighlightActionBubble(null);
  }, [currentHighlightBookRef]);

  useEffect(() => {
    const missingCoverRecords = recentHistory
      .filter((record) => {
        if (record.coverImage) return false;
        if (record.starterBookId && starterBooksById[record.starterBookId]?.coverImage) return false;
        return !coverBackfillRef.current.has(record.id);
      });

    if (missingCoverRecords.length === 0) return;

    let cancelled = false;

    const backfillCovers = async () => {
      const updates = await Promise.all(
        missingCoverRecords.map(async (record) => {
          coverBackfillRef.current.add(record.id);
          const coverImage = await fetchBookCoverFromCatalog(record.title);
          return coverImage ? { id: record.id, coverImage } : null;
        })
      );
      if (cancelled) return;

      const validUpdates = updates.filter(
        (item): item is { id: string; coverImage: string } => !!item
      );
      if (validUpdates.length === 0) return;

      const updateMap = new Map(validUpdates.map((item) => [item.id, item.coverImage]));
      const history = loadHistory();
      const nextHistory = history.map((record) => {
        const coverImage = updateMap.get(record.id);
        return coverImage ? { ...record, coverImage } : record;
      });

      if (saveHistory(nextHistory)) {
        setRecentHistory(nextHistory);
      }
    };

    void backfillCovers();

    return () => {
      cancelled = true;
    };
  }, [recentHistory]);

  useEffect(() => {
    setIsOriginalReadingAdviceExpanded(false);
  }, [bookTitle]);

  useEffect(() => {
    if (!currentWorkspaceTab) {
      setActiveTabId(null);
      return;
    }

    setOpenTabs((prev) => {
      const existingIndex = prev.findIndex((tab) => tab.id === currentWorkspaceTab.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = currentWorkspaceTab;
        return next;
      }
      return [...prev, currentWorkspaceTab];
    });
    setActiveTabId(currentWorkspaceTab.id);
  }, [currentWorkspaceTab]);

  useEffect(() => {
    if (!currentHistoryRecord || currentHistoryRecord.originalReadingValue || currentHistoryRecord.isStarterBook) return;
    if (originalReadingValue || !bookSummary.trim() || !readingGuide.trim()) return;
    if (originalReadingBackfillRef.current.has(currentHistoryRecord.id)) return;

    originalReadingBackfillRef.current.add(currentHistoryRecord.id);
    let cancelled = false;
    setIsLoadingOriginalReadingValue(true);

    const backfillOriginalReadingValue = async () => {
      try {
        const response = await fetch("/api/skills/original-reading-value", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: currentHistoryRecord.title,
            bookSummary,
            readingGuide,
            chapters: [],
          }),
        });
        const data = await response.json();
        if (!data.success || typeof data.originalReadingValue !== "string") return;

        const nextOriginalReadingValue = data.originalReadingValue.trim();
        if (!nextOriginalReadingValue) return;

        const history = loadHistory();
        const nextHistory = history.map((record) =>
          record.id === currentHistoryRecord.id
            ? { ...record, originalReadingValue: nextOriginalReadingValue }
            : record
        );
        saveHistory(nextHistory);
        setRecentHistory(nextHistory);

        if (!cancelled && bookTitle === currentHistoryRecord.title) {
          setOriginalReadingValue(nextOriginalReadingValue);
        }
      } catch (error) {
        console.error("历史记录原书阅读建议补生成失败:", error);
      } finally {
        if (!cancelled && bookTitle === currentHistoryRecord.title) {
          setIsLoadingOriginalReadingValue(false);
        }
      }
    };

    void backfillOriginalReadingValue();

    return () => {
      cancelled = true;
    };
  }, [
    bookSummary,
    bookTitle,
    currentHistoryRecord,
    originalReadingValue,
    readingGuide,
  ]);

  // Save to history when analysis completes
  useEffect(() => {
    if (message !== "分析完成" || isAnalyzing || !bookTitle) return;
    const fileType = selectedFile ? getFileTypeFromName(selectedFile.name) ?? "epub" : "epub";
    const currentStarterBook = currentStarterBookId
      ? starterBooksById[currentStarterBookId] ?? null
      : null;
    const record: HistoryRecord = {
      id: `${bookTitle}-${fileType}`,
      title: bookTitle,
      fileType,
      mode: isLiteMode && !isLiteUnlocked ? "lite" : "full",
      createdAt: new Date().toISOString(),
      bookSummary,
      readingGuide,
      originalReadingValue,
      viewMap,
      actionExtraction,
      viewValidation: criticalExamination,
      ideaSourceTracing,
      bookRecommendation: "",
      workspaceQuote: sanitizeWorkspaceQuote(workspaceQuote, { title: bookTitle }),
      cardEvidence: cardEvidenceByKey,
      coverImage: currentStarterBook?.coverImage || bookCoverImage || currentHistoryRecord?.coverImage || "",
      posterContent: posterContent ?? null,
      isStarterBook: !!currentStarterBook,
      starterBookId: currentStarterBook?.id,
      author: currentStarterBook?.author || bookAuthor || currentHistoryRecord?.author || undefined,
      analysisContext: buildHistoryAnalysisContext({
        title: bookTitle,
        author: currentStarterBook?.author || bookAuthor || currentHistoryRecord?.author,
        chapters,
      }),
    };
    const prev = loadHistory().filter((r) => r.id !== record.id);
    const next = [record, ...prev];
    saveHistory(next);
    setRecentHistory(next);
    const thinkingGrowth = awardGrowth("thinking", {
      bookId: buildDecisionBookId(record.title),
      bookTitle: record.title,
      action: "分析完成",
    });
    if (thinkingGrowth.changed) {
      setGrowthLedger(thinkingGrowth.ledger);
      markGrowthInspectorUpdated();
      enqueueGuidanceToast({
        id: `growth-thinking-${buildDecisionBookId(record.title)}`,
        message: `思考力印记 +1\n来自《${record.title}》的分析完成`,
        priority: TOAST_PRIORITY.INFO,
        durationMs: 4500,
      });
    }
    if (!currentStarterBook) {
      markUploadedBook(record.title);
    }
    if (next.length >= 3 && !hasHistoryReorganizedBeenShown()) {
      markHistoryReorganizedShown();
      setShowFabRedDot(true);
      enqueueGuidanceToast({
        id: "history-reorganized",
        message: "📚 你的分析记录已自动整理到「我的」",
        actionText: "去看看",
        onAction: () => {
          setTimeout(() => {
            historyPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
          fabMenuRef.current?.open();
        },
        priority: TOAST_PRIORITY.INFO,
        durationMs: 10000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, isAnalyzing]);

  const advanceOnboardingProgress = useCallback((nextStep: OnboardingProgress) => {
    setOnboardingProgressState((prev) => {
      if (!isBeforeOnboardingStep(prev, nextStep)) {
        return prev;
      }
      persistOnboardingStep(nextStep);
      return nextStep;
    });
  }, []);

  const enqueueGuidanceToast = useCallback((toast: GuidanceToast) => {
    // 高优先级 toast 抢占当前正在显示的低优先级 toast
    setActiveToast((current) => {
      if (shouldPreempt(current, toast)) {
        // 被挤掉的 toast 放回队列（系统级 toast 不放回）
        if (current && current.priority > TOAST_PRIORITY.SYSTEM) {
          setToastQueue((prev) => insertIntoQueue(prev, current, toast.id));
        }
        return toast;
      }
      // 不抢占，入队等待
      setToastQueue((prev) => insertIntoQueue(prev, toast, current?.id));
      return current;
    });
  }, []);

  const downloadLocalBackup = useCallback(async () => {
    try {
      const backup = await createIndexedDbDataBackup();
      const dateStamp = backup.exportedAt.slice(0, 10);

      downloadJsonFile(`bookleap-backup-${dateStamp}.json`, backup);
      enqueueGuidanceToast({
        id: `local-backup-${Date.now()}`,
        message: `已导出本地书库备份\n包含 ${backup.historyCount} 本书`,
        priority: TOAST_PRIORITY.INFO,
        durationMs: 4200,
      });
    } catch {
      enqueueGuidanceToast({
        id: `local-backup-failed-${Date.now()}`,
        message: "本地备份导出失败\n请确认浏览器允许下载文件",
        priority: TOAST_PRIORITY.SYSTEM,
        durationMs: 5200,
      });
    }
  }, [enqueueGuidanceToast]);

  const handleBackupLocalData = useCallback(() => {
    setBackupImportPreview(null);
    setBackupImportError("");
    setIsBackupNoticeOpen(true);
  }, []);

  const handleConfirmBackupDownload = useCallback(() => {
    void downloadLocalBackup();
  }, [downloadLocalBackup]);

  const handleChooseBackupFile = useCallback(() => {
    backupImportInputRef.current?.click();
  }, []);

  const handleBackupFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setBackupImportError("");
    setBackupImportPreview(null);

    try {
      const raw = await file.text();
      const parsed = normalizeBookleapDataBackup(JSON.parse(raw));

      if (!parsed) {
        setBackupImportError("无法识别这个备份文件。请选择书跃导出的 JSON 备份。");
        return;
      }

      setBackupImportPreview({
        ...analyzeBackupImport(parsed),
        fileName: file.name,
      });
    } catch {
      setBackupImportError("备份文件读取失败。请确认文件没有损坏，并且是 JSON 格式。");
    }
  }, []);

  const handleConfirmBackupImport = useCallback(async () => {
    if (!backupImportPreview) return;

    try {
      const currentBackup = await createIndexedDbDataBackup();
      const beforeImportStamp = currentBackup.exportedAt.slice(0, 10);
      downloadJsonFile(`bookleap-before-import-${beforeImportStamp}.json`, currentBackup);

      const { backup } = backupImportPreview;
      const currentHistory = loadHistory();
      const mergeStats = mergeHistoryRecords(currentHistory, getBackupHistoryRecords(backup));

      for (const [key, value] of Object.entries(backup.localStorage)) {
        if (!shouldIncludeBackupStorageKey(key) || key === HISTORY_KEY) continue;
        localStorage.setItem(key, value);
      }

      saveHistory(mergeStats.merged);
      setRecentHistory(mergeStats.merged);
      setGrowthLedger(loadGrowthLedger());
      setExperiencedStarterIds(getExperiencedStarterBooks());
      setSelectedStarterBookIdState(getSelectedStarterBookId());
      setBackupImportPreview(null);
      setBackupImportError("");
      setIsBackupNoticeOpen(false);

      enqueueGuidanceToast({
        id: `local-import-${Date.now()}`,
        message: `已合并导入备份\n新增 ${mergeStats.newHistoryCount} 本，更新 ${mergeStats.updatedHistoryCount} 本`,
        priority: TOAST_PRIORITY.INFO,
        durationMs: 5200,
      });
    } catch {
      setBackupImportError("导入失败。已保留当前浏览器数据，请稍后重试。");
    }
  }, [backupImportPreview, enqueueGuidanceToast]);

  useEffect(() => {
    const handleBackupShortcut = (event: KeyboardEvent) => {
      const isPlainKey = !event.metaKey && !event.ctrlKey && !event.altKey;
      if (
        event.key.toLowerCase() !== "b" ||
        !isPlainKey ||
        isTextInputTarget(event.target) ||
        isInteractiveShortcutTarget(event.target) ||
        isUploadShortcutBlocked
      ) {
        return;
      }

      event.preventDefault();
      handleBackupLocalData();
    };

    window.addEventListener("keydown", handleBackupShortcut);
    return () => window.removeEventListener("keydown", handleBackupShortcut);
  }, [handleBackupLocalData, isUploadShortcutBlocked]);

  useEffect(() => {
    if (!isBackupNoticeOpen) return;

    const handleBackupModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBackupNoticeOpen(false);
      }
    };

    window.addEventListener("keydown", handleBackupModalKeyDown);
    return () => window.removeEventListener("keydown", handleBackupModalKeyDown);
  }, [isBackupNoticeOpen]);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) return;

    // 高优先级 toast（P0/P1）不受冷却期限制
    const nextPriority = toastQueue[0].priority;
    const cooldown = nextPriority <= TOAST_PRIORITY.COGNITIVE ? 0 : 10000;
    const remainingDelay = Math.max(0, cooldown - (Date.now() - lastToastClosedAt));

    const timer = window.setTimeout(() => {
      setToastQueue((prev) => {
        const idx = findEligibleIndex(prev);
        if (idx === -1) return []; // 全部不合格，清空
        setActiveToast(prev[idx]);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    }, remainingDelay);

    return () => window.clearTimeout(timer);
  }, [activeToast, toastQueue, lastToastClosedAt]);

  const hasBlockingToast = !!activeToast || toastQueue.length > 0;

  const clearPendingDeleteCountdown = useCallback(() => {
    if (pendingDeleteCountdownRef.current !== null) {
      window.clearInterval(pendingDeleteCountdownRef.current);
      pendingDeleteCountdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingDeleteTimerRef.current !== null) {
        window.clearTimeout(pendingDeleteTimerRef.current);
      }
      clearPendingDeleteCountdown();
    };
  }, [clearPendingDeleteCountdown]);

  const commitDelete = useCallback((id: string) => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    clearPendingDeleteCountdown();
    const history = loadHistory();
    const recordToDelete = history.find((r) => r.id === id);
    const next = history.filter((r) => r.id !== id);

    if (recordToDelete) {
      clearBookDerivedCaches(recordToDelete.title);
    }

    saveHistory(next);
    setRecentHistory(next);
    setPendingDeleteId(null);
    setPendingDeleteTitle("");
    setPendingDeleteCountdown(10);
  }, [clearPendingDeleteCountdown]);

  const applyAddictionState = useCallback((nextState: AddictionState) => {
    setAddictionStateLocal(nextState);
    if (currentBookId) {
      setAddictionState(currentBookId, nextState);
    }
  }, [currentBookId]);

  const updateCurrentBookAddictionState = useCallback(
    (updater: (prev: AddictionState) => AddictionState) => {
      if (!currentBookId) return DEFAULT_ADDICTION_STATE;

      const nextState = updater(getAddictionState(currentBookId));
      applyAddictionState(nextState);
      return nextState;
    },
    [applyAddictionState, currentBookId]
  );

  const cancelDelete = useCallback(() => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    clearPendingDeleteCountdown();
    setPendingDeleteId(null);
    setPendingDeleteTitle("");
    setPendingDeleteCountdown(10);
  }, [clearPendingDeleteCountdown]);

  const deleteHistoryRecord = useCallback((id: string) => {
    // If there's already a pending delete, finalize it first
    if (pendingDeleteId && pendingDeleteId !== id) {
      commitDelete(pendingDeleteId);
    }

    const record = recentHistory.find((r) => r.id === id);
    const title = record?.title ?? "未知";

    setPendingDeleteId(id);
    setPendingDeleteTitle(title);
    setPendingDeleteCountdown(10);

    // Clear any existing timer
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
    }
    clearPendingDeleteCountdown();

    pendingDeleteCountdownRef.current = window.setInterval(() => {
      setPendingDeleteCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    // Auto-delete after 10 seconds
    pendingDeleteTimerRef.current = window.setTimeout(() => {
      commitDelete(id);
    }, 10000);

    // Show undo toast via unified queue (P0 = SYSTEM, will preempt any lower toast)
    enqueueGuidanceToast({
      id: `delete-undo-${id}`,
      message: `是否删除《${title}》？\n10 秒后将永久删除`,
      priority: TOAST_PRIORITY.SYSTEM,
      durationMs: 10000,
      showCloseButton: false,
      dismissible: false,
      actionText: "取消",
      onAction: () => {
        cancelDelete();
        setActiveToast(null);
        setLastToastClosedAt(Date.now());
      },
      secondaryActionText: "立即删除",
      onSecondaryAction: () => {
        commitDelete(id);
        setActiveToast(null);
        setLastToastClosedAt(Date.now());
      },
    });
  }, [pendingDeleteId, recentHistory, commitDelete, cancelDelete, enqueueGuidanceToast, clearPendingDeleteCountdown]);

  const resetDragState = useCallback(() => {
    dragCounter.current = 0;
    setIsDragging(false);
  }, []);

  const resetReaderScrollPosition = useCallback(() => {
    readerScrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  const navigateImmersive = (
    dir: "prev" | "next",
    options?: { scrollIntoView?: boolean }
  ) => {
    const len = immersiveCardsLenRef.current;
    if (len === 0) return;
    setSlideDir(dir === "next" ? "left" : "right");
    setImmersiveIndex((prev) =>
      dir === "next" ? (prev + 1) % len : (prev - 1 + len) % len
    );
    if (options?.scrollIntoView !== false) {
      // 点击导航按钮时，保持阅读区回到模块起始位置
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (viewMode !== "immersive") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isEditable =
        !!target &&
        (target.isContentEditable ||
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT");

      if (isEditable) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateImmersive("prev", { scrollIntoView: false });
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateImmersive("next", { scrollIntoView: false });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewMode]);

  const resetAllState = useCallback(() => {
    setBookTitle("");
    setBookAuthor("");
    setBookSummary("");
    setUploadProgressPercent(null);
    setAnalysisWaitNotice("");
    setAnalysisIntroTitle("");
    setAnalysisIntroCover("");
    analysisIntroStartedAtRef.current = 0;
    setIsLoadingBookSummary(false);
    setReadingGuide("");
    setIsLoadingReadingGuide(false);
    setOriginalReadingValue("");
    setIsLoadingOriginalReadingValue(false);
    setViewMap("");
    setIsLoadingViewMap(false);
    setActionExtraction("");
    setIsLoadingActionExtraction(false);
    setCriticalExamination("");
    setIsLoadingViewValidation(false);
    setIdeaSourceTracing("");
    setIsLoadingIdeaSourceTracing(false);
    setWorkspaceQuote("");
    setCardEvidenceByKey({});
    setBookCoverImage("");
    setChapters([]);
    setIsLiteMode(false);
    setIsLiteUnlocked(false);
    setIsPaywallModalOpen(false);
    setViewMode("overview");
    setSelectedEvidenceCardKey("");
    setSelectedEvidenceClaimId("");
    setImmersiveIndex(0);
    setSlideDir(null);
    setIsPosterModalOpen(false);
    setPosterContent(null);
    setPendingQuoteSelection(null);
    setQuoteShareSelection(null);
    setHighlightActionBubble(null);
    setBookHighlights([]);
    setIsFeynmanPreviewOpen(false);
    setIsExportModalOpen(false);
    setExportStatus("idle");
    setDecisionScenarios([]);
    setIsDecisionPanelOpen(false);
    setIsDecisionLoading(false);
    setDecisionError("");
    setSeenCardKeys([]);
    setCurrentStarterBookId(null);
    setAddictionStateLocal(DEFAULT_ADDICTION_STATE);
  }, []);

  const removeAnalysisTabs = useCallback((titles: string[]) => {
    const analysisIds = new Set(
      titles
        .map((title) => title.trim())
        .filter(Boolean)
        .map(getAnalysisTabId)
    );

    if (analysisIds.size === 0) return;

    const isTargetAnalysisTab = (tab: WorkspaceTab) =>
      tab.source === "analysis" &&
      (analysisIds.has(tab.id) ||
        (tab.analysisTitle ? analysisIds.has(getAnalysisTabId(tab.analysisTitle)) : false));

    setOpenTabs((prev) => prev.filter((tab) => !isTargetAnalysisTab(tab)));
    setActiveTabId((current) => (current && analysisIds.has(current) ? null : current));
  }, []);

  const failCurrentAnalysis = useCallback((titles: string[]) => {
    bgAnalysisRef.current = null;
    bgAnalysisTitleRef.current = "";
    analysisIntroStartedAtRef.current = 0;
    setAnalysisIntroTitle("");
    setAnalysisIntroCover("");
    setSelectedFile(null);
    resetAnalysisLoadingStates();
    setBgAnalysisStatus({ active: false });
    resetAllState();
    removeAnalysisTabs(titles);
  }, [removeAnalysisTabs, resetAllState, resetAnalysisLoadingStates]);

  const promoteAnalysisTabToHistory = useCallback((titles: string[], record: HistoryRecord) => {
    const analysisIds = new Set(
      titles
        .map((title) => title.trim())
        .filter(Boolean)
        .map(getAnalysisTabId)
    );
    const historyId = `history:${record.id}`;
    const historyTab: WorkspaceTab = {
      id: historyId,
      title: record.title,
      subtitle: record.author || getFileTypeLabel(record.fileType) || "历史记录",
      source: "history",
      recordId: record.id,
      closable: true,
    };

    const isTargetAnalysisTab = (tab: WorkspaceTab) =>
      tab.source === "analysis" &&
      (analysisIds.has(tab.id) ||
        (tab.analysisTitle ? analysisIds.has(getAnalysisTabId(tab.analysisTitle)) : false));

    setOpenTabs((prev) => {
      let inserted = false;
      const next: WorkspaceTab[] = [];

      prev.forEach((tab) => {
        const isDuplicateHistory = tab.id === historyId || tab.recordId === record.id;

        if (isTargetAnalysisTab(tab) || isDuplicateHistory) {
          if (!inserted) {
            next.push(historyTab);
            inserted = true;
          }
          return;
        }

        next.push(tab);
      });

      if (!inserted) {
        next.push(historyTab);
      }

      return next;
    });
    setActiveTabId((current) => (current && analysisIds.has(current) ? historyId : current));
  }, []);

  /** Apply completed background analysis results to display state */
  const applyBgAnalysisToDisplay = useCallback((bg: BgAnalysisData) => {
    setBookTitle(bg.title);
    setBookAuthor(bg.author);
    setBookCoverImage(bg.coverImage);
    setBookSummary(bg.bookSummary);
    setChapters(bg.chapters);
    setReadingGuide(bg.readingGuide);
    setOriginalReadingValue(bg.originalReadingValue);
    setViewMap(bg.viewMap);
    setActionExtraction(bg.actionExtraction);
    setCriticalExamination(bg.viewValidation);
    setIdeaSourceTracing(bg.ideaSourceTracing);
    setWorkspaceQuote(sanitizeWorkspaceQuote(bg.workspaceQuote, { title: bg.title }));
    setCardEvidenceByKey(bg.cardEvidence);
    setIsLiteMode(bg.liteMode);
    setIsLiteUnlocked(!bg.liteMode);
    setCurrentStarterBookId(bg.starterBookId);
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(bg.title)));
    setIsDecisionPanelOpen(false);
    setDecisionError("");
    setAnalysisErrorCode(null);
    setMessage("分析完成");
  }, []);

  const saveBgAnalysisToHistory = useCallback((bg: BgAnalysisData) => {
    const fileType = (["epub", "azw3", "txt", "pdf"].includes(bg.fileType)
      ? bg.fileType
      : "epub") as SupportedFileType;
    const starterBook = bg.starterBookId ? starterBooksById[bg.starterBookId] ?? null : null;
    const recordId = `${bg.title}-${fileType}`;
    const existing = loadHistory().find((record) => record.id === recordId);
    const record: HistoryRecord = {
      id: recordId,
      title: bg.title,
      fileType,
      mode: bg.liteMode ? "lite" : "full",
      createdAt: new Date().toISOString(),
      bookSummary: bg.bookSummary,
      readingGuide: bg.readingGuide,
      originalReadingValue: bg.originalReadingValue,
      viewMap: bg.viewMap,
      actionExtraction: bg.actionExtraction,
      viewValidation: bg.viewValidation,
      ideaSourceTracing: bg.ideaSourceTracing,
      bookRecommendation: "",
      workspaceQuote: sanitizeWorkspaceQuote(bg.workspaceQuote, { title: bg.title }),
      cardEvidence: bg.cardEvidence,
      coverImage: starterBook?.coverImage || bg.coverImage || existing?.coverImage || "",
      posterContent: null,
      isStarterBook: !!starterBook,
      starterBookId: starterBook?.id,
      author: starterBook?.author || bg.author || undefined,
      analysisContext: buildHistoryAnalysisContext({
        title: bg.title,
        author: starterBook?.author || bg.author,
        chapters: bg.chapters,
      }),
    };
    const prev = loadHistory().filter((r) => r.id !== record.id);
    const next = [record, ...prev];
    saveHistory(next);
    setRecentHistory(next);

    const thinkingGrowth = awardGrowth("thinking", {
      bookId: buildDecisionBookId(record.title),
      bookTitle: record.title,
      action: "分析完成",
    });
    if (thinkingGrowth.changed) {
      setGrowthLedger(thinkingGrowth.ledger);
      markGrowthInspectorUpdated();
      enqueueGuidanceToast({
        id: `growth-thinking-${buildDecisionBookId(record.title)}`,
        message: `思考力印记 +1\n来自《${record.title}》的分析完成`,
        priority: TOAST_PRIORITY.INFO,
        durationMs: 4500,
      });
    }

    if (!starterBook) {
      markUploadedBook(record.title);
    }

    return record;
  }, [enqueueGuidanceToast, markGrowthInspectorUpdated]);

  const saveBgAnalysisSnapshotToHistory = useCallback((bg: BgAnalysisData) => {
    if (!bg.title || !bg.bookSummary) return;

    const fileType = (["epub", "azw3", "txt", "pdf"].includes(bg.fileType)
      ? bg.fileType
      : "epub") as SupportedFileType;
    const starterBook = bg.starterBookId ? starterBooksById[bg.starterBookId] ?? null : null;
    const recordId = `${bg.title}-${fileType}`;
    const prev = loadHistory().filter((record) => record.id !== recordId);
    const existing = loadHistory().find((record) => record.id === recordId);
    const record: HistoryRecord = {
      id: recordId,
      title: bg.title,
      fileType,
      mode: bg.liteMode ? "lite" : "full",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      bookSummary: bg.bookSummary,
      readingGuide: bg.readingGuide,
      originalReadingValue: bg.originalReadingValue,
      viewMap: bg.viewMap,
      actionExtraction: bg.actionExtraction,
      viewValidation: bg.viewValidation,
      ideaSourceTracing: bg.ideaSourceTracing,
      bookRecommendation: "",
      workspaceQuote: sanitizeWorkspaceQuote(bg.workspaceQuote, { title: bg.title }),
      cardEvidence: bg.cardEvidence,
      coverImage: starterBook?.coverImage || bg.coverImage || existing?.coverImage || "",
      posterContent: existing?.posterContent ?? null,
      isStarterBook: !!starterBook,
      starterBookId: starterBook?.id,
      author: starterBook?.author || bg.author || undefined,
      analysisContext: buildHistoryAnalysisContext({
        title: bg.title,
        author: starterBook?.author || bg.author,
        chapters: bg.chapters,
      }),
    };
    const next = [record, ...prev];
    saveHistory(next);
    setRecentHistory(next);
  }, []);

  const restoreFromHistory = useCallback((record: HistoryRecord) => {
    // Signal background analysis to stop writing to display
    bgAnalysisTitleRef.current = "";
    // Clear loading states so history book shows cleanly
    setIsLoadingBookSummary(false);
    setIsLoadingReadingGuide(false);
    setIsLoadingOriginalReadingValue(false);
    setIsLoadingViewMap(false);
    setIsLoadingActionExtraction(false);
    setIsLoadingViewValidation(false);
    setIsLoadingIdeaSourceTracing(false);
    setIsLoading(false);
    setIsStarterLoading(false);
    setStarterLoadingStep(STARTER_LOADING_STEPS[0].text);

    const starterBook = record.isStarterBook && record.starterBookId
      ? starterBooksById[record.starterBookId] ?? null
      : null;
    setSelectedFile(null);
    setBookTitle(record.title);
    setBookAuthor(record.author || "");
    setBookSummary(record.bookSummary);
    setReadingGuide(record.readingGuide);
    setOriginalReadingValue(record.originalReadingValue ?? starterBook?.analysis.originalReadingValue ?? "");
    setViewMap(record.viewMap);
    setActionExtraction(record.actionExtraction);
    setCriticalExamination(record.viewValidation);
    setIdeaSourceTracing(record.ideaSourceTracing);
    setWorkspaceQuote(pickWorkspaceQuote(record) || starterBook?.analysis.workspaceQuote || "");
    setCardEvidenceByKey(normalizeCardEvidenceMap(record.cardEvidence));
    setBookCoverImage(record.coverImage ?? "");
    setPosterContent(record.posterContent ?? starterBook?.posterContent ?? null);
    setCurrentStarterBookId(record.isStarterBook ? record.starterBookId ?? null : null);
    setIsLiteMode(record.mode === "lite");
    setIsLiteUnlocked(record.mode === "full");
    setDecisionError("");
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(record.title)));
    setIsDecisionPanelOpen(false);
    setViewMode("overview");
    setImmersiveIndex(0);
    setSlideDir(null);
    setAnalysisErrorCode(null);
    setMessage("");
  }, []);

  const openHistoryRecord = useCallback((record: HistoryRecord) => {
    restoreFromHistory(record);
    requestAnimationFrame(() => {
      resetReaderScrollPosition();
    });
  }, [resetReaderScrollPosition, restoreFromHistory]);

  const showBackgroundAnalysis = useCallback(() => {
    const bg = bgAnalysisRef.current;
    if (!bg) return false;

    setSelectedFile(null);
    setBookTitle(bg.title);
    setBookAuthor(bg.author);
    setBookCoverImage(bg.coverImage);
    setBookSummary(bg.bookSummary);
    setChapters(bg.chapters);
    setReadingGuide(bg.readingGuide);
    setOriginalReadingValue(bg.originalReadingValue);
    setViewMap(bg.viewMap);
    setActionExtraction(bg.actionExtraction);
    setCriticalExamination(bg.viewValidation);
    setIdeaSourceTracing(bg.ideaSourceTracing);
    setWorkspaceQuote(sanitizeWorkspaceQuote(bg.workspaceQuote, { title: bg.title }));
    setCardEvidenceByKey(bg.cardEvidence);
    setIsLiteMode(bg.liteMode);
    setIsLiteUnlocked(!bg.liteMode);
    setCurrentStarterBookId(bg.starterBookId);
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(bg.title)));
    setIsDecisionPanelOpen(false);
    setDecisionError("");
    setAnalysisErrorCode(null);
    setViewMode("overview");
    setImmersiveIndex(0);
    setSlideDir(null);
    bgAnalysisTitleRef.current = bg.title;

    if (bgAnalysisStatus.active) {
      setMessage(bgAnalysisStatus.step ? `正在生成${bgAnalysisStatus.step}` : "正在分析...");
      setIsLoading(true);
      setIsLoadingBookSummary(!bg.bookSummary);
      setIsLoadingReadingGuide(!bg.readingGuide);
      setIsLoadingOriginalReadingValue(!bg.originalReadingValue);
      setIsLoadingViewMap(!bg.liteMode && !bg.viewMap);
      setIsLoadingActionExtraction(!bg.liteMode && !bg.actionExtraction);
      setIsLoadingViewValidation(!bg.liteMode && !bg.viewValidation);
      setIsLoadingIdeaSourceTracing(!bg.liteMode && !bg.ideaSourceTracing);
    } else {
      resetAnalysisLoadingStates();
      setMessage("分析完成");
    }

    requestAnimationFrame(() => {
      resetReaderScrollPosition();
    });
    return true;
  }, [bgAnalysisStatus, resetAnalysisLoadingStates, resetReaderScrollPosition]);

  const processFile = (file: File | undefined | null) => {
    if (!file) {
      setSelectedFile(null);
    setMessage("");
    setAnalysisErrorCode(null);
    resetAllState();
    return;
  }
    if (isAnalyzing) {
      setMessage("当前正在分析，请稍候完成后再上传新书。");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSelectedFile(null);
      setMessage("文件超过 50MB，暂不支持上传。");
      setAnalysisErrorCode("FILE_TOO_LARGE");
      resetAllState();
      return;
    }

    const fileType = getFileTypeFromName(file.name);
    if (!fileType) {
      setSelectedFile(null);
      setMessage("仅支持上传 EPUB、AZW3、TXT 或 PDF 文件。");
      setAnalysisErrorCode("UNSUPPORTED_FILE_TYPE");
      resetAllState();
      return;
    }
    setFailedUploadFile(null);
    setUploadFailureStage(null);
    setSelectedFile(file);
    setMessage("");
    setAnalysisErrorCode(null);
    resetAllState();
    void handleAnalyze(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resetDragState();

    // Check if this is a starter book drag
    const starterBookId = e.dataTransfer.getData("starter-book-id");
    if (starterBookId) {
      void handleSelectStarterBook(starterBookId);
      return;
    }

    processFile(e.dataTransfer.files?.[0]);
  };

  const handleUploadPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpenUploadPicker();
  };

  const fetchIdeaSourceTracing = async (
    title: string,
    bookSummary: string,
    viewMap: string,
    chapters: Chapter[]
  ) => {
    try {
      setIsLoadingIdeaSourceTracing(true);
      const res = await fetch("/api/skills/idea-source-tracing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, viewMap, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        setIdeaSourceTracing(data.ideaSourceTracing || "");
        rememberCardEvidence("ideaSourceTracing", data.evidence);
      }
    } catch (error) {
      console.error("思想溯源生成失败:", error);
    } finally {
      setIsLoadingIdeaSourceTracing(false);
    }
  };

  const fetchViewValidation = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[],
  ) => {
    try {
      setIsLoadingViewValidation(true);
      const res = await fetch("/api/skills/view-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        setCriticalExamination(data.viewValidation || "");
        rememberCardEvidence("criticalExamination", data.evidence);
      }
    } catch (error) {
      console.error("观点校验生成失败:", error);
    } finally {
      setIsLoadingViewValidation(false);
    }
  };

  const fetchActionExtraction = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[],
  ) => {
    try {
      setIsLoadingActionExtraction(true);
      const res = await fetch("/api/skills/action-extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        setActionExtraction(data.actionExtraction || "");
        rememberCardEvidence("actionExtraction", data.evidence);
      }
    } catch (error) {
      console.error("行动提炼生成失败:", error);
    } finally {
      setIsLoadingActionExtraction(false);
    }
  };

  const fetchViewMap = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[]
  ) => {
    let viewMapResult = "";
    try {
      setIsLoadingViewMap(true);
      setMessage("正在生成观点地图...");
      const res = await fetch("/api/skills/view-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        viewMapResult = data.viewMap || "";
        setViewMap(viewMapResult);
        rememberCardEvidence("viewMap", data.evidence);
      }
    } catch (error) {
      console.error("观点地图生成失败:", error);
    } finally {
      setIsLoadingViewMap(false);
    }

    // 观点地图完成后，后三步并行执行（它们之间无数据依赖）
    setMessage("正在生成剩余分析...");
    await Promise.all([
      fetchActionExtraction(title, bookSummary, chapters),
      fetchViewValidation(title, bookSummary, chapters),
      fetchIdeaSourceTracing(title, bookSummary, viewMapResult, chapters),
    ]);
    setMessage("分析完成");
  };

  const handleUnlock = async () => {
    setIsPaywallModalOpen(false);
    setIsLiteUnlocked(true);
    const title = bookTitle;
    const currentChapters = chapters;
    let realSummary = "";
    try {
      setIsLoadingBookSummary(true);
      setMessage("正在生成全书摘要...");
      const res = await fetch("/api/skills/book-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, chapters: currentChapters }),
      });
      const data = await res.json();
      if (data.success) {
        realSummary = data.bookSummary || "";
        setBookSummary(realSummary);
        rememberCardEvidence("bookSummary", data.evidence);
      }
    } catch (err) {
      console.error("全书摘要生成失败:", err);
    } finally {
      setIsLoadingBookSummary(false);
    }
    fetchViewMap(title, realSummary, currentChapters);
  };

  const handleExport = async ({ target, format, structure, selectedSectionIds }: ExportParams) => {
    if (!bookTitle) return;

    // Build the full section map from current state
    const allSections: ExportSection[] = [
      { id: "bookSummary", label: "全书摘要" },
      { id: "readingGuide", label: "阅读指南" },
      { id: "originalReadingValue", label: "原书阅读建议" },
      { id: "viewMap", label: "观点地图" },
      { id: "actionExtraction", label: "行动提炼" },
      { id: "viewValidation", label: "观点校验" },
      { id: "ideaSourceTracing", label: "思想溯源" },
    ];
    const contentMap: Record<string, string> = {
      bookSummary,
      readingGuide,
      originalReadingValue,
      viewMap,
      actionExtraction,
      viewValidation: criticalExamination,
      ideaSourceTracing,
    };
    const sections = allSections
      .filter((s) => selectedSectionIds.includes(s.id) && contentMap[s.id]?.trim())
      .map((s) => ({ id: s.id, title: s.label, content: contentMap[s.id] }));

    if (sections.length === 0) {
      enqueueGuidanceToast({ id: "export-empty", message: "请至少选择一张有内容的卡片", priority: TOAST_PRIORITY.SYSTEM, durationMs: 4000 });
      return;
    }

    try {
      setExportStatus("exporting");
      const exportFileType =
        selectedFile ? getFileTypeFromName(selectedFile.name) : currentHistoryRecord?.fileType;
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          fileType: exportFileType ?? "epub",
          mode: isLiteMode && !isLiteUnlocked ? "lite" : "full",
          target,
          format,
          structure,
          sections,
        }),
      });
      if (!res.ok) {
        enqueueGuidanceToast({ id: "export-failed", message: "导出失败，请稍后重试", priority: TOAST_PRIORITY.SYSTEM, durationMs: 4000 });
        setExportStatus("idle");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = bookTitle.replace(/[/\\:*?"<>|]/g, "-").trim();
      a.download = `BookLeap-${safeTitle}-知识包.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("success");
      markGrowthInspectorUpdated();
      // 导出成功后清除"把这本书带走"的 toast
      setActiveToast((current) => {
        if (current?.id === "onboarding-trained") return null;
        return current;
      });
      if (isBeforeOnboardingStep(onboardingProgress, "exported")) {
        enqueueGuidanceToast({
          id: "onboarding-exported",
          message: "把你的这次阅读成果分享出去",
          actionText: "分享出去",
          onAction: () => {
            void handleGeneratePoster();
          },
          priority: TOAST_PRIORITY.INFO,
          durationMs: 10000,
        });
        advanceOnboardingProgress("exported");
      }
    } catch (error) {
      console.error(error);
      enqueueGuidanceToast({ id: "export-failed", message: "导出失败，请稍后重试", priority: TOAST_PRIORITY.SYSTEM, durationMs: 4000 });
      setExportStatus("idle");
    }
  };

  const handleGeneratePoster = async () => {
    if (!bookSummary) return;
    // Reuse cached content
    if (posterContent) {
      setIsPosterModalOpen(true);
      if (isBeforeOnboardingStep(onboardingProgress, "completed")) {
        advanceOnboardingProgress("completed");
      }
      return;
    }
    setIsGeneratingPoster(true);
    try {
      const res = await fetch("/api/skills/poster-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle,
          bookSummary,
          readingGuide,
          actionExtraction,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setPosterContent(data.content);
        setIsPosterModalOpen(true);
        if (isBeforeOnboardingStep(onboardingProgress, "completed")) {
          advanceOnboardingProgress("completed");
        }
        // Persist poster content into history
        try {
          const fileType =
            selectedFile ? getFileTypeFromName(selectedFile.name) : currentHistoryRecord?.fileType;
          if (!fileType) return;
          const recordId = `${bookTitle}-${fileType}`;
          const history = loadHistory();
          const idx = history.findIndex((r) => r.id === recordId);
          if (idx >= 0) {
            history[idx].posterContent = data.content;
            saveHistory(history);
            setRecentHistory(history);
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("海报内容生成失败:", err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleOpenFeynmanPreview = () => {
    const cards = getDecisionCardsInput();
    if (!hasCompleteDecisionCards(cards)) {
      enqueueGuidanceToast({
        id: "feynman-export-incomplete",
        message: "请先完成 6 个分析模块，再生成讲书演示",
        priority: TOAST_PRIORITY.SYSTEM,
        durationMs: 4200,
      });
      return;
    }

    setIsFeynmanPreviewOpen(true);
  };

  const getDecisionCardsInput = useCallback((): DecisionCardsInput => ({
    summary: bookSummary,
    readingGuide,
    viewMap,
    actionPrinciples: actionExtraction,
    models: criticalExamination,
    insights: ideaSourceTracing,
  }), [bookSummary, readingGuide, viewMap, actionExtraction, criticalExamination, ideaSourceTracing]);

  const handleLeapLifeCapitalChange = useCallback((lifeCapital: LifeCapital | "auto") => {
    if (!currentBookId) return;
    const currentRound =
      leapPracticeRound && leapPracticeRound.bookId === currentBookId
        ? leapPracticeRound
        : loadLeapPracticeRound(currentBookId);
    if (currentRound.blueprint || currentRound.scenarios.some(Boolean)) return;
    const nextRound = saveLeapPracticeRound(
      updateLeapPracticeLifeCapital(currentRound, lifeCapital)
    );
    recordLeapPracticeEvent(currentBookId, "life_capital_selected", {
      lifeCapital,
    });
    setLeapPracticeRound(nextRound);
  }, [currentBookId, leapPracticeRound]);

  const handleOpenDecisionTraining = useCallback(() => {
    if (!bookTitle) return;

    const cards = getDecisionCardsInput();
    if (!hasCompleteDecisionCards(cards)) {
      setDecisionError("请先完成 6 个分析模块，再开始决策训练。");
      return;
    }

    const bookId = buildDecisionBookId(bookTitle);
    if (!leapPracticeRound || leapPracticeRound.bookId !== bookId) {
      const storedRound = loadLeapPracticeRound(bookId);
      const legacyScenarios = loadDecisionScenarioCache(bookId);
      const legacyAddictionState = getAddictionState(bookId);
      const legacyProgress = Math.min(
        3,
        Math.max(0, legacyAddictionState.decision_training_progress)
      );
      const legacyAnswers = legacyAddictionState.decision_history.filter(
        (answer): answer is DecisionOptionKey => answer === "A" || answer === "B"
      );
      const round =
        storedRound.scenarios.some(Boolean) || legacyScenarios.length !== 3
          ? storedRound
          : saveLeapPracticeRound(createLeapPracticeRoundFromScenarios(
              bookId,
              legacyScenarios,
              legacyProgress,
              legacyAnswers
            ));
      setLeapPracticeRound(round);
      setDecisionScenarios(round.scenarios.filter((scenario): scenario is DecisionScenario => !!scenario));
    }

    setDecisionError("");
    setViewMode("overview");
    setIsDecisionPanelOpen(true);
    recordLeapPracticeEvent(bookId, "practice_opened", {
      generatedCount: leapPracticeRound?.bookId === bookId
        ? leapPracticeRound.scenarios.filter(Boolean).length
        : undefined,
    });
    window.setTimeout(() => {
      cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }, [bookTitle, getDecisionCardsInput, leapPracticeRound, setIsDecisionPanelOpen]);

  const handleGenerateLeapGate = useCallback(async (gateIndex: number): Promise<DecisionScenario | null> => {
    if (!bookTitle || !currentBookId) return null;

    const cards = getDecisionCardsInput();
    if (!hasCompleteDecisionCards(cards)) {
      setDecisionError("请先完成 6 个分析模块，再开始跃迁练习。");
      return null;
    }

    const currentRound =
      leapPracticeRound && leapPracticeRound.bookId === currentBookId
        ? leapPracticeRound
        : loadLeapPracticeRound(currentBookId);
    const existingScenario = currentRound.scenarios[gateIndex];
    if (existingScenario && currentRound.statuses[gateIndex] !== "error") return existingScenario;

    const starterRound = currentStarterBook
      ? currentStarterBook.practiceRounds[
          currentRound.requestedLifeCapital === "auto"
            ? "财富积累"
            : currentRound.requestedLifeCapital
        ]
      : null;
    if (starterRound) {
      const scenario = starterRound.scenarios[gateIndex];
      const nextRound = saveLeapPracticeRound(
        updateLeapPracticeGate(currentRound, gateIndex, {
          scenario,
          blueprint: starterRound.blueprint,
          status: "ready",
          answer: null,
        })
      );
      const scenarios = nextRound.scenarios.filter((item): item is DecisionScenario => !!item);
      setLeapPracticeRound(nextRound);
      setDecisionScenarios(scenarios);
      recordLeapPracticeEvent(currentBookId, "gate_generation_succeeded", {
        gateIndex,
        lifeCapital: starterRound.blueprint.lifeCapital,
        source: "starter-package",
      });
      return scenario;
    }

    const generatingRound = saveLeapPracticeRound(
      updateLeapPracticeGate(currentRound, gateIndex, { status: "generating" })
    );
    setLeapPracticeRound(generatingRound);
    setDecisionLoadingStep(DECISION_STEP_LABELS[gateIndex] ?? `第 ${gateIndex + 1} 关`);
    setIsDecisionLoading(true);
    setDecisionError("");
    recordLeapPracticeEvent(currentBookId, "gate_generation_started", {
      gateIndex,
      lifeCapital: currentRound.requestedLifeCapital,
      hasBlueprint: !!currentRound.blueprint,
    });

    try {
      const res = await fetch("/api/decision/generate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          cards,
          questionIndex: gateIndex,
          blueprint: currentRound.blueprint,
          lifeCapital:
            currentRound.requestedLifeCapital === "auto"
              ? undefined
              : currentRound.requestedLifeCapital,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.scenario) {
        throw new Error(data.error || `第 ${gateIndex + 1} 题生成失败，请稍后重试。`);
      }

      const nextRound = saveLeapPracticeRound(
        updateLeapPracticeGate(generatingRound, gateIndex, {
          scenario: data.scenario,
          blueprint: data.blueprint ?? generatingRound.blueprint,
          status: "ready",
          answer: null,
        })
      );
      const scenarios = nextRound.scenarios.filter((scenario): scenario is DecisionScenario => !!scenario);
      if (scenarios.length === 3) saveDecisionScenarioCache(currentBookId, scenarios);
      setLeapPracticeRound(nextRound);
      setDecisionScenarios(scenarios);
      recordLeapPracticeEvent(currentBookId, "gate_generation_succeeded", {
        gateIndex,
        lifeCapital: nextRound.blueprint?.lifeCapital ?? currentRound.requestedLifeCapital,
      });
      return data.scenario as DecisionScenario;
    } catch (error) {
      console.error("跃迁练习生成失败:", error);
      const errorRound = saveLeapPracticeRound(
        updateLeapPracticeGate(generatingRound, gateIndex, { status: "error" })
      );
      setLeapPracticeRound(errorRound);
      setDecisionError(error instanceof Error ? error.message : "跃迁练习生成失败，请稍后重试。");
      recordLeapPracticeEvent(currentBookId, "gate_generation_failed", {
        gateIndex,
      });
      return null;
    } finally {
      setIsDecisionLoading(false);
      setDecisionLoadingStep("");
    }
  }, [bookTitle, currentBookId, currentStarterBook, getDecisionCardsInput, leapPracticeRound]);

  const handleCompleteLeapGate = useCallback((gateIndex: number, option: DecisionOptionKey) => {
    if (!currentBookId) return;

    const currentRound =
      leapPracticeRound && leapPracticeRound.bookId === currentBookId
        ? leapPracticeRound
        : loadLeapPracticeRound(currentBookId);
    const nextRound = saveLeapPracticeRound(
      updateLeapPracticeGate(currentRound, gateIndex, {
        status: "completed",
        answer: option,
      })
    );
    setLeapPracticeRound(nextRound);

    const scenarios = nextRound.scenarios.filter((scenario): scenario is DecisionScenario => !!scenario);
    setDecisionScenarios(scenarios);

    const progress = nextRound.statuses.filter((status) => status === "completed").length;
    recordLeapPracticeEvent(currentBookId, "gate_completed", {
      gateIndex,
      option,
      progress,
    });
    const nextState = updateCurrentBookAddictionState((prev) => ({
      ...prev,
      decision_training_progress: Math.max(prev.decision_training_progress, progress),
      decision_history: [...prev.decision_history, option],
      decision_score: prev.decision_score + 1,
    }));

    if (progress === 1) {
      enqueueGuidanceToast({
        id: `addiction-first-answer-${currentBookId}`,
        message: "你刚才的选择，其实很有代表性",
        priority: TOAST_PRIORITY.GUIDANCE,
        durationMs: 5000,
      });
    }

    if (progress === 2) {
      enqueueGuidanceToast({
        id: `addiction-tension-${currentBookId}`,
        message: "再做 1 题，你会看到这本书如何影响你的判断",
        priority: TOAST_PRIORITY.GUIDANCE,
        durationMs: 10000,
        showCloseButton: true,
        dismissible: true,
      });
    }

    if (progress >= 3) {
      const patternMessage = inferDecisionPattern(nextState.decision_history);
      if (patternMessage) {
        enqueueGuidanceToast({
          id: `addiction-pattern-${currentBookId}`,
          message: `${patternMessage}\n\n右侧的「能力账本」会记录你完成的真实练习，做得越多，能力增长越清晰。`,
          priority: TOAST_PRIORITY.COGNITIVE,
          durationMs: 0,
          isPersistent: true,
          showCloseButton: true,
          dismissible: true,
        });
      }
    }
  }, [
    currentBookId,
    enqueueGuidanceToast,
    leapPracticeRound,
    updateCurrentBookAddictionState,
  ]);

  const handleCompleteLeapRound = useCallback(() => {
    if (currentBookId && leapPracticeRound?.bookId === currentBookId) {
      if (leapPracticeRound.growthAwardedAt) return;

      recordLeapPracticeEvent(currentBookId, "round_completed", {
        roundId: leapPracticeRound.roundId,
      });
      const decisionGrowth = awardGrowth("decision", {
        bookId: `${currentBookId}:${leapPracticeRound.roundId}`,
        bookTitle: currentBookDisplayTitle,
        action: "训练完成",
      });
      const awardedRound = saveLeapPracticeRound(markLeapPracticeGrowthAwarded(leapPracticeRound));
      setLeapPracticeRound(awardedRound);
      if (decisionGrowth.changed) {
        setGrowthLedger(decisionGrowth.ledger);
        markGrowthInspectorUpdated();
        enqueueGuidanceToast({
          id: `growth-decision-${currentBookId}`,
          message: `决策力印记 +1\n来自《${currentBookDisplayTitle}》的 3 题训练完成`,
          priority: TOAST_PRIORITY.INFO,
          durationMs: 4500,
        });
      }
    }
    if (isBeforeOnboardingStep(onboardingProgress, "trained")) {
      enqueueGuidanceToast({
        id: "onboarding-trained",
        message: "把这本书带走",
        actionText: "导出",
        onAction: () => {
          setExportStatus("idle");
          setIsExportModalOpen(true);
        },
        priority: TOAST_PRIORITY.INFO,
        durationMs: 10000,
      });
      advanceOnboardingProgress("trained");
    }
  }, [
    advanceOnboardingProgress,
    currentBookDisplayTitle,
    currentBookId,
    enqueueGuidanceToast,
    leapPracticeRound,
    markGrowthInspectorUpdated,
    onboardingProgress,
  ]);

  const handleStartNewLeapRound = useCallback(() => {
    if (!currentBookId) return;
    const currentRound =
      leapPracticeRound && leapPracticeRound.bookId === currentBookId
        ? leapPracticeRound
        : loadLeapPracticeRound(currentBookId);
    const nextRound = saveLeapPracticeRound(startNewLeapPracticeRound(currentRound));
    setLeapPracticeRound(nextRound);
    setDecisionScenarios([]);
    setDecisionError("");
    recordLeapPracticeEvent(currentBookId, "new_round_started", {
      previousRoundId: currentRound.roundId,
    });
  }, [currentBookId, leapPracticeRound]);

  const applyStarterBook = useCallback((starterBook: StarterBookData) => {
    resetAllState();
    setSelectedFile(null);
    setCurrentStarterBookId(starterBook.id);
    setBookCoverImage(starterBook.coverImage);
    setBookTitle(starterBook.title);
    setBookAuthor(starterBook.author);
    setBookSummary(starterBook.analysis.summary);
    setReadingGuide(starterBook.analysis.readingGuide);
    setViewMap(starterBook.analysis.viewMap);
    setActionExtraction(starterBook.analysis.actionExtraction);
    setCriticalExamination(starterBook.analysis.viewValidation);
    setIdeaSourceTracing(starterBook.analysis.ideaSourceTracing);
    setOriginalReadingValue(starterBook.analysis.originalReadingValue);
    setWorkspaceQuote(sanitizeWorkspaceQuote(starterBook.analysis.workspaceQuote, { title: starterBook.title }));
    setCardEvidenceByKey(starterBook.cardEvidence);
    setPosterContent(starterBook.posterContent);
    setDecisionScenarios(starterBook.decisionTraining);
    saveDecisionScenarioCache(buildDecisionBookId(starterBook.title), starterBook.decisionTraining);
    setViewMode("overview");
    setImmersiveIndex(0);
    setMessage("分析完成");

    // Explicitly save starter book to history (don't rely on useEffect timing)
    const record: HistoryRecord = {
      id: `${starterBook.title}-epub`,
      title: starterBook.title,
      fileType: "epub",
      mode: "full",
      createdAt: new Date().toISOString(),
      bookSummary: starterBook.analysis.summary,
      readingGuide: starterBook.analysis.readingGuide,
      viewMap: starterBook.analysis.viewMap,
      actionExtraction: starterBook.analysis.actionExtraction,
      viewValidation: starterBook.analysis.viewValidation,
      ideaSourceTracing: starterBook.analysis.ideaSourceTracing,
      originalReadingValue: starterBook.analysis.originalReadingValue,
      bookRecommendation: "",
      workspaceQuote: sanitizeWorkspaceQuote(starterBook.analysis.workspaceQuote, { title: starterBook.title }),
      cardEvidence: starterBook.cardEvidence,
      coverImage: starterBook.coverImage,
      isStarterBook: true,
      starterBookId: starterBook.id,
      starterContentVersion: starterBook.contentVersion,
      author: starterBook.author,
    };
    const prev = loadHistory().filter((r) => r.id !== record.id);
    const next = [record, ...prev];
    saveHistory(next);
    setRecentHistory(next);
    const thinkingGrowth = awardGrowth("thinking", {
      bookId: buildDecisionBookId(record.title),
      bookTitle: record.title,
      action: "分析完成",
    });
    if (thinkingGrowth.changed) {
      setGrowthLedger(thinkingGrowth.ledger);
      markGrowthInspectorUpdated();
      enqueueGuidanceToast({
        id: `growth-thinking-${buildDecisionBookId(record.title)}`,
        message: `思考力印记 +1\n来自《${record.title}》的分析完成`,
        priority: TOAST_PRIORITY.INFO,
        durationMs: 4500,
      });
    }
  }, [enqueueGuidanceToast, markGrowthInspectorUpdated, resetAllState]);

  const scrollToStarterBooksSection = useCallback(() => {
    const el = document.getElementById("starter-books-section");
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const handleShowStarterModeFromToast = useCallback(() => {
    setShowStarterBooks(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isStarterModeVisible || !shouldScrollToStarterSectionRef.current) return;

    const timer = window.setTimeout(() => {
      scrollToStarterBooksSection();
      shouldScrollToStarterSectionRef.current = false;
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isStarterModeVisible, scrollToStarterBooksSection]);

  // starter-mode-entry toast 已移除：3 本预置书现在直接展示在上传区下方

  useEffect(() => {
    if (isStarterModeVisible || hasShownReturningUserToast || hasBlockingToast) return;
    if (!hasUploadedBook()) return;

    const lastTitle = getLastAnalyzedBookTitle();
    if (!lastTitle) return;

    const lastRecord = recentHistory.find((record) => record.title === lastTitle && !record.isStarterBook)
      ?? recentHistory.find((record) => !record.isStarterBook);
    if (!lastRecord) return;

    const timer = window.setTimeout(() => {
      enqueueGuidanceToast({
        id: "returning-user-reminder",
        message: `你上次分析了《${lastRecord.title}》\n继续看看？`,
        actionText: "继续查看",
        onAction: () => {
          restoreFromHistory(lastRecord);
          setTimeout(() => {
            cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        },
        priority: TOAST_PRIORITY.ENTRY,
        durationMs: 10000,
        eligibilityCheck: () =>
          !hasSeenStarterMode() || !!getSelectedStarterBookId(),
      });
      markReturningUserToastSeenThisSession();
      setHasShownReturningUserToast(true);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [
    enqueueGuidanceToast,
    hasBlockingToast,
    hasShownReturningUserToast,
    isStarterModeVisible,
    recentHistory,
    restoreFromHistory,
  ]);

  const handleSelectStarterBook = useCallback(async (starterBookId: string) => {
    if (!starterBooksById[starterBookId] || isStarterLoading) return;

    resetDragState();
    markStarterModeSeen();
    setSelectedStarterBookIdState(starterBookId);
    setSelectedStarterBookId(starterBookId);
    setIsStarterLoading(true);
    setStarterLoadingStep(STARTER_LOADING_STEPS[0].text);

    try {
      for (const step of STARTER_LOADING_STEPS) {
        setStarterLoadingStep(step.text);
        await new Promise((resolve) => setTimeout(resolve, step.duration));
      }

      const starterBook = await loadStarterBook(starterBookId);
      applyStarterBook(starterBook);
      setIsStarterModeVisible(false);

      markStarterBookExperienced(starterBookId);
      setExperiencedStarterIds((prev) => {
        const next = prev.includes(starterBookId) ? prev : [...prev, starterBookId];
        if (next.length >= starterBooks.length) {
          setShowStarterBooks(false);
        }
        return next;
      });

      requestAnimationFrame(() => {
        resetReaderScrollPosition();
      });

      setTimeout(() => {
        enqueueGuidanceToast({
          id: `starter-book-ready-${starterBookId}`,
          message: "这本书的精华总览已准备好",
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 5000,
        });
      }, 600);
    } catch (error) {
      console.error("加载示例内容包失败:", error);
      enqueueGuidanceToast({
        id: `starter-book-load-error-${starterBookId}`,
        message: "示例内容暂不可用，请稍后重试。",
        priority: TOAST_PRIORITY.GUIDANCE,
        durationMs: 5000,
      });
    } finally {
      resetDragState();
      setIsStarterLoading(false);
    }
  }, [applyStarterBook, enqueueGuidanceToast, isStarterLoading, resetDragState, resetReaderScrollPosition]);

  const openStarterBook = useCallback((starterBookId: string) => {
    const starterRecord = recentHistory.find(
      (record) => record.isStarterBook && record.starterBookId === starterBookId
    );

    if (starterRecord?.starterContentVersion === starterBooksById[starterBookId]?.contentVersion) {
      openHistoryRecord(starterRecord);
      return;
    }

    void handleSelectStarterBook(starterBookId);
  }, [handleSelectStarterBook, openHistoryRecord, recentHistory]);

  const activateWorkspaceTab = useCallback((tabId: string) => {
    const tab = openTabs.find((item) => item.id === tabId);
    if (!tab) return;

    setActiveTabId(tab.id);

    if (tab.source === "analysis") {
      showBackgroundAnalysis();
      return;
    }

    if (tab.source === "starter" && tab.starterBookId) {
      openStarterBook(tab.starterBookId);
      return;
    }

    if (tab.recordId) {
      const record = recentHistory.find((item) => item.id === tab.recordId);
      if (record) {
        openHistoryRecord(record);
      }
    }
  }, [openHistoryRecord, openStarterBook, openTabs, recentHistory, showBackgroundAnalysis]);

  const closeWorkspaceTab = useCallback((tabId: string) => {
    if (isAnalyzing) return;

    const targetIndex = openTabs.findIndex((tab) => tab.id === tabId);
    if (targetIndex === -1) return;

    const nextTabs = openTabs.filter((tab) => tab.id !== tabId);
    setOpenTabs(nextTabs);

    if (activeTabId !== tabId) return;

    const fallbackTab = nextTabs[targetIndex - 1] ?? nextTabs[targetIndex] ?? null;
    if (fallbackTab) {
      activateWorkspaceTab(fallbackTab.id);
      return;
    }

    bgAnalysisTitleRef.current = "";
    setSelectedFile(null);
    setMessage("");
    resetAllState();
    setActiveTabId(null);
  }, [activeTabId, activateWorkspaceTab, isAnalyzing, openTabs, resetAllState]);

  const closeAllWorkspaceTabs = useCallback(() => {
    if (isAnalyzing) return;

    setOpenTabs([]);
    setActiveTabId(null);
    bgAnalysisTitleRef.current = "";
    setSelectedFile(null);
    setMessage("");
    resetAllState();
  }, [isAnalyzing, resetAllState]);

  useEffect(() => {
    if (message !== "分析完成" || isAnalyzing || !bookTitle || !selectedFile || !currentBookId) return;
    if (lastUploadPromptBookIdRef.current === currentBookId) return;

    enqueueGuidanceToast({
      id: `addiction-upload-${currentBookId}`,
      message: "这本书的精华总览已准备好",
      priority: TOAST_PRIORITY.COGNITIVE,
      durationMs: 5000,
    });
    lastUploadPromptBookIdRef.current = currentBookId;

    if (isBeforeOnboardingStep(onboardingProgress, "analyzed")) {
      advanceOnboardingProgress("analyzed");
    }
  }, [
    message,
    isAnalyzing,
    bookTitle,
    selectedFile,
    currentBookId,
    onboardingProgress,
    advanceOnboardingProgress,
    enqueueGuidanceToast,
  ]);

  const handleAnalyze = async (fileOverride?: File | null) => {
    const fileToAnalyze = fileOverride ?? selectedFile;
    const pendingTitle = fileToAnalyze
      ? stripSupportedFileExtension(fileToAnalyze.name) || "新书"
      : "新书";

    if (!fileToAnalyze) {
      setMessage("请先选择一本 EPUB、AZW3、TXT 或 PDF 电子书。");
      setAnalysisErrorCode("NO_FILE_SELECTED");
      return;
    }
    try {
      resetAllState();

      setFailedUploadFile(null);
      setUploadFailureStage(null);
      analysisIntroStartedAtRef.current = 0;
      setAnalysisIntroTitle(pendingTitle);
      setAnalysisIntroCover("");
      setUploadProgressPercent(null);
      setAnalysisWaitNotice("");
      setIsLoading(true);
      setMessage("正在上传文件...");

      setIsLoadingBookSummary(true);
      setIsLoadingReadingGuide(true);
      setIsLoadingOriginalReadingValue(true);
      setIsLoadingViewMap(true);
      setIsLoadingActionExtraction(true);
      setIsLoadingViewValidation(true);
      setIsLoadingIdeaSourceTracing(true);

      // Initialize background analysis tracker
      const bg: BgAnalysisData = {
        title: pendingTitle, author: "", coverImage: "", bookSummary: "", chapters: [], readingGuide: "",
        originalReadingValue: "",
        viewMap: "", actionExtraction: "", viewValidation: "",
        ideaSourceTracing: "", workspaceQuote: "", cardEvidence: {}, liteMode: false,
        fileType: getFileTypeFromName(fileToAnalyze.name) ?? "epub",
        starterBookId: currentStarterBookId,
      };
      bgAnalysisRef.current = bg;
      bgAnalysisTitleRef.current = pendingTitle;
      setOpenTabs((prev) => {
        const tab: WorkspaceTab = {
          id: getAnalysisTabId(pendingTitle),
          title: pendingTitle,
          subtitle: "解析中",
          source: "analysis",
          analysisTitle: pendingTitle,
          closable: false,
          status: "analyzing",
          progressLabel: "0/6",
        };
        return prev.some((item) => item.id === tab.id) ? prev : [...prev, tab];
      });
      setActiveTabId(getAnalysisTabId(pendingTitle));
      let stepsCompleted = 0;
      const totalSteps = 6;
      const updateProgress = (step: string) => {
        setBgAnalysisStatus({ active: true, title: bg.title || "新书", step, stepsCompleted, totalSteps });
        setOpenTabs((prev) => {
          const analysisTitle = bg.title || pendingTitle;
          const nextId = getAnalysisTabId(analysisTitle);
          const previousIds = new Set([getAnalysisTabId(pendingTitle)]);
          if (bg.title) previousIds.add(getAnalysisTabId(bg.title));
          const existingIndex = prev.findIndex((tab) => previousIds.has(tab.id));
          const nextTab: WorkspaceTab = {
            id: nextId,
            title: analysisTitle,
            subtitle: "解析中",
            source: "analysis",
            analysisTitle,
            closable: false,
            status: "analyzing",
            progressLabel: `${stepsCompleted}/${totalSteps}`,
          };
          if (existingIndex === -1) return [...prev, nextTab];
          const next = [...prev];
          next[existingIndex] = nextTab;
          return next;
        });
        setActiveTabId((current) => {
          const previousIds = [getAnalysisTabId(pendingTitle), getAnalysisTabId(bg.title || pendingTitle)];
          return current && previousIds.includes(current) ? getAnalysisTabId(bg.title || pendingTitle) : current;
        });
      };
      updateProgress("上传解析中…");

      let res: Response;
      const handleBlobUploadProgress = (percentage: number) => {
        const nextProgress = Math.max(1, Math.min(99, Math.round(percentage)));
        setUploadProgressPercent(nextProgress);
        setMessage(`正在上传文件 ${nextProgress}%...`);
      };
      const handleBlobUploaded = () => {
        setUploadProgressPercent(100);
        setAnalysisWaitNotice("");
        setMessage("文件已上传，正在拆解目录和章节...");
        updateProgress("拆解目录和章节…");
      };
      const shouldUseBlobUpload = !isLocalRuntimeHost(window.location.hostname);
      try {
        if (shouldUseBlobUpload) {
          setUploadProgressPercent(1);
          setMessage("正在上传文件 1%...");
          updateProgress("稳定上传中…");
          res = await uploadBookViaBlob(fileToAnalyze, {
            onProgress: handleBlobUploadProgress,
            onUploaded: handleBlobUploaded,
          });
        } else {
          setUploadProgressPercent(null);
          setMessage("正在上传并解析章节...");
          res = await uploadBookDirectly(fileToAnalyze);
        }
      } catch (directUploadError) {
        console.error("直接上传失败，尝试 Blob 上传:", directUploadError);
        try {
          setUploadProgressPercent(1);
          setMessage("正在切换稳定上传方式，上传文件 1%...");
          updateProgress("稳定上传中…");
          res = await uploadBookViaBlob(fileToAnalyze, {
            onProgress: handleBlobUploadProgress,
            onUploaded: handleBlobUploaded,
          });
        } catch (blobUploadError) {
          console.error("Blob 上传失败:", blobUploadError);
          setAnalysisErrorCode("UPLOAD_INIT_FAILED");
          setUploadFailureStage("upload");
          setFailedUploadFile(fileToAnalyze);
          setMessage(getUploadFailureMessage());
          failCurrentAnalysis([pendingTitle, bg.title]);
          return;
        }
      }
      const rawResponse = await res.text();
      let data: { success?: boolean; error?: string; errorCode?: string; title?: string; author?: string; coverImage?: string; bookSummary?: string; chapters?: Chapter[]; mode?: string };
      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        console.error("解析接口返回了非 JSON 内容:", {
          status: res.status,
          statusText: res.statusText,
          preview: rawResponse.slice(0, 300),
        });
        setAnalysisErrorCode("ANALYZE_RESPONSE_INVALID");
        setUploadFailureStage("analyze");
        setFailedUploadFile(fileToAnalyze);
        setMessage(getAnalyzeResponseErrorMessage());
        failCurrentAnalysis([pendingTitle, bg.title]);
        return;
      }
      if (!data.success) {
        setAnalysisErrorCode(data.errorCode || (res.ok ? "ANALYZE_FAILED" : "ANALYZE_HTTP_ERROR"));
        setUploadFailureStage("parse");
        setFailedUploadFile(fileToAnalyze);
        setMessage(getAnalyzeFailureMessage(res.ok, data.error));
        failCurrentAnalysis([pendingTitle, bg.title]);
        return;
      }
      setAnalysisErrorCode(null);
      setUploadFailureStage(null);
      setFailedUploadFile(null);
      setUploadProgressPercent(null);
      setAnalysisWaitNotice("");
      const title = cleanBookTitle(data.title || "");
      const author = (data.author || "").replace(/\s+/g, " ").trim();
      const coverImage = data.coverImage || "";
      let bkSummary = data.bookSummary || "";
      const chaps: Chapter[] = data.chapters || [];
      const liteMode = data.mode === "lite";

      bg.title = title;
      bg.author = author;
      bg.coverImage = coverImage;
      bg.bookSummary = bkSummary;
      bg.chapters = chaps;
      bg.liteMode = liteMode;
      bgAnalysisRef.current = bg;
      saveBgAnalysisSnapshotToHistory(bg);
      const shouldAttachAnalysisToDisplay =
        bgAnalysisTitleRef.current === pendingTitle || bgAnalysisTitleRef.current === title;
      if (shouldAttachAnalysisToDisplay) {
        bgAnalysisTitleRef.current = title;
      }
      updateProgress("章节已解析…");

      // Helper: only write to display if user is still viewing this book
      const isStillViewing = () => bgAnalysisTitleRef.current === title;
      const waitForAnalysisIntro = async () => {
        const introStartedAt = analysisIntroStartedAtRef.current || Date.now();
        analysisIntroStartedAtRef.current = introStartedAt;
        const remainingMs = introStartedAt
          ? ANALYSIS_INTRO_DURATION_MS - (Date.now() - introStartedAt)
          : 0;

        if (remainingMs > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
        }
      };

      // Keep the first upload reveal long enough to read as an intentional state change.
      if (isStillViewing() && coverImage) {
        analysisIntroStartedAtRef.current = Date.now();
        setAnalysisIntroTitle(title || pendingTitle);
        setAnalysisIntroCover(coverImage);
        await waitForAnalysisIntro();
      }
      if (isStillViewing()) {
        setBookTitle(title);
        setBookAuthor(author);
        setBookCoverImage(coverImage);
        setBookSummary(bkSummary);
        setChapters(chaps);
        setIsLiteMode(liteMode);
        setIsLoadingBookSummary(!liteMode && !bkSummary);
      }

      if (liteMode) {
        if (isStillViewing()) {
          setIsLoadingViewMap(false);
          setIsLoadingActionExtraction(false);
          setIsLoadingViewValidation(false);
          setIsLoadingIdeaSourceTracing(false);
        }
        
        if (isStillViewing()) setMessage("正在生成阅读指南...");
        updateProgress("阅读指南…");
        const [guideResult, quoteResult] = await Promise.allSettled([
          fetch("/api/skills/reading-guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
          }).then((r) => r.json()),
          fetch("/api/skills/workspace-quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
          }).then((r) => r.json()),
        ]);

        if (guideResult.status === "fulfilled" && guideResult.value.success) {
          bg.readingGuide = guideResult.value.readingGuide || "";
          if (isCardEvidence(guideResult.value.evidence)) {
            bg.cardEvidence.readingGuide = guideResult.value.evidence;
          }
          if (isStillViewing()) setReadingGuide(bg.readingGuide);
          if (isStillViewing()) setCardEvidenceByKey({ ...bg.cardEvidence });
        }

        if (bg.readingGuide) {
          try {
            const originalValueRes = await fetch("/api/skills/original-reading-value", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                bookSummary: bkSummary,
                readingGuide: bg.readingGuide,
                chapters: chaps,
              }),
            });
            const originalValueData = await originalValueRes.json();
            if (originalValueData.success) {
              bg.originalReadingValue = originalValueData.originalReadingValue || "";
              if (isStillViewing()) setOriginalReadingValue(bg.originalReadingValue);
            }
          } catch (e) {
            console.error("原书阅读价值判断生成失败:", e);
          }
        }

        if (quoteResult.status === "fulfilled" && quoteResult.value.success) {
          bg.workspaceQuote = sanitizeWorkspaceQuote(
            quoteResult.value.workspaceQuote || "",
            { title: bg.title }
          );
          if (isStillViewing()) setWorkspaceQuote(bg.workspaceQuote);
        }
        bgAnalysisRef.current = bg;
        saveBgAnalysisSnapshotToHistory(bg);

        if (isStillViewing()) setIsLoadingReadingGuide(false);
        if (isStillViewing()) setIsLoadingOriginalReadingValue(false);
        const record = saveBgAnalysisToHistory(bg);
        promoteAnalysisTabToHistory([pendingTitle, title], record);
        if (isStillViewing()) setMessage("分析完成");
        setBgAnalysisStatus({ active: false });
        return;
      }

      // ── Book Summary ──
      updateProgress("全书摘要…");
      if (isStillViewing()) setMessage("正在生成全书摘要...");
      if (!bkSummary) {
        try {
          const summaryRes = await fetch("/api/skills/book-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, chapters: chaps }),
          });
          const summaryData = await summaryRes.json();
          if (summaryData.success) {
            bkSummary = summaryData.bookSummary || "";
            if (isCardEvidence(summaryData.evidence)) {
              bg.cardEvidence.bookSummary = summaryData.evidence;
            }
          }
        } catch (e) {
          console.error("全书摘要生成失败:", e);
        }
      }
      if (!bkSummary) {
        bkSummary = buildFallbackBookSummary(title, chaps);
      }
      bg.bookSummary = bkSummary;
      bgAnalysisRef.current = bg;
      saveBgAnalysisSnapshotToHistory(bg);
      if (isStillViewing()) {
        setBookSummary(bkSummary);
        setCardEvidenceByKey({ ...bg.cardEvidence });
        setIsLoadingBookSummary(false);
      }
      stepsCompleted = 1;

      // ── Reading Guide ──
      updateProgress("阅读指南…");
      if (isStillViewing()) setMessage("正在生成阅读指南...");
      try {
        const guideRes = await fetch("/api/skills/reading-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        });
        const guideData = await guideRes.json();
        if (guideData.success) {
          bg.readingGuide = guideData.readingGuide || "";
          if (isCardEvidence(guideData.evidence)) {
            bg.cardEvidence.readingGuide = guideData.evidence;
          }
          if (isStillViewing()) setReadingGuide(bg.readingGuide);
          if (isStillViewing()) setCardEvidenceByKey({ ...bg.cardEvidence });
        }
      } catch (e) { console.error("阅读指南生成失败:", e); }
      bgAnalysisRef.current = bg;
      saveBgAnalysisSnapshotToHistory(bg);
      if (isStillViewing()) setIsLoadingReadingGuide(false);
      stepsCompleted = 2;

      // ── View Map ──
      updateProgress("观点地图…");
      if (isStillViewing()) setMessage("正在生成观点地图...");
      try {
        const vmRes = await fetch("/api/skills/view-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        });
        const vmData = await vmRes.json();
        if (vmData.success) {
          bg.viewMap = vmData.viewMap || "";
          if (isCardEvidence(vmData.evidence)) {
            bg.cardEvidence.viewMap = vmData.evidence;
          }
          if (isStillViewing()) setViewMap(bg.viewMap);
          if (isStillViewing()) setCardEvidenceByKey({ ...bg.cardEvidence });
        }
      } catch (e) { console.error("观点地图生成失败:", e); }
      bgAnalysisRef.current = bg;
      saveBgAnalysisSnapshotToHistory(bg);
      if (isStillViewing()) setIsLoadingViewMap(false);
      stepsCompleted = 3;

      // ── Parallel: Action + Validation + IdeaSource ──
      updateProgress("剩余分析…");
      if (isStillViewing()) setMessage("正在生成剩余分析...");
      const [actionResult, validResult, ideaResult, originalValueResult, quoteResult] = await Promise.allSettled([
        fetch("/api/skills/action-extraction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        }).then(r => r.json()),
        fetch("/api/skills/view-validation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        }).then(r => r.json()),
        fetch("/api/skills/idea-source-tracing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            bookSummary: bkSummary,
            viewMap: bg.viewMap || "",
            chapters: chaps,
          }),
        }).then(r => r.json()),
        fetch("/api/skills/original-reading-value", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            bookSummary: bkSummary,
            readingGuide: bg.readingGuide,
            chapters: chaps,
          }),
        }).then(r => r.json()),
        fetch("/api/skills/workspace-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        }).then(r => r.json()),
      ]);

      if (actionResult.status === "fulfilled" && actionResult.value.success) {
        bg.actionExtraction = actionResult.value.actionExtraction || "";
        if (isCardEvidence(actionResult.value.evidence)) {
          bg.cardEvidence.actionExtraction = actionResult.value.evidence;
        }
        if (isStillViewing()) setActionExtraction(bg.actionExtraction);
      }
      if (validResult.status === "fulfilled" && validResult.value.success) {
        bg.viewValidation = validResult.value.viewValidation || "";
        if (isCardEvidence(validResult.value.evidence)) {
          bg.cardEvidence.criticalExamination = validResult.value.evidence;
        }
        if (isStillViewing()) setCriticalExamination(bg.viewValidation);
      }
      if (ideaResult.status === "fulfilled" && ideaResult.value.success) {
        bg.ideaSourceTracing = ideaResult.value.ideaSourceTracing || "";
        if (isCardEvidence(ideaResult.value.evidence)) {
          bg.cardEvidence.ideaSourceTracing = ideaResult.value.evidence;
        }
        if (isStillViewing()) setIdeaSourceTracing(bg.ideaSourceTracing);
      }
      if (originalValueResult.status === "fulfilled" && originalValueResult.value.success) {
        bg.originalReadingValue = originalValueResult.value.originalReadingValue || "";
        if (isStillViewing()) setOriginalReadingValue(bg.originalReadingValue);
      }
      if (quoteResult.status === "fulfilled" && quoteResult.value.success) {
        bg.workspaceQuote = sanitizeWorkspaceQuote(
          quoteResult.value.workspaceQuote || "",
          { title: bg.title }
        );
        if (isStillViewing()) setWorkspaceQuote(bg.workspaceQuote);
      }
      bgAnalysisRef.current = bg;
      saveBgAnalysisSnapshotToHistory(bg);
      if (isStillViewing()) {
        setCardEvidenceByKey({ ...bg.cardEvidence });
        setIsLoadingActionExtraction(false);
        setIsLoadingViewValidation(false);
        setIsLoadingIdeaSourceTracing(false);
        setIsLoadingOriginalReadingValue(false);
      }
      stepsCompleted = totalSteps;

      // ── Save to history ──
      bgAnalysisRef.current = bg;
      const record = saveBgAnalysisToHistory(bg);
      promoteAnalysisTabToHistory([pendingTitle, title], record);

      if (isStillViewing()) {
        // User is still on this book — just mark complete
        setMessage("分析完成");
      } else {
        // User switched away — offer to switch back via toast
        const savedBg = { ...bg };
        enqueueGuidanceToast({
          id: `bg-analysis-done-${title}`,
          message: `《${title}》分析完成`,
          actionText: "查看",
          onAction: () => {
            applyBgAnalysisToDisplay(savedBg);
            bgAnalysisRef.current = null;
          },
          priority: TOAST_PRIORITY.COGNITIVE,
          durationMs: 10000,
        });
      }
    } catch (error) {
      console.error(error);
      setAnalysisErrorCode("REQUEST_FAILED");
      setUploadFailureStage("request");
      setFailedUploadFile(fileToAnalyze);
      setMessage(getRequestFailureMessage());
      failCurrentAnalysis([pendingTitle, bgAnalysisRef.current?.title ?? ""]);
    } finally {
      setIsLoading(false);
      setBgAnalysisStatus({ active: false });
      bgAnalysisRef.current = null;
    }
  };

  const handleRetryFailedUpload = () => {
    if (!failedUploadFile || isAnalyzing) return;

    setSelectedFile(failedUploadFile);
    setMessage("");
    setAnalysisErrorCode(null);
    setUploadFailureStage(null);
    void handleAnalyze(failedUploadFile);
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const allImmersiveCardDefs = useMemo<ImmersiveCardDef[]>(() => [
    { key: "bookSummary",         label: "全书摘要", orderLabel: "01", content: bookSummary,         isLoading: isLoadingBookSummary,        loadingText: "正在生成全书摘要..." },
    { key: "readingGuide",        label: "阅读指南", orderLabel: "02", content: readingGuide,        isLoading: isLoadingReadingGuide,       loadingText: "正在生成阅读指南..." },
    { key: "viewMap",             label: "观点地图", orderLabel: "03", content: viewMap,             isLoading: isLoadingViewMap,            loadingText: "正在生成观点地图..." },
    { key: "actionExtraction",    label: "行动提炼", orderLabel: "04", content: actionExtraction,    isLoading: isLoadingActionExtraction,   loadingText: "正在生成行动提炼..." },
    { key: "criticalExamination", label: "观点校验", orderLabel: "05", content: criticalExamination, isLoading: isLoadingViewValidation,     loadingText: "正在生成观点校验..." },
    { key: "ideaSourceTracing",   label: "思想溯源", orderLabel: "06", content: ideaSourceTracing,   isLoading: isLoadingIdeaSourceTracing,  loadingText: "正在生成思想溯源..." },
  ], [
    actionExtraction,
    bookSummary,
    criticalExamination,
    ideaSourceTracing,
    isLoadingActionExtraction,
    isLoadingBookSummary,
    isLoadingIdeaSourceTracing,
    isLoadingReadingGuide,
    isLoadingViewMap,
    isLoadingViewValidation,
    readingGuide,
    viewMap,
  ]);

  const workspaceSearchTokens = useMemo(
    () => getSearchTokens(debouncedWorkspaceSearchQuery),
    [debouncedWorkspaceSearchQuery]
  );

  const workspaceSearchWorkerDocuments = useMemo(() => {
    const documents = allImmersiveCardDefs
      .filter((card) => !!card.content.trim())
      .map((card) => ({ id: `current:${card.key}`, content: card.content }));

    recentHistory.forEach((record) => {
      documents.push({
        id: `book:${record.id}`,
        content: `${record.title} ${record.author ?? ""} ${getFileTypeLabel(record.fileType)}`,
      });
      SEARCHABLE_CARD_FIELDS.forEach((field) => {
        const content = getHistoryRecordCardContent(record, field.key);
        if (content.trim()) {
          documents.push({ id: `library:${record.id}:${field.key}`, content });
        }
      });
    });

    return documents;
  }, [allImmersiveCardDefs, recentHistory]);

  const shouldUseWorkspaceSearchWorker =
    recentHistory.length >= 100 ||
    workspaceSearchWorkerDocuments.reduce((total, document) => total + document.content.length, 0) > 2 * 1024 * 1024;

  useEffect(() => {
    if (!shouldUseWorkspaceSearchWorker || workspaceSearchTokens.length === 0) {
      setWorkspaceSearchWorkerMatches(null);
      return;
    }

    const worker = new Worker(
      new URL("../../lib/workspaceSearch.worker.mjs", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (event: MessageEvent<{ matches: Record<string, WorkspaceSearchWorkerMatch | null> }>) => {
      setWorkspaceSearchWorkerMatches(event.data.matches);
    };
    worker.postMessage({
      query: debouncedWorkspaceSearchQuery,
      documents: workspaceSearchWorkerDocuments,
    });

    return () => worker.terminate();
  }, [
    debouncedWorkspaceSearchQuery,
    shouldUseWorkspaceSearchWorker,
    workspaceSearchTokens.length,
    workspaceSearchWorkerDocuments,
  ]);

  const getWorkspaceSearchMatch = useCallback((id: string, content: string) => {
    if (workspaceSearchWorkerMatches && id in workspaceSearchWorkerMatches) {
      return workspaceSearchWorkerMatches[id];
    }
    return getTextSearchMatch(content, debouncedWorkspaceSearchQuery, workspaceSearchTokens);
  }, [debouncedWorkspaceSearchQuery, workspaceSearchTokens, workspaceSearchWorkerMatches]);

  const workspaceSearchCorpus = useMemo<WorkspaceSearchResult[]>(() => {
    const items: WorkspaceSearchResult[] = [];

    const addResult = (label: string, content: string, targetKey: string, title = label) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const match = getWorkspaceSearchMatch(`current:${targetKey}`, trimmed);
      if (workspaceSearchTokens.length > 0 && !match) return;
      items.push({
        id: targetKey,
        label,
        title,
        excerpt: match
          ? createSearchExcerptAt(trimmed, match.firstMatchIndex)
          : createSearchExcerpt(trimmed, [], 180),
        targetKey,
        score: match?.score ?? 999,
        matchCount: match?.matchCount ?? 0,
      });
    };

    allImmersiveCardDefs.forEach((card) => {
      addResult(card.label, card.content, card.key);
    });

    return items;
  }, [allImmersiveCardDefs, getWorkspaceSearchMatch, workspaceSearchTokens]);

  const workspaceSearchResults = useMemo(() => {
    if (workspaceSearchFilter === "books") return [];

    return workspaceSearchCorpus
      .filter((item) =>
        workspaceSearchFilter === "all" ||
        workspaceSearchFilter === "insights" ||
        item.targetKey === workspaceSearchFilter
      )
      .sort((a, b) => a.score - b.score)
      .slice(0, workspaceSearchTokens.length > 0 ? 8 : 3);
  }, [workspaceSearchCorpus, workspaceSearchFilter, workspaceSearchTokens.length]);

  const workspaceBookSearchResults = useMemo<WorkspaceBookSearchResult[]>(() => {
    if (workspaceSearchFilter !== "all" && workspaceSearchFilter !== "books") return [];

    const scored = recentHistory.map((record, index) => {
      const fileTypeLabel = getFileTypeLabel(record.fileType);
      const subtitle = record.author || `${fileTypeLabel} · ${record.mode === "lite" ? "简化版" : "完整版"}`;
      const badge = record.isStarterBook ? "赠送书单" : record.mode === "lite" ? "简化版" : "历史记录";
      const haystack = `${record.title} ${record.author ?? ""} ${fileTypeLabel} ${badge}`.toLowerCase();
      const bookMatch = getWorkspaceSearchMatch(`book:${record.id}`, haystack);
      const titleMatch = getTextSearchMatch(record.title, debouncedWorkspaceSearchQuery, workspaceSearchTokens);
      const authorMatch = getTextSearchMatch(record.author ?? "", debouncedWorkspaceSearchQuery, workspaceSearchTokens);

      let score = index + 10;
      if (workspaceSearchTokens.length > 0) {
        if (titleMatch) score = titleMatch.score;
        else if (authorMatch) score = 30 + authorMatch.score;
        else if (bookMatch) score = 60 + bookMatch.score;
        else score = Number.POSITIVE_INFINITY;
      }

      return {
        result: {
          id: record.id,
          title: record.title,
          subtitle,
          badge,
          record,
          score,
        },
        score,
      };
    });

    return scored
      .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
      .sort((a, b) => a.score - b.score)
      .slice(0, workspaceSearchTokens.length > 0 ? 8 : 5)
      .map((entry) => entry.result);
  }, [
    debouncedWorkspaceSearchQuery,
    getWorkspaceSearchMatch,
    recentHistory,
    workspaceSearchFilter,
    workspaceSearchTokens,
  ]);

  const workspaceLibraryContentSearchResults = useMemo<WorkspaceLibraryContentSearchResult[]>(() => {
    if (workspaceSearchTokens.length === 0 || workspaceSearchFilter === "books") return [];

    const results: Array<{ result: WorkspaceLibraryContentSearchResult; score: number }> = [];

    recentHistory.forEach((record, recordIndex) => {
      if (record.title === bookTitle) return;

      SEARCHABLE_CARD_FIELDS.forEach((field, fieldIndex) => {
        if (
          workspaceSearchFilter !== "all" &&
          workspaceSearchFilter !== "insights" &&
          workspaceSearchFilter !== field.key
        ) return;
        const content = getHistoryRecordCardContent(record, field.key);
        const compact = compactSearchText(content);
        if (!compact) return;

        const haystack = `${record.title} ${record.author ?? ""} ${field.label} ${compact}`.toLowerCase();
        const contentMatch = getWorkspaceSearchMatch(`library:${record.id}:${field.key}`, compact);
        const generalMatch = getTextSearchMatch(haystack, debouncedWorkspaceSearchQuery, workspaceSearchTokens);
        if (!contentMatch && !generalMatch) return;
        results.push({
          result: {
            id: `${record.id}:${field.key}`,
            bookTitle: record.title,
            label: field.label,
            excerpt: createSearchExcerptAt(compact, (contentMatch ?? generalMatch)!.firstMatchIndex),
            targetKey: field.key,
            record,
            matchCount: (contentMatch ?? generalMatch)?.matchCount ?? 0,
            score: (contentMatch?.score ?? (generalMatch?.score ?? 80) + 80) + recordIndex * 8 + fieldIndex,
          },
          score: (contentMatch?.score ?? (generalMatch?.score ?? 80) + 80) + recordIndex * 8 + fieldIndex,
        });
      });
    });

    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((entry) => entry.result);
  }, [
    bookTitle,
    debouncedWorkspaceSearchQuery,
    getWorkspaceSearchMatch,
    recentHistory,
    workspaceSearchFilter,
    workspaceSearchTokens,
  ]);

  const workspaceSearchFilterCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { all: 0, books: 0, insights: 0 };
    SEARCHABLE_CARD_FIELDS.forEach((field) => {
      counts[field.key] = 0;
    });

    const matches = (content: string) =>
      workspaceSearchTokens.length === 0 ||
      !!getTextSearchMatch(content, debouncedWorkspaceSearchQuery, workspaceSearchTokens);

    recentHistory.forEach((record) => {
      if (matches(`${record.title} ${record.author ?? ""}`)) {
        counts.books += 1;
      }

      SEARCHABLE_CARD_FIELDS.forEach((field) => {
        const content = getHistoryRecordCardContent(record, field.key);
        if (!content.trim() || !matches(content)) return;
        counts[field.key] += 1;
        counts.insights += 1;
      });
    });

    allImmersiveCardDefs.forEach((card) => {
      if (!card.content.trim() || !matches(card.content)) return;
      counts[card.key] = (counts[card.key] ?? 0) + 1;
      counts.insights += 1;
    });

    counts.all = counts.books + counts.insights;
    return counts;
  }, [allImmersiveCardDefs, debouncedWorkspaceSearchQuery, recentHistory, workspaceSearchTokens]);

  const combinedWorkspaceSearchResults = useMemo<WorkspaceCombinedSearchResult[]>(() => [
    ...workspaceBookSearchResults.map((result) => ({
      kind: "book" as const,
      id: `book:${result.id}`,
      result,
    })),
    ...workspaceLibraryContentSearchResults.map((result) => ({
      kind: "libraryContent" as const,
      id: `libraryContent:${result.id}`,
      result,
    })),
    ...workspaceSearchResults.map((result) => ({
      kind: "currentContent" as const,
      id: `currentContent:${result.id}`,
      result,
    })),
  ], [workspaceBookSearchResults, workspaceLibraryContentSearchResults, workspaceSearchResults]);

  useEffect(() => {
    const queryLength = debouncedWorkspaceSearchQuery.trim().length;
    if (!isWorkspaceSearchOpen || queryLength === 0) return;

    recordWorkspaceSearchEvent("search_query_changed", {
      queryLength,
      hasResults: combinedWorkspaceSearchResults.length > 0,
    });

    if (combinedWorkspaceSearchResults.length === 0) {
      recordWorkspaceSearchEvent("search_empty", { queryLength });
    }
  }, [combinedWorkspaceSearchResults.length, debouncedWorkspaceSearchQuery, isWorkspaceSearchOpen]);

  useEffect(() => {
    if (!isWorkspaceSearchOpen) return;
    recordWorkspaceSearchEvent("search_filter_changed", {
      filter: workspaceSearchFilter,
    });
  }, [isWorkspaceSearchOpen, workspaceSearchFilter]);

  const shouldShowInsightResultsFirst =
    workspaceSearchTokens.length > 0 &&
    Math.min(
      ...workspaceSearchResults.map((result) => result.score),
      ...workspaceLibraryContentSearchResults.map((result) => result.score),
      Number.POSITIVE_INFINITY
    ) < Math.min(
      ...workspaceBookSearchResults.map((result) => result.score),
      Number.POSITIVE_INFINITY
    );

  useEffect(() => {
    setWorkspaceSearchActiveIndex(0);
  }, [workspaceSearchQuery]);

  useEffect(() => {
    setWorkspaceSearchActiveIndex((index) => {
      if (combinedWorkspaceSearchResults.length === 0) return 0;
      return Math.min(index, combinedWorkspaceSearchResults.length - 1);
    });
  }, [combinedWorkspaceSearchResults.length]);

  const handleSelectWorkspaceSearchResult = (result: WorkspaceSearchResult) => {
    const cardIndex = immersiveCardList.findIndex((card) => card.key === result.targetKey);
    setViewMode("immersive");
    if (cardIndex >= 0) {
      setSlideDir(cardIndex > safeImmersiveIndex ? "left" : "right");
      setImmersiveIndex(cardIndex);
    } else {
      setSlideDir(null);
    }

    setActiveSearchHighlightTokens(workspaceSearchTokens);
    setActiveSearchHighlightCardKey(result.targetKey);
    setActiveSearchMatchIndex(0);
    setIsWorkspaceSearchOpen(false);
    recordWorkspaceSearchEvent("search_result_opened", {
      resultKind: "currentContent",
      cardKey: result.targetKey,
    });
    window.setTimeout(() => {
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleSelectWorkspaceBookSearchResult = (result: WorkspaceBookSearchResult) => {
    setActiveSearchHighlightTokens([]);
    setActiveSearchHighlightCardKey("");
    setActiveSearchMatchIndex(0);
    openHistoryRecord(result.record);
    setIsWorkspaceSearchOpen(false);
    recordWorkspaceSearchEvent("search_result_opened", { resultKind: "book" });
    window.setTimeout(() => {
      resetReaderScrollPosition();
    }, 80);
  };

  const handleSelectWorkspaceLibraryContentSearchResult = (
    result: WorkspaceLibraryContentSearchResult
  ) => {
    setActiveSearchHighlightTokens(workspaceSearchTokens);
    setActiveSearchHighlightCardKey(result.targetKey);
    setActiveSearchMatchIndex(0);
    openHistoryRecord(result.record);
    setViewMode("immersive");
    setIsWorkspaceSearchOpen(false);
    recordWorkspaceSearchEvent("search_result_opened", {
      resultKind: "libraryContent",
      cardKey: result.targetKey,
    });

    window.setTimeout(() => {
      const index = SEARCHABLE_CARD_FIELDS.findIndex((field) => field.key === result.targetKey);
      if (index >= 0) {
        setSlideDir(index > safeImmersiveIndex ? "left" : "right");
        setImmersiveIndex(index);
      } else {
        enqueueGuidanceToast({
          id: `search-record-no-card-${result.record.id}-${result.targetKey}`,
          message: "这条旧记录无法精确定位，已打开对应书籍。",
          priority: TOAST_PRIORITY.INFO,
          durationMs: 5000,
        });
      }
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSelectCombinedWorkspaceSearchResult = (result: WorkspaceCombinedSearchResult) => {
    if (result.kind === "book") {
      handleSelectWorkspaceBookSearchResult(result.result);
      return;
    }

    if (result.kind === "libraryContent") {
      handleSelectWorkspaceLibraryContentSearchResult(result.result);
      return;
    }

    handleSelectWorkspaceSearchResult(result.result);
  };

  const immersiveCardList = allImmersiveCardDefs.filter((card) => {
    if (!isLiteMode || isLiteUnlocked) return card.isLoading || !!card.content;
    return (
      ["bookSummary", "readingGuide"].includes(card.key) &&
      (card.isLoading || !!card.content)
    );
  });

  immersiveCardsLenRef.current = immersiveCardList.length;

  const safeImmersiveIndex =
    immersiveCardList.length > 0
      ? Math.min(immersiveIndex, immersiveCardList.length - 1)
      : 0;

  const currentImmersiveCard = immersiveCardList[safeImmersiveIndex];
  const currentImmersiveCardKey = currentImmersiveCard?.key ?? "";
  const currentImmersiveCardIsLoading = currentImmersiveCard?.isLoading ?? false;
  const currentImmersiveCardHash = currentImmersiveCard
    ? hashHighlightContent(currentImmersiveCard.content)
    : 0;
  const currentCardHighlights = useMemo(
    () =>
      currentImmersiveCardKey
        ? bookHighlights.filter((highlight) => highlight.cardKey === currentImmersiveCardKey)
        : [],
    [bookHighlights, currentImmersiveCardKey]
  );
  const overviewCardList = allImmersiveCardDefs.filter((card) => {
    if (!isLiteMode || isLiteUnlocked) return true;
    return ["bookSummary", "readingGuide"].includes(card.key);
  });
  const selectedEvidenceCard =
    overviewCardList.find((card) => card.key === selectedEvidenceCardKey) ??
    currentImmersiveCard ??
    overviewCardList.find((card) => !card.isLoading && !!card.content.trim());
  const selectedEvidenceCardIndex = selectedEvidenceCard
    ? immersiveCardList.findIndex((card) => card.key === selectedEvidenceCard.key)
    : -1;
  const selectedStoredCardEvidence = selectedEvidenceCard
    ? cardEvidenceByKey[selectedEvidenceCard.key] ??
      normalizeCardEvidenceMap(currentHistoryRecord?.cardEvidence)[selectedEvidenceCard.key] ??
      null
    : null;
  const selectedCardEvidence = selectedStoredCardEvidence ??
    (selectedEvidenceCard
      ? buildCardEvidence({
        cardKey: selectedEvidenceCard.key,
        cardLabel: selectedEvidenceCard.label,
        context: currentAnalysisContext,
      }) as CardEvidence | null
      : null);
  const selectedEvidenceClaim =
    selectedCardEvidence?.claims.find((claim) => claim.id === selectedEvidenceClaimId) ??
    selectedCardEvidence?.claims[0] ??
    null;
  const originalReadingAdviceLevelIndex = originalReadingValue
    ? getOriginalReadingLevelIndex(originalReadingValue)
    : -1;
  const originalReadingAdviceSummary = originalReadingValue
    ? createOriginalReadingAdviceSummary(originalReadingValue, originalReadingAdviceLevelIndex)
    : "";
  const originalReadingAdviceMarkdown =
    originalReadingValue && originalReadingAdviceLevelIndex >= 0
      ? normalizeOriginalReadingAdviceMarkdown(originalReadingValue, originalReadingAdviceLevelIndex)
      : originalReadingValue;

  const openOverviewCard = useCallback((targetKey: string) => {
    const nextIndex = immersiveCardList.findIndex((card) => card.key === targetKey);
    if (nextIndex < 0) return;

    setSlideDir(null);
    setImmersiveIndex(nextIndex);
    setViewMode("immersive");

    window.setTimeout(() => {
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }, [immersiveCardList]);

  const openDecisionSourceCard = useCallback((
    cardKey: keyof DecisionCardsInput,
    returnState: LeapPracticeReturnState
  ) => {
    const cardMap: Record<keyof DecisionCardsInput, string> = {
      summary: "bookSummary",
      readingGuide: "readingGuide",
      viewMap: "viewMap",
      actionPrinciples: "actionExtraction",
      models: "criticalExamination",
      insights: "ideaSourceTracing",
    };
    setLeapPracticeReturnState(returnState);
    setIsDecisionPanelOpen(false);
    if (currentBookId) {
      recordLeapPracticeEvent(currentBookId, "source_card_opened", {
        cardKey,
        gateIndex: returnState.gateIndex,
        view: returnState.view,
      });
    }
    window.setTimeout(() => openOverviewCard(cardMap[cardKey]), 40);
  }, [currentBookId, openOverviewCard, setIsDecisionPanelOpen]);

  const openEvidenceCard = (targetKey: string) => {
    const nextIndex = immersiveCardList.findIndex((card) => card.key === targetKey);
    if (nextIndex >= 0) {
      setImmersiveIndex(nextIndex);
      setSlideDir("left");
    }
    setSelectedEvidenceCardKey(targetKey);
    setSelectedEvidenceClaimId("");
    setEvidenceTransitionState("entering");
    setViewMode("evidence");
    window.setTimeout(() => {
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  const returnFromEvidence = () => {
    setEvidenceTransitionState("leaving");
    window.setTimeout(() => {
      if (selectedEvidenceCardIndex >= 0) {
        setImmersiveIndex(selectedEvidenceCardIndex);
        setSlideDir(null);
        setViewMode("immersive");
      } else {
        setViewMode("overview");
      }
      setEvidenceTransitionState("entering");
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  };

  useEffect(() => {
    if (viewMode !== "evidence" || !selectedCardEvidence?.claims.length) return;
    if (selectedCardEvidence.claims.some((claim) => claim.id === selectedEvidenceClaimId)) return;
    setSelectedEvidenceClaimId(selectedCardEvidence.claims[0].id);
  }, [selectedCardEvidence, selectedEvidenceClaimId, viewMode]);

  useEffect(() => {
    if (viewMode !== "immersive") return;
    if (!currentImmersiveCard || currentImmersiveCard.isLoading || !bookTitle) return;

    setSeenCardKeys((prev) =>
      prev.includes(currentImmersiveCard.key)
        ? prev
        : [...prev, currentImmersiveCard.key]
    );
  }, [currentImmersiveCard, bookTitle, viewMode]);

  useEffect(() => {
    if (!currentBookId) return;

    const nextViewedCount = Math.max(addictionState.viewed_cards_count, seenCardKeys.length);
    if (nextViewedCount === addictionState.viewed_cards_count) return;

    applyAddictionState({
      ...addictionState,
      viewed_cards_count: nextViewedCount,
    });

    if (nextViewedCount === 1) {
      enqueueGuidanceToast({
        id: `addiction-browse-${currentBookId}`,
        message: "继续浏览，你会更快抓住这本书的结构",
        priority: TOAST_PRIORITY.GUIDANCE,
        durationMs: 5000,
      });
    }
  }, [
    addictionState,
    applyAddictionState,
    currentBookId,
    enqueueGuidanceToast,
    seenCardKeys.length,
  ]);

  useEffect(() => {
    if (!currentBookId) return;
    if (addictionState.viewed_cards_count < 3) return;
    if (addictionState.has_triggered_training_prompt) return;
    if (addictionState.decision_training_progress > 0) return;
    if (!hasCompleteDecisionCards(getDecisionCardsInput())) return;

    enqueueGuidanceToast({
      id: `addiction-training-prompt-${currentBookId}`,
      message: "试一道题，看看这本书会怎么影响你的选择",
      actionText: "试一道题",
      onAction: () => {
        void handleOpenDecisionTraining();
      },
      priority: TOAST_PRIORITY.GUIDANCE,
      durationMs: 10000,
    });

    applyAddictionState({
      ...addictionState,
      has_triggered_training_prompt: true,
    });

    if (isBeforeOnboardingStep(onboardingProgress, "viewed_cards")) {
      advanceOnboardingProgress("viewed_cards");
    }
  }, [
    currentBookId,
    addictionState,
    getDecisionCardsInput,
    handleOpenDecisionTraining,
    applyAddictionState,
    onboardingProgress,
    advanceOnboardingProgress,
    enqueueGuidanceToast,
  ]);

  // ── Fallback timers: prevent user from getting stuck ──────────────────────
  useEffect(() => {
    if (!currentBookId) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Scenario 1: entered card view but hasn't browsed >=3 cards after 30s
    if (onboardingProgress === "analyzed" && addictionState.viewed_cards_count < 3) {
      timers.push(setTimeout(() => {
        enqueueGuidanceToast({
          id: `fallback-skip-cards-${currentBookId}`,
          message: "你也可以直接试一道题",
          actionText: "试一道题",
          onAction: () => void handleOpenDecisionTraining(),
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 10000,
        });
        setFallbackUnlocks((prev) => ({ ...prev, training: true }));
      }, 30000));
    }

    // Scenario 2: training entry visible but not clicked after 30s
    if (
      !isBeforeOnboardingStep(onboardingProgress, "viewed_cards") &&
      isBeforeOnboardingStep(onboardingProgress, "trained") &&
      addictionState.decision_training_progress === 0 &&
      !isDecisionLoading &&
      !isDecisionPanelOpen
    ) {
      timers.push(setTimeout(() => {
        enqueueGuidanceToast({
          id: `fallback-nudge-training-${currentBookId}`,
          message: "继续深读也可以，或者试一道题",
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 10000,
        });
      }, 30000));
    }

    // Scenario 3: completed 3 questions but hasn't exported after 30s
    if (
      !isBeforeOnboardingStep(onboardingProgress, "trained") &&
      isBeforeOnboardingStep(onboardingProgress, "exported")
    ) {
      timers.push(setTimeout(() => {
        enqueueGuidanceToast({
          id: `fallback-nudge-export-${currentBookId}`,
          message: "你可以把这本书保存下来",
          actionText: "导出",
          onAction: () => {
            setExportStatus("idle");
            setIsExportModalOpen(true);
          },
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 10000,
        });
        setFallbackUnlocks((prev) => ({ ...prev, export: true }));
      }, 30000));
    }

    return () => timers.forEach(clearTimeout);
  }, [onboardingProgress, currentBookId, addictionState.viewed_cards_count, addictionState.decision_training_progress, isDecisionLoading, isDecisionPanelOpen, enqueueGuidanceToast, handleOpenDecisionTraining]);

  const handleImmersiveTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleImmersiveTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(delta) > 50) {
      navigateImmersive(delta < 0 ? "next" : "prev");
    }
  };

  const renderVisibleCardHighlights = useCallback(
    (highlights = currentCardHighlights) => {
      const root = immersiveContentRef.current;

      if (viewMode !== "immersive" || !currentImmersiveCardKey || currentImmersiveCardIsLoading) {
        renderedHighlightRangesRef.current = [];
        getCssHighlightRegistry()?.delete(CARD_HIGHLIGHT_CSS_NAME);
        return;
      }

      renderedHighlightRangesRef.current = renderCardHighlights(
        root,
        highlights,
        currentImmersiveCardHash
      );
    },
    [
      currentCardHighlights,
      currentImmersiveCardHash,
      currentImmersiveCardIsLoading,
      currentImmersiveCardKey,
      viewMode,
    ]
  );

  useEffect(() => {
    if (viewMode !== "immersive" || !currentImmersiveCardKey || currentImmersiveCardIsLoading) {
      renderedHighlightRangesRef.current = [];
      getCssHighlightRegistry()?.delete(CARD_HIGHLIGHT_CSS_NAME);
      return;
    }

    const timer = window.setTimeout(() => {
      renderVisibleCardHighlights();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      renderedHighlightRangesRef.current = [];
      getCssHighlightRegistry()?.delete(CARD_HIGHLIGHT_CSS_NAME);
    };
  }, [
    currentImmersiveCardIsLoading,
    currentImmersiveCardKey,
    renderVisibleCardHighlights,
    viewMode,
  ]);

  useEffect(() => {
    if (
      viewMode !== "immersive" ||
      !currentImmersiveCard ||
      currentImmersiveCard.isLoading ||
      currentImmersiveCard.key !== activeSearchHighlightCardKey ||
      activeSearchHighlightTokens.length === 0
    ) {
      getCssHighlightRegistry()?.delete(SEARCH_MATCH_HIGHLIGHT_CSS_NAME);
      renderedSearchMatchRangesRef.current = [];
      setActiveSearchMatchCount(0);
      return;
    }

    const timer = window.setTimeout(() => {
      ensureCardHighlightStyle();
      const ranges = renderSearchMatchHighlights(
        immersiveContentRef.current,
        activeSearchHighlightTokens
      );
      renderedSearchMatchRangesRef.current = ranges;
      setActiveSearchMatchCount(ranges.length);
      const targetRange = ranges[Math.min(activeSearchMatchIndex, Math.max(0, ranges.length - 1))];
      targetRange?.startContainer.parentElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 40);

    return () => {
      window.clearTimeout(timer);
      getCssHighlightRegistry()?.delete(SEARCH_MATCH_HIGHLIGHT_CSS_NAME);
      renderedSearchMatchRangesRef.current = [];
    };
  }, [
    activeSearchHighlightCardKey,
    activeSearchHighlightTokens,
    activeSearchMatchIndex,
    currentImmersiveCard,
    viewMode,
  ]);

  const handleReaderTextSelection = useCallback(() => {
    const root = immersiveContentRef.current;
    if (!root || !currentImmersiveCard || currentImmersiveCard.isLoading) {
      setPendingQuoteSelection(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setPendingQuoteSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setPendingQuoteSelection(null);
      return;
    }

    const selectedText = getStructuredSelectionText(
      root,
      range,
      selection.toString()
    ).trim();
    const normalizedLength = normalizeHighlightText(selectedText).length;
    if (
      normalizedLength < MIN_QUOTE_SELECTION_LENGTH ||
      normalizedLength > MAX_QUOTE_SELECTION_LENGTH
    ) {
      setPendingQuoteSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const offsets = getRangeOffsets(root, range);
    setHighlightActionBubble(null);
    setPendingQuoteSelection({
      text: selectedText,
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      x: Math.min(window.innerWidth - 112, Math.max(16, rect.left + rect.width / 2 - 56)),
      y: Math.max(16, rect.top - 48),
    });
  }, [currentImmersiveCard]);

  useEffect(() => {
    if (viewMode !== "immersive" || !currentImmersiveCard || currentImmersiveCard.isLoading) {
      return;
    }

    const handleSelectionEnd = () => {
      window.setTimeout(handleReaderTextSelection, 0);
    };

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("keyup", handleSelectionEnd);
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("keyup", handleSelectionEnd);
    };
  }, [currentImmersiveCard, handleReaderTextSelection, viewMode]);

  const handleCreateQuoteShareFromSelection = () => {
    if (!pendingQuoteSelection || !currentImmersiveCard || !currentHighlightBookRef) return;

    const highlight: BookHighlight = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      bookRef: currentHighlightBookRef,
      bookTitle: currentBookDisplayTitle,
      author: currentBookAuthor,
      cardKey: currentImmersiveCard.key,
      cardLabel: currentImmersiveCard.label,
      selectedText: pendingQuoteSelection.text,
      startOffset: pendingQuoteSelection.startOffset,
      endOffset: pendingQuoteSelection.endOffset,
      contentHash: currentImmersiveCardHash,
      createdAt: new Date().toISOString(),
    };

    const nextHighlights = addBookHighlight(highlight);
    const nextCardHighlights = nextHighlights.filter(
      (item) => item.cardKey === currentImmersiveCardKey
    );
    setBookHighlights(nextHighlights);
    setQuoteShareSelection({
      text: highlight.selectedText,
      cardLabel: highlight.cardLabel,
    });
    setPendingQuoteSelection(null);
    setHighlightActionBubble(null);
    window.getSelection()?.removeAllRanges();
    window.setTimeout(() => renderVisibleCardHighlights(nextCardHighlights), 0);
  };

  const handleOpenQuoteShareFromHighlight = (highlight: BookHighlight) => {
    setQuoteShareSelection({
      text: highlight.selectedText,
      cardLabel: highlight.cardLabel,
    });
    setPendingQuoteSelection(null);
    setHighlightActionBubble(null);
  };

  const handleHighlightPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      setHighlightActionBubble(null);
      return;
    }

    const matched = renderedHighlightRangesRef.current.find((item) =>
      isPointInsideRange(item.range, event.clientX, event.clientY)
    );
    if (!matched) {
      setHighlightActionBubble(null);
      return;
    }

    if (highlightActionBubble?.highlightId === matched.highlight.id) return;

    const point = getPointerActionPoint(event.clientX, event.clientY);
    setHighlightActionBubble({
      highlightId: matched.highlight.id,
      x: point.x,
      y: point.y,
    });
  };

  useEffect(() => {
    if (!highlightActionBubble) return;

    const handleDocumentPointerMove = (event: PointerEvent) => {
      const bubble = document.querySelector("[data-highlight-action-bubble]");
      if (bubble?.contains(event.target as Node)) return;

      const isInsideHighlight = renderedHighlightRangesRef.current.some((item) =>
        isPointInsideRange(item.range, event.clientX, event.clientY)
      );

      if (!isInsideHighlight) setHighlightActionBubble(null);
    };

    document.addEventListener("pointermove", handleDocumentPointerMove);
    return () => {
      document.removeEventListener("pointermove", handleDocumentPointerMove);
    };
  }, [highlightActionBubble]);

  const activeBubbleHighlight = highlightActionBubble
    ? bookHighlights.find((highlight) => highlight.id === highlightActionBubble.highlightId) ?? null
    : null;

  const handleDeleteHighlight = (highlightId: string) => {
    if (!currentHighlightBookRef) return;
    setBookHighlights(deleteBookHighlight(currentHighlightBookRef, highlightId));
    setPendingQuoteSelection(null);
    setHighlightActionBubble(null);
  };

  const handleCloseQuoteShareModal = () => {
    setQuoteShareSelection(null);
    setHomeQuoteShareSelection(null);
    setPendingQuoteSelection(null);
    setHighlightActionBubble(null);
    window.getSelection()?.removeAllRanges();
    window.setTimeout(() => renderVisibleCardHighlights(), 0);
  };

  // ── Onboarding unlock flags ────────────────────────────────────────────────
  const isOnboardingCompleted = onboardingProgress === "completed";
  const trainingUnlocked = isOnboardingCompleted || !isBeforeOnboardingStep(onboardingProgress, "viewed_cards") || fallbackUnlocks.training;
  const exportUnlocked = isOnboardingCompleted || !isBeforeOnboardingStep(onboardingProgress, "trained") || fallbackUnlocks.export;
  const analysisSteps: { key: string; label: string; loading: boolean; done: boolean }[] = [
    { key: "bookSummary", label: "全书摘要", loading: isLoadingBookSummary, done: !!bookSummary },
    { key: "readingGuide", label: "阅读指南", loading: isLoadingReadingGuide, done: !!readingGuide },
    { key: "viewMap", label: "观点地图", loading: isLoadingViewMap, done: !!viewMap },
    { key: "actionExtraction", label: "行动提炼", loading: isLoadingActionExtraction, done: !!actionExtraction },
    { key: "criticalExamination", label: "观点校验", loading: isLoadingViewValidation, done: !!criticalExamination },
    { key: "ideaSourceTracing", label: "思想溯源", loading: isLoadingIdeaSourceTracing, done: !!ideaSourceTracing },
  ];
  const visibleAnalysisSteps =
    isLiteMode && !isLiteUnlocked ? analysisSteps.slice(0, 2) : analysisSteps;
  const completedAnalysisSteps = visibleAnalysisSteps.filter((step) => step.done).length;
  const decisionCardsReady = hasCompleteDecisionCards(getDecisionCardsInput());
  const canExportBook = exportUnlocked && (!isLiteMode || isLiteUnlocked);
  const isAnalysisComplete =
    !!bookTitle &&
    !isAnalyzing &&
    visibleAnalysisSteps.length > 0 &&
    completedAnalysisSteps === visibleAnalysisSteps.length;
  const canShareBook = isAnalysisComplete || !!posterContent;
  const isTrainingActionDisabled =
    isDecisionLoading || isAnalyzing || !trainingUnlocked || !decisionCardsReady;
  const isExportActionDisabled = exportStatus === "exporting" || !canExportBook;
  const isShareActionDisabled = isGeneratingPoster || !canShareBook;
  const isFeynmanActionDisabled =
    isAnalyzing || !decisionCardsReady || (isLiteMode && !isLiteUnlocked);
  const leapProgress = leapPracticeRound && leapPracticeRound.bookId === currentBookId
    ? leapPracticeRound.statuses.filter((status) => status === "completed").length
    : 0;
  const leapGeneratedCount = leapPracticeRound && leapPracticeRound.bookId === currentBookId
    ? leapPracticeRound.scenarios.filter(Boolean).length
    : 0;
  const leapPracticeTabLabel = leapProgress >= 3
    ? "跃迁练习 ✓"
    : leapProgress > 0
    ? `跃迁练习 ${leapProgress}/3`
    : leapGeneratedCount > 0
    ? "继续训练"
    : "跃迁练习";
  const leapPracticeToolTitle = isDecisionLoading
    ? decisionLoadingStep || "生成中…"
    : leapProgress >= 3
    ? "查看本轮"
    : leapProgress > 0
    ? `已完成 ${leapProgress}/3`
    : leapGeneratedCount > 0
    ? `第 ${leapGeneratedCount + 1} 关待练习`
    : "跃迁练习";
  const topBarTabs = openTabs.map<WorkspaceTabItem>((tab) => ({
    id: tab.id,
    title: tab.title,
    closable: tab.closable,
    status: tab.status,
    progressLabel: tab.progressLabel,
  }));
  const displayedActiveTabId =
    currentWorkspaceTab && openTabs.some((tab) => tab.id === currentWorkspaceTab.id)
      ? currentWorkspaceTab.id
      : activeTabId;
  const hasPendingStarterBooks = experiencedStarterIds.length < starterBooks.length;
  const fullHistoryRecords = recentHistory
    .filter((record) => hasPendingStarterBooks ? !record.isStarterBook : true);
  const visibleHistoryRecords = fullHistoryRecords;
  const inProgressLabel = visibleAnalysisSteps.length > 0
    ? `${completedAnalysisSteps}/${visibleAnalysisSteps.length}`
    : "准备中";
  const recentGrowthLabel = growthLedger.lastEvent
    ? formatGrowthEvent(growthLedger.lastEvent)
    : "完成分析、训练或海报导出后，这里会留下最新成长记录。";
  const toolRailActions = [
    {
      id: "training",
      label: "跃迁练习",
      title: leapPracticeToolTitle,
      onClick: () => {
        void handleOpenDecisionTraining();
      },
      disabled: isTrainingActionDisabled,
      active: isDecisionPanelOpen,
    },
    {
      id: "export",
      label: "精华下载",
      title: exportStatus === "exporting" ? "下载中…" : "精华下载",
      onClick: () => {
        setExportStatus("idle");
        setIsExportModalOpen(true);
      },
      disabled: isExportActionDisabled,
    },
    {
      id: "share",
      label: "书摘海报",
      title: isGeneratingPoster ? "生成中…" : "书摘海报",
      onClick: handleGeneratePoster,
      disabled: isShareActionDisabled,
    },
    {
      id: "feynman",
      label: "讲书演示",
      title: "讲书演示",
      onClick: handleOpenFeynmanPreview,
      disabled: isFeynmanActionDisabled,
      active: isFeynmanPreviewOpen,
    },
  ];
  const utilityToolActions = [
    {
      id: "search",
      label: "书库搜索",
      title: "书库搜索 · ⌘/Ctrl K",
      onClick: handleOpenWorkspaceSearch,
    },
    {
      id: isWorkspaceFullscreen ? "exitFullscreen" : "fullscreen",
      label: isWorkspaceFullscreen ? "退出全屏" : "沉浸全屏",
      title: isWorkspaceFullscreen ? "退出全屏 · F" : "沉浸全屏 · F",
      onClick: handleToggleFullscreen,
      active: isWorkspaceFullscreen,
    },
  ];
  const bottomToolActions = [
    {
      id: "coffee",
      label: "请书跃喝杯咖啡",
      title: "请书跃喝杯咖啡",
      onClick: () => {
        setShowSupportCoffeeCallout(false);
        setIsSupportCoffeeModalOpen(true);
      },
      active: isSupportCoffeeModalOpen,
      showCallout: showSupportCoffeeCallout,
      calloutText: "已经认真拆完 3 本书了。愿意的话，请书跃喝杯咖啡。",
      onDismissCallout: () => setShowSupportCoffeeCallout(false),
    },
    {
      id: "backup",
      label: "数据备份",
      title: "数据备份 · B",
      onClick: handleBackupLocalData,
    },
  ];

  const workspacePanelClass =
    "bg-transparent";
  const workspaceRailPanelClass =
    "rounded-[13px] border border-transparent bg-[#eef1f2]";
  const shouldShowLibrarySidebar = !isLibraryCollapsed || isLibraryPreviewOpen;
  const shouldShowGrowthSidebar = !isGrowthPanelCollapsed || isGrowthPreviewOpen;
  const searchResultClass = (isActiveResult: boolean) =>
    `group w-full rounded-[10px] border px-3.5 py-3 text-left transition-all ${
      isActiveResult
        ? "border-[#9297a0] bg-[var(--workspace-hover-surface)]"
        : "border-transparent bg-transparent hover:border-[#dfe4e8] hover:bg-[#f8fafc]"
    }`;

  const librarySidebar = (
    <WorkspaceLibrarySidebar
      isCollapsed={!shouldShowLibrarySidebar}
      isPreview={isLibraryPreviewOpen}
      onToggle={toggleLibraryPanel}
      onPreviewClose={() => setIsLibraryPreviewOpen(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.epub,.azw3,.txt,application/pdf,application/epub+zip,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

      <section className={`${workspacePanelClass} relative overflow-hidden px-0 py-2`}>
        {isStarterLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[12px] bg-[rgba(247,248,249,0.96)] backdrop-blur-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-[#eef1f2]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--ink)]" />
              </span>
            </div>
            <p className="text-sm font-medium text-[var(--ink)]">正在为你准备这本书</p>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">{starterLoadingStep}</p>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label={selectedFile ? "重新选择书籍文件" : "上传书籍文件"}
          onClick={handleOpenUploadPicker}
          onKeyDown={handleUploadPanelKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group rounded-[13px] border px-4 py-4 text-left outline-none transition-all ${
            isDragging
              ? "border-[#9297a0] bg-[#fbfcfd] shadow-[0_10px_28px_rgba(24,29,38,0.08)]"
              : "cursor-pointer border-transparent bg-[var(--workspace-hover-surface)] hover:bg-[var(--workspace-hover-surface)] focus-visible:border-[#9297a0] focus-visible:bg-[var(--workspace-hover-surface)] focus-visible:ring-2 focus-visible:ring-[#9297a0]/25"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <UploadIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--ink)]">
                {selectedFile ? selectedFile.name : "把新书放进书库"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                {selectedFile ? "已开始自动解析，点击可重新选择" : "EPUB / AZW3 解析更完整；TXT / PDF 简化分析，最大 50MB"}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 text-[11px] leading-4 text-[var(--ink-faint)]">
                  {isDragging ? "松开即可添加到书库" : "拖拽文件到这里，或点击选择"}
                </p>
                <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-[var(--accent)] px-3 text-xs font-medium text-[#fbfcfd] shadow-[0_4px_12px_rgba(10,46,14,0.16)] transition group-hover:bg-[#123f1a]">
                  <PlusCircleIcon className="h-4 w-4" aria-hidden="true" />
                  上传书籍
                </span>
              </div>
            </div>
          </div>
        </div>

      </section>

      <div className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
        {hasPendingStarterBooks && (
          <WorkspaceLibraryGroup
            title="赠送书单"
          >
            {starterBooks.map((book) => {
              const isCurrentStarter = currentStarterBookId === book.id;

              return (
                <WorkspaceBookItem
                  key={book.id}
                  title={book.title}
                  subtitle={book.author}
                  coverUrl={book.coverImage}
                  tone={isCurrentStarter ? "current" : "gifted"}
                  onClick={() => openStarterBook(book.id)}
                />
              );
            })}
          </WorkspaceLibraryGroup>
        )}

        {bookTitle && isAnalyzing && (
          <WorkspaceLibraryGroup
            title="正在拆解"
          >
            <WorkspaceBookItem
              title={bookTitle}
              subtitle={currentBookAuthor || "当前书籍"}
              badge={inProgressLabel}
              coverUrl={currentBookCover}
              tone="current"
              onClick={() => {
                immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </WorkspaceLibraryGroup>
        )}

        {visibleHistoryRecords.length > 0 && (
          <div ref={historyPanelRef}>
            <WorkspaceLibraryGroup
              title="上传历史"
            >
              {visibleHistoryRecords.map((record) => (
                <WorkspaceBookItem
                  key={`history-${record.id}`}
                  title={record.title}
                  subtitle={record.author || `${record.fileType.toUpperCase()} · ${record.mode === "lite" ? "简化版" : "完整版"}`}
                  coverUrl={record.coverImage || (record.starterBookId ? starterBooksById[record.starterBookId]?.coverImage : "")}
                  tone={record.title === bookTitle ? "current" : record.isStarterBook ? "gifted" : "default"}
                  variant="flat"
                  onClick={() => openHistoryRecord(record)}
                  onDelete={() => deleteHistoryRecord(record.id)}
                />
              ))}
            </WorkspaceLibraryGroup>
          </div>
        )}
      </div>
    </WorkspaceLibrarySidebar>
  );

  const readerPane = (
    <WorkspaceReaderPane
      topBar={(
        <WorkspaceTopBar
          tabs={topBarTabs}
          activeTabId={displayedActiveTabId}
          onActivateTab={activateWorkspaceTab}
          onCloseTab={closeWorkspaceTab}
          onCloseAllTabs={closeAllWorkspaceTabs}
          isLibraryCollapsed={isLibraryCollapsed}
          onExpandLibrary={openLibraryPanel}
          onPreviewLibrary={previewLibraryPanel}
          onLibraryTriggerLeave={allowLibraryPreview}
          isGrowthCollapsed={isGrowthPanelCollapsed}
          onExpandGrowth={openGrowthInspector}
          onPreviewGrowth={previewGrowthInspector}
          onGrowthTriggerLeave={allowGrowthPreview}
          hasGrowthUpdate={hasGrowthUpdateBadge}
        />
      )}
      scrollContainerRef={readerScrollContainerRef}
    >
      {message && !(bgAnalysisStatus.active && bgAnalysisTitleRef.current !== bookTitle) && (() => {
        const isError =
          analysisErrorCode !== null ||
          message.includes("仅支持") ||
          message.includes("请先选择");
        const isSuccess = message === "分析完成" && !isAnalyzing;
        const isAzw3Unsupported = analysisErrorCode === "AZW3_UNSUPPORTED";
        const failureStageMessage =
          uploadFailureStage === "upload"
            ? "文件还没有完整上传。可以直接重试这本书，不需要重新选择文件。"
            : uploadFailureStage === "analyze"
            ? "文件已上传，但解析服务返回异常。可以先重试一次。"
            : uploadFailureStage === "parse"
            ? "文件已上传，但这本书暂时没有解析成功。"
            : uploadFailureStage === "request"
            ? "上传或解析请求中断。网络恢复后可以直接重试。"
            : "请检查文件后重试。";
        const totalAnalysisSteps = visibleAnalysisSteps.length || 6;
        const activeAnalysisStep =
          visibleAnalysisSteps.find((step) => step.loading) ||
          (isLoadingOriginalReadingValue
            ? { key: "originalReadingValue", label: "原书阅读价值", loading: true, done: false }
            : undefined);
        const analysisProgressPercent = Math.min(
          100,
          Math.max(isAnalyzing ? 8 : 0, Math.round((completedAnalysisSteps / totalAnalysisSteps) * 100))
        );

        const bannerClass = isError
          ? "border-red-200/70 bg-red-50/80 text-red-600"
          : isSuccess
          ? "bg-[var(--workspace-hover-surface)] border-[rgba(24,29,38,0.12)] text-[var(--ink)]"
          : isAnalyzing
          ? "bg-[var(--surface-low)] border-[var(--ghost-border)] text-[var(--ink-soft)]"
          : "bg-[var(--surface-low)] border-[var(--ghost-border)] text-[var(--ink-faint)]";

        if (isAnalyzing) {
          return (
            <div className="analysis-progress-banner relative m-4 overflow-hidden rounded-[14px] border border-[rgba(10,46,14,0.22)] bg-[#eef7f1] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_30px_rgba(10,46,14,0.10)] transition-all duration-300 md:m-5 md:px-5">
              <div className="analysis-progress-sheen pointer-events-none absolute inset-0" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(10,46,14,0.36),transparent)]" />

              <div className="relative flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="analysis-progress-orb relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-[rgba(10,46,14,0.22)] bg-[#fbfcfd] text-[var(--accent)]">
                      <span className="absolute h-3.5 w-3.5 rounded-full bg-[rgba(10,46,14,0.16)]" />
                      <span className="relative h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_16px_rgba(10,46,14,0.55)]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[var(--ink)] md:text-[15px]">
                        {message}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--ink-soft)]">
                        {bookTitle ? `《${bookTitle}》` : "新书"} · {activeAnalysisStep ? activeAnalysisStep.label : "正在建立章节结构"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] tabular-nums">
                      {completedAnalysisSteps}/{totalAnalysisSteps}
                    </span>
                    <span className="hidden text-[11px] font-medium text-[var(--ink-faint)] tabular-nums sm:inline">
                      {analysisProgressPercent}%
                    </span>
                  </div>
                </div>

                <div className="relative h-2.5 overflow-hidden rounded-full bg-[rgba(10,46,14,0.10)]">
                  <div
                    className="analysis-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#0a2e0e_0%,#2f8f58_58%,#8bd6aa_100%)] shadow-[0_0_18px_rgba(47,143,88,0.42)] transition-[width] duration-500 ease-out"
                    style={{ width: `${analysisProgressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {visibleAnalysisSteps.map((step) => (
                    <span
                      key={step.key}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        step.done
                          ? "bg-[var(--accent)]"
                          : step.loading
                          ? "analysis-step-active bg-[#74c991]"
                          : "bg-[rgba(10,46,14,0.12)]"
                      }`}
                      title={step.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        }

        if (isSuccess) {
          if (viewMode !== "overview") return null;

          return (
            <div className="analysis-complete-cue mx-4 mt-3 mb-0 flex items-center gap-3 border-b border-[rgba(24,29,38,0.08)] px-1 pb-3 text-sm md:mx-5 md:px-0">
              <div className="flex min-w-0 items-center gap-3">
                <span className="analysis-complete-check flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[#fbfcfd] shadow-[0_8px_18px_rgba(10,46,14,0.16)]">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7.3 5.8 10 11 4" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--ink)] md:text-[15px]">
                    解析完成
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--ink-soft)]">
                    精华总览已生成，从下方卡片开始阅读
                  </p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className={`m-4 rounded-[10px] border px-4 py-3 text-sm transition-all duration-300 md:m-5 md:px-5 ${bannerClass}`}>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-2.5">
                {isAnalyzing && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-gray-400 animate-status-pulse" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ink-soft)]" />
                  </span>
                )}
                {isSuccess && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd]">
                    <svg className="h-2.5 w-2.5 text-[var(--accent)]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6.5L5 9l4.5-6" />
                    </svg>
                  </span>
                )}
                {isError && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-red-200 bg-red-50">
                    <svg className="h-2.5 w-2.5 text-red-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="6" cy="6" r="4.5" />
                      <path d="M6 4v2.5" />
                      <circle cx="6" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                )}
                <span className="font-medium">{message}</span>
              </span>
            </div>

            {isError && (
              <div className="mt-3 border-t border-red-200/70 pt-3 text-[13px] leading-6 text-red-500/90">
                <p>
                  {isAzw3Unsupported
                    ? "这不代表我们已经确认它带有版权保护，也可能只是当前 AZW3 结构暂不兼容。"
                    : failureStageMessage}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={failedUploadFile ? handleRetryFailedUpload : handleOpenUploadPicker}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100/60"
                  >
                    {failedUploadFile && <RefreshIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {failedUploadFile ? "重试这本书" : "重新选择文件"}
                  </button>
                  {failedUploadFile && (
                    <button
                      type="button"
                      onClick={handleOpenUploadPicker}
                      className="rounded-[9px] border border-red-200/70 bg-transparent px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50/70"
                    >
                      重新选择文件
                    </button>
                  )}
                  <span className="text-xs text-red-500/75">
                    {isAzw3Unsupported
                      ? "建议优先换成 EPUB，或尝试 TXT / PDF"
                      : failedUploadFile
                      ? failedUploadFile.name
                      : "EPUB / TXT / PDF 通常更稳定"}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {!bookTitle && isAnalyzing && analysisIntroCover ? (
        <div className="flex min-h-[560px] items-center justify-center px-6 py-8">
          <BookDisassemblyStage
            key={`${analysisIntroTitle || "new-book"}:${analysisIntroCover}`}
            title={analysisIntroTitle || (bgAnalysisStatus.active ? bgAnalysisStatus.title : "新书")}
            coverImage={analysisIntroCover}
          />
        </div>
      ) : !bookTitle && isAnalyzing ? (
        <AnalysisIntroPendingStage
          title={analysisIntroTitle || (bgAnalysisStatus.active ? bgAnalysisStatus.title : "新书")}
          status={message || (bgAnalysisStatus.active ? bgAnalysisStatus.step : "") || "正在读取文件..."}
          progressPercent={uploadProgressPercent}
          waitNotice={analysisWaitNotice}
        />
      ) : !bookTitle ? (
        <div className="flex min-h-[680px] flex-col items-center justify-center px-8 py-14">
          <div className="max-w-2xl text-center">
            <p className="archive-kicker">Workspace</p>
            <h2 className="font-editorial mt-4 text-[2.4rem] font-semibold tracking-[-0.05em] text-[var(--ink)] md:text-[3.2rem]">
              选择一本书开始阅读
            </h2>
          </div>

          {workspaceMemoryCards.length > 0 && (
            <div className="mt-14 grid w-full max-w-5xl grid-cols-1 gap-5 xl:grid-cols-2">
              {workspaceMemoryCards.map((card, index) => (
                <div
                  key={card.id}
                  className="rounded-[12px] border border-[#dfe4e8] bg-[#fbfcfd] p-5 shadow-[0_1px_2px_rgba(24,29,38,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] text-[var(--accent)]">
                        {index === 0 ? (
                          <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4.5 5.5h11" />
                            <path d="M4.5 10h8.5" />
                            <path d="M4.5 14.5h6.5" />
                          </svg>
                        ) : (
                          <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10 3.8a4 4 0 0 1 4 4c0 1.3-.6 2.4-1.5 3.2L10 13.2 7.5 11C6.6 10.2 6 9.1 6 7.8a4 4 0 0 1 4-4Z" />
                            <path d="M10 13.2v3" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--accent)]">
                          {index === 0 ? "书中金句" : "阅读回响"}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--ink-faint)]">
                          《{card.title}》{card.author ? ` · ${card.author}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHomeQuoteShareSelection({
                          bookTitle: card.title,
                          author: card.author,
                          text: card.quote,
                          cardLabel: index === 0 ? "书中金句" : "阅读回响",
                        });
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-transparent text-[var(--ink-soft)] transition-colors hover:bg-[var(--workspace-hover-surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                      aria-label={`生成《${card.title}》的书摘图`}
                    >
                      <ExternalLinkIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 bg-[#fbfcfd] px-3 py-4">
                    <div className="border-t border-[#dfe4e8] pt-4">
                      <p className="text-[17px] italic leading-8 text-[var(--ink)]">
                        {card.quote}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div ref={immersiveContainerRef} style={{ scrollMarginTop: "24px" }}>
          {viewMode === "overview" && !isDecisionPanelOpen && (
            <WorkspaceReaderHeader
              title={bookTitle}
              subtitle={currentBookAuthor}
              density="hero"
              action={(
                <div className="max-w-[38rem]">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-medium text-[var(--ink-faint)]">阅读状态</span>
                    {[
                      { id: "reading" as const, label: "在读" },
                      { id: "completed" as const, label: hasReadingReflection ? "查看记录" : "已读原书" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          updateReadingCompletionStatus(item.id);
                          if (item.id === "completed" && hasReadingReflection) {
                            setIsReadingReflectionInvite(false);
                            setIsReadingReflectionOpen(true);
                          }
                        }}
                        className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[12px] font-medium transition-all hover:border-[#9297a0] active:scale-[0.98] ${
                          readingCompletionStatus === item.id
                            ? "border-[#181d26] bg-[#181d26] text-[#fbfcfd]"
                            : "border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {analysisCoverageMeta && (
                    <div className="relative mb-5 inline-flex w-max max-w-none items-center overflow-visible rounded-lg border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] text-sm font-medium text-[var(--ink-soft)] shadow-sm shadow-black/5">
                      <button
                        type="button"
                        onClick={() => setIsCoverageDetailOpen((open) => !open)}
                        className={`inline-flex h-9 items-center justify-center whitespace-nowrap bg-[var(--workspace-hover-surface)] px-4 py-2 text-sm font-medium text-[var(--ink)] outline-offset-2 transition-colors hover:bg-[#e6ebee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9297a0] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 ${
                          isCoverageDetailOpen ? "rounded-l-lg border-r border-[rgba(24,29,38,0.08)]" : "rounded-lg"
                        }`}
                        aria-expanded={isCoverageDetailOpen}
                        aria-controls="analysis-coverage-detail"
                        aria-label={isCoverageDetailOpen ? "收起拆书覆盖范围状态" : "展开拆书覆盖范围状态"}
                      >
                        <span>{analysisModeLabel}</span>
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] text-[var(--ink-faint)]">
                          <svg
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${isCoverageDetailOpen ? "rotate-180" : ""}`}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M6 3.5 10.5 8 6 12.5" />
                          </svg>
                        </span>
                      </button>
                      {isCoverageDetailOpen && (
                        <div
                          id="analysis-coverage-detail"
                          className="min-w-0 animate-in fade-in duration-150"
                        >
                          <div className="flex min-h-9 w-max items-center gap-x-2 rounded-r-lg bg-[#fbfcfd] px-3 py-2 text-sm">
                            <span>
                              <strong className="font-semibold text-[var(--ink)]">{analysisCoverageMeta.totalChapters}</strong>
                              {" "}段全书结构
                            </span>
                            <span className="text-[var(--ink-faint)]">→</span>
                            <span>
                              <strong className="font-semibold text-[var(--ink)]">{analysisCoverageMeta.sampledChapters}</strong>
                              {" "}段代表章节
                            </span>
                            <span className="text-[var(--ink-faint)]">→</span>
                            <span>
                              <strong className="font-semibold text-[var(--ink)]">{analysisCoverageMeta.totalSamples}</strong>
                              {" "}个分析片段
                            </span>
                            <span className="rounded-full bg-[rgba(16,78,31,0.08)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                              {analysisCoverageMeta.spreadLabel}
                            </span>
                            <span className="group/coverageHelp relative inline-flex">
                              <button
                                type="button"
                                tabIndex={isCoverageDetailOpen ? 0 : -1}
                                className="flex h-5 w-5 items-center justify-center rounded-full border border-[#cfd6dc] bg-[#fbfcfd] text-[var(--ink-faint)] transition-all hover:border-[#9297a0] hover:bg-[var(--workspace-hover-surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                                aria-label="查看分析范围说明"
                              >
                                <HelpIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 hidden w-[320px] rounded-[10px] border border-[#cfd6dc] bg-[#fbfcfd] px-3.5 py-3 text-[11px] font-medium leading-5 text-[var(--ink-soft)] shadow-[0_12px_28px_rgba(24,29,38,0.14)] group-hover/coverageHelp:block group-focus-within/coverageHelp:block">
                                {analysisModeLabel}说明这次生成的分析深度，不等于逐字抽取整本书。系统会先建立全书结构，再抽取开头、中段、结尾的代表章节和片段进入精读分析，避免上下文过长和重复内容稀释判断。
                              </span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[14px] font-semibold leading-6 text-[var(--ink)]">
                    <span>原书阅读建议</span>
                    <span className="mx-2 text-[var(--ink-faint)]">·</span>
                    <span className="group/help relative inline-flex items-start gap-1.5 pr-4">
                      <span>
                        {originalReadingAdviceLevelIndex >= 0
                          ? ORIGINAL_READING_LEVELS[originalReadingAdviceLevelIndex].label
                          : isLoadingOriginalReadingValue
                          ? "判断中"
                          : "等待生成"}
                      </span>
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#cfd6dc] bg-[#fbfcfd] text-[10px] font-semibold leading-none text-[var(--ink-faint)] transition-all hover:border-[#9297a0] hover:bg-[var(--workspace-hover-surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                        aria-label="查看原书阅读建议档位说明"
                      >
                        <HelpIcon className="h-3 w-3" aria-hidden="true" />
                      </button>
                    <span className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-30 hidden w-[360px] rounded-[10px] border border-[#cfd6dc] bg-[#fbfcfd] px-3.5 py-3 text-[11px] font-medium leading-5 whitespace-pre-line text-[var(--ink-soft)] shadow-[0_12px_28px_rgba(24,29,38,0.14)] group-hover/help:block group-focus-within/help:block">
                        {ORIGINAL_READING_LEVEL_HELP}
                      </span>
                    </span>
                  </p>
                  {isOriginalReadingAdviceExpanded && (originalReadingAdviceMarkdown || originalReadingAdviceSummary) ? (
                    <div className="mt-2 flex items-start gap-2">
                      <div className="min-w-0 flex-1 rounded-[9px] bg-[var(--workspace-hover-surface)] px-3.5 py-3 text-[12px] leading-6 text-[var(--ink-soft)]">
                        {originalReadingAdviceMarkdown ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-[var(--ink)]">{children}</strong>,
                              ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
                            }}
                          >
                            {originalReadingAdviceMarkdown}
                          </ReactMarkdown>
                        ) : (
                          <p>{originalReadingAdviceSummary}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOriginalReadingAdviceExpanded(false)}
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[var(--ink-faint)] transition-all hover:bg-[var(--workspace-hover-surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                        aria-label="收起原书阅读建议详情"
                        aria-expanded={isOriginalReadingAdviceExpanded}
                      >
                        <svg
                          className="h-4 w-4 rotate-180 transition-transform"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-[13px] leading-6 text-[var(--ink-soft)] line-clamp-2">
                        {isLoadingOriginalReadingValue
                          ? "正在根据书的类型、内容密度和原书增量判断是否值得继续读原书"
                          : originalReadingAdviceSummary || "等待生成阅读建议"}
                      </p>
                      {!isLoadingOriginalReadingValue && originalReadingAdviceSummary && (
                        <button
                          type="button"
                          onClick={() => setIsOriginalReadingAdviceExpanded(true)}
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[var(--ink-faint)] transition-all hover:bg-[var(--workspace-hover-surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                          aria-label="展开原书阅读建议详情"
                          aria-expanded={isOriginalReadingAdviceExpanded}
                        >
                          <svg
                            className="h-4 w-4 transition-transform"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-3">
                    <div
                      className="grid grid-cols-5 gap-1.5"
                      aria-label={`原书阅读建议：${
                        originalReadingAdviceLevelIndex >= 0
                          ? ORIGINAL_READING_LEVELS[originalReadingAdviceLevelIndex].label
                          : isLoadingOriginalReadingValue
                          ? "判断中"
                          : "等待生成"
                      }`}
                    >
                      {ORIGINAL_READING_LEVELS.map((level, index) => {
                        const isActive = originalReadingAdviceLevelIndex === index;
                        return (
                          <div key={level.label} className="min-w-0">
                            <div
                              className={`h-1.5 rounded-full transition-colors ${
                                isActive ? "bg-[var(--accent)]" : "bg-[rgba(119,124,123,0.16)]"
                              }`}
                            />
                            <p
                              className={`mt-1.5 truncate text-center text-[10px] font-medium ${
                                isActive ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"
                              }`}
                            >
                              {level.hint}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
              cover={(
                <div className="w-full">
                  <div className="flex h-[196px] w-full overflow-hidden rounded-[8px]">
                    {currentBookCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentBookCover}
                        alt={bookTitle}
                        className="h-full w-full object-contain drop-shadow-[0_1px_2px_rgba(24,29,38,0.16)]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col justify-between rounded-[8px] border border-[rgba(24,29,38,0.1)] bg-[#f8fafc] p-4">
                        <div className="archive-kicker">Book</div>
                        <div className="line-clamp-4 font-editorial text-lg font-semibold leading-tight text-[var(--ink)]">
                          {bookTitle}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                          {currentFileTypeLabel || "BOOK"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          )}

          <div ref={cardSectionRef} className="px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-3 xl:px-5 xl:pb-5 xl:pt-3" style={{ scrollMarginTop: "24px" }}>
            {viewMode === "overview" && overviewCardList.length > 0 && (
              <div
                className="mx-auto mb-5 flex max-w-6xl justify-end px-1"
                role="tablist"
                aria-label="书籍内容模式"
              >
                <div className="inline-flex rounded-full border border-[rgba(24,29,38,0.08)] bg-[rgba(248,250,252,0.72)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
                  {[
                    { id: "cards" as const, label: "拆书精华", count: 6 },
                    { id: "practice" as const, label: leapPracticeTabLabel, count: leapProgress >= 3 ? "3/3" : 3 },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={workspaceContentMode === item.id}
                      aria-controls={item.id === "practice" ? "leap-practice-panel" : "analysis-card-grid"}
                      onClick={() => {
                        if (item.id === "practice") {
                          handleOpenDecisionTraining();
                        } else {
                          setIsDecisionPanelOpen(false);
                        }
                      }}
                      disabled={item.id === "practice" && isTrainingActionDisabled}
                      className={`inline-flex h-8 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                        workspaceContentMode === item.id
                          ? "bg-[#181d26] text-[#fbfcfd] shadow-[0_4px_12px_rgba(24,29,38,0.12)]"
                          : "text-[var(--ink-soft)] hover:bg-white/70 hover:text-[var(--ink)]"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={workspaceContentMode === item.id ? "text-[#dfe4e8]" : "text-[var(--ink-faint)]"}>{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isDecisionPanelOpen && leapPracticeRound && (
              <div id="leap-practice-panel" role="tabpanel" className="workspace-mode-panel">
                <LeapPracticePanel
                  bookTitle={currentBookDisplayTitle}
                  round={leapPracticeRound}
                  error={decisionError}
                  onGenerateGate={handleGenerateLeapGate}
                  onAnswerComplete={handleCompleteLeapGate}
                  onComplete={handleCompleteLeapRound}
                  onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                  onLifeCapitalChange={handleLeapLifeCapitalChange}
                  onOpenSourceCard={openDecisionSourceCard}
                  onStartNewRound={handleStartNewLeapRound}
                  restoreState={leapPracticeReturnState}
                  onRestoreConsumed={() => setLeapPracticeReturnState(null)}
                />
              </div>
            )}

            {!isDecisionPanelOpen && viewMode === "overview" && overviewCardList.length > 0 && (
              <section id="analysis-card-grid" className="workspace-mode-panel mx-auto max-w-6xl" role="tabpanel">
                {leapPracticeReturnState && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[rgba(41,117,74,0.16)] bg-[rgba(241,249,244,0.74)] px-4 py-3">
                    <p className="text-[13px] font-medium text-[rgba(41,117,74,0.96)]">
                      正在查看本题对应的原书方法
                      <span className="ml-2 text-[var(--ink-faint)]">
                        第 {leapPracticeReturnState.gateIndex + 1} 关 · {leapPracticeReturnState.view === "feedback" ? "反馈页" : "题目页"}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsDecisionPanelOpen(true)}
                      className="inline-flex h-9 items-center justify-center rounded-[9px] bg-[#181d26] px-3.5 text-[12px] font-medium text-[#fbfcfd] transition-all hover:bg-[#0d1218] active:scale-[0.98]"
                    >
                      回到第 {leapPracticeReturnState.gateIndex + 1} 关
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {overviewCardList.map((card) => {
                    const isReady = !card.isLoading && !!card.content.trim();
                    const isPending = !card.isLoading && !isReady;
                    const excerpt = createOverviewExcerpt(card.content);
                    const cardStateClass = isReady
                      ? "analysis-overview-card-ready cursor-pointer border-[#dfe4e8] bg-[#fbfcfd] hover:border-[#9297a0] hover:bg-[var(--workspace-hover-surface)] active:scale-[0.99]"
                      : card.isLoading
                      ? "analysis-overview-card-active border-[rgba(10,46,14,0.28)] bg-[#eef7f1] shadow-[0_10px_26px_rgba(10,46,14,0.10)]"
                      : "analysis-overview-card-pending cursor-default border-[rgba(24,29,38,0.06)] bg-[#f8fafc]";

                    return (
                      <article
                        key={card.key}
                        role={isReady ? "button" : undefined}
                        tabIndex={isReady ? 0 : undefined}
                        onClick={isReady ? () => openOverviewCard(card.key) : undefined}
                        onKeyDown={
                          isReady
                            ? (event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                openOverviewCard(card.key);
                              }
                            : undefined
                        }
                        className={`group relative flex min-h-[182px] flex-col overflow-hidden rounded-[12px] border p-4 text-left transition-all ${cardStateClass}`}
                      >
                        {card.isLoading && (
                          <span className="analysis-card-sheen pointer-events-none absolute inset-0" />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-semibold text-[var(--ink-faint)] tabular-nums">
                                {card.orderLabel}
                              </p>
                              <span className="h-1 w-1 rounded-full bg-[rgba(24,29,38,0.18)]" />
                              <h3 className="text-[15px] font-semibold text-[var(--ink)]">
                                {card.label}
                              </h3>
                            </div>
                          </div>
                          {card.isLoading && (
                            <span className="rounded-full border border-[rgba(10,46,14,0.14)] bg-[rgba(168,216,196,0.24)] px-2 py-1 text-[10px] font-medium text-[var(--accent)]">
                              生成中
                            </span>
                          )}
                        </div>

                        {card.isLoading ? (
                          <div className="mt-4 space-y-2.5">
                            <div className="analysis-card-line h-2 w-3/4 rounded-full bg-[rgba(10,46,14,0.14)]" />
                            <div className="analysis-card-line h-2 w-full rounded-full bg-[rgba(10,46,14,0.12)]" />
                            <div className="analysis-card-line h-2 w-5/6 rounded-full bg-[rgba(10,46,14,0.10)]" />
                            <p className="pt-1 text-[11px] font-medium text-[var(--accent)]">
                              {card.loadingText}
                            </p>
                          </div>
                        ) : isPending ? (
                          <div className="mt-4 space-y-2.5">
                            <div className="h-2 w-2/3 rounded-full bg-[rgba(119,124,123,0.10)]" />
                            <div className="h-2 w-full rounded-full bg-[rgba(119,124,123,0.08)]" />
                            <div className="h-2 w-4/5 rounded-full bg-[rgba(119,124,123,0.08)]" />
                            <p className="pt-1 text-[11px] text-[var(--ink-faint)]">
                              等待生成
                            </p>
                          </div>
                        ) : (
                          <p className="mt-4 line-clamp-4 text-[13px] leading-6 text-[var(--ink-soft)]">
                            {excerpt || "这个模块暂时还没有内容。"}
                          </p>
                        )}

                        {isReady && (
                          <div className="mt-auto flex items-center gap-2 pt-4">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openOverviewCard(card.key);
                              }}
                              className="rounded-[8px] px-2 py-1 text-[11px] font-medium text-[var(--ink-faint)] transition-colors hover:bg-[#eef2f4] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                            >
                              深度阅读
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

              </section>
            )}

            {!isDecisionPanelOpen && viewMode === "evidence" && selectedEvidenceCard && (
              <section
                className={`mx-auto max-w-6xl pb-24 ${
                  evidenceTransitionState === "leaving"
                    ? "animate-evidence-view-exit"
                    : "animate-evidence-view-enter"
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={returnFromEvidence}
                    className="rounded-[9px] border border-[rgba(24,29,38,0.08)] bg-transparent px-3 py-1.5 text-[11px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f8fafc] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                  >
                    ← 返回卡片
                  </button>
                  <div className="flex items-center gap-2 rounded-[9px] border border-[rgba(24,29,38,0.08)] bg-[#f8fafc] px-3.5 py-1.5">
                    <span className="text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                      {selectedEvidenceCardIndex >= 0 ? selectedEvidenceCardIndex + 1 : safeImmersiveIndex + 1}
                    </span>
                    <span className="text-[11px] text-[var(--ink-faint)]/45">/</span>
                    <span className="text-[11px] text-[var(--ink-faint)] tabular-nums">
                      {immersiveCardList.length || overviewCardList.length}
                    </span>
                    <span className="ml-0.5 text-[11px] text-[var(--ink-faint)]">
                      {selectedEvidenceCard.label}
                    </span>
                  </div>
                  <div className="rounded-[9px] border border-[rgba(16,78,31,0.10)] bg-[rgba(16,78,31,0.06)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)]">
                    依据 {selectedCardEvidence?.claims.length ?? 0} 条
                  </div>
                </div>

                {selectedCardEvidence && selectedCardEvidence.claims.length > 0 && selectedEvidenceClaim ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.88fr)_minmax(0,1.6fr)]">
                    <aside className="rounded-[12px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] p-4 shadow-[0_8px_22px_rgba(24,29,38,0.05)]">
                      <p className="archive-kicker">卡片判断</p>
                      <h2 className="mt-2 text-[20px] font-semibold leading-7 text-[var(--ink)]">
                        {selectedEvidenceCard.label}
                      </h2>
                      <p className="mt-3 line-clamp-4 text-[13px] leading-6 text-[var(--ink-soft)]">
                        {createOverviewExcerpt(selectedEvidenceCard.content) || "这张卡暂时没有可展示的摘要。"}
                      </p>

                      <div className="mt-5 space-y-2">
                        {selectedCardEvidence.claims.map((claim, index) => {
                          const isActive = claim.id === selectedEvidenceClaim.id;
                          return (
                            <button
                              key={claim.id}
                              type="button"
                              onClick={() => setSelectedEvidenceClaimId(claim.id)}
                              className={`w-full rounded-[10px] border px-3 py-2.5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] ${
                                isActive
                                  ? "border-[rgba(16,78,31,0.20)] bg-[rgba(16,78,31,0.06)]"
                                  : "border-[rgba(24,29,38,0.06)] bg-[#f8fafc] hover:border-[rgba(24,29,38,0.12)] hover:bg-[var(--workspace-hover-surface)]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-[var(--ink-faint)] tabular-nums">
                                  {index + 1}
                                </span>
                                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--accent)]" : "bg-[rgba(24,29,38,0.18)]"}`} />
                                <span className="text-[12px] font-semibold text-[var(--ink)]">
                                  {claim.claim}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[11px] leading-5 text-[var(--ink-soft)]">
                                {claim.supportLevel === "direct" ? "直接原文支撑" : "综合推断依据"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </aside>

                    <div className="rounded-[12px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] p-4 shadow-[0_8px_22px_rgba(24,29,38,0.05)]">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(24,29,38,0.08)] pb-3">
                        <div>
                          <p className="archive-kicker">原文依据</p>
                          <h2 className="mt-2 text-[18px] font-semibold text-[var(--ink)]">
                            {selectedEvidenceClaim.claim}
                          </h2>
                        </div>
                        <span className="rounded-full bg-[rgba(16,78,31,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
                          {selectedEvidenceClaim.supportLevel === "direct" ? "直接支撑" : "综合推断"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedEvidenceClaim.excerpts.map((excerpt) => (
                          <article
                            key={`${selectedEvidenceClaim.id}-${excerpt.sourceId}`}
                            className="rounded-[11px] border border-[rgba(24,29,38,0.08)] bg-[#f8fafc] p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[var(--ink-faint)]">
                              <span className="font-semibold text-[var(--ink)]">{excerpt.sourceId}</span>
                              <span>·</span>
                              <span>第 {excerpt.chapterIndex} 部分</span>
                              <span>·</span>
                              <span>{SAMPLE_POSITION_LABELS[excerpt.samplePosition]}</span>
                            </div>
                            <p className="mt-1 text-[12px] font-medium text-[var(--ink-soft)]">
                              {excerpt.chapterTitle}
                            </p>
                            <p className="mt-4 border-l-2 border-[var(--accent)] bg-[#fbfcfd] px-3 py-2 text-[13px] leading-7 text-[var(--ink-soft)]">
                              {excerpt.before && <span>{excerpt.before}</span>}
                              <mark className="rounded-[5px] bg-[rgba(16,78,31,0.10)] px-1 py-0.5 font-semibold text-[var(--ink)]">
                                {excerpt.quote}
                              </mark>
                              {excerpt.after && <span>{excerpt.after}</span>}
                            </p>
                            <p className="mt-4 rounded-[9px] bg-[rgba(16,78,31,0.06)] px-3 py-2 text-[12px] leading-5 text-[var(--ink-soft)]">
                              {selectedEvidenceClaim.explanation}
                            </p>
                            {currentStarterBookId && (
                              <p className="mt-3 text-right text-[10px] leading-4 text-[var(--ink-faint)]">
                                内容来自网络
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] p-6 text-center shadow-[0_8px_22px_rgba(24,29,38,0.05)]">
                    <p className="text-[15px] font-semibold text-[var(--ink)]">
                      这本书暂时没有保存原文依据
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[var(--ink-soft)]">
                      旧历史记录或部分赠送书单可能还没有保存依据片段。重新生成分析后，可以查看每张卡片对应的原文片段。
                    </p>
                  </div>
                )}
              </section>
            )}

            {!isDecisionPanelOpen &&
              viewMode === "immersive" &&
              immersiveCardList.length > 0 &&
              currentImmersiveCard && (
                <div
                  className="mx-auto max-w-[52rem] pb-28 md:pb-24"
                  onTouchStart={handleImmersiveTouchStart}
                  onTouchEnd={handleImmersiveTouchEnd}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("overview");
                        setSlideDir(null);
                        immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="rounded-[9px] border border-[rgba(24,29,38,0.08)] bg-transparent px-3 py-1.5 text-[11px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f8fafc] hover:text-[var(--ink)]"
                    >
                      ← 精华总览
                    </button>
                    <div className="flex items-center gap-2 rounded-[9px] border border-[rgba(24,29,38,0.08)] bg-[#f8fafc] px-3.5 py-1.5">
                      <span className="text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                        {safeImmersiveIndex + 1}
                      </span>
                      <span className="text-[11px] text-[var(--ink-faint)]/45">/</span>
                      <span className="text-[11px] text-[var(--ink-faint)] tabular-nums">
                        {immersiveCardList.length}
                      </span>
                      <span className="ml-0.5 text-[11px] text-[var(--ink-faint)]">
                        {currentImmersiveCard.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEvidenceCard(currentImmersiveCard.key)}
                      disabled={currentImmersiveCard.isLoading}
                      className="rounded-[9px] border border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] px-3 py-1.5 text-[11px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f8fafc] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                    >
                      原文依据
                    </button>
                  </div>

                  {activeSearchMatchCount > 0 && currentImmersiveCard.key === activeSearchHighlightCardKey && (
                    <div className="mb-4 flex items-center justify-between rounded-[10px] border border-[rgba(10,46,14,0.16)] bg-[rgba(186,221,200,0.24)] px-3 py-2">
                      <p className="text-[11px] font-medium text-[var(--accent)]">
                        搜索命中 {activeSearchMatchIndex + 1} / {activeSearchMatchCount}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveSearchMatchIndex((index) => Math.max(0, index - 1))}
                          disabled={activeSearchMatchIndex === 0}
                          className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-[var(--ink-soft)] hover:bg-[#fbfcfd] disabled:opacity-35"
                        >
                          上一个
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSearchMatchIndex((index) => Math.min(activeSearchMatchCount - 1, index + 1))}
                          disabled={activeSearchMatchIndex >= activeSearchMatchCount - 1}
                          className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-[var(--ink-soft)] hover:bg-[#fbfcfd] disabled:opacity-35"
                        >
                          下一个
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    key={safeImmersiveIndex}
                    className={`px-2 py-5 md:px-8 md:py-7 ${
                      slideDir === "left"
                        ? "animate-slide-from-right"
                        : slideDir === "right"
                        ? "animate-slide-from-left"
                        : "animate-reader-enter"
                    }`}
                  >
                    <div className="mx-auto mb-6 max-w-[42rem] border-b border-[rgba(24,29,38,0.08)] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[var(--ink-faint)] tabular-nums">
                          {String(safeImmersiveIndex + 1).padStart(2, "0")}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-[rgba(24,29,38,0.18)]" />
                        <p className="archive-kicker">
                          {currentImmersiveCard.label}
                        </p>
                      </div>
                    </div>

                    {currentImmersiveCard.isLoading ? (
                      <div className="space-y-3">
                        <div className="h-2 w-3/4 animate-pulse rounded-full bg-[rgba(119,124,123,0.12)]" />
                        <div className="h-2 w-full animate-pulse rounded-full bg-[rgba(119,124,123,0.12)]" />
                        <div className="h-2 w-5/6 animate-pulse rounded-full bg-[rgba(119,124,123,0.12)]" />
                        <div className="h-2 w-2/3 animate-pulse rounded-full bg-[rgba(119,124,123,0.12)]" />
                        <p className="pt-1 text-xs text-[var(--ink-faint)]">
                          {currentImmersiveCard.loadingText}
                        </p>
                      </div>
                    ) : (
                      <div
                        ref={immersiveContentRef}
                        onMouseUp={handleReaderTextSelection}
                        onKeyUp={handleReaderTextSelection}
                        onPointerMove={handleHighlightPointerMove}
                        className="md-prose workspace-prose mx-auto max-w-[42rem]"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {currentImmersiveCard.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {pendingQuoteSelection && (
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={handleCreateQuoteShareFromSelection}
                      className="fixed z-50 rounded-[10px] border border-[rgba(24,29,38,0.12)] bg-[#181d26] px-3 py-2 text-xs font-medium text-[#fbfcfd] shadow-[0_10px_24px_rgba(24,29,38,0.22)] transition hover:bg-[#0d1218] active:scale-[0.98]"
                      style={{
                        left: pendingQuoteSelection.x,
                        top: pendingQuoteSelection.y,
                      }}
                    >
                      生成书摘图
                    </button>
                  )}

                  {!pendingQuoteSelection && highlightActionBubble && activeBubbleHighlight && (
                    <div
                      data-highlight-action-bubble="true"
                      className="fixed z-50 flex items-center gap-1.5 rounded-[10px] border border-[rgba(24,29,38,0.10)] bg-[#fbfcfd] p-1 shadow-[0_10px_24px_rgba(24,29,38,0.16)]"
                      style={{
                        left: highlightActionBubble.x,
                        top: highlightActionBubble.y,
                      }}
                      onPointerLeave={() => setHighlightActionBubble(null)}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenQuoteShareFromHighlight(activeBubbleHighlight);
                          setHighlightActionBubble(null);
                        }}
                        className="rounded-[8px] bg-[#181d26] px-2.5 py-1.5 text-[11px] font-medium text-[#fbfcfd] transition hover:bg-[#0d1218]"
                      >
                        生成书摘图
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(activeBubbleHighlight.id)}
                        className="rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink-faint)] transition hover:bg-[#f1f3f5] hover:text-[var(--ink)]"
                      >
                        删除
                      </button>
                    </div>
                  )}

                  <div
                    className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] md:bottom-6 xl:left-[calc(var(--workspace-dock-shell-edge)+48px+0.625rem+var(--workspace-reader-inset-left))] xl:right-[calc(var(--workspace-dock-shell-edge)+var(--workspace-reader-inset-right))] xl:px-0"
                    style={{
                      "--workspace-dock-shell-edge": "max(1.25rem, calc((100vw - 1760px) / 2 + 1.25rem))",
                    } as CSSProperties}
                  >
                    <nav
                      role="navigation"
                      aria-label="精华卡片翻页"
                      className="pointer-events-auto mx-auto flex w-full max-w-[34rem] items-center justify-between gap-2 rounded-[16px] border border-[rgba(24,29,38,0.10)] bg-[#fbfcfd]/95 px-2.5 py-2 shadow-[0_12px_34px_rgba(24,29,38,0.14),0_1px_2px_rgba(24,29,38,0.08)] backdrop-blur-md md:px-3"
                    >
                      <button
                        type="button"
                        onClick={() => navigateImmersive("prev")}
                        className="flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-xs font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f1f3f5] hover:text-[var(--ink)] active:scale-[0.97] select-none md:px-4"
                      >
                        <span aria-hidden="true">←</span>
                        <span>上一篇</span>
                      </button>

                      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
                        {immersiveCardList.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`切换到第 ${i + 1} 张精华卡片`}
                            aria-current={i === safeImmersiveIndex ? "page" : undefined}
                            onClick={() => {
                              setSlideDir(i > safeImmersiveIndex ? "left" : "right");
                              setImmersiveIndex(i);
                              immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`h-2 rounded-full transition-all duration-200 ${
                              i === safeImmersiveIndex
                                ? "w-5 bg-[var(--ink)]"
                                : "w-2 bg-[rgba(119,124,123,0.24)] hover:bg-[rgba(119,124,123,0.45)]"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateImmersive("next")}
                        className="flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-xs font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f1f3f5] hover:text-[var(--ink)] active:scale-[0.97] select-none md:px-4"
                      >
                        <span>下一篇</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </nav>
                  </div>
                </div>
              )}

          </div>
        </div>
      )}
    </WorkspaceReaderPane>
  );

  const growthSidebar = (
    <WorkspaceGrowthSidebar
      isCollapsed={!shouldShowGrowthSidebar}
      isPreview={isGrowthPreviewOpen}
      onToggle={handleToggleGrowthInspector}
      onPreviewClose={() => setIsGrowthPreviewOpen(false)}
    >
      <GrowthLedgerPanel ledger={growthLedger} />

      <section className={`${workspaceRailPanelClass} p-4`}>
        <p className="archive-kicker">当前阅读</p>
        {bookTitle && (
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{bookTitle}</p>
        )}
        <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
          {recentGrowthLabel}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-[#f7f8f9] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">模块进度</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
              {bookTitle ? `${completedAnalysisSteps}/${visibleAnalysisSteps.length}` : "0/6"}
            </p>
          </div>
          <div className="rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-[#f7f8f9] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">训练进度</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
              {bookTitle ? `${addictionState.decision_training_progress}/3` : "0/3"}
            </p>
          </div>
        </div>
      </section>

      {isLiteMode && !isLiteUnlocked && (
        <section className="rounded-[10px] border border-[rgba(10,46,14,0.18)] bg-[var(--accent-soft)] px-4 py-4">
          <p className="text-sm leading-6 text-[var(--accent)]">
            <strong>{currentFileTypeLabel || "当前文件"} 简化分析模式</strong>
            ：当前仅提供基础摘要与阅读引导。为了获得效果更佳的深度结构化分析，建议优先上传 EPUB 或 AZW3。
          </p>
        </section>
      )}

      {decisionError && (
        <section className="rounded-[10px] border border-[rgba(10,46,14,0.18)] bg-[var(--accent-soft)] px-4 py-4">
          <p className="text-sm leading-6 text-[var(--accent)]">{decisionError}</p>
        </section>
      )}
    </WorkspaceGrowthSidebar>
  );

  const toastMessage =
    activeToast?.id.startsWith("delete-undo-") && pendingDeleteId
      ? `是否删除《${pendingDeleteTitle || "这本书"}》？\n${pendingDeleteCountdown} 秒后将永久删除`
      : activeToast?.message;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <WorkspaceShell
        toolRail={<WorkspaceToolRail actions={toolRailActions} utilityActions={utilityToolActions} bottomActions={bottomToolActions} />}
        librarySidebar={librarySidebar}
        readerPane={readerPane}
        growthSidebar={growthSidebar}
        isLibraryCollapsed={isLibraryCollapsed}
        isGrowthCollapsed={isGrowthPanelCollapsed}
      />

      {isLegacyDomainNoticeVisible && (
        <aside
          className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-[980px] flex-col gap-3 rounded-[12px] border border-[#dfe4e8] bg-[#fbfcfd] px-4 py-3 text-sm shadow-[0_12px_32px_rgba(24,29,38,0.12)] md:left-[72px] md:right-5 md:flex-row md:items-center md:justify-between md:px-4"
          aria-label="旧域名迁移提醒"
        >
          <div className="min-w-0">
            <p className="font-medium text-[var(--ink)]">书跃已启用新域名 bookleap.cn</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
              旧域名里的解析记录只保存在这里。迁移时请先导出备份，再到新域名导入。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBackupLocalData}
              className="rounded-[9px] border border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-xs font-medium text-[#fbfcfd] transition hover:bg-[#2d3138] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] active:scale-[0.98]"
            >
              导出备份
            </button>
            <a
              href={CANONICAL_WORKSPACE_URL}
              className="rounded-[9px] border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[#9297a0] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] active:scale-[0.98]"
            >
              前往新域名
            </a>
            <button
              type="button"
              onClick={() => setIsLegacyDomainNoticeVisible(false)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[var(--ink-faint)] transition hover:border-[#dfe4e8] hover:bg-[#f8fafc] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
              aria-label="关闭旧域名迁移提醒"
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      {isReadingReflectionOpen && (
        <div
          className="fixed inset-0 z-[105] flex justify-end bg-[rgba(24,29,38,0.28)] pl-5 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsReadingReflectionOpen(false);
          }}
          role="presentation"
        >
          <section
            className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[#dfe4e8] bg-[#fbfcfd] shadow-[0_18px_44px_rgba(24,29,38,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reading-reflection-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#dfe4e8] px-6 pb-4 pt-5">
              <div>
                <p id="reading-reflection-title" className="text-base font-semibold leading-6 text-[var(--ink)]">
                  {isReadingReflectionInvite ? "要写一段读后记录吗？" : "读后记录"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                  {isReadingReflectionInvite
                    ? "确认读过原书后，再留下真正属于你的思考。"
                    : `《${currentBookDisplayTitle}》`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReadingReflectionOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-faint)] transition-all hover:border-[#9297a0] hover:text-[var(--ink)] active:scale-[0.98]"
                aria-label="关闭读后记录"
              >
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {isReadingReflectionInvite && (
                <div className="rounded-[10px] border border-[rgba(41,117,74,0.16)] bg-[rgba(241,249,244,0.82)] px-4 py-3 text-[13px] leading-6 text-[var(--ink-soft)]">
                  这不是训练题的结果，也不是拆书自动生成的总结。它只记录你读完原书后，愿意带走的一个观点和一个现实问题。
                </div>
              )}
              <label className="block">
                <span className="text-[12px] font-semibold text-[var(--ink)]">最想留下的一个观点</span>
                <textarea
                  value={readingReflection.insight}
                  onChange={(event) => updateReadingReflection("insight", event.target.value)}
                  rows={4}
                  placeholder="哪句话、哪个判断让你停了一下？"
                  className="mt-2 w-full resize-none rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2.5 text-[13px] leading-6 text-[var(--ink)] outline-none transition focus:border-[#9297a0] focus:bg-[#fbfcfd]"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-semibold text-[var(--ink)]">它击中了哪个现实问题</span>
                <textarea
                  value={readingReflection.question}
                  onChange={(event) => updateReadingReflection("question", event.target.value)}
                  rows={4}
                  placeholder="工作、生活、创业里哪个问题被它照亮了？"
                  className="mt-2 w-full resize-none rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2.5 text-[13px] leading-6 text-[var(--ink)] outline-none transition focus:border-[#9297a0] focus:bg-[#fbfcfd]"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dfe4e8] px-6 py-4">
              <p className="text-[12px] leading-5 text-[var(--ink-faint)]">
                {hasReadingReflection ? "已自动保存在本地。" : "确认读过原书后，再留下这段思考。"}
              </p>
              <div className="flex items-center gap-2">
                {isReadingReflectionInvite && currentBookId && (
                  <button
                    type="button"
                    onClick={() => {
                      dismissReadingReflectionPrompt(currentBookId);
                      recordLeapPracticeEvent(currentBookId, "reading_reflection_dismissed");
                      setIsReadingReflectionInvite(false);
                      setIsReadingReflectionOpen(false);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[#9297a0] hover:text-[var(--ink)] active:scale-[0.98]"
                  >
                    以后再说
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsReadingReflectionInvite(false);
                    setIsReadingReflectionOpen(false);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#181d26] px-4 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] active:scale-[0.98]"
                >
                  {isReadingReflectionInvite ? "现在写好" : "完成"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      
      <UpgradeReadingModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        wechatId="iwbr1988"
        qrImageSrc="/contact-avatar.png"
      />

      {isDisclaimerModalOpen && (
        <WorkspaceDisclaimerModal onAccept={handleAcceptWorkspaceDisclaimer} />
      )}

      {isSupportCoffeeModalOpen && (
        <SupportCoffeeModal onClose={() => setIsSupportCoffeeModalOpen(false)} />
      )}

      {isBackupNoticeOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(24,29,38,0.34)] px-5 py-6 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBackupNoticeOpen(false);
            }
          }}
          role="presentation"
        >
          <section
            className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-[12px] border border-[#9297a0] bg-[#fbfcfd] shadow-[0_18px_44px_rgba(24,29,38,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-notice-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#dfe4e8] px-6 pb-4 pt-5">
              <div>
                <p
                  id="backup-notice-title"
                  className="text-base font-semibold leading-6 text-[var(--ink)]"
                >
                  数据备份
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                  用本地 JSON 文件迁移或恢复当前浏览器里的书跃数据。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupNoticeOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-faint)] transition hover:border-[#9297a0] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                aria-label="关闭备份说明"
              >
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm leading-7 text-[var(--ink-soft)]">
              {!backupImportPreview ? (
                <>
                  <div className="rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 py-3">
                    <p className="font-medium text-[var(--ink)]">备份文件会包含</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">
                      解析历史、训练缓存、成长记录、海报缓存和书跃基础状态。文件只在本地下载或读取，不会上传到书跃服务器。
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <section className="rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] px-4 py-4">
                      <p className="font-medium text-[var(--ink)]">导出备份</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                        下载当前浏览器里的书跃数据，适合换电脑前先保存。
                      </p>
                      <button
                        type="button"
                        onClick={handleConfirmBackupDownload}
                        className="mt-4 flex h-10 w-full items-center justify-center rounded-[10px] bg-[#181d26] px-4 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] focus:outline-none focus:ring-2 focus:ring-[#9297a0] focus:ring-offset-2 focus:ring-offset-[#fbfcfd] active:scale-[0.99]"
                      >
                        导出备份
                      </button>
                    </section>

                    <section className="rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] px-4 py-4">
                      <p className="font-medium text-[var(--ink)]">导入恢复</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                        选择之前导出的备份文件，将数据合并到当前浏览器。
                      </p>
                      <input
                        ref={backupImportInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) => void handleBackupFileChange(event)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={handleChooseBackupFile}
                        className="mt-4 flex h-10 w-full items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[#9297a0] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#9297a0] focus:ring-offset-2 focus:ring-offset-[#fbfcfd] active:scale-[0.99]"
                      >
                        选择备份文件
                      </button>
                    </section>
                  </div>

                  {backupImportError && (
                    <div className="rounded-[10px] border border-[rgba(154,52,18,0.18)] bg-[rgba(255,247,237,0.78)] px-4 py-3 text-sm leading-6 text-[#9a3412]">
                      {backupImportError}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[10px] border border-[rgba(10,46,14,0.18)] bg-[var(--accent-soft)] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-[var(--ink)]">确认导入</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                        {backupImportPreview.fileName} · {new Date(backupImportPreview.backup.exportedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={handleChooseBackupFile}
                        className="flex h-8 items-center justify-center rounded-[8px] border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd] px-3 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[rgba(10,46,14,0.36)] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#9297a0] focus:ring-offset-2 focus:ring-offset-[var(--accent-soft)] active:scale-[0.98]"
                      >
                        重新选择
                      </button>
                      <span className="rounded-[8px] border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                        {backupImportPreview.historyCount} 条记录
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--ink-soft)] sm:grid-cols-3">
                    <div className="rounded-[8px] bg-[#fbfcfd] px-3 py-2">
                      <p className="text-[var(--ink-faint)]">新增记录</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{backupImportPreview.newHistoryCount}</p>
                    </div>
                    <div className="rounded-[8px] bg-[#fbfcfd] px-3 py-2">
                      <p className="text-[var(--ink-faint)]">更新记录</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{backupImportPreview.updatedHistoryCount}</p>
                    </div>
                    <div className="rounded-[8px] bg-[#fbfcfd] px-3 py-2">
                      <p className="text-[var(--ink-faint)]">保留当前</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{backupImportPreview.keptCurrentCount}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--ink-faint)]">
                    解析历史按记录 ID 去重，相同记录保留较新的版本；同名缓存键会使用备份里的值。导入前会自动导出当前浏览器备份。
                  </p>
                </div>
              )}
            </div>

            {backupImportPreview && (
              <div className="flex flex-col gap-3 border-t border-[#dfe4e8] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsBackupNoticeOpen(false)}
                  className="flex h-10 items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[#9297a0] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#9297a0] focus:ring-offset-2 focus:ring-offset-[#fbfcfd] active:scale-[0.99]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBackupImport}
                  className="flex h-10 items-center justify-center rounded-[10px] bg-[#181d26] px-5 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] focus:outline-none focus:ring-2 focus:ring-[#9297a0] focus:ring-offset-2 focus:ring-offset-[#fbfcfd] active:scale-[0.99]"
                >
                  合并导入
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Payment modal ── */}
      {isPaywallModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,29,38,0.34)] px-6 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPaywallModalOpen(false);
          }}
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-[12px] border border-[#9297a0] bg-[#fbfcfd] p-7 shadow-[0_18px_44px_rgba(24,29,38,0.18)]">
            <div className="w-full">
              <p className="mb-1 text-lg font-semibold text-[var(--ink)]">
                支付解锁完整版分析
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                请使用微信扫码支付 ¥9.9
              </p>
            </div>
            <div className="rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wechat-pay-qrcode.jpg"
                alt="微信支付二维码"
                className="h-44 w-44 object-contain"
              />
            </div>
            <p className="text-center text-xs text-[var(--ink-faint)]">
              支付完成后，点击下方按钮继续
            </p>
            <div className="flex w-full flex-col gap-2">
              <button
                onClick={handleUnlock}
                className="w-full rounded-[10px] bg-[#181d26] py-3 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] active:scale-[0.98]"
              >
                我已支付，继续解锁
              </button>
              <button
                onClick={() => setIsPaywallModalOpen(false)}
                className="w-full rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] py-2.5 text-sm text-[var(--ink-soft)] transition hover:border-[#9297a0] hover:text-[var(--ink)]"
              >
                暂不解锁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-card share modal ── */}
      {/* ── Export format modal ── */}
      {isExportModalOpen && (() => {
        const _sectionDefs: ExportSection[] = [
          { id: "bookSummary", label: "全书摘要" },
          { id: "readingGuide", label: "阅读指南" },
          { id: "originalReadingValue", label: "原书阅读建议" },
          { id: "viewMap", label: "观点地图" },
          { id: "actionExtraction", label: "行动提炼" },
          { id: "viewValidation", label: "观点校验" },
          { id: "ideaSourceTracing", label: "思想溯源" },
        ];
        const _contentMap: Record<string, string> = {
          bookSummary,
          readingGuide,
          originalReadingValue,
          viewMap,
          actionExtraction,
          viewValidation: criticalExamination,
          ideaSourceTracing,
        };
        const availableSections = _sectionDefs.filter(
          (s) => _contentMap[s.id]?.trim().length > 0
        );
        return (
          <ExportModal
            availableSections={availableSections}
            onExport={handleExport}
            onClose={() => { setIsExportModalOpen(false); setExportStatus("idle"); }}
            exportStatus={exportStatus}
            onRestart={() => setExportStatus("idle")}
          />
        );
      })()}

      {isFeynmanPreviewOpen && (
        <FeynmanPreview
          bookTitle={currentBookDisplayTitle}
          author={currentBookAuthor}
          coverImageUrl={currentBookCover}
          cards={getDecisionCardsInput()}
          decisionExercises={decisionScenarios.map((scenario) => ({
            scene: scenario.scene,
            question: scenario.question,
            options: scenario.options,
            feedback: {
              A: `${scenario.feedback.A.analysis} ${scenario.feedback.A.upgrade}`.trim(),
              B: `${scenario.feedback.B.analysis} ${scenario.feedback.B.upgrade}`.trim(),
            },
          }))}
          starterBookId={currentStarterBookId}
          onClose={() => setIsFeynmanPreviewOpen(false)}
          onGenerated={() => {
            enqueueGuidanceToast({
              id: "feynman-export-download-success",
              message: "讲书演示已下载",
              priority: TOAST_PRIORITY.INFO,
              durationMs: 4200,
            });
          }}
        />
      )}

      {/* ── Poster preview modal ── */}
      {isPosterModalOpen && posterContent && (
        <PosterPreviewModal
          data={{
            bookTitle: currentBookDisplayTitle,
            content: posterContent,
          }}
          onClose={() => {
            setIsPosterModalOpen(false);
            setToastQueue((prev) =>
              prev.filter((t) => !t.id.startsWith("growth-expression-"))
            );
          }}
          onSaveSuccess={() => {
            if (!currentBookId) return;
            const expressionGrowth = awardGrowth("expression", {
              bookId: currentBookId,
              bookTitle: currentBookDisplayTitle,
              action: "海报导出",
            });
            if (expressionGrowth.changed) {
              setGrowthLedger(expressionGrowth.ledger);
              markGrowthInspectorUpdated();
              setActiveToast({
                id: `growth-expression-${currentBookId}`,
                message: `表达力印记 +1\n来自《${currentBookDisplayTitle}》的海报导出`,
                priority: TOAST_PRIORITY.INFO,
                durationMs: 4500,
              });
            }
          }}
          onRegenerate={async () => {
            setIsPosterModalOpen(false);
            setPosterContent(null);
            // Small delay so modal closes before re-opening
            await new Promise((r) => setTimeout(r, 100));
            setIsGeneratingPoster(true);
            try {
              const res = await fetch("/api/skills/poster-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: bookTitle,
                  bookSummary,
                  readingGuide,
                  actionExtraction,
                }),
              });
              const d = await res.json();
              if (d.success && d.content) {
                setPosterContent(d.content);
                setIsPosterModalOpen(true);
                try {
                  const ft = selectedFile?.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
                  const rid = `${bookTitle}-${ft}`;
                  const hist = loadHistory();
                  const idx = hist.findIndex((r) => r.id === rid);
                  if (idx >= 0) {
                    hist[idx].posterContent = d.content;
                    saveHistory(hist);
                    setRecentHistory(hist);
                  }
                } catch { /* ignore */ }
              }
            } catch (err) {
              console.error("海报内容重新生成失败:", err);
            } finally {
              setIsGeneratingPoster(false);
            }
          }}
        />
      )}

      {(quoteShareSelection || homeQuoteShareSelection) && (
        <QuoteShareModal
          data={
            homeQuoteShareSelection
              ? {
                  bookTitle: homeQuoteShareSelection.bookTitle,
                  author: homeQuoteShareSelection.author,
                  cardLabel: homeQuoteShareSelection.cardLabel,
                  text: homeQuoteShareSelection.text,
                }
              : {
                  bookTitle: currentBookDisplayTitle,
                  author: currentBookAuthor,
                  cardLabel: quoteShareSelection!.cardLabel,
                  text: quoteShareSelection!.text,
                }
          }
          onClose={handleCloseQuoteShareModal}
          onSaveSuccess={() => {
            if (homeQuoteShareSelection) return;
            if (!currentBookId) return;
            const expressionGrowth = awardGrowth("expression", {
              bookId: currentBookId,
              bookTitle: currentBookDisplayTitle,
              action: "海报导出",
            });
            if (expressionGrowth.changed) {
              setGrowthLedger(expressionGrowth.ledger);
              markGrowthInspectorUpdated();
              setActiveToast({
                id: `growth-quote-share-${currentBookId}`,
                message: `表达力印记 +1\n来自《${currentBookDisplayTitle}》的划线书摘`,
                priority: TOAST_PRIORITY.INFO,
                durationMs: 4500,
              });
            }
          }}
        />
      )}

      {activeToast && (
        <Toast
          message={toastMessage ?? activeToast.message}
          actionText={activeToast.actionText}
          onAction={activeToast.onAction ? () => {
            activeToast.onAction?.();
            // onAction 内部已处理 setActiveToast(null) 的情况（如删除撤销）
            // 对于普通 toast，onAction 后自动关闭由 Toast 组件内部处理
          } : undefined}
          secondaryActionText={activeToast.secondaryActionText}
          onSecondaryAction={activeToast.onSecondaryAction ? () => {
            activeToast.onSecondaryAction?.();
          } : undefined}
          durationMs={activeToast.isPersistent ? 0 : (activeToast.durationMs ?? 10000)}
          showCloseButton={activeToast.showCloseButton ?? true}
          dismissible={activeToast.dismissible ?? true}
          onClose={() => {
            setActiveToast(null);
            setLastToastClosedAt(Date.now());
          }}
        />
      )}

      {isWorkspaceSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-search-title"
          className="workspace-search-scrim fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[9vh] md:px-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsWorkspaceSearchOpen(false);
            }
          }}
        >
          <div ref={searchDialogRef} className="workspace-search-surface relative w-full max-w-5xl overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.72)] p-3">
            <h2 id="workspace-search-title" className="sr-only">搜索书库</h2>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 py-3 focus-within:border-[#9297a0]">
                <SearchIcon className="h-5 w-5 shrink-0 text-[var(--ink-soft)] md:h-5 md:w-5" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  value={workspaceSearchQuery}
                  onChange={(event) => setWorkspaceSearchQuery(event.target.value)}
                  aria-controls="workspace-search-results"
                  aria-activedescendant={
                    combinedWorkspaceSearchResults[workspaceSearchActiveIndex]
                      ? `workspace-search-result-${workspaceSearchActiveIndex}`
                      : undefined
                  }
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setWorkspaceSearchActiveIndex((index) =>
                        Math.min(index + 1, Math.max(0, combinedWorkspaceSearchResults.length - 1))
                      );
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setWorkspaceSearchActiveIndex((index) => Math.max(0, index - 1));
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const selected = combinedWorkspaceSearchResults[workspaceSearchActiveIndex];
                      if (selected) {
                        handleSelectCombinedWorkspaceSearchResult(selected);
                      }
                    }
                  }}
                  placeholder="搜索书名、作者、观点或行动建议"
                  className="min-w-0 flex-1 bg-transparent text-[1rem] font-medium text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] md:text-[1.08rem]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const selected = combinedWorkspaceSearchResults[workspaceSearchActiveIndex] ?? combinedWorkspaceSearchResults[0];
                  if (selected) {
                    handleSelectCombinedWorkspaceSearchResult(selected);
                  }
                }}
                disabled={combinedWorkspaceSearchResults.length === 0}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[#181d26] text-[#fbfcfd] transition-all hover:bg-[#0d1218] disabled:cursor-not-allowed disabled:opacity-35 md:h-12 md:w-12"
                aria-label="打开第一个搜索结果"
              >
                <svg className="h-5 w-5 md:h-5 md:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsWorkspaceSearchOpen(false)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-soft)] transition-all hover:border-[#9297a0] hover:text-[var(--ink)]"
                aria-label="关闭搜索"
              >
                <CloseIcon className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1" aria-label="搜索范围">
              {([
                ["all", "全部"],
                ["books", "书籍"],
                ["insights", "洞见"],
                ...SEARCHABLE_CARD_FIELDS.map((field) => [field.key, field.label]),
              ] as Array<[WorkspaceSearchFilter, string]>).map(([filter, label]) => {
                const count = workspaceSearchFilterCounts[filter] ?? 0;
                return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setWorkspaceSearchFilter(filter)}
                  aria-pressed={workspaceSearchFilter === filter}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] ${
                    workspaceSearchFilter === filter
                      ? "bg-[#181d26] text-[#fbfcfd]"
                      : "border border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-soft)] hover:border-[#9297a0] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                  {workspaceSearchQuery && count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
                </button>
                );
              })}
            </div>

            {!workspaceSearchQuery && (
              <div className="mx-1 mt-2 flex items-center justify-between gap-3 rounded-[9px] bg-[rgba(24,29,38,0.035)] px-3 py-2">
                <p className="text-[11px] leading-5 text-[var(--ink-faint)]">
                  搜索已保存的书名、作者和分析卡片，不搜索原书全文。
                </p>
                <span className="shrink-0 text-[10px] font-medium text-[var(--ink-faint)]">⌘/Ctrl K</span>
              </div>
            )}

            <div id="workspace-search-results" className="mt-2 max-h-[46vh] overflow-y-auto border-t border-[#dfe4e8] px-1 pb-1 pt-3" aria-live="polite">
              {workspaceBookSearchResults.length > 0 ||
              workspaceLibraryContentSearchResults.length > 0 ||
              workspaceSearchResults.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {workspaceBookSearchResults.length > 0 && (
                    <section className={shouldShowInsightResultsFirst ? "order-2" : "order-1"}>
                      <div className="mb-2 flex items-center gap-2 px-3">
                        <p className="archive-kicker">书库</p>
                        <span className="h-px flex-1 bg-[#dfe4e8]" />
                      </div>
                      <div className="space-y-1.5">
                        {workspaceBookSearchResults.map((result) => {
                          const resultIndex = combinedWorkspaceSearchResults.findIndex((item) => item.id === `book:${result.id}`);
                          const isActiveResult = resultIndex === workspaceSearchActiveIndex;

                          return (
                            <button
                              key={result.id}
                              id={`workspace-search-result-${resultIndex}`}
                              type="button"
                              onMouseEnter={() => {
                                if (resultIndex >= 0) setWorkspaceSearchActiveIndex(resultIndex);
                              }}
                              onClick={() => handleSelectWorkspaceBookSearchResult(result)}
                              className={`${searchResultClass(isActiveResult)} flex items-center justify-between gap-4`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                                    {result.badge}
                                  </span>
                                  <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                    《{renderHighlightedSearchText(result.title, workspaceSearchTokens)}》
                                  </p>
                                </div>
                                <p className="mt-2 truncate text-sm text-[var(--ink-soft)]">
                                  {renderHighlightedSearchText(result.subtitle, workspaceSearchTokens)}
                                </p>
                              </div>
                              {isActiveResult ? (
                                <span className="shrink-0 rounded-[6px] border border-[#dfe4e8] bg-[#fbfcfd] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-faint)]">
                                  Enter
                                </span>
                              ) : (
                                <span className="shrink-0 text-xl text-[var(--ink-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                                  →
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {workspaceLibraryContentSearchResults.length > 0 && (
                    <section className={shouldShowInsightResultsFirst ? "order-1" : "order-2"}>
                      <div className="mb-2 flex items-center gap-2 px-3">
                        <p className="archive-kicker">书库内容</p>
                        <span className="h-px flex-1 bg-[#dfe4e8]" />
                      </div>
                      <div className="space-y-1.5">
                        {workspaceLibraryContentSearchResults.map((result) => {
                          const resultIndex = combinedWorkspaceSearchResults.findIndex((item) => item.id === `libraryContent:${result.id}`);
                          const isActiveResult = resultIndex === workspaceSearchActiveIndex;

                          return (
                            <button
                              key={result.id}
                              id={`workspace-search-result-${resultIndex}`}
                              type="button"
                              onMouseEnter={() => {
                                if (resultIndex >= 0) setWorkspaceSearchActiveIndex(resultIndex);
                              }}
                              onClick={() => handleSelectWorkspaceLibraryContentSearchResult(result)}
                              className={searchResultClass(isActiveResult)}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="rounded-full border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                                  {result.label}
                                </span>
                                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                  《{renderHighlightedSearchText(result.bookTitle, workspaceSearchTokens)}》
                                </p>
                                {isActiveResult ? (
                                  <span className="ml-auto shrink-0 rounded-[6px] border border-[#dfe4e8] bg-[#fbfcfd] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-faint)]">
                                    Enter
                                  </span>
                                ) : (
                                  <span className="ml-auto shrink-0 text-lg text-[var(--ink-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                                    →
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--ink-soft)]">
                                {renderHighlightedSearchText(result.excerpt, workspaceSearchTokens)}
                              </p>
                              {result.matchCount > 1 && (
                                <p className="mt-2 text-[10px] font-medium text-[var(--ink-faint)]">
                                  共 {result.matchCount} 处命中
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {workspaceSearchResults.length > 0 && (
                    <section className={shouldShowInsightResultsFirst ? "order-1" : "order-2"}>
                      <div className="mb-2 flex items-center gap-2 px-3">
                        <p className="archive-kicker">当前书内容</p>
                        <span className="h-px flex-1 bg-[#dfe4e8]" />
                      </div>
                      <div className="space-y-1.5">
                        {workspaceSearchResults.map((result) => {
                          const resultIndex = combinedWorkspaceSearchResults.findIndex((item) => item.id === `currentContent:${result.id}`);
                          const isActiveResult = resultIndex === workspaceSearchActiveIndex;

                          return (
                            <button
                              key={result.id}
                              id={`workspace-search-result-${resultIndex}`}
                              type="button"
                              onMouseEnter={() => {
                                if (resultIndex >= 0) setWorkspaceSearchActiveIndex(resultIndex);
                              }}
                              onClick={() => handleSelectWorkspaceSearchResult(result)}
                              className={searchResultClass(isActiveResult)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-[rgba(10,46,14,0.18)] bg-[#fbfcfd] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                                  {result.label}
                                </span>
                                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                  {renderHighlightedSearchText(result.title, workspaceSearchTokens)}
                                </p>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--ink-soft)]">
                                {renderHighlightedSearchText(result.excerpt, workspaceSearchTokens)}
                              </p>
                              {result.matchCount > 1 && (
                                <p className="mt-2 text-[10px] font-medium text-[var(--ink-faint)]">
                                  共 {result.matchCount} 处命中
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  {recentHistory.length === 0 && workspaceSearchCorpus.length === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-[var(--ink)]">先把一本书放进书库</p>
                      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--ink-faint)]">
                        之后可搜索书名、作者和已生成的分析卡片，不搜索原书全文。
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsWorkspaceSearchOpen(false);
                          handleOpenUploadPicker();
                        }}
                        className="mt-4 rounded-[9px] bg-[#181d26] px-3.5 py-2 text-xs font-semibold text-[#fbfcfd] transition-all hover:bg-[#0d1218] active:scale-[0.98]"
                      >
                        上传书籍
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[var(--ink)]">没有找到匹配内容</p>
                      <p className="mt-1 text-xs text-[var(--ink-faint)]">可以换一个关键词，或清除当前筛选。</p>
                      {(workspaceSearchQuery || workspaceSearchFilter !== "all") && (
                        <button
                          type="button"
                          onClick={() => {
                            setWorkspaceSearchQuery("");
                            setWorkspaceSearchFilter("all");
                          }}
                          className="mt-3 rounded-[8px] border border-[#dfe4e8] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition-all hover:border-[#9297a0] hover:text-[var(--ink)]"
                        >
                          清除搜索与筛选
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Background analysis progress indicator ── */}
      {bgAnalysisStatus.active && bgAnalysisTitleRef.current !== bookTitle && (
        <button
          type="button"
          onClick={showBackgroundAnalysis}
          className="fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-[12px] border border-[#dfe4e8] bg-[#fbfcfd] px-4 py-2.5 text-left text-xs text-[var(--ink-soft)] shadow-[0_8px_24px_rgba(24,29,38,0.12)] transition-all hover:border-[#c9d1d6] hover:bg-[#f8fafc] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] active:scale-[0.99]"
          aria-label={`查看《${bgAnalysisStatus.title}》的实时解析进度`}
          title="查看实时解析"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
          </span>
          <span className="max-w-[180px] truncate">《{bgAnalysisStatus.title}》{bgAnalysisStatus.step}</span>
          <span className="rounded-[6px] border border-[#dfe4e8] bg-[#f8fafc] px-1.5 py-0.5 text-[var(--ink-faint)]">{bgAnalysisStatus.stepsCompleted}/{bgAnalysisStatus.totalSteps}</span>
        </button>
      )}

      <div className="md:hidden">
        <FabMenu
          ref={fabMenuRef}
          historyItems={recentHistory}
          showRedDot={showFabRedDot}
          currentBookTitle={bookTitle}
          pendingDeleteId={pendingDeleteId}
          onOpen={() => {
            if (showFabRedDot) {
              markFabHistorySeen();
              setShowFabRedDot(false);
            }
          }}
          onRestoreHistory={(id) => {
            const record = recentHistory.find((r) => r.id === id);
            if (record) {
              restoreFromHistory(record);
              setTimeout(() => {
                immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }
          }}
          onDeleteHistory={deleteHistoryRecord}
          onOpenStarterBooks={handleShowStarterModeFromToast}
          hasCurrentBook={!!bookTitle}
          trainingUnlocked={trainingUnlocked}
          exportUnlocked={exportUnlocked}
          onOpenTraining={() => void handleOpenDecisionTraining()}
          onOpenExport={() => { setExportStatus("idle"); setIsExportModalOpen(true); }}
          onBackupData={handleBackupLocalData}
        />
      </div>
    </>
  );
}
