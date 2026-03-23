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

  const userExpanded = expandUmlauts(normalizedUser);

  // For English: also strip "to" and "the" from user input
  const userNoTo = isEnglish ? normalizeForCompare(stripToPrefix(trimmedUser), stripArt) : normalizedUser;
  const userNoToExpanded = expandUmlauts(userNoTo);
  const userNoThe = isEnglish ? normalizeForCompare(stripThePrefix(trimmedUser), stripArt) : normalizedUser;
  const userNoTheExpanded = expandUmlauts(userNoThe);

  let bestResult: GradeResult = "wrong";
  let bestCorrectNorm = acceptableAnswers[0] || normalizeForCompare(trimmedCorrect, stripArt);

  for (const acceptable of acceptableAnswers) {
    // Exact match (with various normalizations)
    if (
      normalizedUser === acceptable ||
      userExpanded === acceptable ||
      userNoTo === acceptable ||
      userNoToExpanded === acceptable ||
      userNoThe === acceptable ||
      userNoTheExpanded === acceptable
    ) {
      return {
        result: "correct",
        userAnswer: trimmedUser,
        correctAnswer: trimmedCorrect,
        normalizedUser,
        normalizedCorrect: acceptable,
      };
    }

    const acceptableExpanded = expandUmlauts(acceptable);
    if (userExpanded === acceptableExpanded || userNoToExpanded === acceptableExpanded || userNoTheExpanded === acceptableExpanded) {
      return {
        result: "correct",
        userAnswer: trimmedUser,
        correctAnswer: trimmedCorrect,
        normalizedUser,
        normalizedCorrect: acceptable,
      };
    }

    // Levenshtein — try all user variants
    const dist = Math.min(
      levenshtein(normalizedUser, acceptable),
      levenshtein(userExpanded, acceptableExpanded),
      levenshtein(userNoTo, acceptable),
      levenshtein(userNoToExpanded, acceptableExpanded),
      levenshtein(userNoThe, acceptable),
      levenshtein(userNoTheExpanded, acceptableExpanded)
    );

    const maxLen = Math.max(normalizedUser.length, acceptable.length);

    // English: very lenient. German: slightly less.
    let closeThreshold: number;
    if (isEnglish) {
      closeThreshold = maxLen <= 4 ? 1 : maxLen <= 8 ? 2 : 3;
    } else {
      closeThreshold = maxLen <= 5 ? 1 : 2;
    }

    if (dist <= closeThreshold && dist > 0) {
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
