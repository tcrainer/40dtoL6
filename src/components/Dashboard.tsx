import { useStore } from "@/store/useStore";
import { TOPICS, BOX_LABELS, BOX_COLORS, LEITNER_BOXES, MAX_DAY } from "@/types";
import type { LeitnerBox } from "@/types";
import { getTopicWordCounts, getTopicDays, getWordsForTopicDay, getAllWords } from "@/data/vocabulary";
import { BookOpen, RotateCcw, ChevronDown, ChevronUp, Flame, Star, Trophy } from "lucide-react";
import { useState, useMemo } from "react";

export function Dashboard() {
  const currentDay = useStore((s) => s.currentDay);
  const setCurrentDay = useStore((s) => s.setCurrentDay);
  const startReviewSession = useStore((s) => s.startReviewSession);
  const startLearnSession = useStore((s) => s.startLearnSession);
  const startCustomSession = useStore((s) => s.startCustomSession);
  const setView = useStore((s) => s.setView);
  const setSelectedTopicId = useStore((s) => s.setSelectedTopicId);
  const getDueWordIds = useStore((s) => s.getDueWordIds);
  const getNewWordIds = useStore((s) => s.getNewWordIds);
  const getBoxCounts = useStore((s) => s.getBoxCounts);
  const getDueTodayCount = useStore((s) => s.getDueTodayCount);
  const isAllRevisedToday = useStore((s) => s.isAllRevisedToday);
  const resetAll = useStore((s) => s.resetAll);
  const wordStates = useStore((s) => s.wordStates);
  const stats = useStore((s) => s.stats);

  const [showReset, setShowReset] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Map<string, Set<number>>>(new Map());

  const dueCount = getDueWordIds().length;
  const newCount = getNewWordIds().length;
  const boxCounts = getBoxCounts();
  const dueTodayCount = getDueTodayCount();
  const allRevised = isAllRevisedToday();

  // Selected words count
  const selectedWordIds = useMemo(() => {
    const ids: string[] = [];
    for (const [topicId, days] of selectedDays) {
      for (const day of days) {
        for (const w of getWordsForTopicDay(topicId, day)) {
          ids.push(w.id);
        }
      }
    }
    return ids;
  }, [selectedDays]);

  const toggleDay = (topicId: string, day: number) => {
    setSelectedDays((prev) => {
      const next = new Map(prev);
      const days = new Set(next.get(topicId) || []);
      if (days.has(day)) days.delete(day); else days.add(day);
      if (days.size === 0) next.delete(topicId); else next.set(topicId, days);
      return next;
    });
  };

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setView("topic-detail");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header with streak */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>GCSE German</h1>
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "4px 0 0" }}>
            {MAX_DAY}-day Leitner vocabulary course
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#d97a1a" }}>
              <Flame size={16} />
              <span style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{stats.streak}</span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-ink-faint)" }}>streak</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#7c4dba" }}>
              <Star size={16} />
              <span style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{stats.points}</span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-ink-faint)" }}>points</div>
          </div>
        </div>
      </div>

      {/* Day selector */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--color-surface)", border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-lg)", padding: "12px 18px",
      }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Current day</div>
          <div style={{ fontSize: "26px", fontWeight: 600, lineHeight: 1.1 }}>
            {currentDay}<span style={{ fontSize: "14px", fontWeight: 400, color: "var(--color-ink-muted)", marginLeft: "4px" }}>/ {MAX_DAY}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <DayBtn onClick={() => setCurrentDay(currentDay - 1)} disabled={currentDay <= 1}><ChevronDown size={16} /></DayBtn>
          <DayBtn onClick={() => setCurrentDay(currentDay + 1)} disabled={currentDay >= MAX_DAY}><ChevronUp size={16} /></DayBtn>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={startLearnSession} disabled={newCount === 0} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          padding: "16px 12px", border: "none", borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
          background: newCount > 0 ? "var(--color-accent)" : "var(--color-surface-sunken)",
          color: newCount > 0 ? "#fff" : "var(--color-ink-faint)", cursor: newCount > 0 ? "pointer" : "not-allowed",
        }}>
          <BookOpen size={18} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Test new words ({newCount})</span>
        </button>
        <button onClick={startReviewSession} disabled={dueCount === 0} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          padding: "16px 12px", border: dueCount > 0 ? "2px solid var(--color-accent)" : "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
          background: "var(--color-surface)", color: dueCount > 0 ? "var(--color-accent)" : "var(--color-ink-faint)",
          cursor: dueCount > 0 ? "pointer" : "not-allowed",
        }}>
          <RotateCcw size={18} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Revise ({dueCount})</span>
        </button>
      </div>

      {/* Leitner boxes */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          GCSE words
        </h2>

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {/* Untested */}
          <div style={{
            minWidth: "90px", background: "var(--color-surface-sunken)", borderRadius: "var(--radius-md)",
            padding: "10px", textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase" }}>Untested</div>
            <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-ink-muted)", margin: "2px 0" }}>{boxCounts[0]}</div>
            <div style={{ fontSize: "9px", color: "var(--color-ink-faint)" }}>{Object.keys(wordStates).length} tested</div>
          </div>

          {LEITNER_BOXES.map((box) => {
            const c = BOX_COLORS[box];
            const count = boxCounts[box];
            const isDueBox = box >= 1 && box <= 5;
            // Count due in this box
            let dueInBox = 0;
            if (isDueBox) {
              const allW = getAllWords();
              for (const w of allW) {
                const ws = wordStates[w.id];
                if (ws && ws.box === box) {
                  if (box === 1 || !ws.lastReviewDate || daysBetween(ws.lastReviewDate, todayISO()) >= BOX_INTERVALS[box]) {
                    dueInBox++;
                  }
                }
              }
            }

            return (
              <div key={box} style={{
                minWidth: "90px", background: c.bg, borderRadius: "var(--radius-md)",
                padding: "10px", textAlign: "center", flexShrink: 0,
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: c.fg, textTransform: "uppercase" }}>Box {box}</div>
                <div style={{ fontSize: "9px", color: c.fg, opacity: 0.7 }}>{BOX_LABELS[box]}</div>
                <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: c.fg, margin: "2px 0" }}>
                  {dueInBox > 0 && box !== 6 ? dueInBox : count === 0 && allRevised && Object.keys(wordStates).length > 0 ? "😊" : count}
                </div>
                {dueInBox > 0 && box !== 6 && (
                  <div style={{ fontSize: "9px", color: c.fg, opacity: 0.8 }}>{dueInBox} due today</div>
                )}
                {dueInBox === 0 && count > 0 && box !== 6 && (
                  <div style={{ fontSize: "9px", color: c.fg, opacity: 0.6 }}>{count} total</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Topics with day grid */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 10px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Topics grouped by day
        </h2>

        {/* Selected count + start button */}
        {selectedWordIds.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--color-accent)", color: "#fff", borderRadius: "var(--radius-lg)",
            padding: "12px 16px", marginBottom: "10px",
          }}>
            <span style={{ fontSize: "13px" }}>
              {selectedDays.size} day{selectedDays.size !== 1 ? "s" : ""}, {selectedWordIds.length} words selected
            </span>
            <button onClick={() => startCustomSession(selectedWordIds)} style={{
              fontSize: "13px", fontWeight: 600, padding: "6px 16px", borderRadius: "var(--radius-md)",
              border: "none", background: "#fff", color: "var(--color-accent)", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}>
              Test these chosen ones
            </button>
          </div>
        )}

        <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
          <div style={{ display: "flex", gap: "16px", minWidth: "max-content" }}>
            {TOPICS.map((topic) => {
              const days = getTopicDays(topic.id).filter((d) => d <= MAX_DAY);
              const topicSelected = selectedDays.get(topic.id) || new Set<number>();

              return (
                <div key={topic.id} style={{ minWidth: "160px" }}>
                  <button onClick={() => handleTopicClick(topic.id)} style={{
                    fontSize: "12px", fontWeight: 600, marginBottom: "6px", padding: 0,
                    border: "none", background: "none", cursor: "pointer", color: "var(--color-ink)",
                    fontFamily: "var(--font-sans)", textAlign: "left",
                  }}>
                    {topic.name}
                  </button>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                    {days.map((day) => {
                      const words = getWordsForTopicDay(topic.id, day);
                      const allTested = words.every((w) => wordStates[w.id]);
                      const someTested = words.some((w) => wordStates[w.id]);
                      const isSelected = topicSelected.has(day);

                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(topic.id, day)}
                          style={{
                            width: "28px", height: "28px", fontSize: "10px", fontWeight: 500,
                            border: isSelected ? `2px solid ${topic.color}` : "1px solid var(--color-border)",
                            borderRadius: "4px", cursor: "pointer", fontFamily: "var(--font-mono)",
                            background: isSelected ? topic.color : allTested ? "var(--color-surface-sunken)" : "var(--color-surface)",
                            color: isSelected ? "#fff" : allTested ? "var(--color-ink-faint)" : "var(--color-ink)",
                            opacity: someTested && !allTested ? 0.85 : 1,
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Browse + Reset */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
        <button onClick={() => setView("browse")} style={{
          fontSize: "13px", fontWeight: 500, color: "var(--color-accent)", background: "none",
          border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, textDecoration: "underline", textUnderlineOffset: "2px",
        }}>
          Browse all words
        </button>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} style={{ fontSize: "11px", color: "var(--color-ink-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
            Reset progress
          </button>
        ) : (
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <button onClick={() => { resetAll(); setShowReset(false); setSelectedDays(new Map()); }} style={{ fontWeight: 600, color: "#fff", background: "var(--color-wrong)", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Yes, reset</button>
            <button onClick={() => setShowReset(false)} style={{ color: "var(--color-ink-muted)", background: "none", border: "1px solid var(--color-border)", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DayBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)",
      background: "var(--color-surface)", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1, color: "var(--color-ink)",
    }}>{children}</button>
  );
}

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
const BOX_INTERVALS: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 8, 5: 14, 6: Infinity };
