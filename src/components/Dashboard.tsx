import { useStore } from "@/store/useStore";
import { TOPICS, BOX_LABELS, BOX_COLORS, LEITNER_BOXES, MAX_DAY } from "@/types";
import type { LeitnerBox } from "@/types";
import { getTopicWordCounts, getTopicDays, getWordsForTopicDay, getAllWords } from "@/data/vocabulary";
import { BookOpen, RotateCcw, ChevronDown, ChevronUp, Flame, Star, Calendar, X, Play } from "lucide-react";
import { useState, useMemo } from "react";

type TestPrompt = {
  label: string;
  allIds: string[];
  untestedIds: string[];
} | null;

export function Dashboard() {
  const currentDay = useStore((s) => s.currentDay);
  const setCurrentDay = useStore((s) => s.setCurrentDay);
  const startReviewSession = useStore((s) => s.startReviewSession);
  const startLearnSession = useStore((s) => s.startLearnSession);
  const startCustomSession = useStore((s) => s.startCustomSession);
  const setView = useStore((s) => s.setView);
  const setSelectedTopicId = useStore((s) => s.setSelectedTopicId);
  const setSelectedBox = useStore((s) => s.setSelectedBox);
  const setSelectedImportance = useStore((s) => s.setSelectedImportance);
  const getDueWordIds = useStore((s) => s.getDueWordIds);
  const getNewWordIdsToday = useStore((s) => s.getNewWordIdsToday);
  const getAllUntestedIds = useStore((s) => s.getAllUntestedIds);
  const getBoxCounts = useStore((s) => s.getBoxCounts);
  const getTopicProgress = useStore((s) => s.getTopicProgress);
  const isAllRevisedToday = useStore((s) => s.isAllRevisedToday);
  const isTopicDayTested = useStore((s) => s.isTopicDayTested);
  const isTopicDayPartial = useStore((s) => s.isTopicDayPartial);
  const resetAll = useStore((s) => s.resetAll);
  const wordStates = useStore((s) => s.wordStates);
  const stats = useStore((s) => s.stats);

  const [showReset, setShowReset] = useState(false);
  const [testPrompt, setTestPrompt] = useState<TestPrompt>(null);

  const dueCount = getDueWordIds().length;
  const newTodayCount = getNewWordIdsToday().length;
  const allUntestedCount = getAllUntestedIds().length;
  const boxCounts = getBoxCounts();
  const allRevised = isAllRevisedToday();
  const topicCounts = useMemo(() => getTopicWordCounts(), []);
  const allWords = useMemo(() => getAllWords(), []);

  const openTestPrompt = (label: string, wordIds: string[]) => {
    const untestedIds = wordIds.filter(id => !wordStates[id]);
    setTestPrompt({ label, allIds: wordIds, untestedIds });
  };

  const handleDayClick = (day: number) => {
    const dayWords = allWords.filter(w => w.day === day);
    if (dayWords.length > 0) openTestPrompt(`Day ${day}`, dayWords.map(w => w.id));
  };

  const handleTopicClick = (topicId: string) => {
    const topic = TOPICS.find(t => t.id === topicId);
    const topicWords = allWords.filter(w => w.topicId === topicId);
    if (topicWords.length > 0) openTestPrompt(topic?.name || topicId, topicWords.map(w => w.id));
  };

  const handleTopicDayClick = (topicId: string, day: number) => {
    const topic = TOPICS.find(t => t.id === topicId);
    const words = getWordsForTopicDay(topicId, day);
    if (words.length > 0) openTestPrompt(`${topic?.shortName || topicId} — Day ${day}`, words.map(w => w.id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Lower Sixth Exam Countdown</h1>
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "4px 0 0" }}>{MAX_DAY}-day German vocabulary revision</p>
        </div>
        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#d97a1a" }}><Flame size={16} /><span style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{stats.streak}</span></div>
            <div style={{ fontSize: "10px", color: "var(--color-ink-faint)" }}>streak</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#7c4dba" }}><Star size={16} /><span style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{stats.points}</span></div>
            <div style={{ fontSize: "10px", color: "var(--color-ink-faint)" }}>points</div>
          </div>
        </div>
      </div>

      {/* Day selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "12px 18px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Current day</div>
          <div style={{ fontSize: "26px", fontWeight: 600, lineHeight: 1.1 }}>{currentDay}<span style={{ fontSize: "14px", fontWeight: 400, color: "var(--color-ink-muted)", marginLeft: "4px" }}>/ {MAX_DAY}</span></div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <DayBtn onClick={() => setCurrentDay(currentDay - 1)} disabled={currentDay <= 1}><ChevronDown size={16} /></DayBtn>
          <DayBtn onClick={() => setCurrentDay(currentDay + 1)} disabled={currentDay >= MAX_DAY}><ChevronUp size={16} /></DayBtn>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={startLearnSession} disabled={newTodayCount === 0} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          padding: "16px 12px", border: "none", borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
          background: newTodayCount > 0 ? "var(--color-accent)" : "var(--color-surface-sunken)",
          color: newTodayCount > 0 ? "#fff" : "var(--color-ink-faint)", cursor: newTodayCount > 0 ? "pointer" : "not-allowed",
        }}>
          <Calendar size={18} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Test today's words ({newTodayCount})</span>
        </button>
        <button onClick={startReviewSession} disabled={dueCount === 0} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          padding: "16px 12px", border: dueCount > 0 ? "2px solid var(--color-accent)" : "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
          background: "var(--color-surface)", color: dueCount > 0 ? "var(--color-accent)" : "var(--color-ink-faint)",
          cursor: dueCount > 0 ? "pointer" : "not-allowed",
        }}>
          <RotateCcw size={18} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Revise due ({dueCount})</span>
        </button>
      </div>

      {/* Test prompt popup */}
      {testPrompt && (
        <div style={{
          background: "var(--color-surface)", border: "2px solid var(--color-accent)", borderRadius: "var(--radius-lg)",
          padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>{testPrompt.label}</div>
            <button onClick={() => setTestPrompt(null)} style={{ width: "28px", height: "28px", border: "1px solid var(--color-border)", borderRadius: "50%", background: "var(--color-surface)", cursor: "pointer", color: "var(--color-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
          </div>
          <div style={{ fontSize: "13px", color: "var(--color-ink-muted)" }}>
            {testPrompt.allIds.length} words total · {testPrompt.untestedIds.length} untested
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => { setTestPrompt(null); if (testPrompt.untestedIds.length > 0) startCustomSession(testPrompt.untestedIds); }}
              disabled={testPrompt.untestedIds.length === 0}
              style={{
                flex: 1, padding: "14px 12px", border: "none", borderRadius: "var(--radius-md)",
                background: testPrompt.untestedIds.length > 0 ? "var(--color-accent)" : "var(--color-surface-sunken)",
                color: testPrompt.untestedIds.length > 0 ? "#fff" : "var(--color-ink-faint)",
                cursor: testPrompt.untestedIds.length > 0 ? "pointer" : "not-allowed",
                fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
              <Play size={14} /> Test untested ({testPrompt.untestedIds.length})
            </button>
            <button
              onClick={() => { setTestPrompt(null); startCustomSession(testPrompt.allIds); }}
              style={{
                flex: 1, padding: "14px 12px", border: "2px solid var(--color-accent)",
                borderRadius: "var(--radius-md)", background: "var(--color-surface)",
                color: "var(--color-accent)", cursor: "pointer",
                fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
              <RotateCcw size={14} /> Test all ({testPrompt.allIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Leitner boxes */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Leitner boxes</h2>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <BoxCard label="Untested" count={allUntestedCount} sub="all words" fg="var(--color-ink-muted)" bg="var(--color-surface-sunken)" smiley={false} onClick={() => { setSelectedBox(0); setView("box-detail"); }} />
          {LEITNER_BOXES.map((box) => {
            const c = BOX_COLORS[box];
            const dueInBox = box < 6 ? countDueInBox(box, wordStates) : 0;
            const showSmiley = allRevised && boxCounts[box] > 0 && box < 6 && dueInBox === 0;
            return <BoxCard key={box} label={`Box ${box}`} count={showSmiley ? -1 : boxCounts[box]} sub={BOX_LABELS[box]} fg={c.fg} bg={c.bg} dueCount={dueInBox} smiley={showSmiley} onClick={() => { setSelectedBox(box); setView("box-detail"); }} />;
          })}
        </div>
      </div>

      {/* Importance breakdown — clickable */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress by importance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {([
            { stars: 4, label: "★★★★ Essential", color: "#d94f4f", bg: "#fce8e8" },
            { stars: 3, label: "★★★ Very Important", color: "#d97a1a", bg: "#fef0de" },
            { stars: 2, label: "★★ Important", color: "#2a6fb5", bg: "#e4f0fb" },
            { stars: 1, label: "★ Specialist", color: "#7c4dba", bg: "#f0eafb" },
          ] as const).map(({ stars, label, color, bg }) => {
            const allOfTier = allWords.filter(w => w.importance === stars);
            const learnt = allOfTier.filter(w => wordStates[w.id]?.box >= 5).length;
            const total = allOfTier.length;
            return (
              <button key={stars} onClick={() => { setSelectedImportance(stars); setView("box-detail"); }} style={{
                background: bg, borderRadius: "var(--radius-md)", padding: "10px 8px", textAlign: "center",
                border: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color, lineHeight: 1.3 }}>{label}</div>
                <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)", color, margin: "4px 0 2px" }}>{learnt}/{total}</div>
                <div style={{ fontSize: "9px", color, opacity: 0.7 }}>learnt</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day by day */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Day by day</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {Array.from({ length: MAX_DAY }, (_, i) => i + 1).map((day) => {
            const dayWords = allWords.filter(w => w.day === day);
            const totalInDay = dayWords.length;
            const testedInDay = dayWords.filter(w => !!wordStates[w.id]).length;
            const allTested = totalInDay > 0 && testedInDay === totalInDay;
            const partial = testedInDay > 0 && testedInDay < totalInDay;
            const isUnlocked = day <= currentDay;
            return (
              <button key={day} onClick={() => handleDayClick(day)} disabled={totalInDay === 0}
                style={{
                  width: "52px", height: "52px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: "1px", fontSize: "14px", fontWeight: allTested ? 700 : 600,
                  border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)",
                  cursor: totalInDay > 0 ? "pointer" : "default", fontFamily: "var(--font-mono)",
                  background: allTested ? "#fbbf24" : partial ? "#93c5fd" : !isUnlocked ? "var(--color-surface-sunken)" : "var(--color-surface)",
                  color: allTested ? "#78350f" : partial ? "#1e3a5f" : !isUnlocked ? "var(--color-ink-faint)" : "var(--color-ink)",
                  opacity: totalInDay === 0 ? 0.4 : 1,
                }}>
                <span style={{ fontSize: "15px", fontWeight: 700 }}>{day}</span>
                <span style={{ fontSize: "9px", fontWeight: 400, opacity: 0.7 }}>{totalInDay}w</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topics */}
      <div>
        <h2 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 10px", color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Topics</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {TOPICS.map((topic) => {
            const progress = getTopicProgress(topic.id);
            const totalForTopic = topicCounts[topic.id] || 0;
            const pct = totalForTopic > 0 ? Math.round((progress.mastered / totalForTopic) * 100) : 0;
            const days = getTopicDays(topic.id).filter((d) => d <= MAX_DAY);
            return (
              <div key={topic.id} style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: topic.color, flexShrink: 0 }} />
                  <button onClick={() => handleTopicClick(topic.id)} style={{ fontSize: "14px", fontWeight: 600, padding: 0, border: "none", background: "none", cursor: "pointer", color: "var(--color-ink)", fontFamily: "var(--font-sans)", textAlign: "left", flex: 1 }}>{topic.name}</button>
                  <span style={{ fontSize: "11px", color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{progress.mastered}/{totalForTopic}</span>
                </div>
                <div style={{ height: "6px", background: "var(--color-surface-sunken)", borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: topic.color, borderRadius: "3px", transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                  {days.map((day) => {
                    const allTested = isTopicDayTested(topic.id, day);
                    const partial = isTopicDayPartial(topic.id, day);
                    return (
                      <button key={day} onClick={() => handleTopicDayClick(topic.id, day)} style={{
                        width: "28px", height: "28px", fontSize: "10px", fontWeight: allTested ? 700 : 500,
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px", cursor: "pointer", fontFamily: "var(--font-mono)",
                        background: allTested ? "#fbbf24" : partial ? "#93c5fd" : "var(--color-surface)",
                        color: allTested ? "#78350f" : partial ? "#1e3a5f" : "var(--color-ink)",
                      }}>{day}</button>
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
        <button onClick={() => setView("browse")} style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, textDecoration: "underline", textUnderlineOffset: "2px" }}>Browse all words</button>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} style={{ fontSize: "11px", color: "var(--color-ink-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>Reset progress</button>
        ) : (
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <button onClick={() => { resetAll(); setShowReset(false); }} style={{ fontWeight: 600, color: "#fff", background: "#d94f4f", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Yes, reset</button>
            <button onClick={() => setShowReset(false)} style={{ color: "var(--color-ink-muted)", background: "none", border: "1px solid var(--color-border)", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BoxCard({ label, count, sub, fg, bg, dueCount, smiley, onClick }: {
  label: string; count: number; sub: string; fg: string; bg: string; dueCount?: number; smiley: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={{ minWidth: "90px", background: bg, borderRadius: "var(--radius-md)", padding: "10px", textAlign: "center", flexShrink: 0, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: fg, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "9px", color: fg, opacity: 0.7 }}>{sub}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: fg, margin: "2px 0" }}>{smiley ? "😊" : count}</div>
      {dueCount !== undefined && dueCount > 0 && <div style={{ fontSize: "9px", color: fg, opacity: 0.8 }}>{dueCount} due today</div>}
    </button>
  );
}

function DayBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, color: "var(--color-ink)" }}>{children}</button>
  );
}

function countDueInBox(box: LeitnerBox, wordStates: Record<string, any>): number {
  const intervals: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14, 6: Infinity };
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  let count = 0;
  for (const ws of Object.values(wordStates)) {
    if (ws.box !== box) continue;
    if (box === 1) { count++; continue; }
    if (!ws.lastReviewDate) { count++; continue; }
    const [ay,am,ad] = ws.lastReviewDate.split("-").map(Number);
    const [by,bm,bd] = today.split("-").map(Number);
    const elapsed = Math.floor((Date.UTC(by,bm-1,bd) - Date.UTC(ay,am-1,ad)) / 86400000);
    if (elapsed >= intervals[box]) count++;
  }
  return count;
}
