import type { BookContext, StoredBookContext } from "./context";

export type EvidenceExcerpt = {
  sourceId: string;
  chapterIndex: number;
  chapterTitle: string;
  samplePosition: "opening" | "middle" | "ending" | "full";
  quote: string;
  before?: string;
  after?: string;
};

export type EvidenceClaim = {
  id: string;
  claim: string;
  sourceIds: string[];
  supportLevel: "direct" | "inferred" | "weak";
  explanation: string;
  excerpts: EvidenceExcerpt[];
};

export type CardEvidence = {
  cardKey: string;
  cardLabel: string;
  claims: EvidenceClaim[];
};

export function buildCardEvidence(input: {
  cardKey: string;
  cardLabel: string;
  context?: BookContext | StoredBookContext;
  claims?: Array<unknown>;
  maxClaims?: number;
}): CardEvidence | null;

export function buildCardEvidenceFromContent(input: {
  cardKey: string;
  cardLabel: string;
  content?: string;
  context?: BookContext | StoredBookContext;
  maxClaims?: number;
}): CardEvidence | null;
