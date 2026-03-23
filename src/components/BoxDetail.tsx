import { useStore } from "@/store/useStore";
import { getNextReviewDate } from "@/store/useStore";
import { getAllWords } from "@/data/vocabulary";
import { TOPICS, BOX_COLORS, BOX_LABELS } from "@/types";
import type { LeitnerBox } from "@/types";
import { X, RotateCcw } from "lucide-react";
import { useState, useMemo } from "react";

const IMP_META: Record<number, { label: string; color: string; bg: string }> = {
  4: { label: "★★★★ Essential", color: "#d94f4f", bg: "#fce8e8" },
  3: { label: "★★★ Very Important", color: "#d97a1a", bg: "#fef0de" },
  2: { label: "★★ Important", color: "#2a6fb5", bg: "#e4f0fb" },
  1: { label: "★ Specialist", color: "#7c4dba", bg: "#f0eafb" },
};

export function BoxDetail() {
  const selectedBox = useStore((s) => s.selectedBox);
  const selectedImportance = useStore((s) => s.selectedImportance);
  const setView = useStore((s) => s.setView);
  const setSelectedBox = useStore((s) => s.setSelectedBox);
  const setSelectedImportance = useStore((s) => s.setSelectedImportance);
  const wordStates = useStore((s) => s.wordStates);
  const startCustomSession = useStore((s) => s.startCustomSession);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isImportanceView = selectedImportance !== null;
  const isUntested = selectedBox === 0;

  const impMeta = isImportanceView ? IMP_META[selectedImportance!] : null;
  const boxLabel = isImportanceView ? (impMeta?.label || "") : isUntested ? "All Untested Words" : `Box ${selectedBox}`;
  const colors = isImportanceView
    ? { fg: impMeta?.color || "#333", bg: impMeta?.bg || "#f0f0f0" }
    : !isUntested && selectedBox ? BOX_COLORS[selectedBox as LeitnerBox] : { fg: "#6b6b6b", bg: "#f0f0f0" };

  const words = useMemo(() => {
    if (isImportanceView) {
      return getAllWords().filter(w => w.importance === selectedImportance);
    }
    return getAllWords().filter((w) => {
      const ws = wordStates[w.id];
      if (isUntested) return !ws; // ALL untested, not just today
      return ws && ws.box === selectedBox;
    });
  }, [wordStates, selectedBox, isUntested, isImportanceView, selectedImportance]);

  const toggleWord = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const selectAll = () => {
    if (selectedIds.size === words.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(words.map(w => w.id)));
  };
  const handleBack = () => { setSelectedBox(null); setSelectedImportance(null); setView("dashboard"); };

  if (selectedBox === null && selectedImportance === null) {
    return <div style={{ textAlign: "center", padding: "40px" }}><button onClick={handleBack} style={{ padding: "10px 24px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Back</button></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: colors.fg }}>{boxLabel}</h1>
          {!isUntested && !isImportanceView && selectedBox && <p style={{ fontSize: "12px", color: "var(--color-ink-muted)", margin: "2px 0 0" }}>{BOX_LABELS[selectedBox as LeitnerBox]}</p>}
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "4px 0 0" }}>{words.length} words</p>
        </div>
        <button onClick={handleBack} style={{ width: "32px", height: "32px", border: "1px solid var(--color-border)", borderRadius: "50%", background: "var(--color-surface)", cursor: "pointer", color: "var(--color-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <button onClick={selectAll} style={{ fontSize: "12px", fontWeight: 500, padding: "6px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          {selectedIds.size === words.length ? "Deselect all" : "Select all"}
        </button>
        {selectedIds.size > 0 && (
          <button onClick={() => startCustomSession([...selectedIds])} style={{ fontSize: "13px", fontWeight: 600, padding: "8px 16px", border: "none", borderRadius: "var(--radius-md)", background: "var(--color-accent)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: "6px" }}>
            <RotateCcw size={14} /> Test {selectedIds.size} words
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {words.map((word) => {
          const isSelected = selectedIds.has(word.id);
          const topic = TOPICS.find(t => t.id === word.topicId);
          const ws = wordStates[word.id];
          const boxColors = ws ? BOX_COLORS[ws.box as LeitnerBox] : null;
          const nextReview = ws ? getNextReviewDate(ws) : null;
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
          const isDueNow = ws && (ws.box === 1 || !ws.lastReviewDate || (nextReview && nextReview <= todayStr));

          return (
            <button key={word.id} onClick={() => toggleWord(word.id)} style={{
              display: "flex", alignItems: "flex-start", gap: "10px", textAlign: "left",
              padding: "10px 14px", border: isSelected ? `2px solid ${colors.fg}` : "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-md)", background: isSelected ? colors.bg : "var(--color-surface)",
              cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", boxSizing: "border-box",
            }}>
              <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "2px", border: isSelected ? `2px solid ${colors.fg}` : "2px solid var(--color-border)", background: isSelected ? colors.fg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px" }}>
                {isSelected && "✓"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{word.german}</div>
                <div style={{ fontSize: "12px", color: "var(--color-ink-muted)" }}>{word.english}</div>
                {ws && nextReview && !isDueNow && ws.box !== 6 && (
                  <div style={{ fontSize: "10px", color: "var(--color-ink-faint)", marginTop: "2px" }}>Due: {nextReview}</div>
                )}
                {isDueNow && ws && ws.box !== 6 && (
                  <div style={{ fontSize: "10px", color: "#d94f4f", fontWeight: 600, marginTop: "2px" }}>Due now</div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                {topic && <span style={{ fontSize: "10px", color: topic.color, fontWeight: 500 }}>{topic.shortName}</span>}
                {boxColors ? (
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "8px", background: boxColors.bg, color: boxColors.fg }}>Box {ws!.box}</span>
                ) : (
                  <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)" }}>Untested</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={handleBack} style={{ padding: "12px", fontSize: "14px", fontWeight: 600, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", background: "var(--color-surface)", color: "var(--color-ink)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Back to dashboard</button>
    </div>
  );
}
