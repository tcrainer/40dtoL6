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
import { BOX_INTERVALS, MAX_DAY } from "@/types";
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
  if (box === 6) return false;
  if (box === 1) return true;
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
  view: AppView;
  setView: (v: AppView) => void;

  // Topic detail
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;

  currentDay: number;
  setCurrentDay: (d: number) => void;

  wordStates: Record<string, WordState>;
  getWordState: (wordId: string) => WordState | null;
  initWordState: (wordId: string) => void;

  // Session
  sessionType: SessionType;
  sessionCards: SessionCard[];
  sessionIndex: number;
  sessionResults: SessionResult[];
  sessionDirectionPhase: 1 | 2;
  sessionFirstDirection: Direction;

  startReviewSession: () => void;
  startLearnSession: () => void;
  recordAnswer: (grade: GradeResult, userAnswer: string) => void;
  advanceCard: () => void;
  getSessionSummary: () => SessionSummary;

  getDueWordIds: () => string[];
  getNewWordIds: () => string[];
  getBoxCounts: () => Record<LeitnerBox | 0, number>;
  getTopicProgress: (topicId: string) => { total: number; mastered: number; inProgress: number; untested: number };

  resetAll: () => void;
}

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
      view: "dashboard",
      setView: (v) => set({ view: v }),

      selectedTopicId: null,
      setSelectedTopicId: (id) => set({ selectedTopicId: id }),

      currentDay: 1,
      setCurrentDay: (d) => set({ currentDay: Math.max(1, Math.min(MAX_DAY, d)) }),

      wordStates: {},

      getWordState: (wordId) => {
        return get().wordStates[wordId] || null;
      },

      initWordState: (wordId) => {
        const current = get().wordStates[wordId];
        if (!current) {
          set((s) => ({
            wordStates: { ...s.wordStates, [wordId]: defaultWordState() },
          }));
        }
      },

      sessionType: "review",
      sessionCards: [],
      sessionIndex: 0,
      sessionResults: [],
      sessionDirectionPhase: 1,
      sessionFirstDirection: "de-to-en",

      // Review: due words from boxes 1–5
      startReviewSession: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();

        const dueIds: string[] = [];
        for (const word of allWords) {
          if (word.day > currentDay) continue;
          const ws = wordStates[word.id];
          if (!ws) continue;
          if (isDue(ws)) dueIds.push(word.id);
        }

        dueIds.sort((a, b) => {
          const boxA = wordStates[a]?.box || 1;
          const boxB = wordStates[b]?.box || 1;
          return boxA - boxB;
        });

        const cards: SessionCard[] = dueIds.map((id) => ({
          wordId: id,
          direction: "de-to-en",
        }));

        set({
          view: "session",
          sessionType: "review",
          sessionCards: shuffleArray(cards),
          sessionIndex: 0,
          sessionResults: [],
          sessionDirectionPhase: 1,
          sessionFirstDirection: Math.random() < 0.5 ? "de-to-en" : "en-to-de",
        });
      },

      // Learn: new (untested) words for current day
      startLearnSession: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords();

        const newIds: string[] = [];
        for (const word of allWords) {
          if (word.day > currentDay) continue;
          if (!wordStates[word.id]) newIds.push(word.id);
        }

        const cards: SessionCard[] = newIds.map((id) => ({
          wordId: id,
          direction: "de-to-en",
        }));

        // Initialize word states for new words
        const newStates = { ...get().wordStates };
        for (const id of newIds) {
          if (!newStates[id]) newStates[id] = defaultWordState();
        }

        set({
          view: "session",
          sessionType: "learn",
          sessionCards: cards,
          sessionIndex: 0,
          sessionResults: [],
          sessionDirectionPhase: 1,
          sessionFirstDirection: Math.random() < 0.5 ? "de-to-en" : "en-to-de",
          wordStates: newStates,
        });
      },

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

        const passing = grade === "correct" || grade === "close";
        const ws = { ...(get().wordStates[card.wordId] || defaultWordState()) };

        if (currentDirection === "de-to-en") {
          ws.deToEnCorrect = passing;
        } else {
          ws.enToDeCorrect = passing;
        }

        if (passing) ws.totalCorrect += 1;
        else ws.totalIncorrect += 1;

        set((s) => ({
          sessionResults: [...s.sessionResults, result],
          wordStates: { ...s.wordStates, [card.wordId]: ws },
        }));
      },

      advanceCard: () => {
        const { sessionCards, sessionIndex, sessionDirectionPhase, wordStates, sessionType } = get();
        if (sessionIndex >= sessionCards.length) return;

        if (sessionDirectionPhase === 1) {
          set({ sessionDirectionPhase: 2 });
          return;
        }

        // Phase 2 complete — apply Leitner logic
        const card = sessionCards[sessionIndex];
        const ws = { ...wordStates[card.wordId] };

        const bothCorrect = ws.deToEnCorrect && ws.enToDeCorrect;
        const isFirstTest = ws.totalCorrect + ws.totalIncorrect <= 2; // just tested 2 directions

        if (sessionType === "learn" && isFirstTest) {
          // First time testing: correct → box 5, wrong → box 2
          if (bothCorrect) {
            ws.box = 5 as LeitnerBox;
          } else {
            ws.box = 2 as LeitnerBox;
          }
        } else {
          // Normal Leitner: promote or demote
          if (bothCorrect) {
            ws.box = Math.min(6, ws.box + 1) as LeitnerBox;
          } else {
            ws.box = 1 as LeitnerBox;
          }
        }

        ws.lastReviewDate = todayISO();
        ws.deToEnCorrect = false;
        ws.enToDeCorrect = false;

        const nextIndex = sessionIndex + 1;
        const isComplete = nextIndex >= sessionCards.length;

        set((s) => ({
          wordStates: { ...s.wordStates, [card.wordId]: ws },
          sessionIndex: nextIndex,
          sessionDirectionPhase: 1,
          sessionFirstDirection: Math.random() < 0.5 ? "de-to-en" : "en-to-de",
          view: isComplete ? "session-complete" : s.view,
        }));
      },

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

        let correct = 0, close = 0, wrong = 0;
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

        return { type: sessionType, totalCards: sessionResults.length, correct, close, wrong, promoted, demoted, newlyMastered };
      },

      getDueWordIds: () => {
        const { wordStates, currentDay } = get();
        return getAllWords()
          .filter((w) => w.day <= currentDay && wordStates[w.id] && isDue(wordStates[w.id]))
          .map((w) => w.id);
      },

      getNewWordIds: () => {
        const { wordStates, currentDay } = get();
        return getAllWords()
          .filter((w) => w.day <= currentDay && !wordStates[w.id])
          .map((w) => w.id);
      },

      // Box 0 = untested
      getBoxCounts: () => {
        const { wordStates, currentDay } = get();
        const allWords = getAllWords().filter(w => w.day <= currentDay);
        const counts: Record<LeitnerBox | 0, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const w of allWords) {
          const ws = wordStates[w.id];
          if (!ws) {
            counts[0]++;
          } else {
            counts[ws.box]++;
          }
        }
        return counts;
      },

      getTopicProgress: (topicId) => {
        const { wordStates, currentDay } = get();
        const topicWords = getAllWords().filter((w) => w.topicId === topicId && w.day <= currentDay);
        const total = topicWords.length;
        let mastered = 0, inProgress = 0, untested = 0;
        for (const w of topicWords) {
          const ws = wordStates[w.id];
          if (!ws) { untested++; continue; }
          if (ws.box === 6) mastered++;
          else inProgress++;
        }
        return { total, mastered, inProgress, untested };
      },

      resetAll: () =>
        set({
          view: "dashboard",
          currentDay: 1,
          wordStates: {},
          sessionCards: [],
          sessionIndex: 0,
          sessionResults: [],
          sessionDirectionPhase: 1,
          selectedTopicId: null,
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
