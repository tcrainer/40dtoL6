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

/** Remove slash-separated alternatives — keep only the first option.
 *  e.g. "lustig / witzig" → "lustig"
 *  e.g. "to go, to travel, to drive" → "to go"
 */
function firstAlternative(s: string): string {
  // Split on " / " or ", " when they separate alternatives
  const slashParts = s.split(/\s*\/\s*/);
  return slashParts[0].trim();
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

/**
 * Generate all plausible answer variants from a correct answer string.
 * Handles: slash alternatives, comma alternatives, article stripping.
 */
function getAcceptableAnswers(correct: string, stripArt: boolean): string[] {
  const answers: string[] = [];

  // Split on " / " for explicit alternatives
  const slashAlts = correct.split(/\s*\/\s*/);

  // Also split on ", " for comma-separated alternatives
  // but only when they look like full alternative answers
  // e.g. "to go, to travel" → ["to go", "to travel"]
  const commaAlts = correct.split(/,\s+/).filter((p) => p.length > 1);

  const allAlts = [...slashAlts];
  if (commaAlts.length > 1 && commaAlts.length <= 4) {
    allAlts.push(...commaAlts);
  }

  for (const alt of allAlts) {
    const n = normalizeForCompare(alt, stripArt);
    if (n.length > 0) answers.push(n);

    // Also add version without articles
    const noArt = normalizeForCompare(stripArticle(alt), stripArt);
    if (noArt.length > 0 && noArt !== n) answers.push(noArt);
  }

  return [...new Set(answers)];
}

// ── Main grading function ───────────────────────────────────────────────────

/**
 * Grade a student's typed answer against the correct answer.
 *
 * @param userAnswer  What the student typed
 * @param correctAnswer  The canonical correct answer
 * @param direction  "de-to-en" or "en-to-de" — affects article stripping behavior
 * @returns GradeDetail with result, answers, and normalized forms
 */
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

  // Articles are optional in both directions
  const stripArt = true;

  const normalizedUser = normalizeForCompare(trimmedUser, stripArt);
  const acceptableAnswers = getAcceptableAnswers(trimmedCorrect, stripArt);

  // Also create a user variant with umlauts expanded
  const userExpanded = expandUmlauts(normalizedUser);

  let bestResult: GradeResult = "wrong";
  let bestCorrectNorm = acceptableAnswers[0] || normalizeForCompare(trimmedCorrect, stripArt);

  for (const acceptable of acceptableAnswers) {
    // Exact match
    if (normalizedUser === acceptable || userExpanded === acceptable) {
      return {
        result: "correct",
        userAnswer: trimmedUser,
        correctAnswer: trimmedCorrect,
        normalizedUser,
        normalizedCorrect: acceptable,
      };
    }

    // Check if user typed umlauts as ae/oe/ue and we should accept
    const acceptableExpanded = expandUmlauts(acceptable);
    if (userExpanded === acceptableExpanded) {
      return {
        result: "correct",
        userAnswer: trimmedUser,
        correctAnswer: trimmedCorrect,
        normalizedUser,
        normalizedCorrect: acceptable,
      };
    }

    // Levenshtein distance for close matches
    const dist = Math.min(
      levenshtein(normalizedUser, acceptable),
      levenshtein(userExpanded, acceptableExpanded)
    );

    const maxLen = Math.max(normalizedUser.length, acceptable.length);

    // Close: 1 edit for short words, up to 2 for longer words
    const closeThreshold = maxLen <= 5 ? 1 : 2;

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

/**
 * Quick check: is the answer correct or close (i.e. not "wrong")?
 * Used for Leitner promotion logic.
 */
export function isPassingGrade(result: GradeResult): boolean {
  return result === "correct" || result === "close";
}
