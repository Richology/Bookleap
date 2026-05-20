export type FeynmanHtmlContent = {
  bookTitle: string;
  author: string;
  coverImageUrl?: string;
  presentationSlides?: Array<{
    title: string;
    body: string;
    note?: string;
    sourceCardTitle?: string;
  }>;
  overview: string;
  coreIdeas: Array<{ title: string; explanation: string }>;
  methodsSummary: string;
  keyModels: Array<{ name: string; description: string }>;
  examples: Array<{ scenario: string; insight: string }>;
  finalTakeaway: string;
  decisionExercises?: Array<{
    scene: string;
    question: string;
    options: { A: string; B: string };
    feedback: { A: string; B: string };
  }>;
};

export type FeynmanCardsInput = {
  summary: string;
  readingGuide: string;
  viewMap: string;
  actionPrinciples: string;
  models: string;
  insights: string;
};

export type FeynmanDecisionExerciseInput = {
  scene: string;
  question: string;
  options: { A: string; B: string };
  feedback: { A: string; B: string };
};

export type FeynmanExportMode = "all" | "core" | "methods" | "decision";

export type FeynmanTemplateSlug =
  | "editorial-forest"
  | "cartesian"
  | "soft-editorial"
  | "vellum"
  | "signal"
  | "blue-professional"
  | "cobalt-grid"
  | "biennale-yellow"
  | "stencil-tablet"
  | "broadside"
  | "bold-poster"
  | "raw-grid"
  | "scatterbrain"
  | "capsule";

export type FeynmanTemplateChoice = {
  slug: FeynmanTemplateSlug;
  name: string;
  nameZh?: string;
  tagline: string;
  taglineZh?: string;
  bestFor: string;
  bestForZh?: string;
  reason: string;
  mood: string[];
  scheme: "light" | "dark" | "mixed";
  density: "low" | "medium" | "high";
  colors: {
    paper: string;
    panel: string;
    ink: string;
    muted: string;
    faint: string;
    line: string;
    primary: string;
    accent: string;
    accentSoft: string;
    finalBg: string;
    finalText: string;
  };
};

export type FeynmanExportRequest = {
  bookTitle: string;
  author?: string;
  coverImageUrl?: string;
  mode?: FeynmanExportMode;
  templateSlug?: FeynmanTemplateSlug;
  cards: FeynmanCardsInput;
  decisionExercises?: FeynmanDecisionExerciseInput[];
};
