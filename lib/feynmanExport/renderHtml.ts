import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  FeynmanExportMode,
  FeynmanHtmlContent,
  FeynmanSlidePreset,
  GuizangMagazineLayout,
  GuizangPptStyle,
  GuizangSwissLayout,
} from "./types";

const MOTION_SOURCE_ID = "__bookleap_motion_module__";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compact(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function escapeScriptText(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function splitBody(value: string): string[] {
  const normalized = value.replace(/\s+/g, " ").trim();
  const numberedItems = normalized
    .replace(/\s+(\d+[.)、])\s*/g, "\n$1 ")
    .split("\n")
    .map((item) => item.replace(/^\d+[.)、]\s+/, "").trim())
    .filter(Boolean);

  if (numberedItems.length >= 2) return numberedItems.slice(0, 4);

  const lineItems = value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (lineItems.length >= 2) return lineItems.slice(0, 4);

  const sentenceItems = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalized];
  return sentenceItems.map((item) => item.trim()).filter(Boolean).slice(0, 4);
}

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

const SWISS_LAYOUT_SEQUENCE: GuizangSwissLayout[] = [
  "S08",
  "S03",
  "S19",
  "S15",
  "S17",
  "S09",
  "S11",
  "S14",
  "S16",
  "S10",
];

const MAGAZINE_LAYOUT_SEQUENCE: GuizangMagazineLayout[] = [
  "two-column",
  "quote",
  "mixed",
  "pipeline",
  "grid",
  "comparison",
  "statement",
  "divider",
];

function getSwissLayout(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  preset: FeynmanSlidePreset,
  index: number
): GuizangSwissLayout {
  if (slide.layout && SWISS_LAYOUT_SEQUENCE.includes(slide.layout as GuizangSwissLayout)) {
    return slide.layout as GuizangSwissLayout;
  }
  if (preset === "quote" || preset === "summary") return "S03";
  if (preset === "method") return "S15";
  if (preset === "list") return "S17";
  if (preset === "case") return "S08";
  return SWISS_LAYOUT_SEQUENCE[index % SWISS_LAYOUT_SEQUENCE.length];
}

function getMagazineLayout(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  preset: FeynmanSlidePreset,
  index: number
): GuizangMagazineLayout {
  if (slide.layout && MAGAZINE_LAYOUT_SEQUENCE.includes(slide.layout as GuizangMagazineLayout)) {
    return slide.layout as GuizangMagazineLayout;
  }
  if (preset === "quote") return "quote";
  if (preset === "summary") return "statement";
  if (preset === "method") return "pipeline";
  if (preset === "list") return "grid";
  if (preset === "case") return "mixed";
  return MAGAZINE_LAYOUT_SEQUENCE[index % MAGAZINE_LAYOUT_SEQUENCE.length];
}

function loadGuizangTemplate(style: GuizangPptStyle): string {
  const filename = style === "swiss" ? "template-swiss.html" : "template.html";
  return readFileSync(
    path.join(process.cwd(), "lib/feynmanExport/guizang/assets", filename),
    "utf8"
  );
}

function loadMotionModuleSource(): string {
  return readFileSync(
    path.join(process.cwd(), "lib/feynmanExport/guizang/assets/motion.min.js"),
    "utf8"
  );
}

function prepareSingleFileRuntime(template: string): string {
  const motionSourceTag = `<script id="${MOTION_SOURCE_ID}" type="text/plain">${escapeScriptText(loadMotionModuleSource())}</script>\n`;
  const inlineMotionLoader = `let motion;
try {
  const motionSource = document.getElementById('${MOTION_SOURCE_ID}')?.textContent || '';
  const motionUrl = URL.createObjectURL(new Blob([motionSource], { type: 'text/javascript' }));
  motion = await import(motionUrl);
  URL.revokeObjectURL(motionUrl);
} catch(error) {
  console.warn('[motion] inline module failed, disabling animations', error);
  document.querySelectorAll('[data-anim]').forEach(el=>{el.style.opacity='1';el.style.transform='none'});
  document.querySelectorAll('[data-animate="pipeline"] [data-anim]').forEach(el=>el.style.opacity='1');
}

if(motion){`;

  return template
    .replace(/guizang-ppt-low-power/g, "bookleap-presentation-low-power")
    .replace(/<div id="hint">[\s\S]*?<\/div>/g, "")
    .replace(/if\(hint\) hint\.textContent = `[\s\S]*?`;/g, "")
    .replace(
      "加载策略:先 ./assets/motion.min.js(本地,离线可用),失败 fallback 到 jsDelivr CDN",
      "加载策略:BookLeap 生成时已将 motion.min.js 内联到当前 HTML,离线可用"
    )
    .replace(
      "Motion One 动效引擎（本地优先,CDN 兜底）",
      "Motion One 动效引擎（BookLeap 单文件内联版）"
    )
    .replace(
      "Motion One 动效引擎 (与原模板一致)",
      "Motion One 动效引擎 (BookLeap 单文件内联版)"
    )
    .replace(
      /<script src="https:\/\/unpkg\.com\/lucide@latest\/dist\/umd\/lucide\.min\.js"><\/script>\s*<script>lucide\.createIcons\(\);<\/script>/g,
      "<script>window.lucide?.createIcons?.();</script>"
    )
    .replace(/<script type="module">\s*let motion;/, `${motionSourceTag}<script type="module">\nlet motion;`)
    .replace(/let motion;\s*try \{[\s\S]*?\}\s*\n\s*if\(motion\)\{/, inlineMotionLoader);
}

function renderMagazineCover(content: FeynmanHtmlContent, total: number): string {
  const author = content.author ? `作者：${escapeHtml(content.author)}` : "BookLeap";
  return `
<section class="slide hero dark" data-animate="hero">
  <div class="kicker" data-anim="kicker">BookLeap · 讲书演示 Beta</div>
  <h1 class="h-hero" data-anim="title">${escapeHtml(content.bookTitle)}</h1>
  <p class="lead" data-anim="up">${escapeHtml(author)} · 基于书跃解析生成</p>
  <div class="meta-row" data-anim="up">
    <span>书跃 BookLeap</span>
    <span>${String(total).padStart(2, "0")} pages</span>
  </div>
</section>`;
}

function renderMagazineSlide(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  index: number,
  total: number
): string {
  const preset = inferSlidePreset(slide, index, total);
  const layout = getMagazineLayout(slide, preset, index);
  const number = String(index + 1).padStart(2, "0");
  const bodyItems = splitBody(slide.body);
  const theme = index % 3 === 1 || layout === "quote" || layout === "statement" ? "dark" : "light";

  if (layout === "quote" || layout === "statement" || layout === "divider") {
    return `
<section class="slide hero ${theme}" data-animate="hero">
  <div class="kicker" data-anim="kicker">${number} · ${preset === "summary" ? "Takeaway" : "Key Thought"}</div>
  <h2 class="h-xl" data-anim="title">${escapeHtml(slide.title)}</h2>
  <p class="lead" data-anim="up">${escapeHtml(compact(slide.body, 180))}</p>
</section>`;
  }

  if (layout === "pipeline" || layout === "grid") {
    return `
<section class="slide ${theme}" data-animate="${layout === "pipeline" ? "pipeline" : "cascade"}">
  <div class="kicker" data-anim="kicker">${number} · Method</div>
  <h2 class="h-md" data-anim="title">${escapeHtml(slide.title)}</h2>
  <div class="grid-3" style="margin-top:6vh">
    ${bodyItems
      .map(
        (item, itemIndex) => `
      <div class="callout" data-anim="up">
        <div class="stat-label">${String(itemIndex + 1).padStart(2, "0")}</div>
        <p>${escapeHtml(item)}</p>
      </div>`
      )
      .join("")}
  </div>
</section>`;
  }

  if (layout === "comparison") {
    const left = bodyItems[0] ?? slide.body;
    const right = bodyItems.slice(1).join(" ") || slide.note || "真正理解一本书，不是复述概念，而是能把它放回自己的选择里。";
    return `
<section class="slide ${theme}" data-animate="directional">
  <div class="kicker" data-anim="kicker">${number} · Contrast</div>
  <h2 class="h-md" data-anim="title">${escapeHtml(slide.title)}</h2>
  <div class="grid-2-6-6" style="margin-top:7vh">
    <div class="callout" data-anim="left"><p>${escapeHtml(left)}</p></div>
    <div class="callout" data-anim="right"><p>${escapeHtml(right)}</p></div>
  </div>
</section>`;
  }

  return `
<section class="slide ${theme}" data-animate="cascade">
  <div class="grid-2-7-5" style="align-items:end">
    <div data-anim="left">
      <div class="kicker">${number} · ${preset === "case" ? "Scene" : "Idea"}</div>
      <h2 class="h-md">${escapeHtml(slide.title)}</h2>
    </div>
    <div class="callout" data-anim="right">
      ${bodyItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </div>
  </div>
</section>`;
}

function renderSwissCover(content: FeynmanHtmlContent, total: number): string {
  const author = content.author ? `作者：${escapeHtml(content.author)}` : "BookLeap";
  return `
<section class="slide accent" data-layout="SWISS-COVER-ASCII" data-animate="hero">
  <div class="canvas-card">
    <canvas class="ascii-bg" aria-hidden="true"></canvas>
    <div class="chrome-min">
      <div class="l">BookLeap · 讲书演示 Beta</div>
      <div class="r">01 / ${String(total).padStart(2, "0")}</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr auto;gap:2.6vh">
      <div data-anim="kicker" class="t-meta" style="color:rgba(255,255,255,.78);letter-spacing:.22em">BOOK PRESENTATION</div>
      <h1 data-anim="title" style="align-self:center;font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(9.6vw,16vh);line-height:.94;letter-spacing:-.025em;color:#fff">${escapeHtml(content.bookTitle)}</h1>
      <div data-anim="bottom" style="display:grid;grid-template-rows:auto auto;gap:1.6vh;border-top:1px solid rgba(255,255,255,.22);padding-top:2vh">
        <div class="lead" style="max-width:52ch;color:rgba(255,255,255,.86)">把一本书讲给别人听，也重新讲给自己听。</div>
        <div style="display:flex;justify-content:space-between;align-items:end">
          <div class="t-meta" style="color:rgba(255,255,255,.6)">${author}</div>
          <div class="t-meta" style="color:rgba(255,255,255,.6)">书跃 BookLeap</div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function renderSwissSlide(
  slide: NonNullable<FeynmanHtmlContent["presentationSlides"]>[number],
  index: number,
  total: number
): string {
  const preset = inferSlidePreset(slide, index, total);
  const layout = getSwissLayout(slide, preset, index);
  const number = String(index + 2).padStart(2, "0");
  const bodyItems = splitBody(slide.body);
  const items = bodyItems.length ? bodyItems : [slide.body];
  const pageTotal = String(total).padStart(2, "0");
  const category = preset === "case" ? "SCENE" : preset === "method" ? "METHOD" : preset === "list" ? "MODEL" : "IDEA";

  if (layout === "S03" || preset === "quote" || preset === "summary") {
    return `
<section class="slide dark" data-layout="S03" data-animate="statement">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">${preset === "summary" ? "FINAL TAKEAWAY" : "KEY THOUGHT"}</div>
      <div class="r">${number} / ${pageTotal}</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr auto;gap:3vh">
      <div data-anim="kicker" class="t-meta">书跃 BookLeap</div>
      <h2 data-anim="title" style="align-self:center;font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(6.2vw,10.8vh);line-height:.96;letter-spacing:-.025em;color:var(--paper)">${escapeHtml(slide.title)}</h2>
      <p data-anim="up" class="lead" style="max-width:70ch;color:rgba(255,255,255,.78)">${escapeHtml(compact(slide.body, 210))}</p>
    </div>
  </div>
</section>`;
  }

  if (layout === "S08" || layout === "S09") {
    const left = items[0] ?? slide.body;
    const right = items.slice(1).join(" ") || slide.note || "把这个观点讲给别人听时，重点不是术语，而是它能如何改变下一次选择。";
    return `
<section class="slide split" data-layout="${layout}" data-animate="split-statement">
  <div class="canvas-card">
    <div class="split-half">
      <div class="half b-ink" style="padding:5.6vh 3.6vw 4.4vh;justify-content:space-between">
        <div class="chrome-min" style="margin-bottom:0">
          <div class="l">${category}</div>
          <div class="r">${number} / ${pageTotal}</div>
        </div>
        <div data-anim="left" style="display:flex;flex-direction:column;gap:2vh">
          <div class="t-meta">书跃 BookLeap</div>
          <h2 style="font-family:var(--sans),var(--sans-zh);font-size:min(5.4vw,9.5vh);line-height:.98;letter-spacing:-.02em;font-weight:200;color:var(--paper)">${escapeHtml(slide.title)}</h2>
        </div>
        <div class="t-meta" style="color:rgba(255,255,255,.62)">${preset.toUpperCase()}</div>
      </div>
      <div class="half b-grey r-border" style="padding:5.6vh 3.6vw 4.4vh;justify-content:center">
        <div data-anim="right" style="display:grid;gap:3vh">
          <p class="lead" style="margin:0;color:var(--text-primary)">${escapeHtml(left)}</p>
          <div class="card-fill" style="padding:3vh 2vw">
            <div class="t-meta">讲给别人听时</div>
            <p class="t-body" style="margin-top:2vh">${escapeHtml(right)}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
  }

  if (layout === "S11") {
    const timelineItems = items.slice(0, 4);
    return `
<section class="slide" data-layout="S11" data-animate="timeline-walk">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">PROGRESSION</div>
      <div class="r">${number} / ${pageTotal}</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr;gap:4vh">
      <div data-anim="line" style="display:flex;flex-direction:column;gap:1.4vh">
        <div class="t-meta">书跃 BookLeap</div>
        <h2 class="h-xl-zh" style="font-size:min(4.8vw,8.6vh);font-weight:200;line-height:1">${escapeHtml(slide.title)}</h2>
      </div>
      <div class="timeline-h">
        <div class="tl-row">
          ${timelineItems
            .map(
              (item, itemIndex) => `
          <div class="th-node ${itemIndex === 1 ? "accent" : ""} ${itemIndex % 2 === 0 ? "up" : "down"}" data-anim="step">
            <span class="dot"></span>
            <div class="label">
              <div class="yr">0${itemIndex + 1}</div>
              <div class="name">${escapeHtml(item.slice(0, 18))}</div>
              <div class="desc">${escapeHtml(item)}</div>
            </div>
          </div>`
            )
            .join("")}
        </div>
      </div>
    </div>
  </div>
</section>`;
  }

  if (layout === "S14" || layout === "S17") {
    const stackItems = items.slice(0, 3);
    return `
<section class="slide" data-layout="${layout}" data-animate="stack-build">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">${layout === "S14" ? "STRUCTURE" : "SYSTEM"}</div>
      <div class="r">${number} / ${pageTotal}</div>
    </div>
    <div data-anim="line" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">书跃 BookLeap</div>
      <h2 class="h-xl-zh" style="font-size:min(4.8vw,8.6vh);font-weight:200;line-height:1">${escapeHtml(slide.title)}</h2>
    </div>
    <div class="stack-row">
      ${stackItems
        .map(
          (item, itemIndex) => `
      <div class="stack-block ${itemIndex === 1 ? "b-accent" : itemIndex === 2 ? "b-ink" : "b-grey"}" data-anim="up">
        <div class="layer-nb">${String(itemIndex + 1).padStart(2, "0")}</div>
        <div class="layer-ttl">${escapeHtml(item.slice(0, 18))}</div>
        <div class="layer-desc">${escapeHtml(item)}</div>
      </div>`
        )
        .join("")}
    </div>
  </div>
</section>`;
  }

  if (layout === "S15" || layout === "S16" || preset === "method" || preset === "list") {
    return `
<section class="slide grey" data-layout="${layout === "S16" ? "S16" : "S15"}" data-animate="grid-reveal">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">${preset === "method" ? "METHOD" : "CHECKLIST"}</div>
      <div class="r">${number} / ${pageTotal}</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr;gap:4vh">
      <div data-anim="line" style="display:flex;flex-direction:column;gap:1.2vh">
        <div class="t-meta">书跃 BookLeap</div>
        <h2 class="h-xl-zh" style="font-size:min(4.8vw,8.6vh);font-weight:200;line-height:1">${escapeHtml(slide.title)}</h2>
      </div>
      <div data-anim="up" class="grid-12" style="align-content:start">
        ${items.slice(0, 4)
          .map(
            (item, itemIndex) => `
        <div class="${itemIndex === 0 ? "card-accent" : "card-fill"} span-4" style="min-height:28vh;padding:2.4vh 1.6vw">
          <div class="t-meta">${String(itemIndex + 1).padStart(2, "0")}</div>
          <p class="t-body" style="margin-top:3vh">${escapeHtml(item)}</p>
        </div>`
          )
          .join("")}
      </div>
    </div>
  </div>
</section>`;
  }

  return `
<section class="slide" data-layout="${layout === "S10" ? "S10" : "S19"}" data-animate="grid-reveal">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">${category}</div>
      <div class="r">${number} / ${pageTotal}</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr;gap:4vh">
      <div data-anim="line" style="display:flex;flex-direction:column;gap:1.4vh">
        <div class="t-meta">书跃 BookLeap</div>
        <h2 class="h-xl-zh" style="font-size:min(4.8vw,8.6vh);font-weight:200;line-height:1">${escapeHtml(slide.title)}</h2>
      </div>
      <div data-anim="up" class="grid-12">
        <div class="span-7">
          ${items.map((item) => `<p class="lead" style="margin:0 0 2vh">${escapeHtml(item)}</p>`).join("")}
        </div>
        <div class="card-ink span-5" style="padding:3vh 2vw;align-self:start">
          <div class="t-meta" style="color:rgba(255,255,255,.62)">${preset.toUpperCase()}</div>
          <p class="t-body" style="margin-top:4vh;color:rgba(255,255,255,.82)">${escapeHtml(slide.note || "讲给别人听，是检验自己是否真正理解的一种方式。")}</p>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function getSlides(content: FeynmanHtmlContent) {
  return (content.presentationSlides ?? []).filter((slide) => slide.title.trim() && slide.body.trim());
}

function renderSlides(content: FeynmanHtmlContent, style: GuizangPptStyle): string {
  const slides = getSlides(content);
  const total = slides.length + 1;
  if (style === "swiss") {
    return [
      renderSwissCover(content, total),
      ...slides.map((slide, index) => renderSwissSlide(slide, index, total)),
    ].join("\n");
  }

  return [
    renderMagazineCover(content, total),
    ...slides.map((slide, index) => renderMagazineSlide(slide, index, total)),
  ].join("\n");
}

function injectSlides(template: string, slides: string): string {
  const deckInsertPattern = /<!-- SLIDES_HERE[\s\S]*?<\/div>\s*<div id="nav">/;
  if (deckInsertPattern.test(template)) {
    return template.replace(deckInsertPattern, `${slides}\n\n</div>\n\n<div id="nav">`);
  }
  return template.replace(/<!-- SLIDES_HERE[\s\S]*?-->/, slides);
}

export function renderFeynmanHtml(
  content: FeynmanHtmlContent,
  options: { mode?: FeynmanExportMode; style?: GuizangPptStyle } = {}
): string {
  const style = options.style ?? "swiss";
  const template = prepareSingleFileRuntime(loadGuizangTemplate(style));
  const title = `${content.bookTitle} · 讲书演示`;
  const slides = renderSlides(content, style);

  return injectSlides(template, slides)
    .replace("[必填] 替换为 PPT 标题 · Deck Title", escapeHtml(title));
}
