import { useStore } from "@/store/useStore";
import { getWordById } from "@/data/vocabulary";
import { gradeAnswer } from "@/utils/grading";
import { TOPICS, BOX_COLORS } from "@/types";
import type { Direction, GradeDetail, LeitnerBox } from "@/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, X, AlertTriangle } from "lucide-react";

export function Flashcard() {
  const sessionCards = useStore((s) => s.sessionCards);
  const sessionIndex = useStore((s) => s.sessionIndex);
  const sessionResults = useStore((s) => s.sessionResults);
  const sessionType = useStore((s) => s.sessionType);
  const sessionDirectionPhase = useStore((s) => s.sessionDirectionPhase);
  const sessionFirstDirection = useStore((s) => s.sessionFirstDirection);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const advanceCard = useStore((s) => s.advanceCard);
  const getWordState = useStore((s) => s.getWordState);
  const setView = useStore((s) => s.setView);

  const [input, setInput] = useState("");
  const [gradeResult, setGradeResult] = useState<GradeDetail | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = sessionCards[sessionIndex];
  const word = card ? getWordById(card.wordId) : null;
  const wordState = card ? getWordState(card.wordId) : null;

  const currentDirection: Direction =
    sessionDirectionPhase === 1
      ? sessionFirstDirection
      : sessionFirstDirection === "de-to-en"
        ? "en-to-de"
        : "de-to-en";

  const isDeToEn = currentDirection === "de-to-en";
  const promptText = word ? (isDeToEn ? word.german : word.english) : "";
  const correctText = word ? (isDeToEn ? word.english : word.german) : "";

  const topic = word ? TOPICS.find((t) => t.id === word.topicId) : null;
  const boxColors = wordState ? BOX_COLORS[wordState.box as LeitnerBox] : null;

  // Focus input on mount and card change
  useEffect(() => {
    setInput("");
    setGradeResult(null);
    setShowPreview(sessionType === "learn" && sessionDirectionPhase === 1);
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [sessionIndex, sessionDirectionPhase, sessionType]);

  const handleSubmit = useCallback(() => {
    if (!word || gradeResult) return;

    if (showPreview) {
      setShowPreview(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const result = gradeAnswer(input, correctText, currentDirection);
    setGradeResult(result);
    recordAnswer(result.result, input);
  }, [word, gradeResult, showPreview, input, correctText, currentDirection, recordAnswer]);

  const handleContinue = useCallback(() => {
    setGradeResult(null);
    setInput("");
    advanceCard();
  }, [advanceCard]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (gradeResult) {
          handleContinue();
        } else {
          handleSubmit();
        }
      }
    },
    [gradeResult, handleSubmit, handleContinue]
  );

  if (!card || !word) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>No cards to review.</p>
        <button
          onClick={() => setView("dashboard")}
          style={{
            marginTop: "12px",
            padding: "10px 24px",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
          }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setView("dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "13px",
            color: "var(--color-ink-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            fontFamily: "var(--font-sans)",
          }}
        >
          <ArrowLeft size={14} />
          Exit
        </button>
        <span
          style={{
            fontSize: "13px",
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {sessionIndex + 1} / {sessionCards.length}
        </span>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: "3px",
          flexWrap: "wrap",
        }}
      >
        {sessionCards.map((_, i) => {
          // Each card has 2 results (2 directions)
          const r1 = sessionResults.find(
            (r, ri) =>
              r.wordId === sessionCards[i].wordId &&
              ri >= i * 2 &&
              ri < i * 2 + 2
          );
          let dotColor = "var(--color-border)";
          if (i < sessionIndex) {
            // Check both results for this card
            const cardResults = sessionResults.filter(
              (r) => r.wordId === sessionCards[i].wordId
            );
            const allPass = cardResults.every(
              (r) => r.grade === "correct" || r.grade === "close"
            );
            const anyClose = cardResults.some((r) => r.grade === "close");
            if (allPass && !anyClose) dotColor = "var(--color-correct)";
            else if (allPass && anyClose) dotColor = "var(--color-close)";
            else dotColor = "var(--color-wrong)";
          } else if (i === sessionIndex) {
            dotColor = "var(--color-accent)";
          }

          return (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: dotColor,
                transition: "background 0.2s",
              }}
            />
          );
        })}
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${sessionIndex}-${sessionDirectionPhase}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          style={{
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "24px",
          }}
        >
          {/* Direction badge + topic */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "12px",
                background: isDeToEn
                  ? "var(--color-box5-bg)"
                  : "var(--color-box6-bg)",
                color: isDeToEn ? "var(--color-box5)" : "var(--color-box6)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {isDeToEn ? "DE → EN" : "EN → DE"} · phase{" "}
              {sessionDirectionPhase}/2
            </span>
            {topic && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--color-ink-faint)",
                }}
              >
                {topic.shortName}
              </span>
            )}
            {wordState && boxColors && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "8px",
                  background: boxColors.bg,
                  color: boxColors.fg,
                }}
              >
                Box {wordState.box}
              </span>
            )}
          </div>

          {/* Learn mode: preview */}
          {showPreview && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--color-ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "4px",
                }}
              >
                Learn this word
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
              >
                {word.german}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  color: "var(--color-ink-muted)",
                  marginBottom: "12px",
                }}
              >
                {word.english}
              </div>
              {word.germanSentence && (
                <div
                  style={{
                    background: "var(--color-surface-raised)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontStyle: "italic", marginBottom: "4px" }}>
                    {word.germanSentence}
                  </div>
                  <div style={{ color: "var(--color-ink-muted)" }}>
                    {word.englishSentence}
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setShowPreview(false);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                style={{
                  marginTop: "16px",
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-accent)",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Got it — test me
              </button>
            </div>
          )}

          {/* Typing prompt */}
          {!showPreview && (
            <>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--color-ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "4px",
                }}
              >
                {isDeToEn ? "Translate to English" : "Translate to German"}
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  marginBottom: "16px",
                  lineHeight: 1.3,
                }}
              >
                {promptText}
              </div>

              {/* Input + submit */}
              <div
                style={{ display: "flex", gap: "8px", marginBottom: "4px" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isDeToEn ? "Type English..." : "Type German..."
                  }
                  disabled={!!gradeResult}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{
                    flex: 1,
                    opacity: gradeResult ? 0.6 : 1,
                  }}
                />
                {!gradeResult && (
                  <button
                    onClick={handleSubmit}
                    disabled={input.trim().length === 0}
                    style={{
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      background:
                        input.trim().length > 0
                          ? "var(--color-accent)"
                          : "var(--color-surface-sunken)",
                      color:
                        input.trim().length > 0
                          ? "#fff"
                          : "var(--color-ink-faint)",
                      cursor:
                        input.trim().length > 0 ? "pointer" : "not-allowed",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Check
                  </button>
                )}
              </div>

              {/* Feedback */}
              {gradeResult && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    marginTop: "12px",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    background:
                      gradeResult.result === "correct"
                        ? "var(--color-correct-bg)"
                        : gradeResult.result === "close"
                          ? "var(--color-close-bg)"
                          : "var(--color-wrong-bg)",
                  }}
                >
                  {/* Result header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    {gradeResult.result === "correct" && (
                      <Check
                        size={16}
                        style={{ color: "var(--color-correct)" }}
                      />
                    )}
                    {gradeResult.result === "close" && (
                      <AlertTriangle
                        size={16}
                        style={{ color: "var(--color-close)" }}
                      />
                    )}
                    {gradeResult.result === "wrong" && (
                      <X size={16} style={{ color: "var(--color-wrong)" }} />
                    )}
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color:
                          gradeResult.result === "correct"
                            ? "var(--color-correct)"
                            : gradeResult.result === "close"
                              ? "var(--color-close)"
                              : "var(--color-wrong)",
                      }}
                    >
                      {gradeResult.result === "correct"
                        ? "Correct!"
                        : gradeResult.result === "close"
                          ? "Close — minor error"
                          : "Not quite"}
                    </span>
                  </div>

                  {/* Show correct answer if wrong/close */}
                  {gradeResult.result !== "correct" && (
                    <div style={{ fontSize: "13px", marginBottom: "6px" }}>
                      <span style={{ color: "var(--color-ink-muted)" }}>
                        Your answer:{" "}
                      </span>
                      <span
                        style={{
                          textDecoration:
                            gradeResult.result === "wrong"
                              ? "line-through"
                              : "none",
                          opacity: gradeResult.result === "wrong" ? 0.6 : 1,
                        }}
                      >
                        {gradeResult.userAnswer || "(empty)"}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "var(--color-ink-muted)" }}>
                      Correct:{" "}
                    </span>
                    <span style={{ fontWeight: 600 }}>{correctText}</span>
                  </div>

                  {/* Example sentence */}
                  {word.germanSentence && (
                    <div
                      style={{
                        background: "rgba(255,255,255,0.5)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 12px",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontStyle: "italic" }}>
                        {word.germanSentence}
                      </div>
                      <div
                        style={{
                          color: "var(--color-ink-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {word.englishSentence}
                      </div>
                    </div>
                  )}

                  {/* Continue button */}
                  <button
                    onClick={handleContinue}
                    style={{
                      marginTop: "14px",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-ink)",
                      color: "var(--color-surface)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {sessionDirectionPhase === 1 ? (
                      <>
                        Continue to{" "}
                        {isDeToEn ? "EN → DE" : "DE → EN"}{" "}
                        <ArrowRight size={14} />
                      </>
                    ) : sessionIndex < sessionCards.length - 1 ? (
                      <>
                        Next word <ArrowRight size={14} />
                      </>
                    ) : (
                      "Finish session"
                    )}
                  </button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Keyboard hint */}
      <div
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "var(--color-ink-faint)",
        }}
      >
        Press <kbd style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          padding: "2px 6px",
          border: "1px solid var(--color-border)",
          borderRadius: "4px",
          background: "var(--color-surface)",
        }}>Enter</kbd> to{" "}
        {gradeResult ? "continue" : "check"}
      </div>
    </div>
  );
}
