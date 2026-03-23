import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppView,
  Direction,
  GradeResult,
  LeitnerBox,
  SessionCard,
  SessionResult,
  SessionSummary,
  SessionType,
  WordState,
} from "@/types";
import { BOX_INTERVALS } from "@/types";
import { getAllWords } from "@/data/vocabulary";

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function isDue(state: WordState): boolean {
  const box = state.box;
  if (box === 6) return false; // mastered
  if (box === 1) return true; // always due
  if (!state.lastReviewDate) return true;
  const interval = BOX_INTERVALS[box];
  const elapsed = daysBetween(state.lastReviewDate, todayISO());
  return elapsed >= interval;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── Store types ─────────────────────────────────────────────────────────────

interface AppState {
  // -- App view --
  view: AppView;
  setView: (v: AppView) => void;

  // -- Current day (1–36) --
  currentDay: number;
  setCurrentDay: (d: number) => void;

  // -- Per-word learning state --
  wordStates: Record<string, WordState>;
  getWordState: (wordId: string) => WordState;
  initWordState: (wordId: string) => void;

  // -- Session --
  sessionType: SessionType;
  sessionCards: SessionCard[];
  sessionIndex: number;
  sessionResults: SessionResult[];
  sessionDirectionPhase: 1 | 2; // 1 = first direction, 2 = second direction
  sessionFirstDirection: Direction; // randomized per card

  // Session actions
  startReviewSession: () => void;
  startLearnSession: () => void;
  recordAnswer: (grade: GradeResult, userAnswer: string) => void;
  advanceCard: () => void;
  getSessionSummary: () => SessionSummary;

  // -- Query helpers --
  getDueWordIds: () => string[];
  getNewWordIds: () => string[];
  getBoxCounts: () => Record<LeitnerBox, number>;
  getTopicProgress: (topicId: string) => { total: number; mastered: number; inProgress: number };

  // -- Reset --
  resetAll: () => void;
}

// ── Default word state ──────────────────────────────────────────────────────

const defaultWordState = (): WordState => ({
  box: 1,
  lastReviewDate: null,
  deToEnCorrect: false,
  enToDeCorrect: false,
  totalCorrect: 0,
  totalIncorrect: 0,
});

// ── Store ───────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // -- View --
      view: "dashboard",
      setView: (v) => set({ view: v }),

      // -- Day --
      currentDay: 1,
      setCurrentDay: (d) => set({ currentDay: Math.max(1, Math.min(60, d)) }),

      // -- Word states --
      wordStates: {},

      getWordState: (wordId) => {
        const ws = get().wordStates[wordId];
        return ws || defaultWordState();
      },

      initWordState: (wordId) => {
        const current = get().wordStates[wordId];
        if (!current) {
          set((s) => ({
            wordStates: {
              ...s.wordStates,
              [wordId]: defaultWordState(),
            },
          }));
        }
      },

      // -- Session state --
      sessionType: "review",
      sessionCards: [],
      sessionIndex: 0,
      sessionResults: [],
      sessionDirectionPhase: 1,
      sessionFirstDirection: "de-to-en",

      // -- Start review session: due words from boxes 1–5 --
      startReviewSession: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();

        // Get words that are unlocked (day ≤ currentDay) and have state
        const dueIds: string[] = [];
        for (const word of allWords) {
          if (word.day > currentDay) continue;
          const ws = wordStates[word.id];
          if (!ws) continue; // not yet introduced
          if (isDue(ws)) dueIds.push(word.id);
        }

        // Sort: box 1 first, then by box ascending
        dueIds.sort((a, b) => {
          const boxA = (wordStates[a]?.box || 1);
          const boxB = (wordStates[b]?.box || 1);
          return boxA - boxB;
        });

        // Create session cards — each word gets tested in both directions
        // but we present it as a single card with 2 phases
        const cards: SessionCard[] = dueIds.map((id) => ({
          wordId: id,
          direction: "de-to-en", // placeholder — actual direction randomized per card
        }));

        const firstDir: Direction = Math.random() < 0.5 ? "de-to-en" : "en-to-de";

        set({
          view: "session",
          sessionType: "review",
          sessionCards: shuffleArray(cards),
          sessionIndex: 0,
          sessionResults: [],
          sessionDirectionPhase: 1,
          sessionFirstDirection: firstDir,
        });
      },

      // -- Start learn session: new words for today --
      startLearnSession: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();

        // Words for current day that haven't been introduced yet
        const newIds: string[] = [];
        for (const word of allWords) {
          if (word.day > currentDay) continue;
          if (!wordStates[word.id]) {
            newIds.push(word.id);
          }
        }

        const cards: SessionCard[] = newIds.map((id) => ({
          wordId: id,
          direction: "de-to-en",
        }));

        const firstDir: Direction = Math.random() < 0.5 ? "de-to-en" : "en-to-de";

        // Initialize word states for new words
        const newStates = { ...get().wordStates };
        for (const id of newIds) {
          if (!newStates[id]) newStates[id] = defaultWordState();
        }

        set({
          view: "session",
          sessionType: "learn",
          sessionCards: cards, // learn session: in order
          sessionIndex: 0,
          sessionResults: [],
          sessionDirectionPhase: 1,
          sessionFirstDirection: firstDir,
          wordStates: newStates,
        });
      },

      // -- Record a typed answer for current phase --
      recordAnswer: (grade, userAnswer) => {
        const { sessionCards, sessionIndex, sessionDirectionPhase, sessionFirstDirection } = get();
        if (sessionIndex >= sessionCards.length) return;

        const card = sessionCards[sessionIndex];
        const currentDirection: Direction =
          sessionDirectionPhase === 1
            ? sessionFirstDirection
            : sessionFirstDirection === "de-to-en"
              ? "en-to-de"
              : "de-to-en";

        const result: SessionResult = {
          wordId: card.wordId,
          direction: currentDirection,
          grade,
          userAnswer,
        };

        // Update the direction-specific correctness on the word state
        const passing = grade === "correct" || grade === "close";
        const ws = { ...get().getWordState(card.wordId) };

        if (currentDirection === "de-to-en") {
          ws.deToEnCorrect = passing;
        } else {
          ws.enToDeCorrect = passing;
        }

        if (passing) {
          ws.totalCorrect += 1;
        } else {
          ws.totalIncorrect += 1;
        }

        set((s) => ({
          sessionResults: [...s.sessionResults, result],
          wordStates: {
            ...s.wordStates,
            [card.wordId]: ws,
          },
        }));
      },

      // -- Advance to next phase or next card --
      advanceCard: () => {
        const { sessionCards, sessionIndex, sessionDirectionPhase, wordStates } = get();
        if (sessionIndex >= sessionCards.length) return;

        if (sessionDirectionPhase === 1) {
          // Move to phase 2 (second direction) with a new random first direction
          set({
            sessionDirectionPhase: 2,
            sessionFirstDirection: get().sessionFirstDirection, // keep same first dir
          });
          return;
        }

        // Phase 2 complete — apply Leitner promotion/demotion for this word
        const card = sessionCards[sessionIndex];
        const ws = { ...wordStates[card.wordId] };

        const bothCorrect = ws.deToEnCorrect && ws.enToDeCorrect;

        if (bothCorrect) {
          // Promote: move up one box (max 6)
          ws.box = Math.min(6, ws.box + 1) as LeitnerBox;
        } else {
          // Demote: back to box 1
          ws.box = 1;
        }

        ws.lastReviewDate = todayISO();
        // Reset direction flags for next review
        ws.deToEnCorrect = false;
        ws.enToDeCorrect = false;

        const nextIndex = sessionIndex + 1;
        const isComplete = nextIndex >= sessionCards.length;

        // Randomize direction for next card
        const nextFirstDir: Direction = Math.random() < 0.5 ? "de-to-en" : "en-to-de";

        set((s) => ({
          wordStates: {
            ...s.wordStates,
            [card.wordId]: ws,
          },
          sessionIndex: nextIndex,
          sessionDirectionPhase: 1,
          sessionFirstDirection: nextFirstDir,
          view: isComplete ? "session-complete" : s.view,
        }));
      },

      // -- Session summary (called on session-complete screen) --
      getSessionSummary: () => {
        const { sessionType, sessionResults, wordStates } = get();

        const wordResultMap = new Map<string, { deOk: boolean; enOk: boolean }>();
        for (const r of sessionResults) {
          const existing = wordResultMap.get(r.wordId) || { deOk: false, enOk: false };
          const pass = r.grade === "correct" || r.grade === "close";
          if (r.direction === "de-to-en") existing.deOk = pass;
          else existing.enOk = pass;
          wordResultMap.set(r.wordId, existing);
        }

        let correct = 0;
        let close = 0;
        let wrong = 0;
        const promoted: string[] = [];
        const demoted: string[] = [];
        const newlyMastered: string[] = [];

        for (const r of sessionResults) {
          if (r.grade === "correct") correct++;
          else if (r.grade === "close") close++;
          else wrong++;
        }

        for (const [wordId, result] of wordResultMap) {
          const ws = wordStates[wordId];
          if (!ws) continue;
          if (result.deOk && result.enOk) {
            promoted.push(wordId);
            if (ws.box === 6) newlyMastered.push(wordId);
          } else {
            demoted.push(wordId);
          }
        }

        return {
          type: sessionType,
          totalCards: sessionResults.length,
          correct,
          close,
          wrong,
          promoted,
          demoted,
          newlyMastered,
        };
      },

      // -- Due words (boxes 1-5, past their interval) --
      getDueWordIds: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();
        return allWords
          .filter((w) => w.day <= currentDay && wordStates[w.id] && isDue(wordStates[w.id]))
          .map((w) => w.id);
      },

      // -- New words (not yet introduced, day ≤ currentDay) --
      getNewWordIds: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();
        return allWords
          .filter((w) => w.day <= currentDay && !wordStates[w.id])
          .map((w) => w.id);
      },

      // -- Box counts (only for words that have been introduced) --
      getBoxCounts: () => {
        const { wordStates } = get();
        const counts: Record<LeitnerBox, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const ws of Object.values(wordStates)) {
          counts[ws.box]++;
        }
        return counts;
      },

      // -- Topic progress --
      getTopicProgress: (topicId) => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();
        const topicWords = allWords.filter((w) => w.topicId === topicId && w.day <= currentDay);
        const total = topicWords.length;
        let mastered = 0;
        let inProgress = 0;
        for (const w of topicWords) {
          const ws = wordStates[w.id];
          if (!ws) continue;
          if (ws.box === 6) mastered++;
          else inProgress++;
        }
        return { total, mastered, inProgress };
      },

      // -- Full reset --
      resetAll: () =>
        set({
          view: "dashboard",
          currentDay: 1,
          wordStates: {},
          sessionCards: [],
          sessionIndex: 0,
          sessionResults: [],
          sessionDirectionPhase: 1,
        }),
    }),
    {
      name: "german-vocab-leitner-v1",
      partialize: (state) => ({
        currentDay: state.currentDay,
        wordStates: state.wordStates,
      }),
    }
  )
);
