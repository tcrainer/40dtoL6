import { useStore } from "@/store/useStore";
import { getWordsByTopic } from "@/data/vocabulary";
import { TOPICS, BOX_COLORS, BOX_LABELS } from "@/types";
import type { LeitnerBox } from "@/types";
import { ArrowLeft } from "lucide-react";
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

  // Count by box
  const boxBreakdown = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const w of unlockedWords) {
      const ws = wordStates[w.id];
      if (!ws) counts[0]++;
      else counts[ws.box]++;
    }
    return counts;
  }, [unlockedWords, wordStates]);

  if (!topic) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>Topic not found.</p>
        <button onClick={() => setView("dashboard")} style={{ marginTop: "12px", padding: "10px 24px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "14px" }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <button onClick={() => setView("dashboard")} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--color-ink-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: "var(--font-sans)" }}>
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: topic.color }} />
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>{topic.name}</h1>
      </div>

      <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: 0 }}>
        {allTopicWords.length} total words · {unlockedWords.length} unlocked on day {currentDay}
      </p>

      {/* Box breakdown mini bar */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {boxBreakdown[0] > 0 && (
          <MiniPill label="Untested" count={boxBreakdown[0]} fg="var(--color-ink-muted)" bg="var(--color-surface-sunken)" />
        )}
        {([1, 2, 3, 4, 5, 6] as LeitnerBox[]).map((box) =>
          boxBreakdown[box] > 0 ? (
            <MiniPill key={box} label={`Box ${box}`} count={boxBreakdown[box]} fg={BOX_COLORS[box].fg} bg={BOX_COLORS[box].bg} />
          ) : null
        )}
      </div>

      {/* Word list */}
      <div style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {unlockedWords.map((word, i) => {
          const ws = wordStates[word.id];
          const box = ws ? ws.box : null;
          const boxColors = box ? BOX_COLORS[box as LeitnerBox] : null;

          return (
            <div key={word.id} style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px",
              borderBottom: i < unlockedWords.length - 1 ? "1px solid var(--color-border)" : "none",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {word.german}
              </span>
              <span style={{ fontSize: "12px", color: "var(--color-ink-muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                {word.english}
              </span>
              <span style={{ fontSize: "9px", fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-ink-faint)", flexShrink: 0, minWidth: "22px", textAlign: "center" }}>
                d{word.day}
              </span>
              {boxColors ? (
                <span style={{ fontSize: "9px", fontWeight: 600, padding: "2px 6px", borderRadius: "6px", background: boxColors.bg, color: boxColors.fg, flexShrink: 0, minWidth: "22px", textAlign: "center" }}>
                  B{box}
                </span>
              ) : (
                <span style={{ fontSize: "9px", fontWeight: 500, padding: "2px 6px", borderRadius: "6px", background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)", flexShrink: 0, minWidth: "32px", textAlign: "center" }}>
                  untested
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Locked words */}
      {lockedWords.length > 0 && (
        <div style={{ fontSize: "12px", color: "var(--color-ink-faint)", textAlign: "center", padding: "8px 0" }}>
          {lockedWords.length} more words unlock on later days
        </div>
      )}
    </div>
  );
}

function MiniPill({ label, count, fg, bg }: { label: string; count: number; fg: string; bg: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 500, padding: "3px 8px", borderRadius: "10px", background: bg, color: fg }}>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{count}</span>
      {label}
    </span>
  );
}
