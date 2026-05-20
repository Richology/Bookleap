import type { FeynmanExportMode, FeynmanHtmlContent, FeynmanTemplateChoice } from "./types";

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
      <div class="cover-copy">
        <p class="eyebrow">BookLeap Feynman Mode</p>
        <h1>${escapeHtml(content.bookTitle)}</h1>
        <p class="subtitle">${author}</p>
        <p class="cover-note">把 6 张解析卡片，讲成别人能听懂、能复述、能带走的一场小演示。</p>
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
      <p class="eyebrow">01 / 总体概述</p>
      <h2>这本书先解决一个什么问题？</h2>
      <div class="prose">${paragraph(content.overview)}</div>
    </section>`;
}

function renderPresentationSlide(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  index: number
): string {
  const note = slide.note?.trim();
  const source = slide.sourceCardTitle?.trim();
  const hasMeta = note || source;

  return `
    <section class="chapter presentation-slide" data-slide-title="${escapeAttr(slide.title)}">
      <p class="eyebrow">${String(index + 1).padStart(2, "0")} / 讲述页</p>
      <h2>${escapeHtml(slide.title)}</h2>
      <div class="slide-body">${paragraph(slide.body)}</div>
      ${
        hasMeta
          ? `<aside class="slide-note" data-source-card>
              <button type="button" class="source-chip" aria-expanded="false">
                ${source ? `引用：${escapeHtml(source)}` : "案例 / 提示"}
              </button>
              ${note ? `<p>${escapeHtml(note)}</p>` : ""}
            </aside>`
          : ""
      }
    </section>`;
}

function renderAgenda(chapters: RenderedChapter[]): string {
  const items = chapters.filter((chapter) => chapter.key !== "cover");
  if (items.length === 0) return "";

  return `
    <section class="chapter agenda-slide" data-slide-title="目录概览">
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
      <p class="eyebrow">03 / 方法总结</p>
      <h2>读完以后，具体怎么用？</h2>
      <div class="prose">${paragraph(content.methodsSummary)}</div>
    </section>`;
}

function renderModels(content: FeynmanHtmlContent): string {
  return `
    <section class="chapter" data-slide-title="关键模型">
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

    .chapter-cover {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.62fr);
      gap: clamp(28px, 5vw, 72px);
      align-items: center;
      background: var(--forest);
      color: var(--rose-soft);
    }

    .chapter-cover::after { background: var(--rose); }
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
    .chapter-cover .subtitle,
    .chapter-cover .cover-note { color: var(--rose-soft); }

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
    .cover-note { margin-top: 36px; max-width: 34em; font-size: 18px; }
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
    .slide-body {
      margin-top: clamp(30px, 4vw, 54px);
      max-width: 820px;
      color: var(--ink);
      font-size: clamp(22px, 3vw, 34px);
      line-height: 1.58;
      font-weight: 520;
    }
    .slide-note {
      position: relative;
      margin-top: clamp(26px, 4vw, 46px);
      max-width: 720px;
      border-top: 1px solid var(--line);
      padding-top: 18px;
      color: var(--muted);
    }
    .source-chip {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      margin-bottom: 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      padding: 4px 10px;
      color: var(--forest);
      font-family: var(--mono-font);
      font-size: 12px;
      font-weight: 750;
      cursor: pointer;
    }
    .slide-note p {
      max-width: 52em;
      font-size: 17px;
      line-height: 1.68;
    }
    .slide-note[data-source-open="false"] p,
    .slide-note:not([data-source-open]) p {
      display: none;
    }
    .slide-note:hover p,
    .slide-note[data-source-open="true"] p {
      display: block;
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
    body.deck-mode .chapter-cover.is-active { display: grid; }
    body.deck-mode .chapter-final.is-active { display: flex; }
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
      const sourceCards = Array.from(document.querySelectorAll("[data-source-card]"));
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
      sourceCards.forEach((card) => {
        const button = card.querySelector(".source-chip");
        card.setAttribute("data-source-open", "false");
        button?.addEventListener("click", () => {
          const open = card.getAttribute("data-source-open") === "true";
          card.setAttribute("data-source-open", String(!open));
          button.setAttribute("aria-expanded", String(!open));
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

function buildChapters(content: FeynmanHtmlContent, mode: FeynmanExportMode): RenderedChapter[] {
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
        html: renderPresentationSlide(slide, index),
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
  const renderedChapters = buildChapters(content, mode);
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
