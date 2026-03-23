import { useStore } from "@/store/useStore";
import { TOPICS, BOX_LABELS, BOX_COLORS, LEITNER_BOXES, MAX_DAY } from "@/types";
import type { LeitnerBox } from "@/types";
import { getTopicWordCounts, getTopicDays, getWordsForTopicDay, getAllWords } from "@/data/vocabulary";
import { BookOpen, RotateCcw, ChevronDown, ChevronUp, Flame, Star } from "lucide-react";
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
  const getTopicProgress = useStore((s) => s.getTopicProgress);
  const isAllRevisedToday = useStore((s) => s.isAllRevisedToday);
  const isTopicDayTested = useStore((s) => s.isTopicDayTested);
  const resetAll = useStore((s) => s.resetAll);
  const wordStates = useStore((s) => s.wordStates);
  const stats = useStore((s) => s.stats);

  const [showReset, setShowReset] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Map<string, Set<number>>>(new Map());

  const dueCount = getDueWordIds().length;
  const newCount = getNewWordIds().length;
  const boxCounts = getBoxCounts();
  const allRevised = isAllRevisedToday();
  const topicCounts = useMemo(() => getTopicWordCounts(), []);

  const selectedWordIds = useMemo(() => {
    const ids: string[] = [];
    for (const [topicId, days] of selectedDays) {
      for (const day of days) {
        for (const w of getWordsForTopicDay(topicId, day)) ids.push(w.id);
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>L6 Exam Countdown</h1>
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "4px 0 0" }}>{MAX_DAY}-day vocabulary course</p>
        </div>
        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
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
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>GCSE words</h2>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <BoxCard label="Untested" count={boxCounts[0]} sub={`${Object.keys(wordStates).length} tested`} fg="var(--color-ink-muted)" bg="var(--color-surface-sunken)" smiley={false} />
          {LEITNER_BOXES.map((box) => {
            const c = BOX_COLORS[box];
            const dueInBox = box < 6 ? countDueInBox(box, wordStates) : 0;
            const showSmiley = allRevised && boxCounts[box] > 0 && box < 6 && dueInBox === 0;
            return <BoxCard key={box} label={`Box ${box}`} count={showSmiley ? -1 : boxCounts[box]} sub={BOX_LABELS[box]} fg={c.fg} bg={c.bg} dueCount={dueInBox} smiley={showSmiley} />;
          })}
        </div>
      </div>

      {/* Topics with progress + day grid */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 10px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Topics</h2>

        {selectedWordIds.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--color-accent)", color: "#fff", borderRadius: "var(--radius-lg)",
            padding: "12px 16px", marginBottom: "10px",
          }}>
            <span style={{ fontSize: "13px" }}>{selectedWordIds.length} words selected</span>
            <button onClick={() => startCustomSession(selectedWordIds)} style={{
              fontSize: "13px", fontWeight: 600, padding: "6px 16px", borderRadius: "var(--radius-md)",
              border: "none", background: "#fff", color: "var(--color-accent)", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}>Test these</button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {TOPICS.map((topic) => {
            const progress = getTopicProgress(topic.id);
            const totalForTopic = topicCounts[topic.id] || 0;
            const pct = totalForTopic > 0 ? Math.round((progress.mastered / totalForTopic) * 100) : 0;
            const days = getTopicDays(topic.id).filter((d) => d <= MAX_DAY);
            const topicSelected = selectedDays.get(topic.id) || new Set<number>();

            return (
              <div key={topic.id} style={{
                background: "var(--color-surface)", border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-lg)", padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: topic.color, flexShrink: 0 }} />
                  <button onClick={() => handleTopicClick(topic.id)} style={{
                    fontSize: "14px", fontWeight: 600, padding: 0, border: "none", background: "none",
                    cursor: "pointer", color: "var(--color-ink)", fontFamily: "var(--font-sans)", textAlign: "left", flex: 1,
                  }}>
                    {topic.name}
                  </button>
                  <span style={{ fontSize: "11px", color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                    {progress.mastered}/{totalForTopic}
                  </span>
                </div>

                <div style={{ height: "6px", background: "var(--color-surface-sunken)", borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: topic.color, borderRadius: "3px", transition: "width 0.3s" }} />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                  {days.map((day) => {
                    const isSelected = topicSelected.has(day);
                    const allTested = isTopicDayTested(topic.id, day);

                    return (
                      <button key={day} onClick={() => toggleDay(topic.id, day)} style={{
                        width: "28px", height: "28px", fontSize: "10px", fontWeight: allTested ? 700 : 500,
                        border: isSelected ? `2px solid ${topic.color}` : "1px solid var(--color-border)",
                        borderRadius: "4px", cursor: "pointer", fontFamily: "var(--font-mono)",
                        background: isSelected ? topic.color : allTested ? "#fbbf24" : "var(--color-surface)",
                        color: isSelected ? "#fff" : allTested ? "#78350f" : "var(--color-ink)",
                      }}>
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

      {/* Browse + Reset */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
        <button onClick={() => setView("browse")} style={{
          fontSize: "13px", fontWeight: 500, color: "var(--color-accent)", background: "none",
          border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, textDecoration: "underline", textUnderlineOffset: "2px",
        }}>Browse all words</button>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} style={{ fontSize: "11px", color: "var(--color-ink-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>Reset progress</button>
        ) : (
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <button onClick={() => { resetAll(); setShowReset(false); setSelectedDays(new Map()); }} style={{ fontWeight: 600, color: "#fff", background: "#d94f4f", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Yes, reset</button>
            <button onClick={() => setShowReset(false)} style={{ color: "var(--color-ink-muted)", background: "none", border: "1px solid var(--color-border)", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BoxCard({ label, count, sub, fg, bg, dueCount, smiley }: {
  label: string; count: number; sub: string; fg: string; bg: string; dueCount?: number; smiley: boolean;
}) {
  return (
    <div style={{ minWidth: "90px", background: bg, borderRadius: "var(--radius-md)", padding: "10px", textAlign: "center", flexShrink: 0 }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: fg, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "9px", color: fg, opacity: 0.7 }}>{sub}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: fg, margin: "2px 0" }}>
        {smiley ? "😊" : count}
      </div>
      {dueCount !== undefined && dueCount > 0 && (
        <div style={{ fontSize: "9px", color: fg, opacity: 0.8 }}>{dueCount} due today</div>
      )}
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

function countDueInBox(box: LeitnerBox, wordStates: Record<string, any>): number {
  const intervals: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 8, 5: 14, 6: Infinity };
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const ws of Object.values(wordStates)) {
    if (ws.box !== box) continue;
    if (box === 1) { count++; continue; }
    if (!ws.lastReviewDate) { count++; continue; }
    const elapsed = Math.floor((new Date(today).getTime() - new Date(ws.lastReviewDate).getTime()) / 86400000);
    if (elapsed >= intervals[box]) count++;
  }
  return count;
}
