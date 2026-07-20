export type ReadingCompletionStatus = "unconfirmed" | "reading" | "completed";

const PREFIX = "bookleap_reading_completion:";
const PROMPT_PREFIX = "bookleap_reading_reflection_prompt:";

export function loadReadingCompletion(bookId: string): ReadingCompletionStatus {
  if (typeof window === "undefined") return "unconfirmed";
  try {
    const value = localStorage.getItem(`${PREFIX}${bookId}`);
    return value === "reading" || value === "completed" ? value : "unconfirmed";
  } catch {
    return "unconfirmed";
  }
}

export function saveReadingCompletion(bookId: string, status: ReadingCompletionStatus): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${PREFIX}${bookId}`, status);
  } catch {
    // Local persistence is optional.
  }
}

export function hasDismissedReadingReflectionPrompt(bookId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${PROMPT_PREFIX}${bookId}`) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissReadingReflectionPrompt(bookId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${PROMPT_PREFIX}${bookId}`, "dismissed");
  } catch {
    // Local persistence is optional.
  }
}
