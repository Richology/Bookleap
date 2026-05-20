import { generateFeynmanContent } from "./generateFeynmanContent";
import { renderFeynmanHtml } from "./renderHtml";
import { getFeynmanTemplateBySlug, selectFeynmanTemplate } from "./selectTemplate";
import type { FeynmanExportMode, FeynmanExportRequest } from "./types";

function sanitizeFilename(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function normalizeCoverUrl(coverImageUrl: string | undefined, origin: string): string | undefined {
  if (!coverImageUrl) return undefined;
  const trimmed = coverImageUrl.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }
  return trimmed;
}

export async function createFeynmanExportHtml(
  request: FeynmanExportRequest,
  options: { origin: string }
): Promise<{ html: string; filename: string }> {
  const bookTitle = request.bookTitle.trim() || "未知书名";
  const author = request.author?.trim() ?? "";
  const mode: FeynmanExportMode = request.mode ?? "all";
  const content = await generateFeynmanContent({
    bookTitle,
    author,
    coverImageUrl: normalizeCoverUrl(request.coverImageUrl, options.origin),
    cards: request.cards,
    decisionExercises: request.decisionExercises?.slice(0, 3),
  });
  const template = request.templateSlug
    ? getFeynmanTemplateBySlug(request.templateSlug)
    : selectFeynmanTemplate({
        bookTitle,
        author,
        cards: request.cards,
        content,
      });
  const html = renderFeynmanHtml(content, { mode, template });
  const safeTitle = sanitizeFilename(bookTitle) || "未知书名";
  const modeLabel: Record<FeynmanExportMode, string> = {
    all: "完整",
    core: "核心观点",
    methods: "方法模型",
    decision: "决策练习",
  };

  return {
    html,
    filename: `BookLeap-${safeTitle}-${modeLabel[mode]}费曼分享页.html`,
  };
}
