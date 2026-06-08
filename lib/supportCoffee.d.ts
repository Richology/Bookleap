export const SUPPORT_COFFEE_PROMPT_THRESHOLD: 3;

export type SupportCoffeeHistoryRecord = {
  id?: string;
  title?: string;
  isStarterBook?: boolean;
};

export function countSelfUploadedBooks(
  records: SupportCoffeeHistoryRecord[]
): number;

export function shouldPromptCoffeeSupport(
  records: SupportCoffeeHistoryRecord[],
  hasPrompted: boolean
): boolean;
