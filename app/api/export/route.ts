import { NextResponse } from "next/server";
import JSZip from "jszip";

const BRAND = "书跃 · BookLeap";
const SLOGAN = "从好书中完成认知跃迁";
const CHINESE_NUMS = ["一", "二", "三", "四", "五", "六", "七", "八"];
const DEFAULT_TAGS = ["bookleap", "reading", "second-brain"];

type SectionItem = {
  id: string;
  title: string;
  content: string;
};

type ExportRequestBody = {
  bookTitle: string;
  fileType: "epub" | "pdf" | "azw3" | "txt";
  mode: "full" | "lite";
  target?: "obsidian" | "notion" | "markdown" | "json";
  format: "md" | "txt" | "json";
  structure: "multi" | "single";
  sections: SectionItem[];
};

function sanitize(name: string): string {
  const sanitized = name
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[/\\:*?"<>|[\]#^]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || "未命名书籍";
}

function escapeYaml(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function yamlString(value: string): string {
  return `"${escapeYaml(value)}"`;
}

function buildFrontmatter(values: Record<string, string | string[]>): string {
  const lines = Object.entries(values).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.map(yamlString).join(", ")}]`;
    }
    return `${key}: ${yamlString(value)}`;
  });

  return `---\n${lines.join("\n")}\n---\n\n`;
}

function stripMarkdownHeading(content: string, title: string): string {
  const pattern = new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`);
  return content.replace(pattern, "").trim();
}

function getSectionFileBase(bookTitle: string, sectionTitle: string, index: number): string {
  const idx = String(index + 1).padStart(2, "0");
  return sanitize(`${bookTitle} - ${idx} - ${sectionTitle}`);
}

function mdToTxt(md: string): string {
  return md
    .replace(/^#{1,6}\s+(.+)$/gm, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "• ")
    .replace(/^[\s]*\d+\.\s+/gm, (m) => m.trimStart())
    .replace(/^---+$/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildJsonPayload({
  bookTitle,
  fileType,
  mode,
  target,
  sections,
}: {
  bookTitle: string;
  fileType: ExportRequestBody["fileType"];
  mode: ExportRequestBody["mode"];
  target: NonNullable<ExportRequestBody["target"]>;
  sections: SectionItem[];
}) {
  return {
    meta: {
      title: bookTitle || "未知书名",
      fileType,
      mode,
      target,
      exportedAt: new Date().toISOString(),
      brand: BRAND,
      slogan: SLOGAN,
      tags: DEFAULT_TAGS,
    },
    sections: sections.map(({ id, title, content }) => ({ id, title, content })),
  };
}

function addObsidianFiles(folder: JSZip, safeTitle: string, bookTitle: string, sections: SectionItem[]) {
  const indexTitle = bookTitle || "未知书名";
  const sectionFiles = sections.map((section, index) => ({
    ...section,
    fileBase: getSectionFileBase(indexTitle, section.title, index),
  }));

  const indexFrontmatter = buildFrontmatter({
    source: BRAND,
    type: "book-index",
    book: indexTitle,
    tags: DEFAULT_TAGS,
  });
  const indexBody = [
    `# ${indexTitle}`,
    "",
    `> 本知识包由「${BRAND}」生成。${SLOGAN}。`,
    "",
    "## 知识卡片",
    ...sectionFiles.map(({ fileBase }) => `- [[${fileBase}]]`),
    "",
    "## 使用边界",
    "这些内容是书跃生成的结构化阅读成果，适合进入个人知识库继续加工；它不是电子书原文迁移，也不替代完整阅读。",
  ].join("\n");

  folder.file(`${safeTitle}.md`, `${indexFrontmatter}${indexBody}`);

  sectionFiles.forEach(({ id, title, content, fileBase }, index) => {
    const cardFrontmatter = buildFrontmatter({
      source: BRAND,
      type: "book-card",
      book: indexTitle,
      card: title,
      card_id: id,
      tags: [...DEFAULT_TAGS, "book-card"],
    });
    const body = [
      `# ${title}`,
      "",
      `> 来源书籍：[[${safeTitle}]]`,
      "",
      stripMarkdownHeading(content, title),
      "",
      "## 关联",
      `- 书籍总览：[[${safeTitle}]]`,
      ...sectionFiles
        .filter((_, relatedIndex) => relatedIndex !== index)
        .map((related) => `- [[${related.fileBase}]]`),
    ].join("\n");

    folder.file(`${fileBase}.md`, `${cardFrontmatter}${body.trim()}\n`);
  });
}

function toCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildNotionCsv(
  bookTitle: string,
  mode: ExportRequestBody["mode"],
  sections: SectionItem[]
): string {
  const rows = [
    ["标题", "书籍", "卡片类型", "标签", "内容", "来源", "分析模式"],
    ...sections.map(({ title, content }) => [
      title,
      bookTitle || "未知书名",
      "书籍知识卡",
      DEFAULT_TAGS.join(", "),
      mdToTxt(content),
      BRAND,
      mode === "lite" ? "Lite" : "Full",
    ]),
  ];

  return rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
}

function buildNotionMarkdown(bookTitle: string, fileType: ExportRequestBody["fileType"], mode: ExportRequestBody["mode"], sections: SectionItem[]) {
  const title = bookTitle || "未知书名";
  const lines = [
    `# ${title}`,
    "",
    "## 元信息",
    "",
    `- 来源：${BRAND}`,
    `- 类型：书籍知识包`,
    `- 文件类型：${fileType.toUpperCase()}`,
    `- 分析模式：${mode === "lite" ? "Lite" : "Full"}`,
    `- 标签：${DEFAULT_TAGS.map((tag) => `#${tag}`).join(" ")}`,
    "",
    "## 导入方式",
    "",
    "此文件导入 Notion 后会成为书籍总览页；同目录的「知识卡片.csv」会导入为数据库，每一张卡片对应一个条目。内容不是电子书原文迁移。",
    "",
    "## 目录",
    "",
    ...sections.map(({ title: sectionTitle }, index) => {
      const num = CHINESE_NUMS[index] ?? `${index + 1}`;
      return `- ${num}、${sectionTitle}`;
    }),
    "",
    "---",
    "",
  ];

  sections.forEach(({ title: sectionTitle, content }, index) => {
    const num = CHINESE_NUMS[index] ?? `${index + 1}`;
    lines.push(`## ${num}、${sectionTitle}`, "", stripMarkdownHeading(content, sectionTitle), "", "---", "");
  });

  return lines.join("\n").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;
    const {
      bookTitle,
      fileType = "epub",
      mode = "full",
      format = "md",
      target = format === "json" ? "json" : "markdown",
      structure = "multi",
      sections = [],
    } = body;

    if (sections.length === 0) {
      return NextResponse.json({ success: false, error: "请至少选择一张有内容的卡片" }, { status: 400 });
    }

    const safeTitle = sanitize(bookTitle || "未知书名");
    const zipName = `BookLeap-${safeTitle}-知识包`;

    const zip = new JSZip();
    const folder = zip.folder(zipName)!;

    // ── JSON ──────────────────────────────────────────────
    if (format === "json" || target === "json") {
      const payload = buildJsonPayload({ bookTitle, fileType, mode, target: "json", sections });
      folder.file(
        `BookLeap-${safeTitle}-知识包.json`,
        JSON.stringify(payload, null, 2)
      );

    // ── Obsidian vault-friendly Markdown ─────────────────
    } else if (target === "obsidian") {
      addObsidianFiles(folder, safeTitle, bookTitle, sections);

    // ── Notion import-friendly Markdown ──────────────────
    } else if (target === "notion") {
      folder.file(
        `BookLeap-${safeTitle}-书籍总览.md`,
        buildNotionMarkdown(bookTitle, fileType, mode, sections)
      );
      folder.file(
        `BookLeap-${safeTitle}-知识卡片.csv`,
        buildNotionCsv(bookTitle, mode, sections)
      );

    // ── Single merged file ────────────────────────────────
    } else if (structure === "single") {
      const ext = format === "txt" ? "txt" : "md";
      let merged = "";

      if (format === "md") {
        merged += `# ${bookTitle || "未知书名"}\n\n`;
        merged += `> 本知识包由「${BRAND}」生成\n> ${SLOGAN}\n\n---\n\n`;
        sections.forEach(({ title, content }, i) => {
          const num = CHINESE_NUMS[i] ?? `${i + 1}`;
          merged += `## ${num}、${title}\n\n${content}\n\n---\n\n`;
        });
      } else {
        merged += `${bookTitle || "未知书名"}\n\n`;
        merged += `本知识包由「${BRAND}」生成\n${SLOGAN}\n\n`;
        merged += `${"=".repeat(36)}\n\n`;
        sections.forEach(({ title, content }, i) => {
          const num = CHINESE_NUMS[i] ?? `${i + 1}`;
          const bar = "=".repeat(Math.max(title.length * 2, 16));
          merged += `${num}、${title}\n${bar}\n\n${mdToTxt(content)}\n\n${"=".repeat(36)}\n\n`;
        });
      }

      folder.file(`BookLeap-${safeTitle}-知识包.${ext}`, merged.trim());

    // ── Multi-file ────────────────────────────────────────
    } else {
      const ext = format === "txt" ? "txt" : "md";

      sections.forEach(({ title, content }, i) => {
        const idx = String(i + 1).padStart(2, "0");
        let fileContent = "";

        if (format === "md") {
          fileContent =
            `# ${title}\n\n` +
            `> 本知识包由「${BRAND}」生成\n> ${SLOGAN}\n\n---\n\n` +
            content;
        } else {
          const bar = "=".repeat(Math.max(title.length * 2, 16));
          fileContent =
            `${title}\n${bar}\n\n` +
            `本知识包由「${BRAND}」生成\n${SLOGAN}\n\n` +
            `${"=".repeat(36)}\n\n` +
            mdToTxt(content);
        }

        folder.file(`${safeTitle}-${idx}-${title}.${ext}`, fileContent);
      });
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipBytes = new Uint8Array(zipBuffer);

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}.zip"`,
      },
    });
  } catch (error) {
    console.error("导出失败:", error);
    return NextResponse.json({ success: false, error: "导出失败" }, { status: 500 });
  }
}
