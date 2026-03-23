import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppView, Direction, GradeResult, LeitnerBox, SessionCard,
  SessionResult, SessionSummary, SessionType, WordState, UserStats,
} from "@/types";
import { BOX_INTERVALS, MAX_DAY } from "@/types";
import { getAllWords } from "@/data/vocabulary";

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function isDue(state: WordState): boolean {
  if (state.box === 6) return false;
  if (state.box === 1) return true;
  if (!state.lastReviewDate) return true;
  return daysBetween(state.lastReviewDate, todayISO()) >= BOX_INTERVALS[state.box];
}
function shuffle<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}

/**
 * Build session cards with batched directions:
 * Take words, split into groups of ~5, for each group:
 * test all in direction A, then all in direction B.
 */
function buildSessionCards(wordIds: string[]): SessionCard[] {
  const cards: SessionCard[] = [];
  const batchSize = 5;

  for (let i = 0; i < wordIds.length; i += batchSize) {
    const batch = wordIds.slice(i, i + batchSize);
    const firstDir: Direction = Math.random() < 0.5 ? "de-to-en" : "en-to-de";
    const secondDir: Direction = firstDir === "de-to-en" ? "en-to-de" : "de-to-en";

    // Shuffle within batch
    const shuffledBatch = shuffle(batch);

    // Direction A for all words in batch
    for (const id of shuffledBatch) {
      cards.push({ wordId: id, direction: firstDir });
    }
    // Direction B for same words (re-shuffled)
    for (const id of shuffle(shuffledBatch)) {
      cards.push({ wordId: id, direction: secondDir });
    }
  }
  return cards;
}

const defaultWordState = (): WordState => ({
  box: 1, lastReviewDate: null, deToEnCorrect: false, enToDeCorrect: false, totalCorrect: 0, totalIncorrect: 0,
});
const defaultStats = (): UserStats => ({
  points: 0, streak: 0, lastActiveDate: null, longestStreak: 0,
});

interface AppState {
  view: AppView;
  setView: (v: AppView) => void;
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;
  currentDay: number;
  setCurrentDay: (d: number) => void;
  wordStates: Record<string, WordState>;
  getWordState: (wordId: string) => WordState | null;
  stats: UserStats;
  addPoints: (pts: number) => void;
  updateStreak: () => void;

  // Session — now flat list, no phases
  sessionType: SessionType;
  sessionCards: SessionCard[];
  sessionIndex: number;
  sessionResults: SessionResult[];

  startReviewSession: () => void;
  startLearnSession: () => void;
  startCustomSession: (wordIds: string[]) => void;
  recordAnswer: (grade: GradeResult, userAnswer: string) => void;
  nextCard: () => void;
  getSessionSummary: () => SessionSummary;

  getDueWordIds: () => string[];
  getNewWordIds: () => string[];
  getBoxCounts: () => Record<LeitnerBox | 0, number>;
  getDueTodayCount: () => number;
  isAllRevisedToday: () => boolean;
  getTopicProgress: (topicId: string) => { total: number; mastered: number; inProgress: number; untested: number };
  resetAll: () => void;
}

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
      getWordState: (wid) => get().wordStates[wid] || null,
      stats: defaultStats(),

      addPoints: (pts) => set((s) => ({ stats: { ...s.stats, points: s.stats.points + pts } })),

      updateStreak: () => set((s) => {
        const today = todayISO();
        const last = s.stats.lastActiveDate;
        let ns = s.stats.streak;
        if (!last || daysBetween(last, today) > 1) ns = 1;
        else if (daysBetween(last, today) === 1) ns = s.stats.streak + 1;
        return { stats: { ...s.stats, streak: ns, lastActiveDate: today, longestStreak: Math.max(s.stats.longestStreak, ns) } };
      }),

      sessionType: "review",
      sessionCards: [],
      sessionIndex: 0,
      sessionResults: [],

      startReviewSession: () => {
        const { wordStates, currentDay } = get();
        const dueIds: string[] = [];
        for (const w of getAllWords()) {
          if (w.day > currentDay) continue;
          const ws = wordStates[w.id];
          if (ws && isDue(ws)) dueIds.push(w.id);
        }
        dueIds.sort((a, b) => (wordStates[a]?.box || 1) - (wordStates[b]?.box || 1));

        // Reset direction flags for due words
        const newStates = { ...get().wordStates };
        for (const id of dueIds) {
          if (newStates[id]) newStates[id] = { ...newStates[id], deToEnCorrect: false, enToDeCorrect: false };
        }

        set({
          view: "session", sessionType: "review",
          sessionCards: buildSessionCards(dueIds),
          sessionIndex: 0, sessionResults: [], wordStates: newStates,
        });
        get().updateStreak();
      },

      startLearnSession: () => {
        const { wordStates, currentDay } = get();
        const newIds: string[] = [];
        for (const w of getAllWords()) {
          if (w.day > currentDay) continue;
          if (!wordStates[w.id]) newIds.push(w.id);
        }
        const newStates = { ...get().wordStates };
        for (const id of newIds) newStates[id] = defaultWordState();

        set({
          view: "session", sessionType: "learn",
          sessionCards: buildSessionCards(newIds),
          sessionIndex: 0, sessionResults: [], wordStates: newStates,
        });
        get().updateStreak();
      },

      startCustomSession: (wordIds) => {
        const newStates = { ...get().wordStates };
        for (const id of wordIds) {
          if (!newStates[id]) newStates[id] = defaultWordState();
          else newStates[id] = { ...newStates[id], deToEnCorrect: false, enToDeCorrect: false };
        }
        set({
          view: "session", sessionType: "learn",
          sessionCards: buildSessionCards(wordIds),
          sessionIndex: 0, sessionResults: [], wordStates: newStates,
        });
        get().updateStreak();
      },

      recordAnswer: (grade, userAnswer) => {
        const { sessionCards, sessionIndex } = get();
        if (sessionIndex >= sessionCards.length) return;
        const card = sessionCards[sessionIndex];

        const passing = grade === "correct" || grade === "close";
        const ws = { ...(get().wordStates[card.wordId] || defaultWordState()) };

        if (card.direction === "de-to-en") ws.deToEnCorrect = passing;
        else ws.enToDeCorrect = passing;
        if (passing) ws.totalCorrect++; else ws.totalIncorrect++;

        const pts = grade === "correct" ? 10 : grade === "close" ? 7 : 0;

        set((s) => ({
          sessionResults: [...s.sessionResults, { wordId: card.wordId, direction: card.direction, grade, userAnswer }],
          wordStates: { ...s.wordStates, [card.wordId]: ws },
          stats: { ...s.stats, points: s.stats.points + pts },
        }));
      },

      nextCard: () => {
        const { sessionCards, sessionIndex, wordStates, sessionType } = get();
        if (sessionIndex >= sessionCards.length) return;

        const currentCard = sessionCards[sessionIndex];
        const ws = wordStates[currentCard.wordId];

        // Check if both directions for this word have now been answered
        if (ws) {
          const bothAnswered = sessionCards.filter(c => c.wordId === currentCard.wordId).length <= 2;
          const bothDone = ws.deToEnCorrect !== undefined && ws.enToDeCorrect !== undefined;
          // Check if the second direction card has already been played
          const answeredCards = get().sessionResults.filter(r => r.wordId === currentCard.wordId);
          if (answeredCards.length >= 2) {
            // Apply Leitner
            const bothCorrect = ws.deToEnCorrect && ws.enToDeCorrect;
            const isFirstTest = ws.totalCorrect + ws.totalIncorrect <= 2;
            const updated = { ...ws };

            if (sessionType === "learn" && isFirstTest) {
              updated.box = (bothCorrect ? 5 : 2) as LeitnerBox;
            } else {
              updated.box = bothCorrect ? Math.min(6, updated.box + 1) as LeitnerBox : 1 as LeitnerBox;
            }
            updated.lastReviewDate = todayISO();

            set((s) => ({
              wordStates: { ...s.wordStates, [currentCard.wordId]: updated },
            }));
          }
        }

        const nextIdx = sessionIndex + 1;
        set({
          sessionIndex: nextIdx,
          view: nextIdx >= sessionCards.length ? "session-complete" : get().view,
        });
      },

      getSessionSummary: () => {
        const { sessionType, sessionResults, wordStates } = get();
        const wordMap = new Map<string, { deOk: boolean; enOk: boolean }>();
        for (const r of sessionResults) {
          const e = wordMap.get(r.wordId) || { deOk: false, enOk: false };
          const pass = r.grade === "correct" || r.grade === "close";
          if (r.direction === "de-to-en") e.deOk = pass; else e.enOk = pass;
          wordMap.set(r.wordId, e);
        }
        let correct = 0, close = 0, wrong = 0, pointsEarned = 0;
        const promoted: string[] = [], demoted: string[] = [], newlyMastered: string[] = [];
        for (const r of sessionResults) {
          if (r.grade === "correct") { correct++; pointsEarned += 10; }
          else if (r.grade === "close") { close++; pointsEarned += 7; }
          else wrong++;
        }
        for (const [wid, res] of wordMap) {
          const ws = wordStates[wid];
          if (!ws) continue;
          if (res.deOk && res.enOk) { promoted.push(wid); if (ws.box === 6) newlyMastered.push(wid); }
          else demoted.push(wid);
        }
        return { type: sessionType, totalCards: sessionResults.length, correct, close, wrong, promoted, demoted, newlyMastered, pointsEarned };
      },

      getDueWordIds: () => {
        const { wordStates, currentDay } = get();
        return getAllWords().filter(w => w.day <= currentDay && wordStates[w.id] && isDue(wordStates[w.id])).map(w => w.id);
      },
      getNewWordIds: () => {
        const { wordStates, currentDay } = get();
        return getAllWords().filter(w => w.day <= currentDay && !wordStates[w.id]).map(w => w.id);
      },
      getBoxCounts: () => {
        const { wordStates, currentDay } = get();
        const c: Record<LeitnerBox | 0, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const w of getAllWords().filter(w => w.day <= currentDay)) {
          const ws = wordStates[w.id]; if (!ws) c[0]++; else c[ws.box]++;
        }
        return c;
      },
      getDueTodayCount: () => get().getDueWordIds().length,
      isAllRevisedToday: () => {
        const { wordStates, currentDay } = get();
        for (const w of getAllWords()) {
          if (w.day > currentDay) continue;
          const ws = wordStates[w.id];
          if (ws && isDue(ws)) return false;
        }
        return Object.keys(wordStates).length > 0;
      },
      getTopicProgress: (topicId) => {
        const { wordStates, currentDay } = get();
        const tw = getAllWords().filter(w => w.topicId === topicId && w.day <= currentDay);
        let mastered = 0, inProgress = 0, untested = 0;
        for (const w of tw) { const ws = wordStates[w.id]; if (!ws) untested++; else if (ws.box === 6) mastered++; else inProgress++; }
        return { total: tw.length, mastered, inProgress, untested };
      },
      resetAll: () => set({
        view: "dashboard", currentDay: 1, wordStates: {}, sessionCards: [], sessionIndex: 0,
        sessionResults: [], selectedTopicId: null, stats: defaultStats(),
      }),
    }),
    {
      name: "german-vocab-leitner-v3",
      partialize: (state) => ({ currentDay: state.currentDay, wordStates: state.wordStates, stats: state.stats }),
    }
  )
);
