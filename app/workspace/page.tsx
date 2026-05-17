"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DecisionTrainingPanel } from "../components/DecisionTrainingPanel";
import { UpgradeReadingModal } from "../components/UpgradeReadingModal";
import { Toast } from "../components/Toast";
import { FabMenu, type FabMenuHandle } from "../components/FabMenu";
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
} from "@/types/decision";
import {
  getOnboardingStep,
  isBeforeOnboardingStep,
  setOnboardingStep as persistOnboardingStep,
  type OnboardingProgress,
} from "@/lib/onboarding";
import {
  starterBooks,
  starterBooksById,
  type StarterBookData,
} from "@/src/data/starterBooks";
import {
  DEFAULT_ADDICTION_STATE,
  getAddictionState,
  inferDecisionPattern,
  resetDecisionRound,
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
import type { DecisionOptionKey } from "@/types/decision";
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
};

type BgAnalysisData = {
  title: string;
  author: string;
  coverImage: string;
  bookSummary: string;
  chapters: Chapter[];
  readingGuide: string;
  viewMap: string;
  actionExtraction: string;
  viewValidation: string;
  ideaSourceTracing: string;
  workspaceQuote: string;
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
};

type WorkspaceBookSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  record: HistoryRecord;
};

type WorkspaceLibraryContentSearchResult = {
  id: string;
  bookTitle: string;
  label: string;
  excerpt: string;
  targetKey: string;
  record: HistoryRecord;
};

type WorkspaceCombinedSearchResult =
  | { kind: "book"; id: string; result: WorkspaceBookSearchResult }
  | { kind: "libraryContent"; id: string; result: WorkspaceLibraryContentSearchResult }
  | { kind: "currentContent"; id: string; result: WorkspaceSearchResult };

type WorkspaceTab = WorkspaceTabItem & {
  source: "starter" | "history" | "current";
  starterBookId?: string;
  recordId?: string;
};

type WorkspaceReadMode = "overview" | "immersive";

// ── Share card content helpers ─────────────────────────────────────────────────

// ── Recent history (localStorage) ─────────────────────────────────────────────
const HISTORY_KEY = "bookleap_recent_history";
const HAS_UPLOADED_BOOK_KEY = "bookleap_has_uploaded_book";
const LAST_ANALYZED_BOOK_TITLE_KEY = "bookleap_last_analyzed_book_title";
const STARTER_MODE_SEEN_KEY = "bookleap_has_seen_starter_mode";
const STARTER_SELECTED_BOOK_KEY = "bookleap_selected_starter_book";
const STARTER_EXPERIENCED_KEY = "bookleap_experienced_starter_books";

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
const STARTER_LOADING_STEPS = [
  { text: "正在解析全书结构…", duration: 700 },
  { text: "正在提炼核心观点…", duration: 800 },
  { text: "正在生成认知卡片…", duration: 900 },
  { text: "正在整理分析结果…", duration: 600 },
] as const;
const BLOB_UPLOAD_TIMEOUT_MS = 15000;
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

type HistoryRecord = {
  id: string;
  title: string;
  fileType: SupportedFileType;
  mode: "full" | "lite";
  createdAt: string;
  bookSummary: string;
  readingGuide: string;
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
  author?: string;
};

type WorkspaceMemoryCard = {
  id: string;
  title: string;
  author: string;
  quote: string;
};

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

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(records: HistoryRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch { /* quota exceeded – silently ignore */ }
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

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getSearchTokens(query: string) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
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

function getTokenMatchScore(haystack: string, tokens: string[]) {
  if (tokens.length === 0) return 0;

  const lowerHaystack = haystack.toLowerCase();
  const positions = tokens.map((token) => lowerHaystack.indexOf(token));
  if (positions.some((position) => position === -1)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...positions);
}

function createSearchExcerpt(content: string, tokens: string[], maxLength = 170) {
  const compact = compactSearchText(content);
  if (!compact) return "";
  if (tokens.length === 0) return compact.slice(0, maxLength);

  const lower = compact.toLowerCase();
  const matches = tokens
    .map((token) => ({ token, index: lower.indexOf(token) }))
    .filter((match) => match.index !== -1)
    .sort((a, b) => a.index - b.index);
  const firstMatch = matches[0];
  const index = firstMatch?.index ?? -1;
  if (index === -1) return compact.slice(0, maxLength);

  const start = Math.max(0, index - 54);
  const end = Math.min(compact.length, index + firstMatch.token.length + 112);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < compact.length ? "..." : "";
  return `${prefix}${compact.slice(start, end)}${suffix}`;
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

function isTextInputTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    element?.isContentEditable
  );
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
    : "上传请求没有完成。请检查网络后重试；如果文件较大，可以稍后再试。";
}

function getBlobUploadContentType(filename: string): string | undefined {
  const fileType = getFileTypeFromName(filename);

  if (fileType === "epub") return "application/epub+zip";
  if (fileType === "pdf") return "application/pdf";
  if (fileType === "txt") return "text/plain";
  if (fileType === "azw3") return "application/octet-stream";

  return undefined;
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

async function uploadBookViaBlob(file: File): Promise<Response> {
  const { upload } = await import("@vercel/blob/client");
  const explicitContentType = getBlobUploadContentType(file.name);
  const blob = await withTimeout(
    upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: explicitContentType,
    }),
    BLOB_UPLOAD_TIMEOUT_MS,
    "Blob 上传超时"
  );

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const touchStartXRef = useRef(0);
  const immersiveContainerRef = useRef<HTMLDivElement>(null);
  const readerScrollContainerRef = useRef<HTMLDivElement>(null);
  const immersiveCardsLenRef = useRef(0);
  const shouldScrollToStarterSectionRef = useRef(false);

  // ── Background analysis state ──
  const bgAnalysisRef = useRef<BgAnalysisData | null>(null);
  const bgAnalysisTitleRef = useRef<string>("");
  const [bgAnalysisStatus, setBgAnalysisStatus] = useState<BgAnalysisStatus>({ active: false });
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [analysisErrorCode, setAnalysisErrorCode] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [readingGuide, setReadingGuide] = useState("");
  const [viewMap, setViewMap] = useState("");
  const [actionExtraction, setActionExtraction] = useState("");
  const [criticalExamination, setCriticalExamination] = useState("");
  const [ideaSourceTracing, setIdeaSourceTracing] = useState("");
  const [workspaceQuote, setWorkspaceQuote] = useState("");
  const [bookSummary, setBookSummary] = useState("");
  const [bookCoverImage, setBookCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBookSummary, setIsLoadingBookSummary] = useState(false);
  const [isLoadingReadingGuide, setIsLoadingReadingGuide] = useState(false);
  const [isLoadingViewMap, setIsLoadingViewMap] = useState(false);
  const [isLoadingActionExtraction, setIsLoadingActionExtraction] = useState(false);
  const [isLoadingViewValidation, setIsLoadingViewValidation] = useState(false);
  const [isLoadingIdeaSourceTracing, setIsLoadingIdeaSourceTracing] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success">("idle");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isLiteUnlocked, setIsLiteUnlocked] = useState(false);
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<WorkspaceReadMode>("overview");
  const [immersiveIndex, setImmersiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterContent, setPosterContent] = useState<PosterContent | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [decisionScenarios, setDecisionScenarios] = useState<DecisionScenario[]>([]);
  const [isDecisionPanelOpen, setIsDecisionPanelOpen] = useState(false);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);
  const [decisionLoadingStep, setDecisionLoadingStep] = useState("");
  const [decisionError, setDecisionError] = useState("");
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
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [isGrowthPanelCollapsed, setIsGrowthPanelCollapsed] = useState(true);
  const [hasGrowthUpdateBadge, setHasGrowthUpdateBadge] = useState(false);
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isWorkspaceSearchOpen, setIsWorkspaceSearchOpen] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [workspaceSearchActiveIndex, setWorkspaceSearchActiveIndex] = useState(0);
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState(false);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const resetAnalysisLoadingStates = useCallback(() => {
    setIsLoading(false);
    setIsLoadingBookSummary(false);
    setIsLoadingReadingGuide(false);
    setIsLoadingViewMap(false);
    setIsLoadingActionExtraction(false);
    setIsLoadingViewValidation(false);
    setIsLoadingIdeaSourceTracing(false);
  }, []);

  const isAnalyzing =
    isLoading ||
    isLoadingBookSummary ||
    isLoadingReadingGuide ||
    isLoadingViewMap ||
    isLoadingActionExtraction ||
    isLoadingViewValidation ||
    isLoadingIdeaSourceTracing;

  const currentBookId = bookTitle ? buildDecisionBookId(bookTitle) : null;
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
  const historyCover = currentHistoryRecord?.coverImage ?? "";
  const localCover = starterCover || bookCoverImage || historyCover;

  const [fetchedCover, setFetchedCover] = useState("");
  useEffect(() => {
    if (!bookTitle || currentStarterBook?.author || currentHistoryRecord?.author || bookAuthor) {
      setFetchedAuthor("");
      return;
    }

    let cancelled = false;

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

    const isTitleMatch = (returned: string, query: string) => {
      const a = normalize(returned);
      const b = normalize(query);
      return a.includes(b) || b.includes(a);
    };

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
            item.volumeInfo?.title && isTitleMatch(item.volumeInfo.title, bookTitle)
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
          doc.title && isTitleMatch(doc.title, bookTitle)
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

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

    const isTitleMatch = (returned: string, query: string) => {
      const a = normalize(returned);
      const b = normalize(query);
      return a.includes(b) || b.includes(a);
    };

    const tryGoogleBooks = async (): Promise<string | null> => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookTitle)}&maxResults=3`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const items = data.items ?? [];
        for (const item of items) {
          const info = item.volumeInfo;
          if (!info?.imageLinks?.thumbnail) continue;
          if (isTitleMatch(info.title ?? "", bookTitle)) {
            return info.imageLinks.thumbnail.replace("http://", "https://");
          }
        }
        if (items[0]?.volumeInfo?.imageLinks?.thumbnail) {
          return items[0].volumeInfo.imageLinks.thumbnail.replace("http://", "https://");
        }
      } catch { /* ignore */ }
      return null;
    };

    const tryOpenLibrary = async (): Promise<string | null> => {
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?title=${encodeURIComponent(bookTitle)}&limit=3&fields=title,cover_i`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const docs = data.docs ?? [];
        for (const doc of docs) {
          if (!doc.cover_i) continue;
          if (isTitleMatch(doc.title ?? "", bookTitle)) {
            return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          }
        }
        if (docs[0]?.cover_i) {
          return `https://covers.openlibrary.org/b/id/${docs[0].cover_i}-L.jpg`;
        }
      } catch { /* ignore */ }
      return null;
    };

    (async () => {
      const cover = (await tryGoogleBooks()) ?? (await tryOpenLibrary());
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
    setWorkspaceSearchActiveIndex(0);
    setIsWorkspaceSearchOpen(true);
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

  const openGrowthInspector = useCallback(() => {
    setIsGrowthPanelCollapsed(false);
    setHasGrowthUpdateBadge(false);
  }, []);

  const handleToggleGrowthInspector = useCallback(() => {
    if (isGrowthPanelCollapsed) {
      setHasGrowthUpdateBadge(false);
    }
    setIsGrowthPanelCollapsed((prev) => !prev);
  }, [isGrowthPanelCollapsed]);

  useEffect(() => {
    if (!isWorkspaceSearchOpen) return;

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWorkspaceSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorkspaceSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isTyping = isTextInputTarget(event.target);

      if (event.key.toLowerCase() === "k" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        handleOpenWorkspaceSearch();
      }

      if (event.key.toLowerCase() === "f" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        handleToggleFullscreen();
      }

      if (event.key === "[" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setIsLibraryCollapsed((prev) => !prev);
      }

      if (event.key === "]" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        handleToggleGrowthInspector();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenWorkspaceSearch, handleToggleFullscreen, handleToggleGrowthInspector, isWorkspaceSearchOpen]);

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
    isAnalyzing,
  ]);

  // Load history + onboarding progress on mount
  useEffect(() => {
    const history = loadHistory();
    const ledger = loadGrowthLedger();
    const onboardingStep = getOnboardingStep();
    const starterBookId = getSelectedStarterBookId();

    const returningUserToastSeenThisSession = hasSeenReturningUserToastThisSession();

    setRecentHistory(history);
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
      hasHistoryReorganizedBeenShown() && !hasFabHistoryBeenSeen() && history.length >= 3
    );
    // 不再自动进入 starter mode，新用户默认看到上传区
    setIsStarterModeVisible(false);
  }, []);

  useEffect(() => {
    if (!currentBookId) {
      setAddictionStateLocal(DEFAULT_ADDICTION_STATE);
      return;
    }

    setAddictionStateLocal(getAddictionState(currentBookId));
  }, [currentBookId]);

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
      viewMap,
      actionExtraction,
      viewValidation: criticalExamination,
      ideaSourceTracing,
      bookRecommendation: "",
      workspaceQuote: sanitizeWorkspaceQuote(workspaceQuote, { title: bookTitle }),
      coverImage: currentStarterBook?.coverImage || bookCoverImage || currentHistoryRecord?.coverImage || "",
      posterContent: posterContent ?? null,
      isStarterBook: !!currentStarterBook,
      starterBookId: currentStarterBook?.id,
      author: currentStarterBook?.author || bookAuthor || currentHistoryRecord?.author || undefined,
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
          setShowFullHistory(true);
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

  const commitDelete = useCallback((id: string) => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    const history = loadHistory();
    const recordToDelete = history.find((r) => r.id === id);
    const next = history.filter((r) => r.id !== id);

    if (recordToDelete) {
      clearBookDerivedCaches(recordToDelete.title);
    }

    saveHistory(next);
    setRecentHistory(next);
    setPendingDeleteId(null);
  }, []);

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
    setPendingDeleteId(null);
  }, []);

  const deleteHistoryRecord = useCallback((id: string) => {
    // If there's already a pending delete, finalize it first
    if (pendingDeleteId && pendingDeleteId !== id) {
      commitDelete(pendingDeleteId);
    }

    const record = recentHistory.find((r) => r.id === id);
    const title = record?.title ?? "未知";

    setPendingDeleteId(id);

    // Clear any existing timer
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
    }

    // Auto-delete after 10 seconds
    pendingDeleteTimerRef.current = window.setTimeout(() => {
      commitDelete(id);
    }, 10000);

    // Show undo toast via unified queue (P0 = SYSTEM, will preempt any lower toast)
    enqueueGuidanceToast({
      id: `delete-undo-${id}`,
      message: `已删除《${title}》\n10 秒后永久删除`,
      priority: TOAST_PRIORITY.SYSTEM,
      durationMs: 10000,
      showCloseButton: false,
      dismissible: false,
      actionText: "撤销",
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
  }, [pendingDeleteId, recentHistory, commitDelete, cancelDelete, enqueueGuidanceToast]);

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
    setIsLoadingBookSummary(false);
    setReadingGuide("");
    setIsLoadingReadingGuide(false);
    setViewMap("");
    setIsLoadingViewMap(false);
    setActionExtraction("");
    setIsLoadingActionExtraction(false);
    setCriticalExamination("");
    setIsLoadingViewValidation(false);
    setIdeaSourceTracing("");
    setIsLoadingIdeaSourceTracing(false);
    setWorkspaceQuote("");
    setBookCoverImage("");
    setChapters([]);
    setIsLiteMode(false);
    setIsLiteUnlocked(false);
    setIsPaywallModalOpen(false);
    setViewMode("overview");
    setImmersiveIndex(0);
    setSlideDir(null);
    setIsPosterModalOpen(false);
    setPosterContent(null);
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

  /** Apply completed background analysis results to display state */
  const applyBgAnalysisToDisplay = useCallback((bg: BgAnalysisData) => {
    setBookTitle(bg.title);
    setBookAuthor(bg.author);
    setBookCoverImage(bg.coverImage);
    setBookSummary(bg.bookSummary);
    setChapters(bg.chapters);
    setReadingGuide(bg.readingGuide);
    setViewMap(bg.viewMap);
    setActionExtraction(bg.actionExtraction);
    setCriticalExamination(bg.viewValidation);
    setIdeaSourceTracing(bg.ideaSourceTracing);
    setWorkspaceQuote(sanitizeWorkspaceQuote(bg.workspaceQuote, { title: bg.title }));
    setIsLiteMode(bg.liteMode);
    setIsLiteUnlocked(!bg.liteMode);
    setCurrentStarterBookId(bg.starterBookId);
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(bg.title)));
    setIsDecisionPanelOpen(false);
    setDecisionError("");
    setAnalysisErrorCode(null);
    setMessage("分析完成");
  }, []);

  const restoreFromHistory = useCallback((record: HistoryRecord) => {
    // Signal background analysis to stop writing to display
    bgAnalysisTitleRef.current = "";
    // Clear loading states so history book shows cleanly
    setIsLoadingBookSummary(false);
    setIsLoadingReadingGuide(false);
    setIsLoadingViewMap(false);
    setIsLoadingActionExtraction(false);
    setIsLoadingViewValidation(false);
    setIsLoadingIdeaSourceTracing(false);
    setIsLoading(false);

    setSelectedFile(null);
    setBookTitle(record.title);
    setBookAuthor(record.author || "");
    setBookSummary(record.bookSummary);
    setReadingGuide(record.readingGuide);
    setViewMap(record.viewMap);
    setActionExtraction(record.actionExtraction);
    setCriticalExamination(record.viewValidation);
    setIdeaSourceTracing(record.ideaSourceTracing);
    setWorkspaceQuote(pickWorkspaceQuote(record));
    setBookCoverImage(record.coverImage ?? "");
    setPosterContent(record.posterContent ?? null);
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

  const fetchIdeaSourceTracing = async (
    title: string,
    bookSummary: string,
    viewMap: string
  ) => {
    try {
      setIsLoadingIdeaSourceTracing(true);
      const res = await fetch("/api/skills/idea-source-tracing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, viewMap }),
      });
      const data = await res.json();
      if (data.success) {
        setIdeaSourceTracing(data.ideaSourceTracing || "");
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
      fetchIdeaSourceTracing(title, bookSummary, viewMapResult),
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
      }
    } catch (err) {
      console.error("全书摘要生成失败:", err);
    } finally {
      setIsLoadingBookSummary(false);
    }
    fetchViewMap(title, realSummary, currentChapters);
  };

  const handleExport = async ({ format, structure, selectedSectionIds }: ExportParams) => {
    if (!bookTitle) return;

    // Build the full section map from current state
    const allSections: ExportSection[] = [
      { id: "bookSummary", label: "全书摘要" },
      { id: "readingGuide", label: "阅读指南" },
      { id: "viewMap", label: "观点地图" },
      { id: "actionExtraction", label: "行动提炼" },
      { id: "viewValidation", label: "观点校验" },
      { id: "ideaSourceTracing", label: "思想溯源" },
    ];
    const contentMap: Record<string, string> = {
      bookSummary,
      readingGuide,
      viewMap,
      actionExtraction,
      viewValidation: criticalExamination,
      ideaSourceTracing,
    };
    const sections = allSections
      .filter((s) => selectedSectionIds.includes(s.id) && contentMap[s.id]?.trim())
      .map((s) => ({ id: s.id, title: s.label, content: contentMap[s.id] }));

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

  const getDecisionCardsInput = useCallback((): DecisionCardsInput => ({
    summary: bookSummary,
    readingGuide,
    viewMap,
    actionPrinciples: actionExtraction,
    models: criticalExamination,
    insights: ideaSourceTracing,
  }), [bookSummary, readingGuide, viewMap, actionExtraction, criticalExamination, ideaSourceTracing]);

  const handleOpenDecisionTraining = useCallback(async () => {
    if (!bookTitle) return;

    const cards = getDecisionCardsInput();
    if (!hasCompleteDecisionCards(cards)) {
      setDecisionError("请先完成 6 个分析模块，再开始决策训练。");
      return;
    }

    const bookId = buildDecisionBookId(bookTitle);
    applyAddictionState(resetDecisionRound(bookId));

    const cached = loadDecisionScenarioCache(bookId);
    if (cached.length === 3) {
      setDecisionScenarios(cached);
      setDecisionError("");
      setIsDecisionPanelOpen(true);
      return;
    }

    try {
      setIsDecisionLoading(true);
      setDecisionError("");
      const scenarios: import("@/types/decision").DecisionScenario[] = [];

      // 逐题生成，每完成一题立即更新进度
      for (let i = 0; i < 3; i++) {
        setDecisionLoadingStep(DECISION_STEP_LABELS[i]);
        const res = await fetch("/api/decision/generate-one", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookTitle, cards, questionIndex: i }),
        });
        const data = await res.json();
        if (!data.success || !data.scenario) {
          setDecisionError(data.error || `第 ${i + 1} 题生成失败，请稍后重试。`);
          return;
        }
        scenarios.push(data.scenario);
      }

      if (scenarios.length !== 3) {
        setDecisionError("决策训练题生成不完整，请稍后再试。");
        return;
      }

      saveDecisionScenarioCache(bookId, scenarios);
      setDecisionScenarios(scenarios);
      setIsDecisionPanelOpen(true);
    } catch (error) {
      console.error("决策训练生成失败:", error);
      setDecisionError("决策训练生成失败，请稍后重试。");
    } finally {
      setIsDecisionLoading(false);
      setDecisionLoadingStep("");
    }
  }, [applyAddictionState, bookTitle, getDecisionCardsInput]);

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
    setWorkspaceQuote(sanitizeWorkspaceQuote(starterBook.posterContent.highlight, { title: starterBook.title }));
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
      bookRecommendation: "",
      workspaceQuote: sanitizeWorkspaceQuote(starterBook.posterContent.highlight, { title: starterBook.title }),
      coverImage: starterBook.coverImage,
      isStarterBook: true,
      starterBookId: starterBook.id,
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
    const starterBook = starterBooksById[starterBookId];
    if (!starterBook || isStarterLoading) return;

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
    } finally {
      resetDragState();
      setIsStarterLoading(false);
    }
  }, [applyStarterBook, enqueueGuidanceToast, isStarterLoading, resetDragState, resetReaderScrollPosition]);

  const activateWorkspaceTab = useCallback((tabId: string) => {
    const tab = openTabs.find((item) => item.id === tabId);
    if (!tab) return;

    setActiveTabId(tab.id);

    if (tab.source === "starter" && tab.starterBookId) {
      void handleSelectStarterBook(tab.starterBookId);
      return;
    }

    if (tab.recordId) {
      const record = recentHistory.find((item) => item.id === tab.recordId);
      if (record) {
        openHistoryRecord(record);
      }
    }
  }, [handleSelectStarterBook, openHistoryRecord, openTabs, recentHistory]);

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

    if (!fileToAnalyze) {
      setMessage("请先选择一本 EPUB、AZW3、TXT 或 PDF 电子书。");
      setAnalysisErrorCode("NO_FILE_SELECTED");
      return;
    }
    try {
      resetAllState();

      setIsLoading(true);
      setMessage("正在上传文件...");

      setIsLoadingBookSummary(true);
      setIsLoadingReadingGuide(true);
      setIsLoadingViewMap(true);
      setIsLoadingActionExtraction(true);
      setIsLoadingViewValidation(true);
      setIsLoadingIdeaSourceTracing(true);

      // Initialize background analysis tracker
      const bg: BgAnalysisData = {
        title: "", author: "", coverImage: "", bookSummary: "", chapters: [], readingGuide: "",
        viewMap: "", actionExtraction: "", viewValidation: "",
        ideaSourceTracing: "", workspaceQuote: "", liteMode: false,
        fileType: getFileTypeFromName(fileToAnalyze.name) ?? "epub",
        starterBookId: currentStarterBookId,
      };
      bgAnalysisRef.current = null;
      let stepsCompleted = 0;
      const totalSteps = 6;
      const updateProgress = (step: string) => {
        setBgAnalysisStatus({ active: true, title: bg.title || "新书", step, stepsCompleted, totalSteps });
      };
      updateProgress("上传解析中…");

      let res: Response;
      try {
        setMessage("正在上传并解析章节...");
        res = await uploadBookDirectly(fileToAnalyze);
      } catch (directUploadError) {
        console.error("直接上传失败，尝试 Blob 上传:", directUploadError);
        try {
          setMessage("上传通道较慢，正在切换上传方式...");
          res = await uploadBookViaBlob(fileToAnalyze);
          setMessage("上传成功，正在解析章节...");
        } catch (blobUploadError) {
          console.error("Blob 上传失败:", blobUploadError);
          setAnalysisErrorCode("UPLOAD_INIT_FAILED");
          setMessage(getUploadFailureMessage());
          resetAnalysisLoadingStates();
          setBgAnalysisStatus({ active: false });
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
        setMessage(getAnalyzeResponseErrorMessage());
        resetAnalysisLoadingStates();
        setBgAnalysisStatus({ active: false });
        return;
      }
      if (!data.success) {
        setAnalysisErrorCode(data.errorCode || (res.ok ? "ANALYZE_FAILED" : "ANALYZE_HTTP_ERROR"));
        setMessage(getAnalyzeFailureMessage(res.ok, data.error));
        resetAnalysisLoadingStates();
        setBgAnalysisStatus({ active: false });
        return;
      }
      setAnalysisErrorCode(null);
      const title = cleanBookTitle(data.title || "");
      const author = (data.author || "").replace(/\s+/g, " ").trim();
      const coverImage = data.coverImage || "";
      const bkSummary = data.bookSummary || "";
      const chaps: Chapter[] = data.chapters || [];
      const liteMode = data.mode === "lite";

      bg.title = title;
      bg.author = author;
      bg.coverImage = coverImage;
      bg.bookSummary = bkSummary;
      bg.chapters = chaps;
      bg.liteMode = liteMode;
      stepsCompleted = 1;
      bgAnalysisTitleRef.current = title;

      // Helper: only write to display if user is still viewing this book
      const isStillViewing = () => bgAnalysisTitleRef.current === title;

      // Show initial results immediately
      setBookTitle(title);
      setBookAuthor(author);
      setBookCoverImage(coverImage);
      setBookSummary(bkSummary);
      setChapters(chaps);
      setIsLiteMode(liteMode);
      setIsLoadingBookSummary(false);

      if (liteMode) {
        setIsLoadingViewMap(false);
        setIsLoadingActionExtraction(false);
        setIsLoadingViewValidation(false);
        setIsLoadingIdeaSourceTracing(false);
        
        setMessage("正在生成阅读指南...");
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
          if (isStillViewing()) setReadingGuide(bg.readingGuide);
        }

        if (quoteResult.status === "fulfilled" && quoteResult.value.success) {
          bg.workspaceQuote = sanitizeWorkspaceQuote(
            quoteResult.value.workspaceQuote || "",
            { title: bg.title }
          );
          if (isStillViewing()) setWorkspaceQuote(bg.workspaceQuote);
        }

        if (isStillViewing()) setIsLoadingReadingGuide(false);
        setMessage("分析完成");
        setBgAnalysisStatus({ active: false });
        // NOTE: We rely on the useEffect hook to catch message === "分析完成" && !isAnalyzing to save history.
        return;
      }

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
          if (isStillViewing()) setReadingGuide(bg.readingGuide);
        }
      } catch (e) { console.error("阅读指南生成失败:", e); }
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
          if (isStillViewing()) setViewMap(bg.viewMap);
        }
      } catch (e) { console.error("观点地图生成失败:", e); }
      if (isStillViewing()) setIsLoadingViewMap(false);
      stepsCompleted = 3;

      // ── Parallel: Action + Validation + IdeaSource ──
      updateProgress("剩余分析…");
      if (isStillViewing()) setMessage("正在生成剩余分析...");
      const [actionResult, validResult, ideaResult, quoteResult] = await Promise.allSettled([
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
          body: JSON.stringify({ title, bookSummary: bkSummary, viewMap: bg.viewMap || "" }),
        }).then(r => r.json()),
        fetch("/api/skills/workspace-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        }).then(r => r.json()),
      ]);

      if (actionResult.status === "fulfilled" && actionResult.value.success) {
        bg.actionExtraction = actionResult.value.actionExtraction || "";
        if (isStillViewing()) setActionExtraction(bg.actionExtraction);
      }
      if (validResult.status === "fulfilled" && validResult.value.success) {
        bg.viewValidation = validResult.value.viewValidation || "";
        if (isStillViewing()) setCriticalExamination(bg.viewValidation);
      }
      if (ideaResult.status === "fulfilled" && ideaResult.value.success) {
        bg.ideaSourceTracing = ideaResult.value.ideaSourceTracing || "";
        if (isStillViewing()) setIdeaSourceTracing(bg.ideaSourceTracing);
      }
      if (quoteResult.status === "fulfilled" && quoteResult.value.success) {
        bg.workspaceQuote = sanitizeWorkspaceQuote(
          quoteResult.value.workspaceQuote || "",
          { title: bg.title }
        );
        if (isStillViewing()) setWorkspaceQuote(bg.workspaceQuote);
      }
      if (isStillViewing()) {
        setIsLoadingActionExtraction(false);
        setIsLoadingViewValidation(false);
        setIsLoadingIdeaSourceTracing(false);
      }
      stepsCompleted = totalSteps;

      // ── Save to history ──
      bgAnalysisRef.current = bg;

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
      setMessage(getRequestFailureMessage());
      resetAnalysisLoadingStates();
    } finally {
      setIsLoading(false);
      setBgAnalysisStatus({ active: false });
      bgAnalysisRef.current = null;
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const allImmersiveCardDefs = useMemo<ImmersiveCardDef[]>(() => [
    { key: "bookSummary",         label: "全书摘要", content: bookSummary,         isLoading: isLoadingBookSummary,        loadingText: "正在生成全书摘要..." },
    { key: "readingGuide",        label: "阅读指南", content: readingGuide,        isLoading: isLoadingReadingGuide,       loadingText: "正在生成阅读指南..." },
    { key: "viewMap",             label: "观点地图", content: viewMap,             isLoading: isLoadingViewMap,            loadingText: "正在生成观点地图..." },
    { key: "actionExtraction",    label: "行动提炼", content: actionExtraction,    isLoading: isLoadingActionExtraction,   loadingText: "正在生成行动提炼..." },
    { key: "criticalExamination", label: "观点校验", content: criticalExamination, isLoading: isLoadingViewValidation,     loadingText: "正在生成观点校验..." },
    { key: "ideaSourceTracing",   label: "思想溯源", content: ideaSourceTracing,   isLoading: isLoadingIdeaSourceTracing,  loadingText: "正在生成思想溯源..." },
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
    () => getSearchTokens(workspaceSearchQuery),
    [workspaceSearchQuery]
  );

  const workspaceSearchCorpus = useMemo<WorkspaceSearchResult[]>(() => {
    const items: WorkspaceSearchResult[] = [];

    const addResult = (label: string, content: string, targetKey: string, title = label) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      items.push({
        id: targetKey,
        label,
        title,
        excerpt: createSearchExcerpt(trimmed, workspaceSearchTokens, 220),
        targetKey,
      });
    };

    allImmersiveCardDefs.forEach((card) => {
      addResult(card.label, card.content, card.key);
    });

    return items;
  }, [allImmersiveCardDefs, workspaceSearchTokens]);

  const workspaceSearchResults = useMemo(() => {
    if (workspaceSearchTokens.length === 0) return workspaceSearchCorpus.slice(0, 6);

    return workspaceSearchCorpus
      .map((item) => {
        const haystack = `${item.label} ${item.title} ${item.excerpt}`.toLowerCase();
        return { item, score: getTokenMatchScore(haystack, workspaceSearchTokens) };
      })
      .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((entry) => entry.item);
  }, [workspaceSearchCorpus, workspaceSearchTokens]);

  const workspaceBookSearchResults = useMemo<WorkspaceBookSearchResult[]>(() => {
    const scored = recentHistory.map((record, index) => {
      const fileTypeLabel = getFileTypeLabel(record.fileType);
      const subtitle = record.author || `${fileTypeLabel} · ${record.mode === "lite" ? "简化版" : "完整版"}`;
      const badge = record.isStarterBook ? "赠送书单" : record.mode === "lite" ? "简化版" : "历史记录";
      const haystack = `${record.title} ${record.author ?? ""} ${fileTypeLabel} ${badge}`.toLowerCase();
      const titleScore = getTokenMatchScore(record.title, workspaceSearchTokens);
      const authorScore = getTokenMatchScore(record.author ?? "", workspaceSearchTokens);
      const generalScore = getTokenMatchScore(haystack, workspaceSearchTokens);

      let score = index + 10;
      if (workspaceSearchTokens.length > 0) {
        if (titleScore === 0) score = 0;
        else if (titleScore !== Number.POSITIVE_INFINITY) score = 10 + titleScore;
        else if (authorScore !== Number.POSITIVE_INFINITY) score = 30 + authorScore;
        else if (generalScore !== Number.POSITIVE_INFINITY) score = 60 + generalScore;
        else score = Number.POSITIVE_INFINITY;
      }

      return {
        result: {
          id: record.id,
          title: record.title,
          subtitle,
          badge,
          record,
        },
        score,
      };
    });

    return scored
      .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
      .sort((a, b) => a.score - b.score)
      .slice(0, workspaceSearchTokens.length > 0 ? 8 : 5)
      .map((entry) => entry.result);
  }, [recentHistory, workspaceSearchTokens]);

  const workspaceLibraryContentSearchResults = useMemo<WorkspaceLibraryContentSearchResult[]>(() => {
    if (workspaceSearchTokens.length === 0) return [];

    const results: Array<{ result: WorkspaceLibraryContentSearchResult; score: number }> = [];

    recentHistory.forEach((record, recordIndex) => {
      if (record.title === bookTitle) return;

      SEARCHABLE_CARD_FIELDS.forEach((field, fieldIndex) => {
        const content = getHistoryRecordCardContent(record, field.key);
        const compact = compactSearchText(content);
        if (!compact) return;

        const haystack = `${record.title} ${record.author ?? ""} ${field.label} ${compact}`.toLowerCase();
        const matchScore = getTokenMatchScore(haystack, workspaceSearchTokens);
        if (matchScore === Number.POSITIVE_INFINITY) return;

        const contentScore = getTokenMatchScore(compact, workspaceSearchTokens);
        results.push({
          result: {
            id: `${record.id}:${field.key}`,
            bookTitle: record.title,
            label: field.label,
            excerpt: createSearchExcerpt(compact, workspaceSearchTokens),
            targetKey: field.key,
            record,
          },
          score: (contentScore !== Number.POSITIVE_INFINITY ? contentScore : matchScore + 80) + recordIndex * 8 + fieldIndex,
        });
      });
    });

    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((entry) => entry.result);
  }, [bookTitle, recentHistory, workspaceSearchTokens]);

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

    setIsWorkspaceSearchOpen(false);
    window.setTimeout(() => {
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleSelectWorkspaceBookSearchResult = (result: WorkspaceBookSearchResult) => {
    openHistoryRecord(result.record);
    setIsWorkspaceSearchOpen(false);
    window.setTimeout(() => {
      resetReaderScrollPosition();
    }, 80);
  };

  const handleSelectWorkspaceLibraryContentSearchResult = (
    result: WorkspaceLibraryContentSearchResult
  ) => {
    openHistoryRecord(result.record);
    setViewMode("immersive");
    setIsWorkspaceSearchOpen(false);

    window.setTimeout(() => {
      const index = SEARCHABLE_CARD_FIELDS.findIndex((field) => field.key === result.targetKey);
      if (index >= 0) {
        setSlideDir(index > safeImmersiveIndex ? "left" : "right");
        setImmersiveIndex(index);
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
  const overviewCardList = allImmersiveCardDefs.filter((card) => {
    if (!isLiteMode || isLiteUnlocked) return true;
    return ["bookSummary", "readingGuide"].includes(card.key);
  });

  const openOverviewCard = (targetKey: string) => {
    const nextIndex = immersiveCardList.findIndex((card) => card.key === targetKey);
    if (nextIndex < 0) return;

    setSlideDir(null);
    setImmersiveIndex(nextIndex);
    setViewMode("immersive");

    window.setTimeout(() => {
      immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

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
  const topBarTabs = openTabs.map<WorkspaceTabItem>((tab) => ({
    id: tab.id,
    title: tab.title,
    closable: tab.closable,
  }));
  const hasPendingStarterBooks = experiencedStarterIds.length < starterBooks.length;
  const fullHistoryRecords = recentHistory
    .filter((record) => hasPendingStarterBooks ? !record.isStarterBook : true);
  const visibleHistoryRecords = fullHistoryRecords.slice(0, 6);
  const expandedHistoryRecords = fullHistoryRecords.slice(6);
  const inProgressLabel = visibleAnalysisSteps.length > 0
    ? `${completedAnalysisSteps}/${visibleAnalysisSteps.length}`
    : "准备中";
  const recentGrowthLabel = growthLedger.lastEvent
    ? formatGrowthEvent(growthLedger.lastEvent)
    : "完成分析、训练或海报导出后，这里会留下最新成长记录。";
  const toolRailActions = [
    {
      id: "training",
      label: "测试题",
      title: isDecisionLoading ? decisionLoadingStep || "生成中…" : "测试题",
      onClick: () => {
        void handleOpenDecisionTraining();
      },
      disabled: isTrainingActionDisabled,
      active: isDecisionPanelOpen,
    },
    {
      id: "export",
      label: "导出",
      title: exportStatus === "exporting" ? "导出中…" : "导出",
      onClick: () => {
        setExportStatus("idle");
        setIsExportModalOpen(true);
      },
      disabled: isExportActionDisabled,
    },
    {
      id: "share",
      label: "分享",
      title: isGeneratingPoster ? "生成中…" : "分享",
      onClick: handleGeneratePoster,
      disabled: isShareActionDisabled,
    },
  ];
  const utilityToolActions = [
    {
      id: "search",
      label: "搜索",
      title: "搜索 · K",
      onClick: handleOpenWorkspaceSearch,
      disabled:
        recentHistory.length === 0 &&
        workspaceSearchCorpus.length === 0 &&
        workspaceLibraryContentSearchResults.length === 0,
    },
    {
      id: isWorkspaceFullscreen ? "exitFullscreen" : "fullscreen",
      label: isWorkspaceFullscreen ? "退出全屏" : "全屏",
      title: isWorkspaceFullscreen ? "退出全屏 · F" : "进入全屏 · F",
      onClick: handleToggleFullscreen,
      active: isWorkspaceFullscreen,
    },
  ];

  const workspacePanelClass =
    "bg-transparent";
  const workspaceRailPanelClass =
    "rounded-[13px] border border-transparent bg-[#eef1f2]";
  const searchResultClass = (isActiveResult: boolean) =>
    `group w-full rounded-[10px] border px-3.5 py-3 text-left transition-all ${
      isActiveResult
        ? "border-[#9297a0] bg-[#eef1ef]"
        : "border-transparent bg-transparent hover:border-[#dfe4e8] hover:bg-[#f8fafc]"
    }`;

  const librarySidebar = (
    <WorkspaceLibrarySidebar
      isCollapsed={isLibraryCollapsed}
      onToggle={() => setIsLibraryCollapsed((prev) => !prev)}
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
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-[13px] border px-3 py-3 text-left transition-all ${
            isDragging
              ? "border-[#9297a0] bg-[#fbfcfd]"
              : "cursor-pointer border-transparent bg-[#eef1f2] hover:bg-[#e7ebed]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-[#f7f8f9] text-[var(--ink-soft)]">
              <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 4v8" />
                <path d="M6.8 7.2 10 4l3.2 3.2" />
                <path d="M4.8 15.2h10.4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ink)]">
                {selectedFile ? selectedFile.name : "把新书放进书库"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                {selectedFile ? "已开始自动解析，点击可重新选择" : "EPUB / AZW3 解析更完整；TXT / PDF 简化分析，最大 50MB"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-[11px] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[#fbfcfd] transition-all hover:bg-[#123f1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
          >
            + 上传书籍
          </button>
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
                  onClick={() => void handleSelectStarterBook(book.id)}
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
              actions={expandedHistoryRecords.length > 0 ? (
                <button
                  onClick={() => setShowFullHistory((prev) => !prev)}
                  aria-expanded={showFullHistory}
                  className="text-[11px] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
                >
                  {showFullHistory ? "收起" : "展开"}
                </button>
              ) : undefined}
            >
              {visibleHistoryRecords.map((record) => (
                <WorkspaceBookItem
                  key={`history-${record.id}`}
                  title={record.title}
                  subtitle={record.author || `${record.fileType.toUpperCase()} · ${record.mode === "lite" ? "简化版" : "完整版"}`}
                  coverUrl={record.coverImage || (record.starterBookId ? starterBooksById[record.starterBookId]?.coverImage : "")}
                  tone={record.title === bookTitle ? "current" : record.isStarterBook ? "gifted" : "default"}
                  onClick={() => openHistoryRecord(record)}
                  onDelete={() => deleteHistoryRecord(record.id)}
                />
              ))}

              {expandedHistoryRecords.length > 0 && (
                <div
                  className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                    showFullHistory
                      ? "grid-rows-[1fr] opacity-100 translate-y-0"
                      : "grid-rows-[0fr] opacity-0 -translate-y-1"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-0.5 pt-0.5">
                      {expandedHistoryRecords.map((record, index) => (
                        <div
                          key={`history-extra-${record.id}`}
                          className={`transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                            showFullHistory ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                          }`}
                          style={{ transitionDelay: showFullHistory ? `${Math.min(index, 5) * 24}ms` : "0ms" }}
                        >
                          <WorkspaceBookItem
                            title={record.title}
                            subtitle={record.author || `${record.fileType.toUpperCase()} · ${record.mode === "lite" ? "简化版" : "完整版"}`}
                            coverUrl={record.coverImage || (record.starterBookId ? starterBooksById[record.starterBookId]?.coverImage : "")}
                            tone={record.title === bookTitle ? "current" : record.isStarterBook ? "gifted" : "default"}
                            onClick={() => openHistoryRecord(record)}
                            onDelete={() => deleteHistoryRecord(record.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
          activeTabId={activeTabId}
          onActivateTab={activateWorkspaceTab}
          onCloseTab={closeWorkspaceTab}
          onCloseAllTabs={closeAllWorkspaceTabs}
          isLibraryCollapsed={isLibraryCollapsed}
          onExpandLibrary={() => setIsLibraryCollapsed(false)}
          isGrowthCollapsed={isGrowthPanelCollapsed}
          onExpandGrowth={openGrowthInspector}
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
        const totalAnalysisSteps = visibleAnalysisSteps.length || 6;
        const activeAnalysisStep = visibleAnalysisSteps.find((step) => step.loading);
        const analysisProgressPercent = Math.min(
          100,
          Math.max(isAnalyzing ? 8 : 0, Math.round((completedAnalysisSteps / totalAnalysisSteps) * 100))
        );

        const bannerClass = isError
          ? "border-red-200/70 bg-red-50/80 text-red-600"
          : isSuccess
          ? "bg-[#eef1ef] border-[rgba(10,46,14,0.18)] text-[var(--accent)]"
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
            <div className="analysis-complete-cue mx-4 mt-3 mb-0 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(24,29,38,0.08)] px-1 pb-3 text-sm md:mx-5 md:px-0">
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

              <button
                type="button"
                onClick={() => {
                  cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-full border border-[rgba(10,46,14,0.14)] bg-[rgba(168,216,196,0.18)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)] transition-all hover:bg-[rgba(168,216,196,0.28)] active:scale-[0.98]"
              >
                查看精华 ↓
              </button>
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

            {isAzw3Unsupported && (
              <div className="mt-3 border-t border-red-200/70 pt-3 text-[13px] leading-6 text-red-500/90">
                <p>这不代表我们已经确认它带有版权保护，也可能只是当前 AZW3 结构暂不兼容。</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100/60"
                  >
                    重新上传
                  </button>
                  <span className="text-xs text-red-500/75">
                    建议优先换成 EPUB，或尝试 TXT / PDF
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {!bookTitle ? (
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
                  <div className="flex items-center gap-3">
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
          {viewMode === "overview" && (
            <WorkspaceReaderHeader
              title={bookTitle}
              subtitle={currentBookAuthor}
              density="hero"
              cover={(
                <div>
                  <div className="overflow-hidden rounded-[8px] border border-[rgba(24,29,38,0.1)] bg-[#f8fafc] shadow-[0_1px_1px_rgba(24,29,38,0.05)]">
                    {currentBookCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentBookCover}
                        alt={bookTitle}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] flex-col justify-between p-4">
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

          <div ref={cardSectionRef} className="p-4 md:p-5 xl:p-5" style={{ scrollMarginTop: "24px" }}>
            {isDecisionPanelOpen && decisionScenarios.length > 0 && (
              <DecisionTrainingPanel
                scenarios={decisionScenarios}
                onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                onBackToCards={() => {
                  setIsDecisionPanelOpen(false);
                  immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onAnswerComplete={(option: DecisionOptionKey, progress: number) => {
                  if (!currentBookId) return;

                  const nextState = updateCurrentBookAddictionState((prev) => ({
                    ...prev,
                    decision_training_progress: progress,
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
                      message: "再做1题，你会看到你的决策模式",
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
                }}
                onComplete={() => {
                  if (currentBookId) {
                    const decisionGrowth = awardGrowth("decision", {
                      bookId: currentBookId,
                      bookTitle: currentBookDisplayTitle,
                      action: "训练完成",
                    });
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
                }}
              />
            )}

            {!isDecisionPanelOpen && viewMode === "overview" && overviewCardList.length > 0 && (
              <section className="mx-auto max-w-6xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="archive-kicker">精华总览</p>
                  {currentFileTypeLabel && (
                    <span className="rounded-full border border-[rgba(24,29,38,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-medium text-[var(--ink-faint)]">
                      {currentFileTypeLabel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {overviewCardList.map((card, index) => {
                    const isReady = !card.isLoading && !!card.content.trim();
                    const isPending = !card.isLoading && !isReady;
                    const excerpt = createOverviewExcerpt(card.content);
                    const cardStateClass = isReady
                      ? "analysis-overview-card-ready border-[#dfe4e8] bg-[#fbfcfd] hover:border-[#9297a0] hover:bg-[#f8fafc] active:scale-[0.99]"
                      : card.isLoading
                      ? "analysis-overview-card-active border-[rgba(10,46,14,0.28)] bg-[#eef7f1] shadow-[0_10px_26px_rgba(10,46,14,0.10)]"
                      : "analysis-overview-card-pending cursor-default border-[rgba(24,29,38,0.06)] bg-[#f8fafc]";

                    return (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => {
                          if (isReady) openOverviewCard(card.key);
                        }}
                        disabled={!isReady}
                        className={`group relative flex min-h-[182px] flex-col overflow-hidden rounded-[12px] border p-4 text-left transition-all ${cardStateClass}`}
                      >
                        {card.isLoading && (
                          <span className="analysis-card-sheen pointer-events-none absolute inset-0" />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-semibold text-[var(--ink-faint)] tabular-nums">
                                {String(index + 1).padStart(2, "0")}
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
                          <span className="mt-auto pt-4 text-[11px] font-medium text-[var(--ink-faint)] transition-colors group-hover:text-[var(--accent)]">
                            进入深度阅读
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {!isDecisionPanelOpen &&
              viewMode === "immersive" &&
              immersiveCardList.length > 0 &&
              currentImmersiveCard && (
                <div
                  className="mx-auto max-w-[52rem]"
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
                    <div className="hidden w-[86px] md:block" aria-hidden="true" />
                  </div>

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
                      <div className="md-prose workspace-prose mx-auto max-w-[42rem]">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {currentImmersiveCard.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 hidden select-none text-center text-[10px] text-[var(--ink-faint)]/70 md:block">
                    使用键盘 ← → 方向键切换
                  </p>

                  <div className="mt-5 hidden items-center justify-between gap-4 md:flex">
                    <button
                      onClick={() => navigateImmersive("prev")}
                      className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f8fafc] hover:text-[var(--ink)] active:scale-[0.97] select-none"
                    >
                      ← 上一篇
                    </button>

                    <div className="flex items-center gap-1.5">
                      {immersiveCardList.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSlideDir(i > safeImmersiveIndex ? "left" : "right");
                            setImmersiveIndex(i);
                            immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            i === safeImmersiveIndex
                              ? "w-4 bg-[var(--ink)]"
                              : "w-1.5 bg-[rgba(119,124,123,0.24)] hover:bg-[rgba(119,124,123,0.45)]"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => navigateImmersive("next")}
                      className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(24,29,38,0.08)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f8fafc] hover:text-[var(--ink)] active:scale-[0.97] select-none"
                    >
                      下一篇 →
                    </button>
                  </div>

                  <div className="h-16 md:hidden" />
                  <div
                    className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#dfe4e8] bg-[#fbfcfd] px-4 py-3 md:hidden"
                    style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                  >
                    <div className="mx-auto flex max-w-xl items-center justify-between">
                      <button
                        onClick={() => navigateImmersive("prev")}
                        className="flex items-center gap-1.5 rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 py-2 text-xs font-medium text-[var(--ink-soft)] transition-all active:scale-[0.97] select-none"
                      >
                        ← 上一篇
                      </button>

                      <div className="flex items-center gap-1.5">
                        {immersiveCardList.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSlideDir(i > safeImmersiveIndex ? "left" : "right");
                              setImmersiveIndex(i);
                              immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`h-1.5 rounded-full transition-all duration-200 ${
                              i === safeImmersiveIndex
                                ? "w-4 bg-[var(--ink)]"
                                : "w-1.5 bg-[rgba(119,124,123,0.24)] hover:bg-[rgba(119,124,123,0.45)]"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => navigateImmersive("next")}
                        className="flex items-center gap-1.5 rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 py-2 text-xs font-medium text-[var(--ink-soft)] transition-all active:scale-[0.97] select-none"
                      >
                        下一篇 →
                      </button>
                    </div>
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
      isCollapsed={isGrowthPanelCollapsed}
      onToggle={handleToggleGrowthInspector}
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <WorkspaceShell
        toolRail={<WorkspaceToolRail actions={toolRailActions} utilityActions={utilityToolActions} />}
        librarySidebar={librarySidebar}
        readerPane={readerPane}
        growthSidebar={growthSidebar}
        isLibraryCollapsed={isLibraryCollapsed}
        isGrowthCollapsed={isGrowthPanelCollapsed}
      />
      
      <UpgradeReadingModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        wechatId="iwbr1988"
        qrImageSrc="/contact-avatar.png"
      />

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
          { id: "viewMap", label: "观点地图" },
          { id: "actionExtraction", label: "行动提炼" },
          { id: "viewValidation", label: "观点校验" },
          { id: "ideaSourceTracing", label: "思想溯源" },
        ];
        const _contentMap: Record<string, string> = {
          bookSummary,
          readingGuide,
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

      {activeToast && (
        <Toast
          message={activeToast.message}
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
          className="fixed inset-0 z-[70] flex items-start justify-center bg-[rgba(24,29,38,0.34)] px-4 pt-[9vh] backdrop-blur-[2px] md:px-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsWorkspaceSearchOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[12px] border border-[#9297a0] bg-[#fbfcfd] p-3 shadow-[0_18px_44px_rgba(24,29,38,0.18)]">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] border border-[#dfe4e8] bg-[#f8fafc] px-4 py-3 focus-within:border-[#9297a0]">
                <svg className="h-5 w-5 shrink-0 text-[var(--ink-soft)] md:h-5 md:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.1 4.1" />
                </svg>
                <input
                  ref={searchInputRef}
                  value={workspaceSearchQuery}
                  onChange={(event) => setWorkspaceSearchQuery(event.target.value)}
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
                  placeholder="搜索书名、作者、观点或行动建议..."
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
                <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5 5 15" />
                </svg>
              </button>
            </div>

            <div className="mt-3 max-h-[46vh] overflow-y-auto border-t border-[#dfe4e8] px-1 pb-1 pt-3">
              {workspaceBookSearchResults.length > 0 ||
              workspaceLibraryContentSearchResults.length > 0 ||
              workspaceSearchResults.length > 0 ? (
                <div className="space-y-5">
                  {workspaceBookSearchResults.length > 0 && (
                    <section>
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
                    <section>
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
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {workspaceSearchResults.length > 0 && (
                    <section>
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
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[var(--ink)]">没有找到匹配内容</p>
                  <p className="mt-1 text-xs text-[var(--ink-faint)]">可以换一个关键词试试。</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Background analysis progress indicator ── */}
      {bgAnalysisStatus.active && bgAnalysisTitleRef.current !== bookTitle && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-[12px] border border-[#dfe4e8] bg-[#fbfcfd] px-4 py-2.5 text-xs text-[var(--ink-soft)] shadow-[0_8px_24px_rgba(24,29,38,0.12)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
          </span>
          <span className="max-w-[180px] truncate">《{bgAnalysisStatus.title}》{bgAnalysisStatus.step}</span>
          <span className="rounded-[6px] border border-[#dfe4e8] bg-[#f8fafc] px-1.5 py-0.5 text-[var(--ink-faint)]">{bgAnalysisStatus.stepsCompleted}/{bgAnalysisStatus.totalSteps}</span>
        </div>
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
        />
      </div>
    </>
  );
}
