// ── Word & Topic types ──────────────────────────────────────────────────────

export interface Word {
  id: string;
  topicId: string;
  day: number;
  german: string;
  english: string;
  germanSentence: string;
  englishSentence: string;
  importance: number; // 1–4 stars
}

export interface Topic {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export const TOPICS: Topic[] = [
  { id: "T1", name: "The world around us", shortName: "Umwelt", color: "var(--color-box4)" },
  { id: "T2", name: "Education & Employment", shortName: "Bildung", color: "var(--color-box5)" },
  { id: "T3", name: "Home & Abroad", shortName: "Zuhause", color: "var(--color-box2)" },
  { id: "T4", name: "Personal life & Relationships", shortName: "Leben", color: "var(--color-box6)" },
  { id: "T5", name: "B1 Advanced vocabulary", shortName: "B1", color: "var(--color-box1)" },
  { id: "T6", name: "Opinion, Intensifiers & Adj.", shortName: "Meinung", color: "var(--color-close)" },
  { id: "SW", name: "Strukturwörter", shortName: "Struktur", color: "var(--color-ink-muted)" },
  { id: "VB", name: "Important Verbs & Tenses", shortName: "Verben", color: "var(--color-box3)" },
  { id: "WR", name: "Writing phrases", shortName: "Schreiben", color: "var(--color-accent)" },
];

// ── Leitner system ──────────────────────────────────────────────────────────

export const LEITNER_BOXES = [1, 2, 3, 4, 5, 6] as const;
export type LeitnerBox = (typeof LEITNER_BOXES)[number];

/**
 * Review intervals in days for each box.
 * Box 1: every session (0 = always due)
 * Box 2: every 2 days
 * Box 3: every 4 days
 * Box 4: every 8 days
 * Box 5: every 14 days
 * Box 6: mastered — no scheduled review
 */
export const BOX_INTERVALS: Record<LeitnerBox, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 8,
  5: 14,
  6: Infinity,
};

export const BOX_LABELS: Record<LeitnerBox, string> = {
  1: "New / struggling",
  2: "2-day review",
  3: "4-day review",
  4: "8-day review",
  5: "14-day review",
  6: "Mastered",
};

export const BOX_COLORS: Record<LeitnerBox, { fg: string; bg: string }> = {
  1: { fg: "var(--color-box1)", bg: "var(--color-box1-bg)" },
  2: { fg: "var(--color-box2)", bg: "var(--color-box2-bg)" },
  3: { fg: "var(--color-box3)", bg: "var(--color-box3-bg)" },
  4: { fg: "var(--color-box4)", bg: "var(--color-box4-bg)" },
  5: { fg: "var(--color-box5)", bg: "var(--color-box5-bg)" },
  6: { fg: "var(--color-box6)", bg: "var(--color-box6-bg)" },
};

// ── Per-word learning state ─────────────────────────────────────────────────

export interface WordState {
  box: LeitnerBox;
  lastReviewDate: string | null; // ISO date string
  deToEnCorrect: boolean; // current session: got DE→EN right
  enToDeCorrect: boolean; // current session: got EN→DE right
  totalCorrect: number;
  totalIncorrect: number;
}

// ── Review directions ───────────────────────────────────────────────────────

export type Direction = "de-to-en" | "en-to-de";

// ── Grading result ──────────────────────────────────────────────────────────

export type GradeResult = "correct" | "close" | "wrong";

export interface GradeDetail {
  result: GradeResult;
  userAnswer: string;
  correctAnswer: string;
  normalizedUser: string;
  normalizedCorrect: string;
}

// ── Session types ───────────────────────────────────────────────────────────

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
  promoted: string[]; // word IDs that moved up
  demoted: string[];  // word IDs that went back to box 1
  newlyMastered: string[]; // word IDs that reached box 6
}

// ── App view state ──────────────────────────────────────────────────────────

export type AppView = "dashboard" | "session" | "session-complete" | "browse";
