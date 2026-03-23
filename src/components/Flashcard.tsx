import { useStore } from "@/store/useStore";
import { getWordById } from "@/data/vocabulary";
import { gradeAnswer } from "@/utils/grading";
import { BOX_COLORS } from "@/types";
import type { LeitnerBox, GradeDetail, GradeResult } from "@/types";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, X, AlertTriangle, Star, Trophy } from "lucide-react";

const UMLAUTS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

function makeGapFill(sentence: string, targetWord: string): string | null {
  if (!sentence || !targetWord) return null;
  const plain = targetWord.replace(/^(der|die|das|den|dem|des|ein|eine)\s+/i, "").trim();
  if (plain.length < 2) return null;
  const idx = sentence.toLowerCase().indexOf(plain.toLowerCase());
  if (idx === -1) return null;
  return sentence.slice(0, idx) + "______" + sentence.slice(idx + plain.length);
}

/** Split "ich habe genommen" into { aux: "habe", participle: "genommen" } */
function splitPerfekt(perfekt: string): { aux: string; participle: string } | null {
  if (!perfekt || perfekt === "—" || perfekt === "-") return null;
  // Pattern: "ich habe/bin WORD" or "ich habe/bin WORD WORD"
  const m = perfekt.match(/^ich\s+(habe|bin)\s+(.+)$/i);
  if (m) return { aux: m[1], participle: m[2] };
  return null;
}

/** Simple normalize for verb comparison */
function normalizeVerb(s: string): string {
  return s.trim().toLowerCase().replace(/[.,;:!?]/g, "");
}

function gradeVerbField(input: string, correct: string): "correct" | "close" | "wrong" {
  if (!correct || correct === "—" || correct === "-") return "correct"; // skip empty fields
  const n1 = normalizeVerb(input);
  const n2 = normalizeVerb(correct);
  if (n1 === n2) return "correct";
  // Levenshtein 1 = close
  let dist = 0;
  const a = n1, b = n2;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  dist = dp[m][n];
  if (dist <= 1) return "close";
  // Also check umlaut expansion
  const expand = (s: string) => s.replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss");
  if (expand(n1) === expand(n2)) return "correct";
  return "wrong";
}

export function Flashcard() {
  const sessionCards = useStore((s) => s.sessionCards);
  const sessionIndex = useStore((s) => s.sessionIndex);
  const sessionResults = useStore((s) => s.sessionResults);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const nextCard = useStore((s) => s.nextCard);
  const getWordState = useStore((s) => s.getWordState);
  const setView = useStore((s) => s.setView);
  const stats = useStore((s) => s.stats);

  const [input, setInput] = useState("");
  const [gradeResult, setGradeResult] = useState<GradeDetail | null>(null);
  const [showBothCorrect, setShowBothCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Verb form inputs
  const [verbInputs, setVerbInputs] = useState<string[]>(["", "", "", "", ""]);
  const [verbResults, setVerbResults] = useState<("correct"|"close"|"wrong")[] | null>(null);
  const verbRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);

  const card = sessionCards[sessionIndex];
  const word = card ? getWordById(card.wordId) : null;
  const wordState = card ? getWordState(card.wordId) : null;
  const isVerbMode = card?.direction === "verb-forms";

  const isDeToEn = card?.direction === "de-to-en";
  const promptText = word ? (isVerbMode ? word.english : isDeToEn ? word.german : word.english) : "";
  const correctText = word ? (isVerbMode ? word.german : isDeToEn ? word.english : word.german) : "";
  const promptSentence = word && !isVerbMode ? (isDeToEn ? word.germanSentence : word.englishSentence) : "";
  const gapFill = word && !isVerbMode ? makeGapFill(isDeToEn ? word.englishSentence : word.germanSentence, correctText) : null;

  const perfektParts = word?.isVerb ? splitPerfekt(word.germanPerfekt || "") : null;

  const otherDirResult = useMemo(() => {
    if (!card || isVerbMode) return null;
    const otherDir = isDeToEn ? "en-to-de" : "de-to-en";
    return sessionResults.find(r => r.wordId === card.wordId && r.direction === otherDir) || null;
  }, [card, isDeToEn, sessionResults, isVerbMode]);
  const otherDirPassed = otherDirResult && (otherDirResult.grade === "correct" || otherDirResult.grade === "close");

  useEffect(() => {
    setInput("");
    setGradeResult(null);
    setShowBothCorrect(false);
    setVerbInputs(["", "", "", "", ""]);
    setVerbResults(null);
    const t1 = setTimeout(() => {
      if (isVerbMode) verbRefs.current[0]?.focus();
      else inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t1);
  }, [sessionIndex, isVerbMode]);

  // --- Regular word submit ---
  const handleSubmit = useCallback(() => {
    if (!word || gradeResult) return;
    const result = gradeAnswer(input || "", correctText, card!.direction as "de-to-en" | "en-to-de");
    setGradeResult(result);
    recordAnswer(result.result, input);
    const thisPassed = result.result === "correct" || result.result === "close";
    if (thisPassed && otherDirPassed) setShowBothCorrect(true);
  }, [word, gradeResult, input, correctText, card, recordAnswer, otherDirPassed]);

  // --- Verb submit ---
  const handleVerbSubmit = useCallback(() => {
    if (!word || verbResults) return;
    const correct3rd = (word.german3rd || "").replace(/^er\s+/i, "").replace(/^sie\s+/i, "").trim();
    const correctImp = (word.germanImperfekt || "").replace(/^ich\s+/i, "").trim();
    const results: ("correct"|"close"|"wrong")[] = [
      gradeVerbField(verbInputs[0], word.german),
      gradeVerbField(verbInputs[1], correct3rd),
      gradeVerbField(verbInputs[2], correctImp),
    ];
    if (perfektParts) {
      results.push(gradeVerbField(verbInputs[3], perfektParts.aux));
      results.push(gradeVerbField(verbInputs[4], perfektParts.participle));
    } else {
      results.push("correct", "correct");
    }
    setVerbResults(results);

    // Overall grade
    let overall: GradeResult = "correct";
    if (results.some(r => r === "wrong")) overall = "wrong";
    else if (results.some(r => r === "close")) overall = "close";
    recordAnswer(overall, verbInputs.join(" / "));
  }, [word, verbResults, verbInputs, perfektParts, recordAnswer]);

  const handleNext = useCallback(() => {
    setGradeResult(null);
    setVerbResults(null);
    setInput("");
    setVerbInputs(["", "", "", "", ""]);
    setShowBothCorrect(false);
    nextCard();
  }, [nextCard]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (gradeResult || verbResults) handleNext();
      else if (isVerbMode) handleVerbSubmit();
      else handleSubmit();
    }
    if (!isVerbMode && !isDeToEn && !gradeResult) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 7) { e.preventDefault(); insertUmlaut(UMLAUTS[num - 1], inputRef.current, input, setInput); }
    }
  }, [gradeResult, verbResults, handleNext, handleSubmit, handleVerbSubmit, isVerbMode, isDeToEn, input]);

  const handleVerbKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (verbResults) { handleNext(); return; }
      // Tab to next box, or submit if last
      if (idx < 4 && perfektParts) { verbRefs.current[idx + 1]?.focus(); }
      else if (idx < 2 && !perfektParts) { verbRefs.current[idx + 1]?.focus(); }
      else handleVerbSubmit();
    }
    const num = parseInt(e.key);
    if (num >= 1 && num <= 7 && !verbResults) {
      e.preventDefault();
      const el = verbRefs.current[idx];
      const val = verbInputs[idx];
      const start = el?.selectionStart || val.length;
      const newVal = val.slice(0, start) + UMLAUTS[num - 1] + val.slice(start);
      const newInputs = [...verbInputs];
      newInputs[idx] = newVal;
      setVerbInputs(newInputs);
      setTimeout(() => { if (el) { el.selectionStart = el.selectionEnd = start + 1; el.focus(); } }, 0);
    }
  };

  if (!card || !word) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>No cards to review.</p>
        <button onClick={() => setView("dashboard")} style={{ marginTop: "12px", padding: "10px 24px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "14px" }}>Back to dashboard</button>
      </div>
    );
  }

  const progressPct = Math.round(((sessionIndex + 1) / sessionCards.length) * 100);
  const answered = isVerbMode ? !!verbResults : !!gradeResult;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setView("dashboard")} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--color-ink-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>
            <ArrowLeft size={14} /> Exit
          </button>
          <span style={{ fontSize: "13px", color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>{sessionIndex + 1} / {sessionCards.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#7c4dba" }}>
          <Star size={14} />
          <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{stats.points} pts</span>
        </div>
      </div>

      <div style={{ height: "4px", background: "var(--color-surface-sunken)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--color-accent)", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      {/* Other direction badge (regular words only) */}
      {otherDirResult && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "var(--radius-md)", fontSize: "12px", fontWeight: 500, background: otherDirPassed ? "#dcfce7" : "#fce4ec", color: otherDirPassed ? "#16a34a" : "#dc2626" }}>
          {otherDirPassed ? <Check size={14} /> : <X size={14} />}
          {isDeToEn ? "EN → DE" : "DE → EN"}: {otherDirPassed ? "correct" : "incorrect"} earlier
        </div>
      )}

      {/* ── VERB MODE ── */}
      {isVerbMode ? (
        <div style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          {/* English prompt */}
          <div style={{ background: "#eef2ff", padding: "16px 24px", borderBottom: "3px solid #6366f1" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4338ca", marginBottom: "6px" }}>English meaning</div>
            <div style={{ fontSize: "22px", fontWeight: 700, textAlign: "center" }}>{word.english}</div>
            {word.verbType && <div style={{ fontSize: "11px", textAlign: "center", color: "#6366f1", marginTop: "4px" }}>{word.verbType}</div>}
          </div>

          {/* Verb form inputs */}
          <div style={{ background: "#fef9e0", padding: "16px 24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b45309", marginBottom: "12px" }}>German verb forms</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <VerbField label="Infinitiv" placeholder="e.g. nehmen" value={verbInputs[0]} correct={word.german} result={verbResults?.[0]} onChange={v => { const n = [...verbInputs]; n[0] = v; setVerbInputs(n); }} inputRef={el => verbRefs.current[0] = el} onKeyDown={e => handleVerbKeyDown(e, 0)} disabled={!!verbResults} />
              <VerbField label="er/sie ___" placeholder="e.g. nimmt" value={verbInputs[1]} correct={word.german3rd?.replace(/^er\s+/i,"").replace(/^sie\s+/i,"").trim() || "—"} result={verbResults?.[1]} onChange={v => { const n = [...verbInputs]; n[1] = v; setVerbInputs(n); }} inputRef={el => verbRefs.current[1] = el} onKeyDown={e => handleVerbKeyDown(e, 1)} disabled={!!verbResults} />
              <VerbField label="Imperfekt: ich ___" placeholder="e.g. nahm" value={verbInputs[2]} correct={word.germanImperfekt?.replace(/^ich\s+/i,"").trim() || "—"} result={verbResults?.[2]} onChange={v => { const n = [...verbInputs]; n[2] = v; setVerbInputs(n); }} inputRef={el => verbRefs.current[2] = el} onKeyDown={e => handleVerbKeyDown(e, 2)} disabled={!!verbResults} />
              {perfektParts && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-ink-muted)", marginBottom: "4px" }}>Perfekt: ich ___ ___</div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ flex: "0 0 90px" }}>
                      <VerbFieldInline placeholder="habe/bin" value={verbInputs[3]} correct={perfektParts.aux} result={verbResults?.[3]} onChange={v => { const n = [...verbInputs]; n[3] = v; setVerbInputs(n); }} inputRef={el => verbRefs.current[3] = el} onKeyDown={e => handleVerbKeyDown(e, 3)} disabled={!!verbResults} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <VerbFieldInline placeholder="e.g. genommen" value={verbInputs[4]} correct={perfektParts.participle} result={verbResults?.[4]} onChange={v => { const n = [...verbInputs]; n[4] = v; setVerbInputs(n); }} inputRef={el => verbRefs.current[4] = el} onKeyDown={e => handleVerbKeyDown(e, 4)} disabled={!!verbResults} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Umlaut buttons */}
            {!verbResults && (
              <div style={{ display: "flex", gap: "4px", marginTop: "10px", justifyContent: "center" }}>
                {UMLAUTS.map((ch, i) => (
                  <button key={ch} onClick={() => {
                    const active = document.activeElement;
                    const idx = verbRefs.current.findIndex(r => r === active);
                    if (idx >= 0) {
                      const el = verbRefs.current[idx]!;
                      const start = el.selectionStart || verbInputs[idx].length;
                      const newInputs = [...verbInputs];
                      newInputs[idx] = newInputs[idx].slice(0, start) + ch + newInputs[idx].slice(start);
                      setVerbInputs(newInputs);
                      setTimeout(() => { el.selectionStart = el.selectionEnd = start + 1; el.focus(); }, 0);
                    }
                  }} style={{ width: "32px", height: "32px", fontSize: "14px", fontWeight: 500, border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "7px", position: "absolute", top: "1px", right: "3px", color: "var(--color-ink-faint)" }}>{i + 1}</span>
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── REGULAR WORD MODE ── */
        <AnimatePresence mode="wait">
          <motion.div key={sessionIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <div style={{ background: isDeToEn ? "#eef2ff" : "#fef9e0", padding: "20px 24px", borderBottom: `3px solid ${isDeToEn ? "#6366f1" : "#d97a1a"}` }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px", color: isDeToEn ? "#4338ca" : "#b45309" }}>{isDeToEn ? "Deutsch" : "English"}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, textAlign: "center", margin: "8px 0" }}>{promptText}</div>
              {promptSentence && <div style={{ fontSize: "13px", fontStyle: "italic", textAlign: "center", color: isDeToEn ? "#4338ca" : "#b45309", opacity: 0.6, marginTop: "4px" }}>{promptSentence}</div>}
            </div>
            <div style={{ background: isDeToEn ? "#fef9e0" : "#eef2ff", padding: "20px 24px" }}>
              {!gradeResult ? (
                <>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", color: isDeToEn ? "#b45309" : "#4338ca" }}>{isDeToEn ? "English" : "Deutsch"}</div>
                  <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isDeToEn ? "Type English translation..." : "Type German translation..."} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoFocus style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", padding: "12px 14px", borderRadius: "var(--radius-md)", border: `2px solid ${isDeToEn ? "#d97a1a" : "#6366f1"}`, background: "var(--color-surface)" }} />
                  {!isDeToEn && <div style={{ display: "flex", gap: "4px", marginTop: "8px", justifyContent: "center" }}>{UMLAUTS.map((ch, i) => <button key={ch} onClick={() => insertUmlaut(ch, inputRef.current, input, setInput)} style={{ width: "36px", height: "36px", fontSize: "16px", fontWeight: 500, border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "8px", position: "absolute", top: "2px", right: "4px", color: "var(--color-ink-faint)" }}>{i + 1}</span>{ch}</button>)}</div>}
                  {gapFill && <div style={{ fontSize: "12px", color: isDeToEn ? "#b45309" : "#4338ca", opacity: 0.5, textAlign: "center", marginTop: "8px", fontStyle: "italic" }}>{gapFill}</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", color: isDeToEn ? "#b45309" : "#4338ca" }}>{isDeToEn ? "English" : "Deutsch"}</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, textAlign: "center", margin: "8px 0" }}>{correctText}</div>
                  {(isDeToEn ? word.englishSentence : word.germanSentence) && <div style={{ fontSize: "13px", fontStyle: "italic", textAlign: "center", color: isDeToEn ? "#b45309" : "#4338ca", opacity: 0.6, marginTop: "4px" }}>{isDeToEn ? word.englishSentence : word.germanSentence}</div>}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Both correct reward */}
      {showBothCorrect && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, type: "spring" }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: "#78350f" }}>
          <Trophy size={22} />
          <div><div style={{ fontSize: "15px", fontWeight: 700 }}>Both directions correct!</div><div style={{ fontSize: "12px", opacity: 0.8 }}>Moving up a box</div></div>
          <Trophy size={22} />
        </motion.div>
      )}

      {/* Regular feedback */}
      {gradeResult && !isVerbMode && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "8px", background: gradeResult.result === "correct" ? "#dcfce7" : gradeResult.result === "close" ? "#fef3c7" : "#fce4ec" }}>
            {gradeResult.result === "correct" ? <Check size={18} style={{ color: "#16a34a" }} /> : gradeResult.result === "close" ? <AlertTriangle size={18} style={{ color: "#d97706" }} /> : <X size={18} style={{ color: "#dc2626" }} />}
            <span style={{ fontSize: "15px", fontWeight: 700, color: gradeResult.result === "correct" ? "#16a34a" : gradeResult.result === "close" ? "#d97706" : "#dc2626" }}>
              {gradeResult.result === "correct" ? "Correct! +10pts" : gradeResult.result === "close" ? "Close! +7pts" : "Incorrect"}
            </span>
          </div>
          {gradeResult.result !== "correct" && <div style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "6px", background: "#fce4ec" }}><div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#dc2626", marginBottom: "2px" }}>You typed</div><div style={{ fontSize: "14px", fontStyle: "italic", color: "#dc2626" }}>{gradeResult.userAnswer || "nothing"}</div></div>}
          {gradeResult.result !== "correct" && <div style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "8px", background: "#dcfce7" }}><div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#16a34a", marginBottom: "2px" }}>Correct answer</div><div style={{ fontSize: "14px", fontWeight: 600, color: "#15803d" }}>{correctText}</div></div>}
        </motion.div>
      )}

      {/* Verb results summary */}
      {verbResults && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {(() => {
            const hasWrong = verbResults.some(r => r === "wrong");
            const hasClose = verbResults.some(r => r === "close");
            const overall = hasWrong ? "wrong" : hasClose ? "close" : "correct";
            return (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "8px", background: overall === "correct" ? "#dcfce7" : overall === "close" ? "#fef3c7" : "#fce4ec" }}>
                {overall === "correct" ? <Check size={18} style={{ color: "#16a34a" }} /> : overall === "close" ? <AlertTriangle size={18} style={{ color: "#d97706" }} /> : <X size={18} style={{ color: "#dc2626" }} />}
                <span style={{ fontSize: "15px", fontWeight: 700, color: overall === "correct" ? "#16a34a" : overall === "close" ? "#d97706" : "#dc2626" }}>
                  {overall === "correct" ? "All forms correct! +10pts" : overall === "close" ? "Close! +7pts" : "Some forms incorrect"}
                </span>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Next / Check button */}
      {answered ? (
        <button onClick={handleNext} autoFocus onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleNext(); }}} style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700, border: "none", borderRadius: "var(--radius-lg)", background: "var(--color-ink)", color: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {sessionIndex < sessionCards.length - 1 ? <>Next Word <ArrowRight size={16} /></> : "Finish Session"}
        </button>
      ) : (
        <button onClick={isVerbMode ? handleVerbSubmit : handleSubmit} style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700, border: "none", borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)", background: "#6366f1", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          Check Answer <ArrowRight size={16} />
        </button>
      )}

      <div style={{ textAlign: "center", fontSize: "11px", color: "var(--color-ink-faint)" }}>
        Press <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 6px", border: "1px solid var(--color-border)", borderRadius: "4px", background: "var(--color-surface)" }}>Enter</kbd> to {answered ? "next word" : "check"} · Keys 1–7 for umlauts
      </div>
    </div>
  );
}

function insertUmlaut(char: string, el: HTMLInputElement | null, val: string, setter: (v: string) => void) {
  if (!el) { setter(val + char); return; }
  const start = el.selectionStart || val.length;
  setter(val.slice(0, start) + char + val.slice(start));
  setTimeout(() => { el.selectionStart = el.selectionEnd = start + 1; el.focus(); }, 0);
}

function VerbField({ label, placeholder, value, correct, result, onChange, inputRef, onKeyDown, disabled }: {
  label: string; placeholder: string; value: string; correct: string; result?: "correct" | "close" | "wrong"; onChange: (v: string) => void; inputRef: (el: HTMLInputElement | null) => void; onKeyDown: (e: React.KeyboardEvent) => void; disabled: boolean;
}) {
  const borderColor = !result ? "#d97a1a" : result === "correct" ? "#16a34a" : result === "close" ? "#d97706" : "#dc2626";
  const bgColor = !result ? "var(--color-surface)" : result === "correct" ? "#dcfce7" : result === "close" ? "#fef3c7" : "#fce4ec";

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-ink-muted)", marginBottom: "2px" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input ref={inputRef} type="text" value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{ flex: 1, fontSize: "15px", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: `2px solid ${borderColor}`, background: bgColor, boxSizing: "border-box", opacity: disabled && !result ? 0.5 : 1 }} />
        {result && result !== "correct" && (
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#15803d", flexShrink: 0 }}>{correct === "—" ? "—" : correct}</span>
        )}
        {result === "correct" && <Check size={16} style={{ color: "#16a34a", flexShrink: 0 }} />}
      </div>
    </div>
  );
}

function VerbFieldInline({ placeholder, value, correct, result, onChange, inputRef, onKeyDown, disabled }: {
  placeholder: string; value: string; correct: string; result?: "correct" | "close" | "wrong"; onChange: (v: string) => void; inputRef: (el: HTMLInputElement | null) => void; onKeyDown: (e: React.KeyboardEvent) => void; disabled: boolean;
}) {
  const borderColor = !result ? "#d97a1a" : result === "correct" ? "#16a34a" : result === "close" ? "#d97706" : "#dc2626";
  const bgColor = !result ? "var(--color-surface)" : result === "correct" ? "#dcfce7" : result === "close" ? "#fef3c7" : "#fce4ec";

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <input ref={inputRef} type="text" value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{ width: "100%", fontSize: "15px", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: `2px solid ${borderColor}`, background: bgColor, boxSizing: "border-box", opacity: disabled && !result ? 0.5 : 1 }} />
      {result && result !== "correct" && (
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#15803d", flexShrink: 0 }}>{correct}</span>
      )}
      {result === "correct" && <Check size={16} style={{ color: "#16a34a", flexShrink: 0 }} />}
    </div>
  );
}
