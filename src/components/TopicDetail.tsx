import { useStore } from "@/store/useStore";
import { getWordsByTopic } from "@/data/vocabulary";
import { TOPICS, BOX_COLORS, BOX_LABELS } from "@/types";
import type { LeitnerBox } from "@/types";
import { ArrowLeft, X } from "lucide-react";
import { useMemo } from "react";

export function TopicDetail() {
  const selectedTopicId = useStore((s) => s.selectedTopicId);
  const setView = useStore((s) => s.setView);
  const wordStates = useStore((s) => s.wordStates);
  const currentDay = useStore((s) => s.currentDay);

  const topic = TOPICS.find((t) => t.id === selectedTopicId);
  const allTopicWords = useMemo(
    () => (selectedTopicId ? getWordsByTopic(selectedTopicId) : []),
    [selectedTopicId]
  );

  const unlockedWords = allTopicWords.filter((w) => w.day <= currentDay);
  const lockedWords = allTopicWords.filter((w) => w.day > currentDay);

  if (!topic) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>Topic not found.</p>
        <button onClick={() => setView("dashboard")} style={{ marginTop: "12px", padding: "10px 24px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "14px" }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: topic.color }} />
          {topic.name} Words
        </h1>
        <button onClick={() => setView("dashboard")} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "32px", height: "32px", border: "1px solid var(--color-border)", borderRadius: "50%",
          background: "var(--color-surface)", cursor: "pointer", color: "var(--color-ink)",
        }}>
          <X size={16} />
        </button>
      </div>

      <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: 0 }}>
        {allTopicWords.length} total · {unlockedWords.length} unlocked on day {currentDay}
      </p>

      {/* Word list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {unlockedWords.map((word) => {
          const ws = wordStates[word.id];
          const box = ws ? ws.box : null;
          const boxColors = box ? BOX_COLORS[box as LeitnerBox] : null;

          return (
            <div key={word.id} style={{
              background: "var(--color-surface)", border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-lg)", padding: "14px 16px",
              borderLeft: `4px solid ${boxColors ? boxColors.fg : "var(--color-border)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "2px" }}>{word.german}</div>
                  <div style={{ fontSize: "14px", color: "var(--color-ink-muted)" }}>{word.english}</div>
                </div>
                {boxColors ? (
                  <span style={{
                    fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "10px",
                    background: boxColors.bg, color: boxColors.fg, flexShrink: 0, whiteSpace: "nowrap",
                  }}>Box {box}</span>
                ) : (
                  <span style={{
                    fontSize: "11px", fontWeight: 500, padding: "3px 10px", borderRadius: "10px",
                    background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)", flexShrink: 0,
                  }}>Untested</span>
                )}
              </div>

              {/* Sentences */}
              {word.germanSentence && (
                <div style={{ marginTop: "8px", padding: "8px 12px", background: "var(--color-surface-raised)", borderRadius: "var(--radius-sm)", fontSize: "12px", lineHeight: 1.6 }}>
                  <div style={{ fontStyle: "italic" }}>{word.germanSentence}</div>
                  {word.englishSentence && (
                    <div style={{ color: "var(--color-ink-muted)", marginTop: "2px" }}>{word.englishSentence}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lockedWords.length > 0 && (
        <div style={{ fontSize: "12px", color: "var(--color-ink-faint)", textAlign: "center", padding: "8px 0" }}>
          {lockedWords.length} more words unlock on later days
        </div>
      )}

      {/* Back button at bottom */}
      <button onClick={() => setView("dashboard")} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
        padding: "12px", fontSize: "14px", fontWeight: 600,
        border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)",
        background: "var(--color-surface)", color: "var(--color-ink)", cursor: "pointer", fontFamily: "var(--font-sans)",
      }}>
        <ArrowLeft size={16} /> Back to dashboard
      </button>
    </div>
  );
}
