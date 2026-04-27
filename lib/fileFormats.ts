export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

export type SupportedFileType = "epub" | "pdf" | "azw3" | "txt";

const FILE_TYPE_LABELS: Record<SupportedFileType, string> = {
  epub: "EPUB",
  pdf: "PDF",
  azw3: "AZW3",
  txt: "TXT",
};

export function getFileTypeFromName(filename: string): SupportedFileType | null {
  const normalized = filename.trim().toLowerCase();

  if (normalized.endsWith(".epub")) return "epub";
  if (normalized.endsWith(".pdf")) return "pdf";
  if (normalized.endsWith(".azw3")) return "azw3";
  if (normalized.endsWith(".txt")) return "txt";

  return null;
}

export function getFileTypeLabel(fileType: SupportedFileType): string {
  return FILE_TYPE_LABELS[fileType];
}

export function stripSupportedFileExtension(filename: string): string {
  return filename.replace(/\.(epub|pdf|azw3|txt)$/i, "");
}
