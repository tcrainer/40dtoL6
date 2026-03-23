export interface Word {
  id: string;
  topicId: string;
  day: number;
  german: string;
  english: string;
  germanSentence: string;
  englishSentence: string;
  importance: number;
  // Verb-specific fields
  isVerb?: boolean;
  german3rd?: string;     // e.g. "er nimmt"
  germanImperfekt?: string; // e.g. "ich nahm"
  germanPerfekt?: string;   // e.g. "ich habe genommen"
  verbType?: string;        // e.g. "Irregular (haben)"
}

export interface Topic {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export const TOPICS: Topic[] = [
  { id: "T1", name: "Topic 1 — Umwelt", shortName: "Umwelt", color: "#3a8a3a" },
  { id: "T2", name: "Topic 2 — Bildung", shortName: "Bildung", color: "#2a6fb5" },
  { id: "T3", name: "Topic 3 — Arbeit", shortName: "Arbeit", color: "#d97a1a" },
  { id: "T4", name: "Topic 4 — Musik", shortName: "Musik", color: "#7c4dba" },
  { id: "T5", name: "Topic 5 — Medien", shortName: "Medien", color: "#d94f4f" },
  { id: "T6", name: "Topic 6 — Traditionen und Feste", shortName: "Traditionen", color: "#a16b07" },
  { id: "SW", name: "Strukturwörter", shortName: "Struktur", color: "#6b6b6b" },
  { id: "VB", name: "Verben & Zeitformen", shortName: "Verben", color: "#c4a000" },
];

export const MAX_DAY = 36;

export const LEITNER_BOXES = [1, 2, 3, 4, 5, 6] as const;
export type LeitnerBox = (typeof LEITNER_BOXES)[number];

export const BOX_INTERVALS: Record<LeitnerBox, number> = {
  1: 0, 2: 1, 3: 3, 4: 7, 5: 14, 6: Infinity,
};

export const BOX_LABELS: Record<LeitnerBox, string> = {
  1: "repeat any time",
  2: "review tomorrow",
  3: "review in 3 days",
  4: "review in 7 days",
  5: "review in 14 days",
  6: "mastered!",
};

export const BOX_COLORS: Record<LeitnerBox, { fg: string; bg: string }> = {
  1: { fg: "#d94f4f", bg: "#fce8e8" },
  2: { fg: "#d97a1a", bg: "#fef0de" },
  3: { fg: "#c4a000", bg: "#fef9e0" },
  4: { fg: "#3a8a3a", bg: "#e6f4e8" },
  5: { fg: "#2a6fb5", bg: "#e4f0fb" },
  6: { fg: "#7c4dba", bg: "#f0eafb" },
};

export interface WordState {
  box: LeitnerBox;
  lastReviewDate: string | null;
  deToEnCorrect: boolean;
  enToDeCorrect: boolean;
  totalCorrect: number;
  totalIncorrect: number;
}

export interface UserStats {
  points: number;
  streak: number;
  lastActiveDate: string | null;
  longestStreak: number;
}

export type Direction = "de-to-en" | "en-to-de" | "verb-forms";
export type GradeResult = "correct" | "close" | "wrong";

export interface GradeDetail {
  result: GradeResult;
  userAnswer: string;
  correctAnswer: string;
  normalizedUser: string;
  normalizedCorrect: string;
}

export type SessionType = "review" | "learn";

export interface SessionCard {
  wordId: string;
  direction: Direction;
}

export interface SessionResult {
  wordId: string;
  direction: Direction;
  grade: GradeResult;
  userAnswer: string;
}

export interface SessionSummary {
  type: SessionType;
  totalCards: number;
  correct: number;
  close: number;
  wrong: number;
  promoted: string[];
  demoted: string[];
  newlyMastered: string[];
  pointsEarned: number;
}

export type AppView = "dashboard" | "session" | "session-complete" | "browse" | "topic-detail" | "box-detail";
