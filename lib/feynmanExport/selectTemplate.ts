import type {
  FeynmanCardsInput,
  FeynmanHtmlContent,
  FeynmanTemplateChoice,
  FeynmanTemplateSlug,
} from "./types";

type TemplateProfile = FeynmanTemplateChoice & {
  keywords: string[];
  exactKeywords: string[];
};

function normalize(value: string): string {
  return value.toLowerCase();
}

function countMatches(haystack: string, needles: string[]) {
  const text = normalize(haystack);
  return needles.reduce((score, needle) => {
    if (!needle) return score;
    return text.includes(normalize(needle)) ? score + 1 : score;
  }, 0);
}

function countRegexMatches(haystack: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => (pattern.test(haystack) ? score + 1 : score), 0);
}

function scoreProfile(profile: TemplateProfile, contentText: string) {
  const keywordScore = countMatches(contentText, profile.keywords);
  const exactScore = countMatches(contentText, profile.exactKeywords);

  let bonus = 0;
  if (profile.slug === "cartesian" || profile.slug === "signal" || profile.slug === "vellum") {
    bonus += countRegexMatches(contentText, [
      /研究|白皮书|报告|理论|方法论|模型|框架|体系/g,
      /投资|策略|分析|判断|决策/g,
    ]);
  }

  if (profile.slug === "editorial-forest" || profile.slug === "soft-editorial" || profile.slug === "biennale-yellow") {
    bonus += countRegexMatches(contentText, [/书|作者|故事|阅读|观点|理解|案例/g]);
  }

  if (profile.slug === "raw-grid" || profile.slug === "blue-professional" || profile.slug === "cobalt-grid") {
    bonus += countRegexMatches(contentText, [/行动|步骤|执行|工具|习惯|训练/g]);
  }

  if (profile.slug === "broadside" || profile.slug === "bold-poster") {
    bonus += countRegexMatches(contentText, [/结论|宣言|表达|分享|演示|讲给别人/g]);
  }

  return keywordScore * 2 + exactScore * 4 + bonus;
}

const TEMPLATE_PROFILES: TemplateProfile[] = [
  {
    slug: "editorial-forest",
    name: "Editorial Forest",
    tagline: "Forest green, dusty pink, and warm cream meet Source Serif 4 in a quiet, intentional quarterly-review deck.",
    bestFor: "Anything that should feel like a considered editorial: quarterly reviews, internal readouts, studio updates, creative-agency presentations, research recaps, book or program announcements, and team retrospectives.",
    reason: "适合书味最强、需要兼顾封面感和沉稳叙述的分享页。",
    mood: ["editorial", "quiet", "warm", "intentional"],
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
    keywords: ["书", "阅读", "观点", "理解", "大白话", "讲解", "书跃"],
    exactKeywords: ["费曼", "方法", "模型", "案例"],
  },
  {
    slug: "cartesian",
    name: "Cartesian",
    tagline: "Quiet warm-neutral palette with classical Playfair serifs; tasteful and unhurried.",
    bestFor: "Anything that should feel quiet, considered, and grown-up: investment theses, white papers, advisory work, longform research, gallery or cultural decks, editorial features, and founder reflections.",
    reason: "适合研究感、方法感较强的内容，强调冷静判断和结构化理解。",
    mood: ["quiet", "considered", "elegant", "warm-minimal"],
    scheme: "light",
    density: "low",
    colors: {
      paper: "#ede8e0",
      panel: "#f5f0e8",
      ink: "#1a1a1a",
      muted: "#5a5a5a",
      faint: "#8a8178",
      line: "#b8b0a4",
      primary: "#8a8178",
      accent: "#8a8178",
      accentSoft: "#e2dbd1",
      finalBg: "#1a1a1a",
      finalText: "#ede8e0",
    },
    keywords: ["研究", "白皮书", "理论", "框架", "模型", "判断", "推演"],
    exactKeywords: ["方法", "系统", "长期", "分析"],
  },
  {
    slug: "soft-editorial",
    name: "Soft Editorial",
    tagline: "Cormorant Garamond serif on warm paper with sage, blush, and lemon accents.",
    bestFor: "Anything that should feel literary, elegant, and unhurried: editorial features, longform brand stories, gallery or museum decks, advisory deliverables, wedding or lifestyle media, and founder essays.",
    reason: "适合更文学、更柔和的书，气质像周末长文而不是工具文档。",
    mood: ["literary", "elegant", "quiet", "warm-classical"],
    scheme: "light",
    density: "low",
    colors: {
      paper: "#f2eedf",
      panel: "#fbf7ef",
      ink: "#2a241b",
      muted: "#6a6358",
      faint: "#8b8478",
      line: "rgba(42, 36, 27, 0.12)",
      primary: "#2a241b",
      accent: "#e1a4c2",
      accentSoft: "#f1dce6",
      finalBg: "#2a241b",
      finalText: "#f2eedf",
    },
    keywords: ["文学", "阅读", "故事", "作者", "理解", "观点", "分享"],
    exactKeywords: ["书", "案例", "方法"],
  },
  {
    slug: "vellum",
    name: "Vellum",
    tagline: "Deep navy canvas with warm-yellow italic Cormorant serifs and a single dusty teal accent. A quiet, scholarly aesthetic.",
    bestFor: "Anything that should feel scholarly, literary, and quietly intelligent: research synthesis, white papers, academic and policy briefs, advisory deliverables, longform editorial pieces, and founder reflections.",
    reason: "适合知识密度高、需要学术感和安静权威感的内容。",
    mood: ["scholarly", "literary", "considered", "quiet", "intellectual"],
    scheme: "dark",
    density: "low",
    colors: {
      paper: "#2a3870",
      panel: "#343f80",
      ink: "#e8d85c",
      muted: "#d8d0aa",
      faint: "#9fb0d2",
      line: "rgba(232, 216, 92, 0.18)",
      primary: "#e8d85c",
      accent: "#3a7878",
      accentSoft: "#3a7878",
      finalBg: "#1f2644",
      finalText: "#e8d85c",
    },
    keywords: ["研究", "白皮书", "学术", "理论", "长文", "深度", "分析"],
    exactKeywords: ["方法", "模型", "系统"],
  },
  {
    slug: "signal",
    name: "Signal",
    tagline: "Deep navy canvas with bone paper and a single muted-gold accent; institutional with quiet weight.",
    bestFor: "Anything that should feel weighty, considered, and credibly institutional: investor decks, board presentations, consulting deliverables, legal or policy briefs, advisory pitches, and serious research or brand work.",
    reason: "适合更稳、更像报告的内容，尤其是需要可信、克制、机构感的分享页。",
    mood: ["institutional", "trustworthy", "considered", "weighty"],
    scheme: "mixed",
    density: "high",
    colors: {
      paper: "#f0ece3",
      panel: "#f7f3ea",
      ink: "#1c2644",
      muted: "#5a6476",
      faint: "#8892a3",
      line: "rgba(28, 38, 68, 0.12)",
      primary: "#1c2644",
      accent: "#c8a870",
      accentSoft: "#eadfc4",
      finalBg: "#1c2644",
      finalText: "#e2dcd0",
    },
    keywords: ["投资", "报告", "分析", "判断", "策略", "系统", "决策"],
    exactKeywords: ["研究", "方法", "模型", "框架"],
  },
  {
    slug: "blue-professional",
    name: "Blue Professional",
    tagline: "Cream paper background with electric cobalt blue accents; clean modern professional.",
    bestFor: "Anything that should feel modern-considered and lightly authoritative: B2B SaaS pitches, consulting deliverables, advisory updates, investor reports, research synthesis, internal reviews, and service-business brand work.",
    reason: "适合更清楚、更实用、更像工作汇报的内容。",
    mood: ["professional", "modern", "calm", "trustworthy"],
    scheme: "light",
    density: "medium",
    colors: {
      paper: "#fdfae7",
      panel: "#fbfaf3",
      ink: "#111111",
      muted: "#6b6b6b",
      faint: "#8f8f8f",
      line: "rgba(17, 17, 17, 0.12)",
      primary: "#1e2bfa",
      accent: "#1e2bfa",
      accentSoft: "#e5e9ff",
      finalBg: "#111111",
      finalText: "#fdfae7",
    },
    keywords: ["行动", "步骤", "执行", "习惯", "工具", "训练", "方法"],
    exactKeywords: ["建议", "案例", "总结"],
  },
  {
    slug: "cobalt-grid",
    name: "Cobalt Grid",
    tagline: "Electric cobalt italic serifs on a graph-paper canvas, anchored by stair-stepped pixel-glitch decorations and slim hairline rules.",
    bestFor: "Anything that should feel like a quietly serious design or research bulletin, art publication, curated trend report, studio annual, agency capabilities deck, architecture or academic deck.",
    reason: "适合偏研究、偏知识图谱、偏结构化讲解的内容。",
    mood: ["editorial", "design-research", "studious", "modernist", "tech-print", "monochrome"],
    scheme: "light",
    density: "medium",
    colors: {
      paper: "#f0ebde",
      panel: "#f8f4e9",
      ink: "#1f2be0",
      muted: "#5560e5",
      faint: "#8a91db",
      line: "rgba(31, 43, 224, 0.10)",
      primary: "#1f2be0",
      accent: "#1f2be0",
      accentSoft: "#dfe3ff",
      finalBg: "#1f2be0",
      finalText: "#f0ebde",
    },
    keywords: ["研究", "图谱", "结构", "模型", "框架", "讲解", "知识"],
    exactKeywords: ["方法", "总结"],
  },
  {
    slug: "biennale-yellow",
    name: "Biennale Yellow",
    tagline: "Solar yellow on warm parchment with deep indigo serif and atmospheric sun-glow gradients.",
    bestFor: "Anything that should feel like an art-biennale poster or museum annual programme: exhibition decks, arts-institution announcements, design conference brochures, curatorial pitches, literary publications, and studio retrospectives.",
    reason: "适合偏文化、偏文学、偏展陈感的书，整体更像一本可以讲给人的出版物。",
    mood: ["editorial", "atmospheric", "warm", "cultural-institution", "poster-like"],
    scheme: "light",
    density: "medium",
    colors: {
      paper: "#e9e5db",
      panel: "#f5efe3",
      ink: "#1b2566",
      muted: "#5f678d",
      faint: "#8f95b6",
      line: "rgba(27, 37, 102, 0.12)",
      primary: "#1b2566",
      accent: "#f1ee2e",
      accentSoft: "#f0da7c",
      finalBg: "#1b2566",
      finalText: "#f5efe3",
    },
    keywords: ["文化", "出版", "文学", "阅读", "故事", "作者", "出版物"],
    exactKeywords: ["书", "观点", "案例"],
  },
  {
    slug: "stencil-tablet",
    name: "Stencil & Tablet",
    tagline: "Bone paper with stencil-cut headlines and a six-color earth palette: archaeology meets brand.",
    bestFor: "Anything that should feel archival, tactile, and weighty-graphic: museum and cultural-institution decks, art or architecture brands, longform research, heritage and craft brands, and manifestos.",
    reason: "适合知识像档案、笔记、工具箱的内容，强调结构和手工感。",
    mood: ["archival", "earthy", "tactile", "considered", "graphic"],
    scheme: "light",
    density: "medium",
    colors: {
      paper: "#e2dcc9",
      panel: "#f4efe0",
      ink: "#0a0a0a",
      muted: "#5d594f",
      faint: "#8a8477",
      line: "rgba(10, 10, 10, 0.12)",
      primary: "#0a0a0a",
      accent: "#a06a3c",
      accentSoft: "#e9d7bf",
      finalBg: "#0a0a0a",
      finalText: "#f4efe0",
    },
    keywords: ["档案", "笔记", "工具", "模型", "方法", "总结", "步骤"],
    exactKeywords: ["行动", "案例", "知识"],
  },
  {
    slug: "broadside",
    name: "Broadside",
    tagline: "Dark editorial canvas with a single fire orange accent and bilingual Latin/Chinese type stack.",
    bestFor: "Anything that should land like a broadside newspaper headline: brand manifestos, magazine and cultural pitches, design talks, bilingual EN/CN decks, founder vision statements, and campaign launches.",
    reason: "适合更有宣言感、表达感、舞台感的分享页。",
    mood: ["editorial", "dramatic", "loud", "newspaper"],
    scheme: "dark",
    density: "medium",
    colors: {
      paper: "#111111",
      panel: "#1a1a18",
      ink: "#f0ece5",
      muted: "#888880",
      faint: "#b0a98f",
      line: "rgba(240, 236, 229, 0.10)",
      primary: "#e85d26",
      accent: "#e85d26",
      accentSoft: "#f7c9b1",
      finalBg: "#111111",
      finalText: "#f0ece5",
    },
    keywords: ["宣言", "表达", "分享", "讲给别人", "演示", "标题", "观点"],
    exactKeywords: ["总结", "结语", "案例"],
  },
  {
    slug: "bold-poster",
    name: "Bold Poster",
    tagline: "Editorial poster aesthetic with massive Shrikhand display and a single fire-engine red accent.",
    bestFor: "Anything that should land like a magazine cover: brand manifestos, founder vision decks, editorial or cultural pitches, creative reviews, tech keynotes, and quotable finance manifestos.",
    reason: "适合结论很少但很强、适合做海报式表达的内容。",
    mood: ["bold", "editorial", "loud", "confident"],
    scheme: "light",
    density: "low",
    colors: {
      paper: "#fbfaf6",
      panel: "#fbf7f0",
      ink: "#1c1410",
      muted: "#71655c",
      faint: "#9d8f84",
      line: "rgba(28, 20, 16, 0.12)",
      primary: "#d8000f",
      accent: "#d8000f",
      accentSoft: "#f7c9cf",
      finalBg: "#1c1410",
      finalText: "#f5f2ef",
    },
    keywords: ["海报", "宣言", "标题", "金句", "演示", "表达", "结论"],
    exactKeywords: ["一句话", "总结", "观点"],
  },
  {
    slug: "raw-grid",
    name: "Raw Grid",
    tagline: "Neo-brutalist deck with thick borders, offset shadows, and a pink/sage/ink palette.",
    bestFor: "Anything that should feel direct and graphic-confident: founder pitches, accelerator demos, brand decks, indie launches, creator portfolios, stat slides, comparison tables, and process flows.",
    reason: "适合行动导向、步骤清晰、像工作台一样讲内容的书。",
    mood: ["raw", "punchy", "energetic", "confident"],
    scheme: "light",
    density: "high",
    colors: {
      paper: "#fbfaf6",
      panel: "#f8f8f6",
      ink: "#0a0a0a",
      muted: "#5f5f5f",
      faint: "#8e8e8e",
      line: "rgba(10, 10, 10, 0.12)",
      primary: "#0a0a0a",
      accent: "#f2d4cf",
      accentSoft: "#e5edd6",
      finalBg: "#0a0a0a",
      finalText: "#fbfaf6",
    },
    keywords: ["行动", "步骤", "执行", "工具", "习惯", "训练", "方法"],
    exactKeywords: ["建议", "案例", "总结"],
  },
  {
    slug: "scatterbrain",
    name: "Scatterbrain",
    tagline: "Post-it inspired: pastel sticky notes, Caveat handwriting, Shrikhand and Zilla Slab type stack.",
    bestFor: "Anything that should feel like a designer's whiteboard: brainstorms, workshops, creative-agency credentials, design-thinking sessions, ideation pitches, and art-direction reviews.",
    reason: "适合更像工作坊、拆解练习、边讲边想的内容。",
    mood: ["playful", "creative", "warm", "messy-on-purpose", "workshop"],
    scheme: "light",
    density: "high",
    colors: {
      paper: "#f7f5f0",
      panel: "#fcfaf5",
      ink: "#2d2a26",
      muted: "#6f685e",
      faint: "#998d80",
      line: "rgba(45, 42, 38, 0.12)",
      primary: "#2d2a26",
      accent: "#ffc9c9",
      accentSoft: "#ffe066",
      finalBg: "#2d2a26",
      finalText: "#f7f5f0",
    },
    keywords: ["练习", "工作坊", "讨论", "场景", "选择", "案例", "互动"],
    exactKeywords: ["决策", "行动", "方法"],
  },
  {
    slug: "capsule",
    name: "Capsule",
    tagline: "Modular pill-shaped cards on warm bone with a full pastel-pop palette.",
    bestFor: "Anything that should feel modular, modern, and a little Y2K: lifestyle brands, creator portfolios, DTC launches, beauty or wellness, agency credentials, and playful tech demos.",
    reason: "适合更轻、更现代、信息块清晰的讲解页。",
    mood: ["playful", "modern", "warm", "fresh", "fun"],
    scheme: "light",
    density: "medium",
    colors: {
      paper: "#f5f5f0",
      panel: "#fbfaf4",
      ink: "#1a1a1a",
      muted: "#646464",
      faint: "#8f8f8f",
      line: "rgba(26, 26, 26, 0.12)",
      primary: "#1a1a1a",
      accent: "#8bb4f7",
      accentSoft: "#c5b5e0",
      finalBg: "#1a1a1a",
      finalText: "#f5f5f0",
    },
    keywords: ["现代", "轻松", "卡片", "模块", "练习", "互动", "分享"],
    exactKeywords: ["案例", "方法", "总结"],
  },
];

const TEMPLATE_COPY_ZH: Record<
  FeynmanTemplateSlug,
  { nameZh: string; taglineZh: string; bestForZh: string }
> = {
  "editorial-forest": {
    nameZh: "森林编辑风",
    taglineZh: "森林绿、灰粉色和温暖奶油纸色组合，像一份安静、克制、带书卷气的编辑型演示稿。",
    bestForZh: "适合需要被认真阅读和温和讲述的内容：读书分享、研究复盘、团队回顾、项目介绍、课程或计划发布。",
  },
  cartesian: {
    nameZh: "笛卡尔",
    taglineZh: "温暖中性色搭配经典衬线字体，整体安静、成熟、节奏不急，适合慢慢讲清楚复杂问题。",
    bestForZh: "适合研究感和判断感较强的内容：投资观点、白皮书、顾问报告、长篇研究、文化内容、创始人反思。",
  },
  "soft-editorial": {
    nameZh: "柔和编辑风",
    taglineZh: "温暖纸色、柔和鼠尾草绿、腮红粉和浅柠檬色，整体文学、优雅、低压。",
    bestForZh: "适合文学性、故事性和品牌叙事更强的内容：长文解读、品牌故事、展览介绍、生活方式内容、创始人文章。",
  },
  vellum: {
    nameZh: "深蓝学术风",
    taglineZh: "深海军蓝底色配暖黄色衬线字和低饱和青绿色点缀，安静、学术、带一点权威感。",
    bestForZh: "适合需要显得深度、理性、可信的内容：研究综合、白皮书、学术简报、政策简报、顾问交付和长篇观点。",
  },
  signal: {
    nameZh: "信号",
    taglineZh: "深海军蓝画布、骨白纸面和低调金色点缀，整体稳重、克制，带有机构感和分量感。",
    bestForZh: "适合严肃、可信、需要权威感的内容：投资汇报、董事会材料、咨询交付、法律或政策简报、研究报告和品牌策略。",
  },
  "blue-professional": {
    nameZh: "蓝色专业风",
    taglineZh: "奶油纸色背景配高亮钴蓝点缀，干净、现代、专业，信息呈现很清楚。",
    bestForZh: "适合偏工作场景和实用表达的内容：B2B 演示、咨询交付、顾问更新、投资报告、研究整理和内部复盘。",
  },
  "cobalt-grid": {
    nameZh: "钴蓝网格",
    taglineZh: "钴蓝字体落在网格纸画布上，配合像素化装饰和细线规则，既有研究感也有设计感。",
    bestForZh: "适合结构化、知识图谱和研究公告式内容：趋势报告、设计研究、工作室年报、机构能力介绍、建筑或学术演示。",
  },
  "biennale-yellow": {
    nameZh: "双年展黄",
    taglineZh: "明亮太阳黄、温暖羊皮纸色和深靛蓝衬线字体组合，像艺术展海报或文化机构年展。",
    bestForZh: "适合文化、文学、展览和出版气质的内容：艺术机构介绍、设计会议、策展提案、文学出版物、工作室回顾。",
  },
  "stencil-tablet": {
    nameZh: "石板模板风",
    taglineZh: "骨白纸面、镂空标题和大地色系组合，像档案、考古笔记和品牌手册的混合体。",
    bestForZh: "适合档案感、手工感和厚重图文感的内容：博物馆材料、文化机构演示、建筑品牌、长篇研究、传统工艺和宣言。",
  },
  broadside: {
    nameZh: "大字报",
    taglineZh: "深色编辑画布配火焰橙点缀和中英文字体体系，像一张有冲击力的报纸头版。",
    bestForZh: "适合需要有宣言感和舞台感的内容：品牌宣言、文化提案、设计演讲、中英双语演示、创始人愿景和活动发布。",
  },
  "bold-poster": {
    nameZh: "醒目海报",
    taglineZh: "杂志封面式排版，超大标题字体配单一正红色点缀，表达直接、强势、容易被记住。",
    bestForZh: "适合结论少但观点很强的内容：品牌宣言、愿景演示、编辑型提案、创意复盘、科技演讲和金句型金融观点。",
  },
  "raw-grid": {
    nameZh: "粗粝网格",
    taglineZh: "新粗野主义风格，粗边框、错位阴影和粉色、鼠尾草绿、墨色组合，直接、有力量。",
    bestForZh: "适合行动导向和流程清晰的内容：创业路演、加速器演示、独立产品发布、创作者作品集、数据页、对比表和流程图。",
  },
  scatterbrain: {
    nameZh: "便利贴白板",
    taglineZh: "像便利贴和白板一样的视觉语言，使用柔和粉彩、手写感字体和轻松的工作坊氛围。",
    bestForZh: "适合边拆解边讨论的内容：头脑风暴、工作坊、设计思考、创意提案、艺术指导复盘和互动练习。",
  },
  capsule: {
    nameZh: "胶囊卡片",
    taglineZh: "温暖骨白背景上排列模块化胶囊卡片，配一组轻快粉彩色，现代、轻松、信息块清楚。",
    bestForZh: "适合轻量、现代、有模块感的内容：生活方式品牌、创作者作品集、DTC 发布、美妆健康、机构介绍和轻快科技演示。",
  },
};

const TEMPLATE_THUMBNAILS: Record<FeynmanTemplateSlug, string[]> = {
  "editorial-forest": ["editorial-forest-1.png", "editorial-forest-2.png", "editorial-forest-5.png"],
  cartesian: ["cartesian-1.png", "cartesian-4.png", "cartesian-8.png"],
  "soft-editorial": ["soft-editorial-4.png", "soft-editorial-6.png", "soft-editorial-10.png"],
  vellum: ["vellum-1.png", "vellum-4.png", "vellum-8.png"],
  signal: ["signal-1.png", "signal-8.png", "signal-18.png"],
  "blue-professional": ["blue-professional-1.png", "blue-professional-6.png", "blue-professional-8.png"],
  "cobalt-grid": ["cobalt-grid-1.png", "cobalt-grid-3.png", "cobalt-grid-5.png"],
  "biennale-yellow": ["biennale-yellow-1.png", "biennale-yellow-5.png", "biennale-yellow-8.png"],
  "stencil-tablet": ["stencil-tablet-1.png", "stencil-tablet-3.png", "stencil-tablet-8.png"],
  broadside: ["broadside-1.png", "broadside-4.png", "broadside-13.png"],
  "bold-poster": ["bold-poster-1.png", "bold-poster-4.png", "bold-poster-8.png"],
  "raw-grid": ["raw-grid-1.png", "raw-grid-4.png", "raw-grid-8.png"],
  scatterbrain: ["scatterbrain-1.png", "scatterbrain-4.png", "scatterbrain-8.png"],
  capsule: ["capsule-1.png", "capsule-4.png", "capsule-8.png"],
};

function getThumbnailUrls(slug: FeynmanTemplateSlug): string[] {
  return TEMPLATE_THUMBNAILS[slug].map((name) => `/feynman-templates/screenshots/${name}`);
}

function buildContentText(bookTitle: string, author: string, cards: FeynmanCardsInput, content: FeynmanHtmlContent) {
  return [
    bookTitle,
    author,
    cards.summary,
    cards.readingGuide,
    cards.viewMap,
    cards.actionPrinciples,
    cards.models,
    cards.insights,
    content.overview,
    content.methodsSummary,
    content.finalTakeaway,
    content.presentationSlides
      ?.map((item) => `${item.title} ${item.body} ${item.note ?? ""} ${item.sourceCardTitle ?? ""}`)
      .join(" ") ?? "",
    content.coreIdeas.map((item) => `${item.title} ${item.explanation}`).join(" "),
    content.keyModels.map((item) => `${item.name} ${item.description}`).join(" "),
    content.examples.map((item) => `${item.scenario} ${item.insight}`).join(" "),
    content.decisionExercises
      ?.map((item) => `${item.scene} ${item.question} ${item.options.A} ${item.options.B}`)
      .join(" ") ?? "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function selectFeynmanTemplate(params: {
  bookTitle: string;
  author: string;
  cards: FeynmanCardsInput;
  content?: FeynmanHtmlContent;
}): FeynmanTemplateChoice {
  const fallbackContent: FeynmanHtmlContent = {
    bookTitle: params.bookTitle,
    author: params.author,
    overview: params.cards.summary,
    coreIdeas: [{ title: "观点地图", explanation: params.cards.viewMap }],
    methodsSummary: params.cards.actionPrinciples,
    keyModels: [{ name: "方法模型", description: params.cards.models }],
    examples: [{ scenario: "使用场景", insight: params.cards.insights }],
    finalTakeaway: params.cards.readingGuide,
  };
  const contentText = buildContentText(
    params.bookTitle,
    params.author,
    params.cards,
    params.content ?? fallbackContent
  );
  const sorted = [...TEMPLATE_PROFILES]
    .map((profile) => ({ profile, score: scoreProfile(profile, contentText) }))
    .sort((a, b) => b.score - a.score);

  const winner = sorted[0]?.profile ?? TEMPLATE_PROFILES[0];
  return getFeynmanTemplateBySlug(winner.slug);
}

export function getFeynmanTemplateBySlug(slug: string | undefined): FeynmanTemplateChoice {
  const winner = TEMPLATE_PROFILES.find((profile) => profile.slug === slug) ?? TEMPLATE_PROFILES[0];
  const templateSlug = winner.slug as FeynmanTemplateSlug;
  const zh = TEMPLATE_COPY_ZH[templateSlug];
  return {
    slug: templateSlug,
    name: winner.name,
    nameZh: zh.nameZh,
    tagline: winner.tagline,
    taglineZh: zh.taglineZh,
    bestFor: winner.bestFor,
    bestForZh: zh.bestForZh,
    thumbnailUrls: getThumbnailUrls(templateSlug),
    reason: winner.reason,
    mood: winner.mood,
    scheme: winner.scheme,
    density: winner.density,
    colors: winner.colors,
  };
}
