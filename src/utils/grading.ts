import type { GradeDetail, GradeResult } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** German umlaut + ß normalization: ä→ae, ö→oe, ü→ue, ß→ss */
function expandUmlauts(s: string): string {
  return s
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue");
}

/** Strip German articles from the start of a string. */
function stripArticle(s: string): string {
  return s.replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\s+/i, "");
}

/** Remove parenthesized hints like "(en)", "(e)", "(formal)" etc. */
function stripParens(s: string): string {
  return s.replace(/\s*\([^)]*\)/g, "").trim();
}

/**
 * Strip "to " prefix from English verbs.
 * e.g. "to go" → "go", "to be able to" → "be able to"
 */
function stripToPrefix(s: string): string {
  return s.replace(/^to\s+/i, "").trim();
}

/**
 * Strip "the " prefix from English nouns.
 * e.g. "the environment" → "environment"
 */
function stripThePrefix(s: string): string {
  return s.replace(/^the\s+/i, "").trim();
}

/** Core normalization pipeline. */
function normalize(s: string): string {
  let n = s.trim().toLowerCase();
  n = stripParens(n);
  n = n
    .replace(/[.,;:!?'"„""«»\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return n;
}

/** Normalize for comparison: expand umlauts and strip articles. */
function normalizeForCompare(s: string, stripArt: boolean): string {
  let n = normalize(s);
  if (stripArt) n = stripArticle(n);
  n = expandUmlauts(n);
  return n;
}

// ── Accepted alternatives list ──────────────────────────────────────────────

function getAcceptableAnswers(correct: string, stripArt: boolean, isEnglish: boolean): string[] {
  const answers: string[] = [];

  const slashAlts = correct.split(/\s*\/\s*/);
  const commaAlts = correct.split(/,\s+/).filter((p) => p.length > 1);

  const allAlts = [...slashAlts];
  if (commaAlts.length > 1 && commaAlts.length <= 4) {
    allAlts.push(...commaAlts);
  }

  for (const alt of allAlts) {
    const n = normalizeForCompare(alt, stripArt);
    if (n.length > 0) answers.push(n);

    const noArt = normalizeForCompare(stripArticle(alt), stripArt);
    if (noArt.length > 0 && noArt !== n) answers.push(noArt);

    // For English: also accept without "to" prefix (for verbs) and without "the" (for nouns)
    if (isEnglish) {
      const noTo = normalizeForCompare(stripToPrefix(alt), stripArt);
      if (noTo.length > 0 && noTo !== n) answers.push(noTo);

      const noToNoArt = normalizeForCompare(stripToPrefix(stripArticle(alt)), stripArt);
      if (noToNoArt.length > 0 && noToNoArt !== n && noToNoArt !== noTo) answers.push(noToNoArt);

      const noThe = normalizeForCompare(stripThePrefix(alt), stripArt);
      if (noThe.length > 0 && noThe !== n) answers.push(noThe);

      const noTheNoArt = normalizeForCompare(stripThePrefix(stripArticle(alt)), stripArt);
      if (noTheNoArt.length > 0 && !answers.includes(noTheNoArt)) answers.push(noTheNoArt);
    }
  }

  return [...new Set(answers)];
}

// ── ie / ei swap detection ──────────────────────────────────────────────

/**
 * Detects if the difference between user and correct is an ie↔ei swap.
 * e.g. "veilen" vs "vielen", "lieder" vs "leider"
 */
function hasIeEiSwap(user: string, correct: string): boolean {
  if (user === correct) return false;
  if (Math.abs(user.length - correct.length) > 0) return false;
  // Find positions where they differ
  let diffCount = 0;
  for (let i = 0; i < user.length; i++) {
    if (user[i] !== correct[i]) diffCount++;
  }
  if (diffCount > 2) return false;
  // Check for ie↔ei at each position
  for (let i = 0; i < user.length - 1; i++) {
    const userPair = user.slice(i, i + 2);
    const correctPair = correct.slice(i, i + 2);
    if (
      (userPair === "ie" && correctPair === "ei") ||
      (userPair === "ei" && correctPair === "ie")
    ) {
      // Check if the rest matches
      const userFixed = user.slice(0, i) + correctPair + user.slice(i + 2);
      if (userFixed === correct) return true;
    }
  }
  return false;
}

// ── Main grading function ───────────────────────────────────────────────────

export function gradeAnswer(
  userAnswer: string,
  correctAnswer: string,
  direction: "de-to-en" | "en-to-de"
): GradeDetail {
  const trimmedUser = userAnswer.trim();
  const trimmedCorrect = correctAnswer.trim();

  if (trimmedUser.length === 0) {
    return {
      result: "wrong",
      userAnswer: trimmedUser,
      correctAnswer: trimmedCorrect,
      normalizedUser: "",
      normalizedCorrect: normalize(trimmedCorrect),
    };
  }

  const isEnglish = direction === "de-to-en";
  const stripArt = true;

  const normalizedUser = normalizeForCompare(trimmedUser, stripArt);
  const acceptableAnswers = getAcceptableAnswers(trimmedCorrect, stripArt, isEnglish);

  // For English: expand umlauts and strip "to"/"the"
  const userExpanded = isEnglish ? expandUmlauts(normalizedUser) : normalizedUser;
  const userNoTo = isEnglish ? normalizeForCompare(stripToPrefix(trimmedUser), stripArt) : normalizedUser;
  const userNoToExpanded = isEnglish ? expandUmlauts(userNoTo) : normalizedUser;
  const userNoThe = isEnglish ? normalizeForCompare(stripThePrefix(trimmedUser), stripArt) : normalizedUser;
  const userNoTheExpanded = isEnglish ? expandUmlauts(userNoThe) : normalizedUser;

  let bestResult: GradeResult = "wrong";
  let bestCorrectNorm = acceptableAnswers[0] || normalizeForCompare(trimmedCorrect, stripArt);

  for (const acceptable of acceptableAnswers) {
    // Exact match (with various normalizations)
    if (
      normalizedUser === acceptable ||
      userNoTo === acceptable ||
      userNoThe === acceptable
    ) {
      return {
        result: "correct",
        userAnswer: trimmedUser,
        correctAnswer: trimmedCorrect,
        normalizedUser,
        normalizedCorrect: acceptable,
      };
    }

    // For English only: also match via umlaut expansion
    if (isEnglish) {
      const acceptableExpanded = expandUmlauts(acceptable);
      if (
        userExpanded === acceptable ||
        userNoToExpanded === acceptable ||
        userNoTheExpanded === acceptable ||
        userExpanded === acceptableExpanded ||
        userNoToExpanded === acceptableExpanded ||
        userNoTheExpanded === acceptableExpanded
      ) {
        return {
          result: "correct",
          userAnswer: trimmedUser,
          correctAnswer: trimmedCorrect,
          normalizedUser,
          normalizedCorrect: acceptable,
        };
      }
    }

    // For German: check if the ONLY difference is umlauts → mark as "close" not "correct"
    if (!isEnglish) {
      const userExp = expandUmlauts(normalizedUser);
      const accExp = expandUmlauts(acceptable);
      if (userExp === accExp && normalizedUser !== acceptable) {
        // Student typed ae/oe/ue/ss instead of ä/ö/ü/ß — close but not correct
        bestResult = "close";
        bestCorrectNorm = acceptable;
        continue;
      }
    }

    // For German: check for ie↔ei swap — this is WRONG, not close
    if (!isEnglish && hasIeEiSwap(normalizedUser, acceptable)) {
      // ie/ei confusion is a meaningful vocabulary error → wrong
      continue;
    }

    // Levenshtein fuzzy matching
    let dist: number;
    if (isEnglish) {
      const acceptableExpanded = expandUmlauts(acceptable);
      dist = Math.min(
        levenshtein(normalizedUser, acceptable),
        levenshtein(userExpanded, acceptableExpanded),
        levenshtein(userNoTo, acceptable),
        levenshtein(userNoToExpanded, acceptableExpanded),
        levenshtein(userNoThe, acceptable),
        levenshtein(userNoTheExpanded, acceptableExpanded)
      );
    } else {
      // German: NO umlaut expansion in fuzzy match — strict
      dist = levenshtein(normalizedUser, acceptable);
    }

    const maxLen = Math.max(normalizedUser.length, acceptable.length);

    // English: lenient. German: strict.
    let closeThreshold: number;
    if (isEnglish) {
      closeThreshold = maxLen <= 4 ? 1 : maxLen <= 8 ? 2 : 3;
    } else {
      // German: only 1 edit allowed, and only for longer words
      closeThreshold = maxLen <= 5 ? 0 : 1;
    }

    if (dist <= closeThreshold && dist > 0) {
      // For German: even within threshold, reject if the edit is an umlaut or ie/ei issue
      if (!isEnglish) {
        const userExp = expandUmlauts(normalizedUser);
        const accExp = expandUmlauts(acceptable);
        // If expanding umlauts makes them match, the error IS an umlaut — not "close"
        if (userExp === accExp) {
          bestResult = "close";
          bestCorrectNorm = acceptable;
          continue;
        }
        // If swapping ie/ei would match, it's wrong
        if (hasIeEiSwap(normalizedUser, acceptable)) {
          continue;
        }
      }
      bestResult = "close";
      bestCorrectNorm = acceptable;
    }
  }

  return {
    result: bestResult,
    userAnswer: trimmedUser,
    correctAnswer: trimmedCorrect,
    normalizedUser,
    normalizedCorrect: bestCorrectNorm,
  };
}

export function isPassingGrade(result: GradeResult): boolean {
  return result === "correct" || result === "close";
}
