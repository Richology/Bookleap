export function stripInlineBoldMarkers(markdown: string): string;
export function normalizeActionHeadings(markdown: string): string;
export function normalizeBoundarySection(markdown: string): string;
export function normalizeIdeaSourceHeadings(markdown: string): string;
export function extractQuoteCandidatesFromAnalysisContext(analysisContext: string): string[];
export function enforceIdeaSourceQuoteCandidates(
  markdown: string,
  quoteCandidates: string[]
): string;
export function cleanupReadingGuideMarkdown(markdown: string): string;
export function cleanupActionExtractionMarkdown(markdown: string): string;
export function cleanupCriticalExaminationMarkdown(markdown: string): string;
export function cleanupIdeaSourceTracingMarkdown(
  markdown: string,
  quoteCandidates?: string[]
): string;
