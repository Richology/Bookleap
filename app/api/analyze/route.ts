import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Epub from "epub2";
import { initKf8File } from "@lingo-reader/mobi-parser";
import {
  MAX_UPLOAD_SIZE_BYTES,
  getFileTypeFromName,
  stripSupportedFileExtension,
} from "@/lib/fileFormats";
import {
  toAnalysisChapters,
} from "@/lib/bookAnalysis/context.mjs";

type ChapterItem = {
  id: string;
  title: string;
  text: string;
  summary?: string;
  analysisMeta?: {
    chapterIndex: number;
    originalChapterId: string;
    originalTitle: string;
    totalChapters: number;
    estimatedChars: number;
    positionRatio: number;
    sampleIndex: number;
    samplePosition: "opening" | "middle" | "ending" | "full";
    quoteCandidates: string[];
  };
};

type ParsedBookData = {
  title: string;
  author: string;
  coverImage?: string;
  chapters: ChapterItem[];
};

type EpubManifestItem = {
  id?: string;
  href?: string;
  title?: string;
  "media-type"?: string;
  mediaType?: string;
  properties?: string;
};

const MAX_INLINE_COVER_BYTES = 1.2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let filename: string;
    let buffer: Buffer;

    if (contentType.includes("application/json")) {
      // URL-based flow (Vercel Blob / production)
      const body = await request.json();
      const { fileUrl, filename: fn } = body as {
        fileUrl: string;
        filename: string;
      };

      if (!fileUrl || !fn) {
        return NextResponse.json(
          { success: false, error: "上传信息不完整，请重新上传这本书。" },
          { status: 400 }
        );
      }

      filename = fn;

      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        return NextResponse.json(
          { success: false, error: "文件地址已失效，请重新上传这本书。" },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await fileRes.arrayBuffer());
    } else {
      // Direct FormData flow (local dev)
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "没有收到你上传的文件，请重新选择后再试。" },
          { status: 400 }
        );
      }

      filename = file.name;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "文件超过 50MB，暂不支持上传" },
        { status: 400 }
      );
    }

    const fileType = getFileTypeFromName(filename);
    const isEpub = fileType === "epub";
    const isAzw3 = fileType === "azw3";
    const isTxt = fileType === "txt";

    if (!fileType) {
      return NextResponse.json(
        { success: false, error: "仅支持 EPUB、AZW3、TXT 或 PDF 文件" },
        { status: 400 }
      );
    }

    console.log("收到文件:", filename);

    if (isEpub) {
      const uploadDir = process.env.VERCEL
        ? "/tmp/uploads"
        : path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      const epubData = await parseEpub(filePath);
      const chapters = toAnalysisChapters(epubData.chapters);

      return NextResponse.json({
        success: true,
        type: "epub",
        mode: "full",
        filename,
        title: epubData.title,
        author: epubData.author,
        coverImage: epubData.coverImage,
        bookSummary: "",
        chapters,
      });
    }

    if (isAzw3) {
      let azw3Data: ParsedBookData;

      try {
        azw3Data = await parseAzw3(buffer, filename);
      } catch (error) {
        console.error("AZW3 解析失败:", error);
        return NextResponse.json(
          {
            success: false,
            errorCode: "AZW3_UNSUPPORTED",
            error: "这本 AZW3 暂时无法解析。常见原因是文件带有版权保护，或内部结构暂不兼容当前解析方式。",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        type: "azw3",
        mode: "full",
        filename,
        title: azw3Data.title,
        author: azw3Data.author,
        bookSummary: "",
        chapters: toAnalysisChapters(azw3Data.chapters),
      });
    }

    if (isTxt) {
      const txtTitle = stripSupportedFileExtension(filename);
      const txtChapters = parseTxt(buffer);

      return NextResponse.json({
        success: true,
        type: "txt",
        mode: "lite",
        filename,
        title: txtTitle,
        author: "",
        bookSummary: "",
        chapters: toAnalysisChapters(txtChapters),
      });
    }

    const pdfTitle = stripSupportedFileExtension(filename);
    const pdfChapters = await parsePdf(buffer);

    return NextResponse.json({
      success: true,
      type: "pdf",
      mode: "lite",
      filename,
      title: pdfTitle,
      author: "",
      bookSummary: "",
      chapters: toAnalysisChapters(pdfChapters),
    });
  } catch (error) {
    console.error("分析失败:", error);

    return NextResponse.json(
      { success: false, error: "这本书暂时无法完成解析，请重新上传后再试。" },
      { status: 500 }
    );
  }
}

function parseEpub(
  filePath: string
): Promise<ParsedBookData & { coverImage: string }> {
  return new Promise((resolve, reject) => {
    const epub = new Epub(filePath);

    epub.on("error", (err) => {
      reject(err);
    });

    epub.on("end", async () => {
      try {
        const metadataTitle = epub.metadata?.title || "未知书名";
        const metadataAuthor = normalizeMetadataText(epub.metadata?.creator || epub.metadata?.author);
        const coverImage = await getEpubCoverDataUrl(epub);
        const chapters: ChapterItem[] = [];

        for (const item of epub.flow || []) {
          if (!item.id) {
            continue;
          }

          const chapterId = item.id;
          const rawText = await getChapterText(epub, chapterId);
          const cleanText = cleanHtmlText(rawText);
          const chapterTitle =
            extractHeadingFromHtml(rawText) ||
            item.title?.trim() ||
            "未命名章节";

          if (isFrontMatterChapter(chapterId, chapterTitle)) {
            continue;
          }

          if (cleanText.length < 80) {
            continue;
          }

          chapters.push({
            id: chapterId,
            title: chapterTitle,
            text: cleanText,
          });

        }

        resolve({
          title: metadataTitle,
          author: metadataAuthor,
          coverImage,
          chapters,
        });
      } catch (err) {
        reject(err);
      }
    });

    epub.parse();
  });
}

function normalizeMetadataText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeMetadataText(item))
      .filter(Boolean)
      .join(" / ");
  }

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (value && typeof value === "object" && "text" in value) {
    return normalizeMetadataText((value as { text?: unknown }).text);
  }

  return "";
}

async function getEpubCoverDataUrl(epub: Epub): Promise<string> {
  const coverId = typeof epub.metadata?.cover === "string"
    ? epub.metadata.cover.trim()
    : "";
  const manifest = epub.manifest as Record<string, EpubManifestItem>;
  const manifestEntries = Object.entries(manifest);
  const candidateIds = new Set<string>();

  if (coverId && manifest[coverId]) {
    candidateIds.add(coverId);
  }

  manifestEntries.forEach(([id, item]) => {
    const properties = item.properties || "";
    if (properties.split(/\s+/).includes("cover-image")) {
      candidateIds.add(id);
    }
  });

  manifestEntries.forEach(([id, item]) => {
    const haystack = `${id} ${item.href ?? ""} ${item.title ?? ""}`.toLowerCase();
    if (isImageManifestItem(item) && isLikelyCoverImageName(haystack)) {
      candidateIds.add(id);
    }
  });

  manifestEntries.forEach(([id, item]) => {
    if (isImageManifestItem(item)) {
      candidateIds.add(id);
    }
  });

  for (const id of candidateIds) {
    try {
      const result = await getImageData(epub, id);
      if (!result?.data.length || result.data.byteLength > MAX_INLINE_COVER_BYTES) {
        continue;
      }

      return `data:${result.mimeType};base64,${result.data.toString("base64")}`;
    } catch {
      // Try the next candidate. EPUB cover metadata is inconsistent across publishers.
    }
  }

  return "";
}

function isImageManifestItem(item: EpubManifestItem): boolean {
  const mediaType = (item["media-type"] || item.mediaType || "").toLowerCase();
  const href = item.href?.toLowerCase() || "";

  return mediaType.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg)$/i.test(href);
}

function isLikelyCoverImageName(value: string): boolean {
  return (
    value.includes("cover") ||
    value.includes("front") ||
    value.includes("titlepage") ||
    value.includes("封面")
  );
}

function getImageData(
  epub: Epub,
  imageId: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  return new Promise((resolve) => {
    epub.getImage(imageId, (err, data, mimeType) => {
      if (err || !data || !mimeType) {
        resolve(null);
        return;
      }

      resolve({ data, mimeType });
    });
  });
}

async function parseAzw3(
  buffer: Buffer,
  filename: string
): Promise<ParsedBookData> {
  const kf8 = await initKf8File(new Uint8Array(buffer));

  try {
    const metadata = kf8.getMetadata();
    const title = metadata?.title?.trim() || stripSupportedFileExtension(filename);
    const author = normalizeMetadataText(metadata?.author);
    const tocTitleById = new Map<string, string>();
    const walkToc = (items: Array<{ label: string; href: string; children?: Array<{ label: string; href: string; children?: unknown[] }> }>) => {
      items.forEach((item) => {
        const resolved = kf8.resolveHref(item.href);
        if (resolved?.id && item.label?.trim()) {
          tocTitleById.set(resolved.id, item.label.trim());
        }
        if (item.children?.length) {
          walkToc(item.children as Array<{ label: string; href: string; children?: Array<{ label: string; href: string; children?: unknown[] }> }>);
        }
      });
    };

    walkToc(kf8.getToc() || []);

    const chapters: ChapterItem[] = [];
    for (const [index, item] of kf8.getSpine().entries()) {
      const chapter = kf8.loadChapter(item.id);
      if (!chapter?.html) continue;

      const text = cleanHtmlText(chapter.html);
      if (text.length < 80) continue;

      chapters.push({
        id: item.id,
        title:
          tocTitleById.get(item.id) ||
          extractHeadingFromHtml(chapter.html) ||
          `第 ${index + 1} 章`,
        text,
      });
    }

    if (chapters.length === 0) {
      throw new Error("未提取到可用章节");
    }

    return { title, author, chapters };
  } finally {
    kf8.destroy();
  }
}

function getChapterText(epub: Epub, chapterId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, text) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(text || "");
    });
  });
}

function parseTxt(buffer: Buffer): ChapterItem[] {
  const fullText = decodeTextBuffer(buffer)
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!fullText) return [];

  const headingPattern =
    /^(第[0-9一二三四五六七八九十百千万零两〇]+[章节回部卷篇][^\n]{0,24}|chapter\s+\d+[^\n]{0,24}|prologue|epilogue)$/i;
  const lines = fullText.split("\n");
  const groupedSections: Array<{ title: string; text: string }> = [];

  let currentTitle = "开篇";
  let currentLines: string[] = [];

  const pushSection = () => {
    const text = currentLines.join("\n").trim();
    if (text.length < 80) return;
    groupedSections.push({ title: currentTitle, text });
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      currentLines.push("");
      return;
    }

    if (headingPattern.test(trimmed) && currentLines.join("").trim().length > 0) {
      pushSection();
      currentTitle = trimmed;
      currentLines = [];
      return;
    }

    if (headingPattern.test(trimmed) && currentLines.length === 0) {
      currentTitle = trimmed;
      return;
    }

    currentLines.push(trimmed);
  });

  pushSection();

  if (groupedSections.length > 0) {
    return groupedSections.map((section, index) => ({
      id: `txt-${index + 1}`,
      title: section.title || `第 ${index + 1} 部分`,
      text: section.text,
    }));
  }

  return chunkPlainText(fullText, "txt");
}

async function parsePdf(buffer: Buffer): Promise<ChapterItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string }>;

    const data = await pdfParse(buffer);
    const fullText = (data.text || "").trim();

    if (!fullText) return [];

    return chunkPlainText(fullText, "pdf");
  } catch (err) {
    console.error("PDF 文本提取失败:", err);
    return [];
  }
}

function chunkPlainText(fullText: string, prefix: "pdf" | "txt"): ChapterItem[] {
  const CHUNK_SIZE = 6000;
  const chunks: ChapterItem[] = [];
  const totalChunks = Math.ceil(fullText.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const text = fullText
      .slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      .trim();
    if (text.length > 50) {
      chunks.push({
        id: `${prefix}-p${i + 1}`,
        title: `第 ${i + 1} 部分`,
        text,
      });
    }
  }

  return chunks;
}

function decodeTextBuffer(buffer: Buffer): string {
  const encodings = ["utf-8", "utf-16le", "gb18030"] as const;
  let best = "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const encoding of encodings) {
    try {
      const decoded = new TextDecoder(encoding).decode(buffer);
      const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
      const nullCount = (decoded.match(/\u0000/g) || []).length;
      const score = replacementCount * 10 + nullCount;

      if (decoded.trim() && score < bestScore) {
        best = decoded;
        bestScore = score;
      }
    } catch {
      // ignore unsupported decoder errors
    }
  }

  return (best || buffer.toString("utf8")).trim();
}

function extractHeadingFromHtml(html: string): string | null {
  const headingMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!headingMatch?.[1]) return null;

  const heading = cleanHtmlText(headingMatch[1]).slice(0, 80).trim();
  return heading || null;
}

function cleanHtmlText(html: string): string {
  return decodeHtmlEntities(html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      if (!Number.isFinite(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    })
    .replace(/&#(\d+);/g, (match, decimal) => {
      const codePoint = Number.parseInt(decimal, 10);
      if (!Number.isFinite(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function isFrontMatterChapter(chapterId: string, title: string): boolean {
  const normalizedId = chapterId.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (/^(cover|halftitle|titlepage|copyright|content|toc|index|preface|foreword|acknowledg|contributor|contributors|about)/i.test(normalizedId)) {
    return true;
  }

  if (normalizedId.startsWith("fm-")) {
    return true;
  }

  return /^(cover|halftitle|titlepage|copyright|contents?|contributors?|index|preface|foreword)$/i.test(normalizedTitle);
}
