import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Epub from "epub2";
import { initKf8File } from "@lingo-reader/mobi-parser";
import { generateBookSummary } from "@/lib/skills/generateBookSummary";
import {
  MAX_UPLOAD_SIZE_BYTES,
  getFileTypeFromName,
  stripSupportedFileExtension,
} from "@/lib/fileFormats";

type ChapterItem = {
  id: string;
  title: string;
  text: string;
};

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
      const bookSummary = await generateBookSummaryWithFallback(
        epubData.title,
        epubData.chapters
      );

      return NextResponse.json({
        success: true,
        type: "epub",
        mode: "full",
        filename,
        title: epubData.title,
        bookSummary,
        chapters: epubData.chapters,
      });
    }

    if (isAzw3) {
      let azw3Data: { title: string; chapters: ChapterItem[] };

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

      const bookSummary = await generateBookSummaryWithFallback(
        azw3Data.title,
        azw3Data.chapters
      );

      return NextResponse.json({
        success: true,
        type: "azw3",
        mode: "full",
        filename,
        title: azw3Data.title,
        bookSummary,
        chapters: azw3Data.chapters,
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
        bookSummary: "",
        chapters: txtChapters,
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
      bookSummary: "",
      chapters: pdfChapters,
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
): Promise<{ title: string; chapters: ChapterItem[] }> {
  return new Promise((resolve, reject) => {
    const epub = new Epub(filePath);

    epub.on("error", (err) => {
      reject(err);
    });

    epub.on("end", async () => {
      try {
        const metadataTitle = epub.metadata?.title || "未知书名";
        const chapters: ChapterItem[] = [];

        for (const item of epub.flow || []) {
          if (!item.id) {
            continue;
          }

          const chapterId = item.id;
          const rawText = await getChapterText(epub, chapterId);
          const cleanText = cleanHtmlText(rawText).slice(0, 3000);
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

          if (chapters.length >= 8) {
            break;
          }
        }

        resolve({
          title: metadataTitle,
          chapters,
        });
      } catch (err) {
        reject(err);
      }
    });

    epub.parse();
  });
}

async function parseAzw3(
  buffer: Buffer,
  filename: string
): Promise<{ title: string; chapters: ChapterItem[] }> {
  const kf8 = await initKf8File(new Uint8Array(buffer));

  try {
    const metadata = kf8.getMetadata();
    const title = metadata?.title?.trim() || stripSupportedFileExtension(filename);
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
    for (const [index, item] of kf8.getSpine().slice(0, 8).entries()) {
      const chapter = kf8.loadChapter(item.id);
      if (!chapter?.html) continue;

      const text = cleanHtmlText(chapter.html).slice(0, 3000);
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

    return { title, chapters };
  } finally {
    kf8.destroy();
  }
}

async function generateBookSummaryWithFallback(
  title: string,
  chapters: ChapterItem[]
): Promise<string> {
  const chapterContextForSummary = chapters.map((chapter, index) => ({
    index: index + 1,
    title: chapter.title,
    summary: chapter.text.slice(0, 800),
  }));

  try {
    return await generateBookSummary(title, chapterContextForSummary);
  } catch (error) {
    console.error("全书摘要生成失败，使用备用摘要:", error);
    return buildFallbackBookSummary(title, chapters);
  }
}

function buildFallbackBookSummary(
  title: string,
  chapters: ChapterItem[]
): string {
  const chapterTitles = chapters
    .map((chapter) => chapter.title.trim())
    .filter(Boolean)
    .slice(0, 3);

  const chapterSnippets = chapters
    .map((chapter) => chapter.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => text.slice(0, 48));

  const titleLine = chapterTitles.length > 0
    ? `《${title}》当前已提取出 ${chapters.length} 个核心章节，内容主要围绕 ${chapterTitles.join("、")} 展开。`
    : `《${title}》当前已提取出 ${chapters.length} 个核心章节，已经可以进入阅读与后续分析。`;

  const excerptLine = chapterSnippets.length > 0
    ? `先给你一版提取摘要：${chapterSnippets.join(" / ")}。`
    : "当前摘要服务暂时不可用，但正文内容已经成功提取。";

  return `${titleLine}${excerptLine}`.slice(0, 220);
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
    return groupedSections.slice(0, 8).map((section, index) => ({
      id: `txt-${index + 1}`,
      title: section.title || `第 ${index + 1} 部分`,
      text: section.text.slice(0, 3000),
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
  const CHUNK_SIZE = 3000;
  const chunks: ChapterItem[] = [];
  const totalChunks = Math.min(8, Math.ceil(fullText.length / CHUNK_SIZE));

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
