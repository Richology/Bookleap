export const SUPPORT_COFFEE_PROMPT_THRESHOLD = 3;

function getRecordKey(record) {
  if (!record || typeof record !== "object") return "";
  if (typeof record.id === "string" && record.id.trim()) return record.id.trim();
  if (typeof record.title === "string" && record.title.trim()) return record.title.trim();
  return "";
}

export function countSelfUploadedBooks(records) {
  if (!Array.isArray(records)) return 0;

  const uploadedBookIds = new Set();

  for (const record of records) {
    if (!record || typeof record !== "object" || record.isStarterBook === true) {
      continue;
    }

    const key = getRecordKey(record);
    if (key) uploadedBookIds.add(key);
  }

  return uploadedBookIds.size;
}

export function shouldPromptCoffeeSupport(records, hasPrompted) {
  return (
    !hasPrompted &&
    countSelfUploadedBooks(records) >= SUPPORT_COFFEE_PROMPT_THRESHOLD
  );
}
