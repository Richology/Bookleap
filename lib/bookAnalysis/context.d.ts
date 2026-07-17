export type SamplePosition = "opening" | "middle" | "ending" | "full";

export type AnalysisChapterMeta = {
  chapterIndex: number;
  originalChapterId: string;
  originalTitle: string;
  totalChapters: number;
  estimatedChars: number;
  positionRatio: number;
  sampleIndex: number;
  samplePosition: SamplePosition;
  quoteCandidates: string[];
};

export type AnalysisChapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
  analysisMeta: AnalysisChapterMeta;
};

export type SourceChapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

export type BookContext = {
  title: string;
  author: string;
  coverage: {
    totalChapters: number;
    sampledChapters: number;
    totalSamples: number;
    strategy: string;
  };
  outline: Array<{
    index: number;
    id: string;
    title: string;
    estimatedChars: number;
    positionRatio: number;
  }>;
  samples: Array<{
    sourceId: string;
    chapterIndex: number;
    chapterTitle: string;
    position: SamplePosition;
    text: string;
  }>;
  evidenceBriefs: Array<{
    sourceId: string;
    chapterIndex: number;
    chapterTitle: string;
    position: SamplePosition;
    summary: string;
    evidencePreview: string;
    quoteCandidates: string[];
  }>;
  chapterBriefs: Array<{
    chapterIndex: number;
    title: string;
    summary: string;
    keyPoints: string[];
    evidenceHints: string[];
  }>;
  quoteCandidates: string[];
};

export type StoredBookContext = {
  version: 1;
  title: string;
  author: string;
  coverage: BookContext["coverage"];
  outline: BookContext["outline"];
  samples: Array<{
    sourceId: string;
    chapterIndex: number;
    chapterTitle: string;
    position: SamplePosition;
    preview: string;
  }>;
  evidenceBriefs: Array<{
    sourceId: string;
    chapterIndex: number;
    chapterTitle: string;
    position: SamplePosition;
    preview: string;
    quoteCandidates: string[];
  }>;
  quoteCandidates: string[];
};

export function extractQuoteCandidates(
  texts: string[],
  options?: { minLength?: number; maxLength?: number; limit?: number }
): string[];

export function selectRepresentativeChapters(
  chapters: SourceChapter[],
  options?: {
    targetChapterCount?: number;
    sampleCharLimit?: number;
    totalCharLimit?: number;
  }
): AnalysisChapter[];

export function toAnalysisChapters(
  chapters: SourceChapter[],
  options?: {
    targetChapterCount?: number;
    sampleCharLimit?: number;
    totalCharLimit?: number;
  }
): AnalysisChapter[];

export function buildBookContext(input?: {
  title?: string;
  author?: string;
  chapters?: Array<SourceChapter | AnalysisChapter>;
}): BookContext;

export function formatBookContextForPrompt(
  context: BookContext,
  options?: { maxBriefs?: number; maxQuotes?: number }
): string;

export function buildStoredBookContext(input: {
  title?: string;
  author?: string;
  chapters?: Array<SourceChapter | AnalysisChapter>;
}): StoredBookContext;
