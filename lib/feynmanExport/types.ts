export type FeynmanSlidePreset =
  | "problem"
  | "idea"
  | "method"
  | "case"
  | "list"
  | "quote"
  | "summary";

export type GuizangPptStyle = "magazine" | "swiss";

export type GuizangSwissLayout =
  | "S03"
  | "S08"
  | "S09"
  | "S10"
  | "S11"
  | "S14"
  | "S15"
  | "S16"
  | "S17"
  | "S19";

export type GuizangMagazineLayout =
  | "hero"
  | "divider"
  | "statement"
  | "two-column"
  | "grid"
  | "pipeline"
  | "quote"
  | "comparison"
  | "mixed";

export type GuizangSlideLayout = GuizangSwissLayout | GuizangMagazineLayout;

export type FeynmanHtmlContent = {
  bookTitle: string;
  author: string;
  coverImageUrl?: string;
  presentationSlides?: Array<{
    title: string;
    body: string;
    preset?: FeynmanSlidePreset;
    layout?: GuizangSlideLayout;
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

export type FeynmanExportRequest = {
  bookTitle: string;
  author?: string;
  coverImageUrl?: string;
  mode?: FeynmanExportMode;
  style?: GuizangPptStyle;
  cards: FeynmanCardsInput;
  decisionExercises?: FeynmanDecisionExerciseInput[];
};
