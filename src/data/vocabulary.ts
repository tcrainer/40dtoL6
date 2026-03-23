import type { Word } from "@/types";
import { MAX_DAY } from "@/types";

import { topic1Raw } from "./topic1";
import { topic2Raw } from "./topic2";
import { topic3Raw } from "./topic3";
import { topic4Raw } from "./topic4";
import { topic5Raw } from "./topic5";
import { topic6Raw } from "./topic6";
import { structuralRaw } from "./structural";
import { verbsRaw } from "./verbs";

function remapDay(day: number): number {
  if (day <= MAX_DAY) return day;
  return 13 + Math.round(((day - 37) / (60 - 37)) * (36 - 13));
}

function parseTopicVocab(topicId: string, rawData: string): Word[] {
  return rawData.trim().split("\n").map((line, index) => {
    const parts = line.split("\t");
    if (parts.length < 3) return null;
    const rawDay = parseInt(parts[0]?.trim(), 10);
    const german = parts[1]?.trim() || "";
    const english = parts[2]?.trim() || "";
    const germanSentence = parts[3]?.trim() || "";
    const englishSentence = parts[4]?.trim() || "";
    if (isNaN(rawDay) || !german || !english) return null;
    let importance = 3;
    if (parts[5]) {
      const stars = (parts[5].match(/★/g) || []).length;
      if (stars > 0) importance = stars;
    }
    return {
      id: `${topicId}_${index}`, topicId, day: Math.min(MAX_DAY, Math.max(1, remapDay(rawDay))),
      german, english, germanSentence, englishSentence, importance,
    } satisfies Word;
  }).filter((w): w is Word => w !== null);
}

function parseVerbVocab(rawData: string): Word[] {
  const words: Word[] = [];
  for (const [index, line] of rawData.trim().split("\n").entries()) {
    const [dayStr, german, german3rd, germanImp, germanPerf, english, _eImp, _ePerf, verbType] = line.split("\t");
    const rawDay = parseInt(dayStr, 10);
    if (isNaN(rawDay) || !german?.trim() || !english?.trim()) continue;
    words.push({
      id: `VB_${index}`, topicId: "VB",
      day: Math.min(MAX_DAY, Math.max(1, remapDay(rawDay))),
      german: german.trim(), english: english.trim(),
      germanSentence: "", englishSentence: "", importance: 3,
      isVerb: true,
      german3rd: german3rd?.trim() || "",
      germanImperfekt: germanImp?.trim() || "",
      germanPerfekt: germanPerf?.trim() || "",
      verbType: verbType?.trim() || "",
    });
  }
  return words;
}

let _cachedWords: Word[] | null = null;

export function getAllWords(): Word[] {
  if (_cachedWords) return _cachedWords;
  _cachedWords = [
    ...parseTopicVocab("T1", topic1Raw),
    ...parseTopicVocab("T2", topic2Raw),
    ...parseTopicVocab("T3", topic3Raw),
    ...parseTopicVocab("T4", topic4Raw),
    ...parseTopicVocab("T5", topic5Raw),
    ...parseTopicVocab("T6", topic6Raw),
    ...parseTopicVocab("SW", structuralRaw),
    ...parseVerbVocab(verbsRaw),
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
export function getTopicWordCounts(): Record<string, number> {
  const c: Record<string, number> = {};
  for (const w of getAllWords()) c[w.topicId] = (c[w.topicId] || 0) + 1;
  return c;
}
export function getTopicDays(topicId: string): number[] {
  return [...new Set(getWordsByTopic(topicId).map(w => w.day))].sort((a, b) => a - b);
}
export function getWordsForTopicDay(topicId: string, day: number): Word[] {
  return getAllWords().filter(w => w.topicId === topicId && w.day === day);
}
