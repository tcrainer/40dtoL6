import { useStore } from "@/store/useStore";
import { getWordById } from "@/data/vocabulary";
import { gradeAnswer } from "@/utils/grading";
import { TOPICS, BOX_COLORS } from "@/types";
import type { LeitnerBox, GradeDetail } from "@/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, X, AlertTriangle, Star } from "lucide-react";

const UMLAUTS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

function makeGapFill(sentence: string, targetWord: string): string | null {
  if (!sentence || !targetWord) return null;
  const plain = targetWord.replace(/^(der|die|das|den|dem|des|ein|eine)\s+/i, "").trim();
  if (plain.length < 2) return null;
  const idx = sentence.toLowerCase().indexOf(plain.toLowerCase());
  if (idx === -1) return null;
  return sentence.slice(0, idx) + "______" + sentence.slice(idx + plain.length);
}

export function Flashcard() {
  const sessionCards = useStore((s) => s.sessionCards);
  const sessionIndex = useStore((s) => s.sessionIndex);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const nextCard = useStore((s) => s.nextCard);
  const getWordState = useStore((s) => s.getWordState);
  const setView = useStore((s) => s.setView);
  const stats = useStore((s) => s.stats);

  const [input, setInput] = useState("");
  const [gradeResult, setGradeResult] = useState<GradeDetail | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = sessionCards[sessionIndex];
  const word = card ? getWordById(card.wordId) : null;
  const wordState = card ? getWordState(card.wordId) : null;

  const isDeToEn = card?.direction === "de-to-en";
  const promptText = word ? (isDeToEn ? word.german : word.english) : "";
  const correctText = word ? (isDeToEn ? word.english : word.german) : "";

  // Only show the sentence in the PROMPT language (not the answer language!)
  const promptSentence = word ? (isDeToEn ? word.germanSentence : word.englishSentence) : "";

  // Gap fill uses the ANSWER-language sentence with the answer blanked out
  const gapFill = word ? makeGapFill(
    isDeToEn ? word.englishSentence : word.germanSentence,
    correctText
  ) : null;

  const boxColors = wordState ? BOX_COLORS[wordState.box as LeitnerBox] : null;

  useEffect(() => {
    setInput("");
    setGradeResult(null);
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [sessionIndex]);

  const handleSubmit = useCallback(() => {
    if (!word || gradeResult) return;
    const result = gradeAnswer(input, correctText, card!.direction);
    setGradeResult(result);
    recordAnswer(result.result, input);
  }, [word, gradeResult, input, correctText, card, recordAnswer]);

  const handleNext = useCallback(() => {
    setGradeResult(null);
    setInput("");
    nextCard();
  }, [nextCard]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (gradeResult) handleNext();
      else if (input.trim().length > 0) handleSubmit();
    }
    const num = parseInt(e.key);
    if (num >= 1 && num <= 7 && !gradeResult && !isDeToEn) {
      e.preventDefault();
      insertUmlaut(UMLAUTS[num - 1]);
    }
  }, [gradeResult, handleNext, handleSubmit, input, isDeToEn]);

  const insertUmlaut = (char: string) => {
    const el = inputRef.current;
    if (!el) { setInput((p) => p + char); return; }
    const start = el.selectionStart || input.length;
    const end = el.selectionEnd || input.length;
    const newVal = input.slice(0, start) + char + input.slice(end);
    setInput(newVal);
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + 1; el.focus(); }, 0);
  };

  if (!card || !word) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>No cards to review.</p>
        <button onClick={() => setView("dashboard")} style={{
          marginTop: "12px", padding: "10px 24px", border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-md)", background: "var(--color-surface)", cursor: "pointer",
          fontFamily: "var(--font-sans)", fontSize: "14px",
        }}>Back to dashboard</button>
      </div>
    );
  }

  const progressPct = Math.round(((sessionIndex + 1) / sessionCards.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setView("dashboard")} style={{
            display: "flex", alignItems: "center", gap: "4px", fontSize: "13px",
            color: "var(--color-ink-muted)", background: "none", border: "none",
            cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)",
          }}>
            <ArrowLeft size={14} /> Exit
          </button>
          <span style={{ fontSize: "13px", color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>
            {sessionIndex + 1} / {sessionCards.length}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#7c4dba" }}>
          <Star size={14} />
          <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{stats.points} pts</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", background: "var(--color-surface-sunken)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--color-accent)", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sessionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          style={{
            background: "var(--color-surface)", border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-xl)", overflow: "hidden",
          }}
        >
          {/* Prompt section */}
          <div style={{
            background: isDeToEn ? "#eef2ff" : "#fef9e0",
            padding: "20px 24px",
            borderBottom: `3px solid ${isDeToEn ? "#6366f1" : "#d97a1a"}`,
          }}>
            <div style={{
              fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: "12px",
              color: isDeToEn ? "#4338ca" : "#b45309",
            }}>
              {isDeToEn ? "Deutsch" : "English"}
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, textAlign: "center", margin: "8px 0" }}>
              {promptText}
            </div>
            {/* Only show the prompt-language sentence — NOT the answer language */}
            {promptSentence && (
              <div style={{ fontSize: "13px", fontStyle: "italic", textAlign: "center", color: isDeToEn ? "#4338ca" : "#b45309", opacity: 0.6, marginTop: "4px" }}>
                {promptSentence}
              </div>
            )}
          </div>

          {/* Answer section */}
          <div style={{
            background: isDeToEn ? "#fef9e0" : "#eef2ff",
            padding: "20px 24px",
          }}>
            {!gradeResult ? (
              <>
                <div style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: "8px",
                  color: isDeToEn ? "#b45309" : "#4338ca",
                }}>
                  {isDeToEn ? "English" : "Deutsch"}
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isDeToEn ? "Type English translation..." : "Type German translation..."}
                  autoComplete="off" autoCapitalize="off" spellCheck={false}
                  style={{
                    width: "100%", boxSizing: "border-box", fontSize: "16px",
                    padding: "12px 14px", borderRadius: "var(--radius-md)",
                    border: `2px solid ${isDeToEn ? "#d97a1a" : "#6366f1"}`,
                    background: "var(--color-surface)",
                  }}
                />

                {/* Umlaut buttons (only for German typing) */}
                {!isDeToEn && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "8px", justifyContent: "center" }}>
                    {UMLAUTS.map((ch, i) => (
                      <button key={ch} onClick={() => insertUmlaut(ch)} style={{
                        width: "36px", height: "36px", fontSize: "16px", fontWeight: 500,
                        border: "1px solid var(--color-border)", borderRadius: "6px",
                        background: "var(--color-surface)", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", fontFamily: "var(--font-sans)", position: "relative",
                      }}>
                        <span style={{ fontSize: "8px", position: "absolute", top: "2px", right: "4px", color: "var(--color-ink-faint)" }}>{i + 1}</span>
                        {ch}
                      </button>
                    ))}
                  </div>
                )}

                {/* Gap fill hint — uses answer-language sentence with blanks */}
                {gapFill && (
                  <div style={{ fontSize: "12px", color: isDeToEn ? "#b45309" : "#4338ca", opacity: 0.5, textAlign: "center", marginTop: "8px", fontStyle: "italic" }}>
                    {gapFill}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Reveal the correct answer */}
                <div style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: "8px",
                  color: isDeToEn ? "#b45309" : "#4338ca",
                }}>
                  {isDeToEn ? "English" : "Deutsch"}
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, textAlign: "center", margin: "8px 0" }}>
                  {correctText}
                </div>
                {/* Now show the answer-language sentence too */}
                {(isDeToEn ? word.englishSentence : word.germanSentence) && (
                  <div style={{ fontSize: "13px", fontStyle: "italic", textAlign: "center", color: isDeToEn ? "#b45309" : "#4338ca", opacity: 0.6, marginTop: "4px" }}>
                    {isDeToEn ? word.englishSentence : word.germanSentence}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback */}
      {gradeResult && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "8px",
            background: gradeResult.result === "correct" ? "#dcfce7" : gradeResult.result === "close" ? "#fef3c7" : "#fce4ec",
          }}>
            {gradeResult.result === "correct" && <Check size={18} style={{ color: "#16a34a" }} />}
            {gradeResult.result === "close" && <AlertTriangle size={18} style={{ color: "#d97706" }} />}
            {gradeResult.result === "wrong" && <X size={18} style={{ color: "#dc2626" }} />}
            <span style={{
              fontSize: "15px", fontWeight: 700,
              color: gradeResult.result === "correct" ? "#16a34a" : gradeResult.result === "close" ? "#d97706" : "#dc2626",
            }}>
              {gradeResult.result === "correct" ? "Correct! +10pts" : gradeResult.result === "close" ? "Close! +7pts" : "Incorrect"}
            </span>
          </div>

          {gradeResult.result !== "correct" && (
            <div style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "6px", background: "#fce4ec" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#dc2626", marginBottom: "2px" }}>You typed</div>
              <div style={{ fontSize: "14px", fontStyle: "italic", color: "#dc2626" }}>{gradeResult.userAnswer || "nothing"}</div>
            </div>
          )}

          {gradeResult.result !== "correct" && (
            <div style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "8px", background: "#dcfce7" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#16a34a", marginBottom: "2px" }}>Correct answer</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#15803d" }}>{correctText}</div>
            </div>
          )}

          <button onClick={handleNext} style={{
            width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700,
            border: "none", borderRadius: "var(--radius-lg)",
            background: "var(--color-ink)", color: "var(--color-surface)",
            cursor: "pointer", fontFamily: "var(--font-sans)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
            {sessionIndex < sessionCards.length - 1 ? <>Next Word <ArrowRight size={16} /></> : "Finish Session"}
          </button>
        </motion.div>
      )}

      {/* Check button */}
      {!gradeResult && (
        <button onClick={handleSubmit} disabled={input.trim().length === 0} style={{
          width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700,
          border: "none", borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
          background: input.trim().length > 0 ? "#6366f1" : "var(--color-surface-sunken)",
          color: input.trim().length > 0 ? "#fff" : "var(--color-ink-faint)",
          cursor: input.trim().length > 0 ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}>
          Check Answer <ArrowRight size={16} />
        </button>
      )}

      <div style={{ textAlign: "center", fontSize: "11px", color: "var(--color-ink-faint)" }}>
        Press <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 6px", border: "1px solid var(--color-border)", borderRadius: "4px", background: "var(--color-surface)" }}>Enter</kbd> to {gradeResult ? "go to next word" : "check answer"}
        {!isDeToEn && !gradeResult && <> · Keys <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 6px", border: "1px solid var(--color-border)", borderRadius: "4px", background: "var(--color-surface)" }}>1</kbd>–<kbd style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "2px 6px", border: "1px solid var(--color-border)", borderRadius: "4px", background: "var(--color-surface)" }}>7</kbd> for umlauts</>}
      </div>
    </div>
  );
}
