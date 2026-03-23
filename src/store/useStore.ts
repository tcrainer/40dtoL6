import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppView, Direction, GradeResult, LeitnerBox, SessionCard,
  SessionResult, SessionSummary, SessionType, WordState, UserStats,
} from "@/types";
import { BOX_INTERVALS, MAX_DAY } from "@/types";
import { getAllWords, getWordById } from "@/data/vocabulary";

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

function buildSessionCards(wordIds: string[]): SessionCard[] {
  const cards: SessionCard[] = [];
  const batchSize = 5;

  // Separate verbs from regular words
  const verbIds = wordIds.filter(id => getWordById(id)?.isVerb);
  const regularIds = wordIds.filter(id => !getWordById(id)?.isVerb);

  // Regular words: batched in groups of 5, both directions
  for (let i = 0; i < regularIds.length; i += batchSize) {
    const batch = regularIds.slice(i, i + batchSize);
    const firstDir: Direction = Math.random() < 0.5 ? "de-to-en" : "en-to-de";
    const secondDir: Direction = firstDir === "de-to-en" ? "en-to-de" : "de-to-en";
    const shuffled = shuffle(batch);
    for (const id of shuffled) cards.push({ wordId: id, direction: firstDir });
    for (const id of shuffle(shuffled)) cards.push({ wordId: id, direction: secondDir });
  }

  // Verbs: only "verb-forms" direction (German only, one card per verb)
  for (const id of shuffle(verbIds)) {
    cards.push({ wordId: id, direction: "verb-forms" });
  }

  return cards;
}

const newWordState = (): WordState => ({
  box: 1, lastReviewDate: null, deToEnCorrect: false, enToDeCorrect: false, totalCorrect: 0, totalIncorrect: 0,
});
const defaultStats = (): UserStats => ({ points: 0, streak: 0, lastActiveDate: null, longestStreak: 0 });

interface AppState {
  view: AppView;
  setView: (v: AppView) => void;
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;
  currentDay: number;
  setCurrentDay: (d: number) => void;
  wordStates: Record<string, WordState>;
  getWordState: (wid: string) => WordState | null;
  stats: UserStats;
  updateStreak: () => void;
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
  isAllRevisedToday: () => boolean;
  getTopicProgress: (topicId: string) => { total: number; mastered: number; inProgress: number; untested: number };
  isTopicDayTested: (topicId: string, day: number) => boolean;
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
        const newStates = { ...get().wordStates };
        for (const id of dueIds) {
          if (newStates[id]) newStates[id] = { ...newStates[id], deToEnCorrect: false, enToDeCorrect: false };
        }
        set({ view: "session", sessionType: "review", sessionCards: buildSessionCards(dueIds), sessionIndex: 0, sessionResults: [], wordStates: newStates });
        get().updateStreak();
      },

      startLearnSession: () => {
        const { wordStates, currentDay } = get();
        const newIds: string[] = [];
        for (const w of getAllWords()) {
          if (w.day > currentDay) continue;
          if (!wordStates[w.id]) newIds.push(w.id);
        }
        set({ view: "session", sessionType: "learn", sessionCards: buildSessionCards(newIds), sessionIndex: 0, sessionResults: [] });
        get().updateStreak();
      },

      startCustomSession: (wordIds) => {
        const newStates = { ...get().wordStates };
        for (const id of wordIds) {
          if (newStates[id]) newStates[id] = { ...newStates[id], deToEnCorrect: false, enToDeCorrect: false };
        }
        set({ view: "session", sessionType: "learn", sessionCards: buildSessionCards(wordIds), sessionIndex: 0, sessionResults: [], wordStates: newStates });
        get().updateStreak();
      },

      recordAnswer: (grade, userAnswer) => {
        const { sessionCards, sessionIndex } = get();
        if (sessionIndex >= sessionCards.length) return;
        const card = sessionCards[sessionIndex];
        const passing = grade === "correct" || grade === "close";
        const existing = get().wordStates[card.wordId];
        const ws = existing ? { ...existing } : newWordState();

        if (card.direction === "verb-forms") {
          // Verbs: both directions set at once
          ws.deToEnCorrect = passing;
          ws.enToDeCorrect = passing;
        } else if (card.direction === "de-to-en") {
          ws.deToEnCorrect = passing;
        } else {
          ws.enToDeCorrect = passing;
        }
        if (passing) ws.totalCorrect++; else ws.totalIncorrect++;

        const pts = grade === "correct" ? 10 : grade === "close" ? 7 : 0;
        set((s) => ({
          sessionResults: [...s.sessionResults, { wordId: card.wordId, direction: card.direction, grade, userAnswer }],
          wordStates: { ...s.wordStates, [card.wordId]: ws },
          stats: { ...s.stats, points: s.stats.points + pts },
        }));
      },

      nextCard: () => {
        const { sessionCards, sessionIndex, wordStates, sessionType, sessionResults } = get();
        if (sessionIndex >= sessionCards.length) return;
        const currentCard = sessionCards[sessionIndex];
        const ws = wordStates[currentCard.wordId];
        const word = getWordById(currentCard.wordId);

        if (ws) {
          const isVerb = word?.isVerb;
          const answeredCount = sessionResults.filter(r => r.wordId === currentCard.wordId).length;
          // Verbs need 1 answer, regular words need 2
          const needsCount = isVerb ? 1 : 2;

          if (answeredCount >= needsCount) {
            const bothCorrect = ws.deToEnCorrect && ws.enToDeCorrect;
            const isFirstTest = ws.totalCorrect + ws.totalIncorrect <= needsCount;
            const updated = { ...ws };
            if (sessionType === "learn" && isFirstTest) {
              updated.box = (bothCorrect ? 5 : 2) as LeitnerBox;
            } else {
              updated.box = bothCorrect ? Math.min(6, updated.box + 1) as LeitnerBox : 1 as LeitnerBox;
            }
            updated.lastReviewDate = todayISO();
            set((s) => ({ wordStates: { ...s.wordStates, [currentCard.wordId]: updated } }));
          }
        }

        const nextIdx = sessionIndex + 1;
        set({ sessionIndex: nextIdx, view: nextIdx >= sessionCards.length ? "session-complete" : get().view });
      },

      getSessionSummary: () => {
        const { sessionType, sessionResults, wordStates } = get();
        let correct = 0, close = 0, wrong = 0, pointsEarned = 0;
        const promoted: string[] = [], demoted: string[] = [], newlyMastered: string[] = [];
        const seen = new Set<string>();
        for (const r of sessionResults) {
          if (r.grade === "correct") { correct++; pointsEarned += 10; }
          else if (r.grade === "close") { close++; pointsEarned += 7; }
          else wrong++;
          seen.add(r.wordId);
        }
        for (const wid of seen) {
          const ws = wordStates[wid];
          if (!ws) continue;
          if (ws.box >= 2) promoted.push(wid); else demoted.push(wid);
          if (ws.box === 6) newlyMastered.push(wid);
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
      isTopicDayTested: (topicId: string, day: number) => {
        const { wordStates } = get();
        const words = getAllWords().filter(w => w.topicId === topicId && w.day === day);
        return words.length > 0 && words.every(w => !!wordStates[w.id]);
      },
      resetAll: () => set({
        view: "dashboard", currentDay: 1, wordStates: {}, sessionCards: [], sessionIndex: 0,
        sessionResults: [], selectedTopicId: null, stats: defaultStats(),
      }),
    }),
    {
      name: "german-vocab-leitner-v4",
      partialize: (state) => ({ currentDay: state.currentDay, wordStates: state.wordStates, stats: state.stats }),
    }
  )
);
