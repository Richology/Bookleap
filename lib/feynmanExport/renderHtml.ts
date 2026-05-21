import type {
  FeynmanExportMode,
  FeynmanHtmlContent,
  FeynmanSlidePreset,
  FeynmanTemplateChoice,
} from "./types";

const TEMPLATE_SOURCE =
  "Template selected from Richology/beautiful-html-templates metadata and applied as a BookLeap offline HTML theme.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function stripDangerousUrl(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^javascript:/i.test(trimmed)) return "";
  return trimmed;
}

function paragraph(value: string): string {
  return `<p>${escapeHtml(value)}</p>`;
}

function renderSlideBody(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const numberedItems = normalized
    .replace(/\s+(\d+[.)、])\s*/g, "\n$1 ")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (numberedItems.length >= 2 && numberedItems.every((item) => /^\d+[.)、]\s+/.test(item))) {
    return `<ol>${numberedItems
      .map((item) => `<li>${escapeHtml(item.replace(/^\d+[.)、]\s+/, ""))}</li>`)
      .join("")}</ol>`;
  }

  const lineItems = value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (lineItems.length >= 2) {
    return lineItems.map((item) => paragraph(item)).join("");
  }

  const sentenceItems = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalized];
  return sentenceItems
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => paragraph(item))
    .join("");
}

type SlideLayout =
  | "layout-split"
  | "layout-statement"
  | "layout-panel"
  | "layout-stack"
  | "layout-list"
  | "layout-poster"
  | "layout-tiles"
  | "layout-table"
  | "layout-ribbon";

const TEMPLATE_PRESET_LAYOUTS: Partial<
  Record<FeynmanTemplateChoice["slug"], Partial<Record<FeynmanSlidePreset, SlideLayout[]>>>
> = {
  "editorial-forest": {
    problem: ["layout-split", "layout-stack"],
    idea: ["layout-stack", "layout-statement"],
    method: ["layout-panel", "layout-table"],
    case: ["layout-split", "layout-panel"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement", "layout-poster"],
    summary: ["layout-ribbon", "layout-statement"],
  },
  cartesian: {
    problem: ["layout-statement", "layout-stack"],
    idea: ["layout-split", "layout-stack"],
    method: ["layout-table", "layout-list"],
    case: ["layout-panel", "layout-split"],
    list: ["layout-table", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-stack", "layout-ribbon"],
  },
  "soft-editorial": {
    problem: ["layout-statement", "layout-stack"],
    idea: ["layout-stack", "layout-split"],
    method: ["layout-panel", "layout-table"],
    case: ["layout-split", "layout-panel"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement", "layout-poster"],
    summary: ["layout-ribbon", "layout-stack"],
  },
  vellum: {
    problem: ["layout-statement", "layout-panel"],
    idea: ["layout-table", "layout-stack"],
    method: ["layout-table", "layout-list"],
    case: ["layout-panel", "layout-split"],
    list: ["layout-table", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-poster"],
  },
  signal: {
    problem: ["layout-panel", "layout-split"],
    idea: ["layout-table", "layout-stack"],
    method: ["layout-table", "layout-list"],
    case: ["layout-panel", "layout-table"],
    list: ["layout-list", "layout-table"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-panel"],
  },
  "blue-professional": {
    problem: ["layout-split", "layout-panel"],
    idea: ["layout-table", "layout-stack"],
    method: ["layout-list", "layout-table"],
    case: ["layout-panel", "layout-split"],
    list: ["layout-list", "layout-tiles"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-stack"],
  },
  "cobalt-grid": {
    problem: ["layout-table", "layout-split"],
    idea: ["layout-table", "layout-ribbon"],
    method: ["layout-tiles", "layout-table"],
    case: ["layout-panel", "layout-split"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-poster"],
  },
  "biennale-yellow": {
    problem: ["layout-poster", "layout-statement"],
    idea: ["layout-statement", "layout-stack"],
    method: ["layout-ribbon", "layout-panel"],
    case: ["layout-split", "layout-panel"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-poster", "layout-statement"],
    summary: ["layout-ribbon", "layout-poster"],
  },
  "stencil-tablet": {
    problem: ["layout-tiles", "layout-panel"],
    idea: ["layout-table", "layout-split"],
    method: ["layout-tiles", "layout-list"],
    case: ["layout-panel", "layout-table"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-panel"],
  },
  broadside: {
    problem: ["layout-poster", "layout-statement"],
    idea: ["layout-statement", "layout-ribbon"],
    method: ["layout-panel", "layout-table"],
    case: ["layout-split", "layout-panel"],
    list: ["layout-list", "layout-tiles"],
    quote: ["layout-poster"],
    summary: ["layout-poster", "layout-ribbon"],
  },
  "bold-poster": {
    problem: ["layout-poster", "layout-statement"],
    idea: ["layout-poster", "layout-ribbon"],
    method: ["layout-panel", "layout-list"],
    case: ["layout-split", "layout-panel"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-poster"],
    summary: ["layout-poster", "layout-ribbon"],
  },
  "raw-grid": {
    problem: ["layout-tiles", "layout-table"],
    idea: ["layout-table", "layout-tiles"],
    method: ["layout-list", "layout-tiles"],
    case: ["layout-panel", "layout-table"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-table"],
  },
  scatterbrain: {
    problem: ["layout-tiles", "layout-stack"],
    idea: ["layout-tiles", "layout-panel"],
    method: ["layout-list", "layout-tiles"],
    case: ["layout-panel", "layout-split"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-stack"],
  },
  capsule: {
    problem: ["layout-tiles", "layout-split"],
    idea: ["layout-panel", "layout-stack"],
    method: ["layout-list", "layout-tiles"],
    case: ["layout-split", "layout-panel"],
    list: ["layout-tiles", "layout-list"],
    quote: ["layout-statement"],
    summary: ["layout-ribbon", "layout-stack"],
  },
};

const DEFAULT_PRESET_LAYOUTS: Record<FeynmanSlidePreset, SlideLayout[]> = {
  problem: ["layout-split", "layout-stack"],
  idea: ["layout-stack", "layout-statement"],
  method: ["layout-panel", "layout-table"],
  case: ["layout-split", "layout-panel"],
  list: ["layout-list", "layout-tiles"],
  quote: ["layout-statement", "layout-poster"],
  summary: ["layout-ribbon", "layout-statement"],
};

const SLIDE_PRESET_LABELS: Record<FeynmanSlidePreset, string> = {
  problem: "问题",
  idea: "观点",
  method: "方法",
  case: "案例",
  list: "清单",
  quote: "金句",
  summary: "总结",
};

function inferSlidePreset(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  index: number,
  total: number
): FeynmanSlidePreset {
  if (slide.preset) return slide.preset;
  if (index === 0) return "problem";
  if (index >= total - 1) return "summary";

  const text = `${slide.title} ${slide.body} ${slide.note ?? ""}`;
  if (/最后|带走|总结|收束|结论|一句话/.test(text)) return "summary";
  if (/案例|场景|现实|比如|例如|放进|检验/.test(text)) return "case";
  if (/方法|模型|步骤|行动|怎么做|练习|原则|工具/.test(text)) return "method";
  if (/\d+[.)、]\s+/.test(slide.body) || /清单|列表|三步|四步|要点/.test(text)) return "list";
  if (slide.title.length <= 12 && slide.body.replace(/\s+/g, "").length <= 120) return "quote";
  return "idea";
}

function getSlideLayoutClass(
  index: number,
  body: string,
  preset: FeynmanSlidePreset,
  template: FeynmanTemplateChoice
): SlideLayout {
  const hasList = /\d+[.)、]\s+/.test(body);
  const layouts =
    TEMPLATE_PRESET_LAYOUTS[template.slug]?.[preset] ??
    DEFAULT_PRESET_LAYOUTS[preset] ??
    DEFAULT_PRESET_LAYOUTS.idea;
  if (hasList && preset !== "quote" && layouts.includes("layout-list")) return "layout-list";
  return layouts[index % layouts.length];
}

function getSlideDensityClass(body: string): string {
  const compactLength = body.replace(/\s+/g, "").length;
  const numberedCount = body.match(/\d+[.)、]\s+/g)?.length ?? 0;
  const sentenceCount = body.match(/[。！？!?；;]/g)?.length ?? 0;
  const structureCount = Math.max(numberedCount, sentenceCount);

  if (compactLength >= 220 || structureCount >= 6) return "density-dense";
  if (compactLength >= 150 || structureCount >= 4) return "density-comfy";
  return "density-normal";
}

type RenderedChapter = {
  key: string;
  title: string;
  html: string;
};

const MODE_LABELS: Record<FeynmanExportMode, string> = {
  all: "完整讲解",
  core: "核心观点",
  methods: "方法模型",
  decision: "决策练习",
};

const DEFAULT_TEMPLATE: FeynmanTemplateChoice = {
  slug: "editorial-forest",
  name: "Editorial Forest",
  tagline: "Forest green, dusty pink, and warm cream meet Source Serif 4 in a quiet, intentional quarterly-review deck.",
  bestFor: "Anything that should feel like a considered editorial: research recaps, book or program announcements, and thoughtful readouts.",
  reason: "默认书籍讲解模板，兼顾书卷气和演示可读性。",
  mood: ["editorial", "quiet", "warm"],
  scheme: "light",
  density: "medium",
  colors: {
    paper: "#f7f4ec",
    panel: "#fbfaf6",
    ink: "#181d1a",
    muted: "#636862",
    faint: "#8b918a",
    line: "rgba(24, 29, 26, 0.12)",
    primary: "#243f2b",
    accent: "#d89aa4",
    accentSoft: "#f2d9dc",
    finalBg: "#243f2b",
    finalText: "#f2d9dc",
  },
};

function getFontStack(template: FeynmanTemplateChoice) {
  const serif =
    'Georgia, "Songti SC", "Noto Serif SC", "Times New Roman", serif';
  const sans =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
  const condensed =
    '"Arial Narrow", "PingFang SC", "Microsoft YaHei", sans-serif';
  const mono =
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';

  if (["cartesian", "soft-editorial", "vellum", "biennale-yellow"].includes(template.slug)) {
    return { display: serif, body: sans, mono };
  }

  if (["broadside", "bold-poster", "stencil-tablet", "raw-grid"].includes(template.slug)) {
    return { display: condensed, body: sans, mono };
  }

  return { display: sans, body: sans, mono };
}

function renderCover(content: FeynmanHtmlContent): string {
  const coverUrl = stripDangerousUrl(content.coverImageUrl);
  const author = content.author ? `作者：${escapeHtml(content.author)}` : "费曼讲解分享页";

  return `
    <section class="chapter chapter-cover" data-slide-title="封面">
      <p class="deck-brand">书跃 BookLeap</p>
      <div class="cover-copy">
        <h1>${escapeHtml(content.bookTitle)}</h1>
        <p class="subtitle">${author}</p>
      </div>
      ${
        coverUrl
          ? `<figure class="cover-art"><img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(content.bookTitle)} 封面" /></figure>`
          : `<div class="cover-art cover-art-empty" aria-hidden="true"><span>书跃</span></div>`
      }
    </section>`;
}

function renderOverview(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter" data-slide-title="总体概述">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">01 / 总体概述</p>
      <h2>这本书先解决一个什么问题？</h2>
      <div class="prose">${paragraph(content.overview)}</div>
    </section>`;
}

function renderPresentationSlide(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  index: number,
  total: number,
  template: FeynmanTemplateChoice
): string {
  const preset = inferSlidePreset(slide, index, total);
  const layoutClass = getSlideLayoutClass(index, slide.body, preset, template);
  const densityClass = getSlideDensityClass(slide.body);
  const slideNumber = String(index + 1).padStart(2, "0");

  return `
    <section class="chapter presentation-slide ${layoutClass} ${densityClass} preset-${preset}" data-slide-title="${escapeAttr(slide.title)}" data-slide-preset="${escapeAttr(preset)}">
      <p class="deck-brand">书跃 BookLeap</p>
      <span class="slide-decoration" aria-hidden="true"></span>
      <span class="slide-number" aria-hidden="true">${slideNumber}</span>
      <p class="eyebrow">${slideNumber} / ${SLIDE_PRESET_LABELS[preset]}</p>
      <p class="slide-preset-label">${SLIDE_PRESET_LABELS[preset]}</p>
      <h2>${escapeHtml(slide.title)}</h2>
      <div class="slide-body">${renderSlideBody(slide.body)}</div>
    </section>`;
}

function renderAgenda(chapters: RenderedChapter[]): string {
  const items = chapters.filter((chapter) => chapter.key !== "cover");
  if (items.length === 0) return "";

  return `
    <section class="chapter agenda-slide" data-slide-title="目录概览">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">00 / 目录概览</p>
      <h2>这场分享会怎么讲？</h2>
      <div class="agenda-grid">
        ${items
          .map(
            (chapter, index) => `
              <article class="agenda-item">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <p>${escapeHtml(chapter.title)}</p>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderCoreIdeas(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter" data-slide-title="核心观点">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">02 / 核心观点</p>
      <h2>可以直接讲给别人的几句话</h2>
      <div class="idea-list">
        ${content.coreIdeas
          .map(
            (idea, index) => `
              <article class="idea-row fold-card" data-fold-card>
                <span class="num">${String(index + 1).padStart(2, "0")}</span>
                <div>
                  <button type="button" class="fold-head" aria-expanded="true">
                    <span>${escapeHtml(idea.title)}</span>
                    <span class="fold-mark" aria-hidden="true">+</span>
                  </button>
                  <div class="fold-body"><p>${escapeHtml(idea.explanation)}</p></div>
                </div>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderMethods(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter chapter-accent" data-slide-title="方法总结">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">03 / 方法总结</p>
      <h2>读完以后，具体怎么用？</h2>
      <div class="prose">${paragraph(content.methodsSummary)}</div>
    </section>`;
}

function renderModels(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter" data-slide-title="关键模型">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">04 / 关键模型</p>
      <h2>把观点变成可复用的模型</h2>
      <div class="model-grid">
        ${content.keyModels
          .map(
            (model) => `
              <article class="model-card fold-card" data-fold-card>
                <button type="button" class="fold-head" aria-expanded="true">
                  <span>${escapeHtml(model.name)}</span>
                  <span class="fold-mark" aria-hidden="true">+</span>
                </button>
                <div class="fold-body"><p>${escapeHtml(model.description)}</p></div>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderExamples(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter" data-slide-title="使用场景">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">05 / 使用场景</p>
      <h2>放进现实里，才知道有没有懂</h2>
      <div class="example-list">
        ${content.examples
          .map(
            (example) => `
              <article class="example-row fold-card" data-fold-card>
                <button type="button" class="fold-head" aria-expanded="true">
                  <span>${escapeHtml(example.scenario)}</span>
                  <span class="fold-mark" aria-hidden="true">+</span>
                </button>
                <div class="fold-body"><p>${escapeHtml(example.insight)}</p></div>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderExercises(content: FeynmanHtmlContent): string {
  if (!content.decisionExercises || content.decisionExercises.length === 0) return "";

  return `
    <section class="chapter" data-slide-title="决策练习">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">06 / 决策练习</p>
      <h2>最后，用一个选择检验理解</h2>
      <div class="exercise-list">
        ${content.decisionExercises
          .map(
            (exercise) => `
              <article class="exercise-card fold-card" data-fold-card>
                <button type="button" class="fold-head" aria-expanded="true">
                  <span>${escapeHtml(exercise.question)}</span>
                  <span class="fold-mark" aria-hidden="true">+</span>
                </button>
                <div class="fold-body">
                  <p class="scene">${escapeHtml(exercise.scene)}</p>
                  <div class="option-grid">
                    <div><b>A</b><span>${escapeHtml(exercise.options.A)}</span><small>${escapeHtml(exercise.feedback.A)}</small></div>
                    <div><b>B</b><span>${escapeHtml(exercise.options.B)}</span><small>${escapeHtml(exercise.feedback.B)}</small></div>
                  </div>
                </div>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderFinal(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter chapter-final" data-slide-title="结语">
      <p class="deck-brand">书跃 BookLeap</p>
      <p class="eyebrow">Final / 结语</p>
      <h2>一句话带走</h2>
      <blockquote>${escapeHtml(content.finalTakeaway)}</blockquote>
      <p class="signature">书跃 · BookLeap</p>
    </section>`;
}

function renderStyles(template: FeynmanTemplateChoice): string {
  const fonts = getFontStack(template);

  return `
    :root {
      --paper: ${template.colors.paper};
      --paper-deep: ${template.colors.accentSoft};
      --ink: ${template.colors.ink};
      --muted: ${template.colors.muted};
      --faint: ${template.colors.faint};
      --line: ${template.colors.line};
      --forest: ${template.colors.primary};
      --leaf: ${template.colors.primary};
      --rose: ${template.colors.accent};
      --rose-soft: ${template.colors.accentSoft};
      --panel: ${template.colors.panel};
      --panel-soft: ${template.colors.accentSoft};
      --final-bg: ${template.colors.finalBg};
      --final-text: ${template.colors.finalText};
      --display-font: ${fonts.display};
      --body-font: ${fonts.body};
      --mono-font: ${fonts.mono};
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: var(--body-font);
      line-height: 1.65;
    }

    .toolbar {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 50;
      display: flex;
      gap: 8px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(251, 250, 246, 0.92);
      box-shadow: 0 14px 34px rgba(24, 29, 26, 0.11);
      backdrop-filter: blur(12px);
    }

    .toolbar button {
      height: 34px;
      border: 0;
      border-radius: 8px;
      padding: 0 12px;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
    }

    .toolbar button:hover,
    .toolbar button[aria-pressed="true"] {
      background: var(--forest);
      color: var(--panel);
    }

    main {
      width: min(100%, 1120px);
      margin: 0 auto;
      padding: 34px 22px 72px;
    }

    .chapter {
      position: relative;
      min-height: min(860px, calc(100vh - 48px));
      margin: 0 0 22px;
      padding: clamp(34px, 5vw, 72px);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
      box-shadow: 0 10px 28px rgba(24, 29, 26, 0.045);
    }

    .chapter::after {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: 4px;
      background: linear-gradient(90deg, var(--forest), var(--rose), transparent);
      opacity: 0.72;
    }

    .deck-brand {
      display: none;
      margin: 0;
      color: var(--faint);
      font-family: var(--mono-font);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .chapter-cover {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.62fr);
      gap: clamp(28px, 5vw, 72px);
      align-items: center;
      background: var(--forest);
      color: var(--rose-soft);
    }

    .chapter-cover::after { background: var(--rose); }
    .chapter-cover .deck-brand { color: var(--rose-soft); }
    .cover-copy { max-width: 720px; }
    .eyebrow {
      margin: 0 0 18px;
      color: var(--faint);
      font-size: 12px;
      font-weight: 750;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-family: var(--mono-font);
    }
    .chapter-cover .eyebrow,
    .chapter-cover .subtitle { color: var(--rose-soft); }

    h1, h2, h3, p, blockquote, figure { margin: 0; }
    h1 {
      max-width: 9em;
      font-size: clamp(44px, 8vw, 92px);
      line-height: 0.98;
      letter-spacing: 0;
      font-weight: 760;
      font-family: var(--display-font);
    }
    h2 {
      max-width: 10em;
      color: var(--forest);
      font-size: clamp(34px, 5vw, 64px);
      line-height: 1.05;
      letter-spacing: 0;
      font-weight: 760;
      font-family: var(--display-font);
    }
    h3 {
      color: var(--ink);
      font-size: 20px;
      line-height: 1.32;
      letter-spacing: 0;
      font-weight: 720;
    }

    .subtitle { margin-top: 18px; font-size: 18px; font-weight: 650; }
    .cover-art {
      width: min(100%, 340px);
      justify-self: end;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid rgba(242, 217, 220, 0.42);
      background: rgba(242, 217, 220, 0.12);
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.22);
      aspect-ratio: 3 / 4;
    }
    .cover-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-art-empty { display: grid; place-items: center; color: var(--rose-soft); font-size: 30px; font-weight: 760; }

    .prose {
      margin-top: clamp(30px, 4vw, 54px);
      max-width: 720px;
      color: var(--ink);
      font-size: clamp(20px, 2.5vw, 28px);
      line-height: 1.72;
    }

    .presentation-slide {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .presentation-slide h2 {
      max-width: 12em;
    }
    .slide-number,
    .slide-preset-label,
    .slide-decoration {
      display: none;
    }
    .slide-body {
      margin-top: clamp(30px, 4vw, 54px);
      max-width: 820px;
      color: var(--ink);
      font-size: clamp(22px, 3vw, 34px);
      line-height: 1.58;
      font-weight: 520;
    }
    .slide-body p {
      margin: 0;
      text-indent: 2em;
    }
    .slide-body p + p {
      margin-top: 0.64em;
    }
    .slide-body ol {
      display: grid;
      gap: 0.52em;
      margin: 0;
      padding-left: 1.6em;
    }
    .slide-body li {
      padding-left: 0.3em;
    }

    .agenda-slide {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .agenda-grid {
      margin-top: clamp(30px, 4vw, 54px);
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .agenda-item {
      display: grid;
      grid-template-columns: 44px 1fr;
      gap: 14px;
      align-items: start;
      min-height: 84px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      background: color-mix(in srgb, var(--panel) 82%, var(--rose-soft));
    }
    .agenda-item span {
      color: var(--rose);
      font-family: var(--mono-font);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }
    .agenda-item p {
      color: var(--ink);
      font-size: 18px;
      line-height: 1.34;
      font-weight: 720;
    }

    .idea-list, .example-list, .exercise-list {
      margin-top: 42px;
      display: grid;
      gap: 18px;
    }
    .idea-row {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 22px;
      padding: 22px 0;
      border-top: 1px solid var(--line);
    }
    .num {
      color: var(--rose);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
    }
    .idea-row p, .model-card p, .example-row p, .exercise-card p, .exercise-card small {
      margin-top: 8px;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.7;
    }

    .fold-head {
      width: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      border: 0;
      background: transparent;
      color: var(--ink);
      padding: 0;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
    .fold-head span:first-child {
      font-size: 20px;
      line-height: 1.32;
      font-weight: 760;
    }
    .fold-mark {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      flex: 0 0 auto;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--leaf);
      font-size: 16px;
      font-weight: 650;
      transition: transform 180ms ease-out, background 180ms ease-out;
    }
    .fold-body {
      display: block;
    }
    .fold-card[data-collapsed="true"] .fold-body {
      display: none;
    }
    .fold-card[data-collapsed="true"] .fold-mark {
      transform: rotate(0deg);
      background: var(--panel-soft);
    }
    .fold-card:not([data-collapsed="true"]) .fold-mark {
      transform: rotate(45deg);
      background: var(--panel);
    }

    .chapter-accent {
      background: var(--rose-soft);
    }

    .model-grid {
      margin-top: 42px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .model-card {
      min-height: 180px;
      border: 1px solid rgba(36, 63, 43, 0.18);
      border-radius: 8px;
      padding: 24px;
      background: rgba(251, 250, 246, 0.54);
    }

    .example-row {
      border-top: 1px solid var(--line);
      padding-top: 24px;
    }

    .exercise-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 22px;
      background: var(--paper);
    }
    .exercise-card .scene {
      margin: 0 0 10px;
      color: var(--leaf);
      font-size: 13px;
      font-weight: 750;
    }
    .option-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .option-grid div {
      display: grid;
      gap: 8px;
      padding: 16px;
      border-radius: 8px;
      background: var(--panel);
    }
    .option-grid b { color: var(--forest); }
    .option-grid span { color: var(--ink); font-weight: 650; }
    .option-grid small { margin: 0; }

    .chapter-final {
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--final-bg);
      color: var(--final-text);
    }
    .chapter-final h2,
    .chapter-final .eyebrow,
    .chapter-final .signature { color: var(--final-text); }
    blockquote {
      margin-top: 38px;
      max-width: 850px;
      font-size: clamp(32px, 5vw, 62px);
      line-height: 1.25;
      font-weight: 760;
    }
    .signature { margin-top: 48px; font-size: 14px; font-weight: 750; letter-spacing: 0.12em; text-transform: uppercase; }

    .deck-counter {
      position: fixed;
      left: 50%;
      bottom: 20px;
      z-index: 60;
      display: none;
      transform: translateX(-50%);
      border-radius: 999px;
      background: rgba(24, 29, 26, 0.92);
      color: var(--panel);
      padding: 7px 12px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .slide-nav {
      position: fixed;
      left: 18px;
      top: 50%;
      z-index: 55;
      display: none;
      transform: translateY(-50%);
      padding: 8px;
      border: 1px solid rgba(251, 250, 246, 0.18);
      border-radius: 999px;
      background: rgba(24, 29, 26, 0.72);
      backdrop-filter: blur(12px);
    }
    .slide-nav button {
      display: block;
      width: 11px;
      height: 11px;
      margin: 8px 0;
      border: 0;
      border-radius: 999px;
      background: rgba(251, 250, 246, 0.38);
      cursor: pointer;
      transition: transform 180ms ease-out, background 180ms ease-out;
    }
    .slide-nav button[aria-current="true"] {
      background: var(--rose);
      transform: scale(1.35);
    }

    .deck-overview {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 65;
      display: none;
      width: min(380px, calc(100vw - 36px));
      max-height: min(560px, calc(100vh - 104px));
      overflow: auto;
      border: 1px solid rgba(251, 250, 246, 0.18);
      border-radius: 12px;
      background: rgba(24, 29, 26, 0.88);
      color: var(--panel);
      padding: 10px;
      backdrop-filter: blur(14px);
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
    }
    .deck-overview[data-open="true"] {
      display: block;
    }
    .overview-item {
      width: 100%;
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 10px;
      align-items: start;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      padding: 10px;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
    .overview-item:hover,
    .overview-item[aria-current="true"] {
      background: rgba(251, 250, 246, 0.12);
    }
    .overview-item span {
      color: var(--rose);
      font-family: var(--mono-font);
      font-size: 12px;
      font-weight: 800;
    }
    .overview-item p {
      font-size: 13px;
      line-height: 1.36;
      font-weight: 650;
    }

    @keyframes deck-in {
      from { opacity: 0; transform: translateX(18px); }
      to { opacity: 1; transform: translateX(0); }
    }

    body.deck-mode {
      overflow: hidden;
      background: #11130f;
    }
    body.deck-mode .toolbar {
      top: 16px;
      right: auto;
      left: 50%;
      transform: translateX(-50%);
    }
    body.deck-mode main {
      width: 100vw;
      height: 100vh;
      padding: 0;
    }
    body.deck-mode .chapter {
      display: none;
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      min-height: 0;
      margin: 0;
      border: 0;
      border-radius: 0;
      padding: clamp(42px, 7vw, 96px);
      overflow: auto;
      box-shadow: none;
    }
    body.deck-mode .chapter.is-active { display: block; }
    body.deck-mode .chapter .deck-brand {
      display: block;
      position: absolute;
      top: clamp(24px, 4vw, 52px);
      right: clamp(24px, 4vw, 56px);
      z-index: 3;
      color: color-mix(in srgb, var(--ink) 68%, transparent);
    }
    body.deck-mode .chapter-cover .deck-brand,
    body.deck-mode .chapter-final .deck-brand,
    body.deck-mode .presentation-slide.layout-poster .deck-brand {
      color: color-mix(in srgb, var(--panel) 78%, transparent);
    }
    body.deck-mode .presentation-slide.is-active {
      display: grid;
      grid-template-columns: minmax(0, 0.92fr) minmax(420px, 0.78fr);
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(32px, 5vw, 92px);
      align-content: center;
      align-items: start;
    }
    body.deck-mode .presentation-slide .slide-number {
      display: block;
      position: absolute;
      right: clamp(38px, 7vw, 120px);
      bottom: clamp(24px, 5vw, 68px);
      z-index: 0;
      color: color-mix(in srgb, var(--rose) 22%, transparent);
      font-family: var(--display-font);
      font-size: clamp(96px, 16vw, 260px);
      font-weight: 820;
      line-height: 0.8;
      pointer-events: none;
    }
    body.deck-mode .presentation-slide .slide-preset-label {
      display: block;
      position: absolute;
      left: clamp(42px, 7vw, 96px);
      bottom: clamp(24px, 5vw, 68px);
      z-index: 2;
      width: max-content;
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 10px;
      background: color-mix(in srgb, var(--panel) 78%, var(--rose-soft));
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
      letter-spacing: 0.08em;
    }
    body.deck-mode .presentation-slide .slide-decoration {
      display: block;
      position: absolute;
      pointer-events: none;
    }
    body.deck-mode .presentation-slide .eyebrow {
      grid-column: 1 / -1;
    }
    body.deck-mode .presentation-slide h2 {
      grid-column: 1;
      grid-row: 2;
      max-width: 8.8em;
      font-size: clamp(34px, 4vw, 68px);
      line-height: 1.08;
    }
    body.deck-mode .presentation-slide .slide-body {
      grid-column: 2;
      grid-row: 2;
      margin-top: 0;
      max-width: none;
      font-size: clamp(26px, 2.45vw, 38px);
      line-height: 1.52;
    }
    body.deck-mode .presentation-slide.layout-statement.is-active {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      align-content: center;
      gap: clamp(22px, 3vw, 44px);
    }
    body.deck-mode .presentation-slide.layout-statement .eyebrow,
    body.deck-mode .presentation-slide.layout-statement h2,
    body.deck-mode .presentation-slide.layout-statement .slide-body {
      grid-column: 1;
    }
    body.deck-mode .presentation-slide.layout-statement h2 {
      grid-row: 2;
      max-width: 11em;
      color: var(--forest);
      font-size: clamp(42px, 5.2vw, 82px);
    }
    body.deck-mode .presentation-slide.layout-statement .slide-body {
      grid-row: 3;
      max-width: 980px;
      margin-top: 0;
      font-size: clamp(22px, 2vw, 32px);
      color: var(--muted);
    }
    body.deck-mode .presentation-slide.layout-panel.is-active {
      grid-template-columns: minmax(0, 0.7fr) minmax(480px, 1fr);
      align-items: center;
    }
    body.deck-mode .presentation-slide.layout-panel h2 {
      max-width: 7.2em;
    }
    body.deck-mode .presentation-slide.layout-panel .slide-body {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: clamp(28px, 4vw, 56px);
      background: color-mix(in srgb, var(--panel) 72%, var(--rose-soft));
      box-shadow: 0 18px 38px rgba(24, 29, 26, 0.08);
    }
    body.deck-mode .presentation-slide.layout-stack.is-active {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      align-content: center;
      gap: clamp(20px, 3vw, 44px);
    }
    body.deck-mode .presentation-slide.layout-stack .eyebrow,
    body.deck-mode .presentation-slide.layout-stack h2,
    body.deck-mode .presentation-slide.layout-stack .slide-body {
      grid-column: 1;
    }
    body.deck-mode .presentation-slide.layout-stack h2 {
      grid-row: 2;
      max-width: 12em;
    }
    body.deck-mode .presentation-slide.layout-stack .slide-body {
      grid-row: 3;
      width: min(100%, 980px);
      margin-top: 0;
      padding-top: clamp(22px, 3vw, 38px);
      border-top: 1px solid var(--line);
      font-size: clamp(23px, 2.2vw, 34px);
    }
    body.deck-mode .presentation-slide.layout-list.is-active {
      grid-template-columns: minmax(0, 0.72fr) minmax(520px, 1fr);
      align-items: center;
    }
    body.deck-mode .presentation-slide.layout-list .slide-body ol {
      gap: 0.72em;
      padding-left: 1.35em;
    }
    body.deck-mode .presentation-slide.layout-list .slide-body li {
      padding-left: 0.45em;
    }
    body.deck-mode .presentation-slide.layout-poster.is-active {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      align-content: center;
      gap: clamp(24px, 4vw, 64px);
      background: var(--forest);
      color: var(--panel);
    }
    body.deck-mode .presentation-slide.layout-poster .eyebrow,
    body.deck-mode .presentation-slide.layout-poster h2,
    body.deck-mode .presentation-slide.layout-poster .slide-body {
      grid-column: 1;
    }
    body.deck-mode .presentation-slide.layout-poster .eyebrow,
    body.deck-mode .presentation-slide.layout-poster h2 {
      color: var(--panel);
    }
    body.deck-mode .presentation-slide.layout-poster h2 {
      grid-row: 2;
      max-width: 10em;
      font-size: clamp(44px, 5.8vw, 92px);
      line-height: 0.96;
    }
    body.deck-mode .presentation-slide.layout-poster .slide-body {
      grid-row: 3;
      width: min(100%, 980px);
      color: var(--panel);
      font-size: clamp(22px, 2vw, 32px);
      opacity: 0.92;
    }
    body.deck-mode .presentation-slide.layout-tiles.is-active {
      grid-template-columns: minmax(0, 0.74fr) minmax(520px, 1fr);
      align-items: center;
    }
    body.deck-mode .presentation-slide.layout-tiles .slide-body {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      font-size: clamp(19px, 1.65vw, 27px);
      line-height: 1.48;
    }
    body.deck-mode .presentation-slide.layout-tiles .slide-body p,
    body.deck-mode .presentation-slide.layout-tiles .slide-body li {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      background: color-mix(in srgb, var(--panel) 72%, var(--rose-soft));
      text-indent: 0;
    }
    body.deck-mode .presentation-slide.layout-tiles .slide-body ol {
      display: contents;
    }
    body.deck-mode .presentation-slide.layout-table.is-active {
      grid-template-columns: minmax(0, 0.64fr) minmax(560px, 1.06fr);
      align-items: center;
    }
    body.deck-mode .presentation-slide.layout-table .slide-body {
      border-top: 2px solid var(--forest);
      border-bottom: 2px solid var(--forest);
      font-size: clamp(20px, 1.85vw, 30px);
      line-height: 1.5;
    }
    body.deck-mode .presentation-slide.layout-table .slide-body p,
    body.deck-mode .presentation-slide.layout-table .slide-body li {
      margin: 0;
      padding: 18px 0;
      border-bottom: 1px solid var(--line);
      text-indent: 0;
    }
    body.deck-mode .presentation-slide.layout-table .slide-body p:last-child,
    body.deck-mode .presentation-slide.layout-table .slide-body li:last-child {
      border-bottom: 0;
    }
    body.deck-mode .presentation-slide.layout-ribbon.is-active {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      align-content: center;
      gap: clamp(22px, 3vw, 44px);
    }
    body.deck-mode .presentation-slide.layout-ribbon::before {
      content: "";
      position: absolute;
      inset: auto -10vw 14vh auto;
      width: 72vw;
      height: 16px;
      background: var(--rose);
      transform: rotate(-10deg);
      opacity: 0.78;
    }
    body.deck-mode .presentation-slide.layout-ribbon .eyebrow,
    body.deck-mode .presentation-slide.layout-ribbon h2,
    body.deck-mode .presentation-slide.layout-ribbon .slide-body {
      grid-column: 1;
      position: relative;
      z-index: 1;
    }
    body.deck-mode .presentation-slide.layout-ribbon h2 {
      grid-row: 2;
      max-width: 12em;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: clamp(20px, 3vw, 36px);
      background: var(--panel);
    }
    body.deck-mode .presentation-slide.layout-ribbon .slide-body {
      grid-row: 3;
      width: min(100%, 920px);
      margin-top: 0;
      font-size: clamp(22px, 2.1vw, 34px);
    }
    body.deck-mode .presentation-slide.preset-quote h2 {
      max-width: 13em;
      font-size: clamp(48px, 6vw, 104px);
      line-height: 0.98;
    }
    body.deck-mode .presentation-slide.preset-quote .slide-body {
      max-width: 900px;
      color: var(--muted);
      font-size: clamp(20px, 1.8vw, 30px);
    }
    body.deck-mode .presentation-slide.preset-quote .slide-body p {
      text-indent: 0;
    }
    body.deck-mode .presentation-slide.preset-method .slide-body,
    body.deck-mode .presentation-slide.preset-list .slide-body {
      counter-reset: slide-point;
    }
    body.deck-mode .presentation-slide.preset-method .slide-body p,
    body.deck-mode .presentation-slide.preset-list .slide-body p {
      position: relative;
      text-indent: 0;
      padding-left: 2.3em;
    }
    body.deck-mode .presentation-slide.preset-method .slide-body p::before,
    body.deck-mode .presentation-slide.preset-list .slide-body p::before {
      counter-increment: slide-point;
      content: counter(slide-point, decimal-leading-zero);
      position: absolute;
      left: 0;
      top: 0.08em;
      color: var(--rose);
      font-family: var(--mono-font);
      font-size: 0.58em;
      font-weight: 850;
      letter-spacing: 0.08em;
    }
    body.deck-mode .presentation-slide.preset-case .slide-body {
      position: relative;
    }
    body.deck-mode .presentation-slide.preset-case .slide-body::before {
      content: "SCENE";
      display: block;
      margin-bottom: 16px;
      color: var(--rose);
      font-family: var(--mono-font);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.12em;
    }
    body.deck-mode .presentation-slide.preset-case .slide-body p {
      text-indent: 0;
    }
    body.deck-mode .presentation-slide.preset-summary h2 {
      color: var(--rose);
    }
    body.deck-mode .presentation-slide.preset-summary .slide-body {
      color: var(--ink);
      font-weight: 680;
    }
    body.deck-mode .presentation-slide.preset-summary .slide-body p {
      text-indent: 0;
    }
    body.deck-mode[data-template="cobalt-grid"] .chapter,
    body.deck-mode[data-template="raw-grid"] .chapter {
      background-image:
        linear-gradient(color-mix(in srgb, var(--forest) 11%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--forest) 11%, transparent) 1px, transparent 1px);
      background-size: 34px 34px;
    }
    body.deck-mode[data-template="cartesian"] .presentation-slide .slide-decoration,
    body.deck-mode[data-template="soft-editorial"] .presentation-slide .slide-decoration {
      inset: clamp(42px, 7vw, 96px) auto auto clamp(42px, 7vw, 96px);
      width: min(18vw, 220px);
      height: 1px;
      background: var(--line);
      box-shadow: 0 18px 0 var(--line), 0 36px 0 var(--line);
    }
    body.deck-mode[data-template="editorial-forest"] .presentation-slide .slide-decoration,
    body.deck-mode[data-template="biennale-yellow"] .presentation-slide .slide-decoration {
      inset: auto -8vw 10vh auto;
      width: 58vw;
      height: clamp(36px, 7vw, 92px);
      background: color-mix(in srgb, var(--rose) 36%, transparent);
      transform: rotate(-8deg);
    }
    body.deck-mode[data-template="vellum"] .presentation-slide,
    body.deck-mode[data-template="signal"] .presentation-slide {
      border: clamp(12px, 2vw, 24px) solid color-mix(in srgb, var(--forest) 88%, var(--rose));
    }
    body.deck-mode[data-template="vellum"] .presentation-slide .slide-body,
    body.deck-mode[data-template="signal"] .presentation-slide .slide-body {
      border-color: color-mix(in srgb, var(--rose) 52%, var(--line));
    }
    body.deck-mode[data-template="blue-professional"] .presentation-slide .slide-decoration,
    body.deck-mode[data-template="capsule"] .presentation-slide .slide-decoration {
      inset: 0 auto 0 0;
      width: clamp(12px, 1.6vw, 28px);
      background: var(--forest);
    }
    body.deck-mode[data-template="stencil-tablet"] .presentation-slide .slide-decoration {
      right: clamp(74px, 10vw, 150px);
      top: clamp(92px, 12vw, 170px);
      width: clamp(96px, 14vw, 180px);
      height: clamp(96px, 14vw, 180px);
      border: 2px solid var(--rose);
      background:
        linear-gradient(90deg, transparent 48%, var(--rose) 48% 52%, transparent 52%),
        linear-gradient(transparent 48%, var(--rose) 48% 52%, transparent 52%);
      opacity: 0.28;
    }
    body.deck-mode[data-template="broadside"] .presentation-slide,
    body.deck-mode[data-template="bold-poster"] .presentation-slide {
      text-transform: none;
    }
    body.deck-mode[data-template="broadside"] .presentation-slide .slide-number,
    body.deck-mode[data-template="bold-poster"] .presentation-slide .slide-number {
      right: -0.05em;
      bottom: -0.08em;
      color: color-mix(in srgb, var(--rose) 34%, transparent);
      font-size: clamp(160px, 26vw, 420px);
    }
    body.deck-mode[data-template="broadside"] .presentation-slide h2,
    body.deck-mode[data-template="bold-poster"] .presentation-slide h2 {
      letter-spacing: 0;
      text-transform: uppercase;
    }
    body.deck-mode[data-template="scatterbrain"] .presentation-slide .slide-decoration {
      inset: clamp(86px, 11vw, 150px) clamp(68px, 9vw, 130px) auto auto;
      width: min(32vw, 360px);
      height: min(20vw, 220px);
      border: 1px dashed var(--rose);
      transform: rotate(5deg);
      opacity: 0.52;
    }
    body.deck-mode .presentation-slide.density-comfy h2 {
      font-size: clamp(30px, 3.4vw, 58px);
    }
    body.deck-mode .presentation-slide.density-comfy .slide-body {
      font-size: clamp(20px, 1.78vw, 29px);
      line-height: 1.4;
    }
    body.deck-mode .presentation-slide.density-comfy .slide-body p + p {
      margin-top: 0.42em;
    }
    body.deck-mode .presentation-slide.density-comfy .slide-body ol {
      gap: 0.42em;
    }
    body.deck-mode .presentation-slide.density-dense h2 {
      font-size: clamp(28px, 3vw, 50px);
      line-height: 1.06;
    }
    body.deck-mode .presentation-slide.density-dense .slide-body {
      font-size: clamp(17px, 1.42vw, 24px);
      line-height: 1.34;
    }
    body.deck-mode .presentation-slide.density-dense .slide-body p + p {
      margin-top: 0.3em;
    }
    body.deck-mode .presentation-slide.density-dense .slide-body ol {
      gap: 0.3em;
    }
    body.deck-mode .presentation-slide.density-dense.layout-panel .slide-body,
    body.deck-mode .presentation-slide.density-dense.layout-tiles .slide-body p,
    body.deck-mode .presentation-slide.density-dense.layout-tiles .slide-body li {
      padding: clamp(12px, 1.8vw, 24px);
    }
    body.deck-mode .presentation-slide.density-dense.layout-table .slide-body p,
    body.deck-mode .presentation-slide.density-dense.layout-table .slide-body li {
      padding: 10px 0;
    }
    body.deck-mode .presentation-slide.density-dense.layout-stack .slide-body {
      padding-top: 18px;
    }
    body.deck-mode .chapter-cover.is-active { display: grid; }
    body.deck-mode .chapter-final.is-active { display: flex; }
    body.deck-mode[data-template="broadside"] .chapter-cover,
    body.deck-mode[data-template="bold-poster"] .chapter-cover,
    body.deck-mode[data-template="biennale-yellow"] .chapter-cover {
      grid-template-columns: minmax(0, 1fr);
      align-content: center;
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--rose) 22%, transparent), transparent 54%),
        var(--forest);
    }
    body.deck-mode[data-template="broadside"] .chapter-cover h1,
    body.deck-mode[data-template="bold-poster"] .chapter-cover h1,
    body.deck-mode[data-template="biennale-yellow"] .chapter-cover h1 {
      max-width: 11em;
      font-size: clamp(62px, 9vw, 152px);
      line-height: 0.9;
    }
    body.deck-mode[data-template="broadside"] .chapter-cover .cover-art,
    body.deck-mode[data-template="bold-poster"] .chapter-cover .cover-art,
    body.deck-mode[data-template="biennale-yellow"] .chapter-cover .cover-art {
      position: absolute;
      right: clamp(34px, 5vw, 80px);
      bottom: clamp(34px, 5vw, 76px);
      width: min(22vw, 260px);
      opacity: 0.86;
    }
    body.deck-mode[data-template="vellum"] .chapter-cover,
    body.deck-mode[data-template="signal"] .chapter-cover {
      border: clamp(12px, 2vw, 24px) solid color-mix(in srgb, var(--rose) 60%, var(--forest));
    }
    body.deck-mode[data-template="cobalt-grid"] .agenda-grid,
    body.deck-mode[data-template="raw-grid"] .agenda-grid,
    body.deck-mode[data-template="stencil-tablet"] .agenda-grid,
    body.deck-mode[data-template="scatterbrain"] .agenda-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    body.deck-mode[data-template="cobalt-grid"] .agenda-item,
    body.deck-mode[data-template="raw-grid"] .agenda-item {
      min-height: 112px;
      border-radius: 0;
      background: color-mix(in srgb, var(--panel) 70%, transparent);
    }
    body.deck-mode[data-template="signal"] .agenda-grid,
    body.deck-mode[data-template="vellum"] .agenda-grid,
    body.deck-mode[data-template="blue-professional"] .agenda-grid {
      grid-template-columns: 1fr;
      gap: 0;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    body.deck-mode[data-template="signal"] .agenda-item,
    body.deck-mode[data-template="vellum"] .agenda-item,
    body.deck-mode[data-template="blue-professional"] .agenda-item {
      min-height: 0;
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      padding: 14px 0;
    }
    body.deck-mode[data-template="signal"] .agenda-item:last-child,
    body.deck-mode[data-template="vellum"] .agenda-item:last-child,
    body.deck-mode[data-template="blue-professional"] .agenda-item:last-child {
      border-bottom: 0;
    }
    body.deck-mode .chapter.is-active { animation: deck-in 220ms cubic-bezier(0.22, 1, 0.36, 1); }
    body.deck-mode .deck-counter { display: block; }
    body.deck-mode .slide-nav { display: block; }
    body.deck-mode .fold-body { display: block !important; }
    body.deck-mode .fold-head { cursor: default; }
    body.deck-mode .fold-mark { display: none; }

    @media (max-width: 760px) {
      .toolbar { left: 12px; right: 12px; top: 12px; justify-content: center; }
      .slide-nav { left: 8px; }
      main { padding-top: 66px; }
      .chapter { padding: 28px; min-height: auto; }
      .chapter-cover { grid-template-columns: 1fr; }
      .cover-art { justify-self: start; width: min(72vw, 260px); }
      .model-grid, .option-grid { grid-template-columns: 1fr; }
      .agenda-grid { grid-template-columns: 1fr; }
      .idea-row { grid-template-columns: 1fr; gap: 10px; }
      body.deck-mode .chapter { padding: 72px 24px 42px; }
      body.deck-mode .presentation-slide.is-active { display: block; }
      body.deck-mode .presentation-slide .slide-body { margin-top: 26px; }
      body.deck-mode .presentation-slide.layout-panel .slide-body {
        padding: 22px;
      }
    }

    @media print {
      .toolbar, .deck-counter, .slide-nav, .deck-overview { display: none !important; }
      body { background: var(--paper); }
      main { width: auto; padding: 0; }
      .chapter {
        break-after: page;
        min-height: 100vh;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }`;
}

function renderScript(): string {
  return `
    (() => {
      const body = document.body;
      const chapters = Array.from(document.querySelectorAll(".chapter"));
      const scrollBtn = document.querySelector("[data-mode='scroll']");
      const deckBtn = document.querySelector("[data-mode='deck']");
      const fullBtn = document.querySelector("[data-action='fullscreen']");
      const overviewBtn = document.querySelector("[data-action='overview']");
      const overview = document.querySelector(".deck-overview");
      const counter = document.querySelector(".deck-counter");
      const navButtons = Array.from(document.querySelectorAll("[data-slide-target]"));
      const overviewButtons = Array.from(document.querySelectorAll("[data-overview-target]"));
      const foldCards = Array.from(document.querySelectorAll("[data-fold-card]"));
      let active = 0;

      const setActive = (next) => {
        active = (next + chapters.length) % chapters.length;
        chapters.forEach((chapter, index) => {
          chapter.classList.toggle("is-active", index === active);
        });
        navButtons.forEach((button, index) => {
          button.setAttribute("aria-current", String(index === active));
        });
        overviewButtons.forEach((button, index) => {
          button.setAttribute("aria-current", String(index === active));
        });
        if (counter) counter.textContent = String(active + 1).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0");
      };

      const setMode = (mode) => {
        const deck = mode === "deck";
        body.classList.toggle("deck-mode", deck);
        scrollBtn?.setAttribute("aria-pressed", String(!deck));
        deckBtn?.setAttribute("aria-pressed", String(deck));
        if (!deck) overview?.setAttribute("data-open", "false");
        if (deck) setActive(active);
      };

      scrollBtn?.addEventListener("click", () => setMode("scroll"));
      deckBtn?.addEventListener("click", () => setMode("deck"));
      navButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.getAttribute("data-slide-target"));
          if (Number.isFinite(index)) {
            setMode("deck");
            setActive(index);
          }
        });
      });
      overviewButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.getAttribute("data-overview-target"));
          if (Number.isFinite(index)) {
            setMode("deck");
            setActive(index);
            overview?.setAttribute("data-open", "false");
          }
        });
      });
      foldCards.forEach((card) => {
        const button = card.querySelector(".fold-head");
        button?.addEventListener("click", () => {
          if (body.classList.contains("deck-mode")) return;
          const collapsed = card.getAttribute("data-collapsed") === "true";
          card.setAttribute("data-collapsed", String(!collapsed));
          button.setAttribute("aria-expanded", String(collapsed));
        });
      });
      overviewBtn?.addEventListener("click", () => {
        setMode("deck");
        const open = overview?.getAttribute("data-open") === "true";
        overview?.setAttribute("data-open", String(!open));
      });
      fullBtn?.addEventListener("click", () => {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        } else {
          document.documentElement.requestFullscreen?.();
        }
      });

      window.addEventListener("keydown", (event) => {
        if (!body.classList.contains("deck-mode")) return;
        if (["ArrowRight", "PageDown", " "].includes(event.key)) {
          event.preventDefault();
          setActive(active + 1);
        }
        if (["ArrowLeft", "PageUp"].includes(event.key)) {
          event.preventDefault();
          setActive(active - 1);
        }
        if (event.key === "Home") setActive(0);
        if (event.key === "End") setActive(chapters.length - 1);
        if (event.key === "Escape") {
          if (overview?.getAttribute("data-open") === "true") {
            overview.setAttribute("data-open", "false");
          } else {
            setMode("scroll");
          }
        }
      });

      setActive(0);
      setMode("scroll");
    })();`;
}

function buildChapters(
  content: FeynmanHtmlContent,
  mode: FeynmanExportMode,
  template: FeynmanTemplateChoice
): RenderedChapter[] {
  const hasExercises = !!content.decisionExercises?.length;
  const presentationSlides = content.presentationSlides?.filter(
    (slide) => slide.title.trim() && slide.body.trim()
  );

  if (mode === "all" && presentationSlides && presentationSlides.length > 0) {
    const storyChapters: RenderedChapter[] = [
      { key: "cover", title: "封面", html: renderCover(content) },
      ...presentationSlides.map((slide, index) => ({
        key: `slide-${index + 1}`,
        title: slide.title,
        html: renderPresentationSlide(slide, index, presentationSlides.length, template),
      })),
      ...(hasExercises
        ? [{ key: "decision", title: "决策练习", html: renderExercises(content) }]
        : []),
    ];

    return [
      storyChapters[0],
      { key: "agenda", title: "目录概览", html: renderAgenda(storyChapters) },
      ...storyChapters.slice(1),
    ];
  }

  const allChapters: RenderedChapter[] = [
    { key: "cover", title: "封面", html: renderCover(content) },
    { key: "overview", title: "总体概述", html: renderOverview(content) },
    { key: "core", title: "核心观点", html: renderCoreIdeas(content) },
    { key: "methods", title: "方法总结", html: renderMethods(content) },
    { key: "models", title: "关键模型", html: renderModels(content) },
    { key: "examples", title: "使用场景", html: renderExamples(content) },
    ...(hasExercises
      ? [{ key: "decision", title: "决策练习", html: renderExercises(content) }]
      : []),
    { key: "final", title: "结语", html: renderFinal(content) },
  ];

  const allowedKeys: Record<FeynmanExportMode, string[]> = {
    all: allChapters.map((chapter) => chapter.key),
    core: ["cover", "overview", "core", "final"],
    methods: ["cover", "overview", "methods", "models", "examples", "final"],
    decision: ["cover", "overview", "decision", "final"],
  };

  return allChapters.filter((chapter) => allowedKeys[mode].includes(chapter.key));
}

function renderSlideNav(chapters: RenderedChapter[]): string {
  return `
    <aside class="slide-nav" aria-label="PPT 页面">
      ${chapters
        .map(
          (chapter, index) =>
            `<button type="button" data-slide-target="${index}" aria-label="${escapeAttr(chapter.title)}" aria-current="${index === 0 ? "true" : "false"}"></button>`
        )
        .join("")}
    </aside>`;
}

function renderDeckOverview(chapters: RenderedChapter[]): string {
  return `
    <aside class="deck-overview" data-open="false" aria-label="目录概览">
      ${chapters
        .map(
          (chapter, index) => `
            <button type="button" class="overview-item" data-overview-target="${index}" aria-current="${index === 0 ? "true" : "false"}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <p>${escapeHtml(chapter.title)}</p>
            </button>`
        )
        .join("")}
    </aside>`;
}

export function renderFeynmanHtml(
  content: FeynmanHtmlContent,
  options: { mode?: FeynmanExportMode; template?: FeynmanTemplateChoice } = {}
): string {
  const mode = options.mode ?? "all";
  const template = options.template ?? DEFAULT_TEMPLATE;
  const renderedChapters = buildChapters(content, mode, template);
  const chapters = renderedChapters.map((chapter) => chapter.html).join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="BookLeap Feynman Mode" />
  <meta name="template-source" content="${escapeAttr(TEMPLATE_SOURCE)}" />
  <meta name="selected-template" content="${escapeAttr(template.slug)}" />
  <meta name="selected-template-name" content="${escapeAttr(template.name)}" />
  <meta name="selected-template-reason" content="${escapeAttr(template.reason)}" />
  <title>${escapeHtml(content.bookTitle)} · ${escapeHtml(MODE_LABELS[mode])}费曼分享页</title>
  <style>${renderStyles(template)}</style>
</head>
<body data-template="${escapeAttr(template.slug)}" data-template-scheme="${escapeAttr(template.scheme)}">
  <nav class="toolbar" aria-label="阅读模式">
    <button type="button" data-mode="scroll" aria-pressed="true">竖版阅读</button>
    <button type="button" data-mode="deck" aria-pressed="false">PPT 模式</button>
    <button type="button" data-action="overview">目录</button>
    <button type="button" data-action="fullscreen">全屏</button>
  </nav>
  ${renderSlideNav(renderedChapters)}
  ${renderDeckOverview(renderedChapters)}
  <main>${chapters}</main>
  <div class="deck-counter" aria-live="polite"></div>
  <script>${renderScript()}</script>
</body>
</html>`;
}
