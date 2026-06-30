export type BookHighlight = {
  id: string;
  bookRef: string;
  bookTitle: string;
  author: string;
  cardKey: string;
  cardLabel: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  contentHash: number;
  createdAt: string;
};

const STORAGE_PREFIX = "bookleap_highlights_v1";

function getStorageKey(bookRef: string) {
  return `${STORAGE_PREFIX}:${bookRef}`;
}

function isValidHighlight(candidate: unknown): candidate is BookHighlight {
  if (!candidate || typeof candidate !== "object") return false;
  const item = candidate as Partial<BookHighlight>;

  return (
    typeof item.id === "string" &&
    typeof item.bookRef === "string" &&
    typeof item.bookTitle === "string" &&
    typeof item.author === "string" &&
    typeof item.cardKey === "string" &&
    typeof item.cardLabel === "string" &&
    typeof item.selectedText === "string" &&
    typeof item.startOffset === "number" &&
    typeof item.endOffset === "number" &&
    typeof item.contentHash === "number" &&
    typeof item.createdAt === "string"
  );
}

export function hashHighlightContent(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function normalizeHighlightText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function loadBookHighlights(bookRef: string): BookHighlight[] {
  if (typeof window === "undefined" || !bookRef) return [];

  try {
    const raw = localStorage.getItem(getStorageKey(bookRef));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidHighlight)
      .sort((a, b) => a.startOffset - b.startOffset);
  } catch {
    return [];
  }
}

export function saveBookHighlights(bookRef: string, highlights: BookHighlight[]) {
  if (typeof window === "undefined" || !bookRef) return;

  try {
    localStorage.setItem(getStorageKey(bookRef), JSON.stringify(highlights));
  } catch {
    // Best-effort local reading marks.
  }
}

export function addBookHighlight(highlight: BookHighlight) {
  const prev = loadBookHighlights(highlight.bookRef);
  const next = [
    highlight,
    ...prev.filter(
      (item) =>
        item.cardKey !== highlight.cardKey ||
        item.endOffset <= highlight.startOffset ||
        item.startOffset >= highlight.endOffset
    ),
  ].sort((a, b) => a.startOffset - b.startOffset);

  saveBookHighlights(highlight.bookRef, next);
  return next;
}

export function deleteBookHighlight(bookRef: string, highlightId: string) {
  const next = loadBookHighlights(bookRef).filter((item) => item.id !== highlightId);
  saveBookHighlights(bookRef, next);
  return next;
}
