import { useStore } from "@/store/useStore";
import { TOPICS, BOX_LABELS, BOX_COLORS, LEITNER_BOXES, MAX_DAY } from "@/types";
import type { LeitnerBox } from "@/types";
import { getAllWords, getTopicWordCounts } from "@/data/vocabulary";
import { BookOpen, RotateCcw, Library, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";

export function Dashboard() {
  const currentDay = useStore((s) => s.currentDay);
  const setCurrentDay = useStore((s) => s.setCurrentDay);
  const startReviewSession = useStore((s) => s.startReviewSession);
  const startLearnSession = useStore((s) => s.startLearnSession);
  const setView = useStore((s) => s.setView);
  const setSelectedTopicId = useStore((s) => s.setSelectedTopicId);
  const getDueWordIds = useStore((s) => s.getDueWordIds);
  const getNewWordIds = useStore((s) => s.getNewWordIds);
  const getBoxCounts = useStore((s) => s.getBoxCounts);
  const getTopicProgress = useStore((s) => s.getTopicProgress);
  const resetAll = useStore((s) => s.resetAll);
  const wordStates = useStore((s) => s.wordStates);

  const [showReset, setShowReset] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const dueCount = getDueWordIds().length;
  const newCount = getNewWordIds().length;
  const boxCounts = getBoxCounts();
  const totalIntroduced = Object.keys(wordStates).length;
  const topicCounts = useMemo(() => getTopicWordCounts(), []);
  const allWords = useMemo(() => getAllWords(), []);
  const totalWords = allWords.length;

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setView("topic-detail");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
          German B1 vocabulary
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "4px 0 0" }}>
          {totalWords.toLocaleString()} words · {MAX_DAY}-day Leitner course
        </p>
      </div>

      {/* Day selector */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--color-surface)", border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-lg)", padding: "14px 18px",
      }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Current day
          </div>
          <div style={{ fontSize: "28px", fontWeight: 600, lineHeight: 1.1 }}>
            {currentDay}
            <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--color-ink-muted)", marginLeft: "4px" }}>/ {MAX_DAY}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <DayButton onClick={() => setCurrentDay(currentDay - 1)} disabled={currentDay <= 1}>
            <ChevronDown size={16} />
          </DayButton>
          <DayButton onClick={() => setCurrentDay(currentDay + 1)} disabled={currentDay >= MAX_DAY}>
            <ChevronUp size={16} />
          </DayButton>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <ActionButton
          onClick={startReviewSession}
          disabled={dueCount === 0}
          primary={dueCount > 0}
          icon={<RotateCcw size={20} />}
          label={`Review (${dueCount})`}
          sub="Due words"
        />
        <ActionButton
          onClick={startLearnSession}
          disabled={newCount === 0}
          icon={<BookOpen size={20} />}
          label={`Learn (${newCount})`}
          sub="New words"
        />
        <ActionButton
          onClick={() => setView("browse")}
          icon={<Library size={20} />}
          label="Browse"
          sub="All words"
        />
      </div>

      {/* Leitner boxes */}
      <div>
        <h2 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 10px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Leitner boxes
        </h2>

        {/* Untested box — grey, full width */}
        <div style={{
          background: "var(--color-surface-sunken)", borderRadius: "var(--radius-md)",
          padding: "10px 16px", marginBottom: "8px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-ink-muted)" }}>
              {boxCounts[0]}
            </span>
            <span style={{ fontSize: "13px", color: "var(--color-ink-muted)" }}>Untested</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--color-ink-faint)" }}>
            Not yet attempted
          </span>
        </div>

        {/* Boxes 1-6 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {LEITNER_BOXES.map((box) => {
            const colors = BOX_COLORS[box];
            return (
              <div key={box} style={{ background: colors.bg, borderRadius: "var(--radius-md)", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", fontWeight: 500, color: colors.fg, opacity: 0.8 }}>Box {box}</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: colors.fg, lineHeight: 1.2, fontFamily: "var(--font-mono)" }}>
                  {boxCounts[box]}
                </div>
                <div style={{ fontSize: "10px", color: colors.fg, opacity: 0.7, marginTop: "2px" }}>{BOX_LABELS[box]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px", color: "var(--color-ink-muted)" }}>
          <span>{totalIntroduced} tested</span>
          <span>{boxCounts[0] + totalIntroduced} unlocked on day {currentDay}</span>
        </div>
      </div>

      {/* Topic progress — clickable */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "14px", fontWeight: 600, color: "var(--color-ink-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px",
            padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
          }}
        >
          Topics {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div style={{
            background: "var(--color-surface)", border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            {TOPICS.map((topic, i) => {
              const progress = getTopicProgress(topic.id);
              const totalForTopic = topicCounts[topic.id] || 0;
              const pct = totalForTopic > 0 ? Math.round((progress.mastered / totalForTopic) * 100) : 0;

              return (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 16px", width: "100%", textAlign: "left",
                    borderBottom: i < TOPICS.length - 1 ? "1px solid var(--color-border)" : "none",
                    border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
                    background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: topic.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: 500, width: "80px", flexShrink: 0 }}>{topic.shortName}</span>
                  <div style={{ flex: 1, height: "6px", background: "var(--color-surface-sunken)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: topic.color, borderRadius: "3px", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)", minWidth: "60px", textAlign: "right" }}>
                    {progress.mastered}/{totalForTopic}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset */}
      <div style={{ marginTop: "8px" }}>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} style={{ fontSize: "12px", color: "var(--color-ink-faint)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: "var(--font-sans)" }}>
            Reset all progress...
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
            <span style={{ color: "var(--color-wrong)" }}>Delete all progress?</span>
            <button onClick={() => { resetAll(); setShowReset(false); }} style={{ fontSize: "12px", fontWeight: 600, color: "#fff", background: "var(--color-wrong)", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 14px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Yes, reset
            </button>
            <button onClick={() => setShowReset(false)} style={{ fontSize: "12px", color: "var(--color-ink-muted)", background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DayButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)",
      background: "var(--color-surface)", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1, color: "var(--color-ink)",
    }}>
      {children}
    </button>
  );
}

function ActionButton({ onClick, disabled, primary, icon, label, sub }: {
  onClick: () => void; disabled?: boolean; primary?: boolean; icon: React.ReactNode; label: string; sub: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
      padding: "18px 12px", border: primary ? "none" : "1.5px solid var(--color-border)",
      borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
      background: primary ? "var(--color-accent)" : disabled ? "var(--color-surface-sunken)" : "var(--color-surface)",
      color: primary ? "#fff" : disabled ? "var(--color-ink-faint)" : "var(--color-ink)",
      cursor: disabled && !primary ? "not-allowed" : "pointer",
    }}>
      {icon}
      <span style={{ fontSize: "14px", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "11px", opacity: 0.7 }}>{sub}</span>
    </button>
  );
}
