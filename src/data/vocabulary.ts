import type { Word } from "@/types";
import { MAX_DAY } from "@/types";

import { topic1Raw } from "./topic1";
import { topic2Raw } from "./topic2";
import { topic3Raw } from "./topic3";
import { topic4Raw } from "./topic4";
import { structuralRaw } from "./structural";
import { verbsRaw } from "./verbs";

/** Remap days to fit within MAX_DAY (36). */
function remapDay(day: number): number {
  if (day <= MAX_DAY) return day;
  const mapped = 13 + Math.round(((day - 37) / (60 - 37)) * (36 - 13));
  return Math.min(MAX_DAY, Math.max(1, mapped));
}

function parseTopicVocab(topicId: string, rawData: string): Word[] {
  return rawData
    .trim()
    .split("\n")
    .map((line, index) => {
      const parts = line.split("\t");
      if (parts.length < 3) return null;

      const dayStr = parts[0]?.trim();
      const german = parts[1]?.trim() || "";
      const english = parts[2]?.trim() || "";
      const germanSentence = parts[3]?.trim() || "";
      const englishSentence = parts[4]?.trim() || "";

      let importance = 3;
      if (parts[5]) {
        const impStr = parts[5].trim();
        const starCount = (impStr.match(/★/g) || []).length;
        if (starCount > 0) importance = starCount;
        else { const num = parseInt(impStr, 10); if (num >= 1 && num <= 4) importance = num; }
      }

      const rawDay = parseInt(dayStr, 10);
      if (isNaN(rawDay) || !german || !english) return null;

      return {
        id: `${topicId}_${index}`,
        topicId,
        day: remapDay(rawDay),
        german, english, germanSentence, englishSentence, importance,
      } satisfies Word;
    })
    .filter((w): w is Word => w !== null);
}

let _cachedWords: Word[] | null = null;

export function getAllWords(): Word[] {
  if (_cachedWords) return _cachedWords;
  _cachedWords = [
    ...parseTopicVocab("T1", topic1Raw),
    ...parseTopicVocab("T2", topic2Raw),
    ...parseTopicVocab("T3", topic3Raw),
    ...parseTopicVocab("T4", topic4Raw),
    ...parseTopicVocab("SW", structuralRaw),
    ...parseTopicVocab("VB", verbsRaw),
  ];
  return _cachedWords;
}

export function getWordById(id: string): Word | undefined {
  return getAllWords().find((w) => w.id === id);
}

export function getWordsByTopic(topicId: string): Word[] {
  return getAllWords().filter((w) => w.topicId === topicId);
}

export function getWordsForDay(day: number): Word[] {
  return getAllWords().filter((w) => w.day <= day);
}

export function getWordsNewOnDay(day: number): Word[] {
  return getAllWords().filter((w) => w.day === day);
}

export function getTopicWordCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const w of getAllWords()) counts[w.topicId] = (counts[w.topicId] || 0) + 1;
  return counts;
}

/** Get unique days for a topic. */
export function getTopicDays(topicId: string): number[] {
  const days = new Set(getWordsByTopic(topicId).map((w) => w.day));
  return [...days].sort((a, b) => a - b);
}

/** Get words for a specific topic and day. */
export function getWordsForTopicDay(topicId: string, day: number): Word[] {
  return getAllWords().filter((w) => w.topicId === topicId && w.day === day);
}
