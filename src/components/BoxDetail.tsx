import { useStore } from "@/store/useStore";
import { getAllWords, getWordById } from "@/data/vocabulary";
import { TOPICS, BOX_COLORS, BOX_LABELS } from "@/types";
import type { LeitnerBox } from "@/types";
import { X, RotateCcw } from "lucide-react";
import { useState, useMemo } from "react";

export function BoxDetail() {
  const selectedBox = useStore((s) => s.selectedBox);
  const setView = useStore((s) => s.setView);
  const wordStates = useStore((s) => s.wordStates);
  const currentDay = useStore((s) => s.currentDay);
  const startCustomSession = useStore((s) => s.startCustomSession);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isUntested = selectedBox === 0;
  const boxLabel = isUntested ? "Untested" : `Box ${selectedBox}`;
  const colors = !isUntested && selectedBox ? BOX_COLORS[selectedBox as LeitnerBox] : { fg: "#6b6b6b", bg: "#f0f0f0" };

  const words = useMemo(() => {
    return getAllWords().filter((w) => {
      if (w.day > currentDay) return false;
      const ws = wordStates[w.id];
      if (isUntested) return !ws;
      return ws && ws.box === selectedBox;
    });
  }, [wordStates, currentDay, selectedBox, isUntested]);

  const toggleWord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === words.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(words.map((w) => w.id)));
  };

  const handleRevise = () => {
    if (selectedIds.size > 0) startCustomSession([...selectedIds]);
  };

  if (selectedBox === null) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <button onClick={() => setView("dashboard")} style={{ padding: "10px 24px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "14px" }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: colors.fg }}>{boxLabel}</h1>
          {!isUntested && selectedBox && <p style={{ fontSize: "12px", color: "var(--color-ink-muted)", margin: "2px 0 0" }}>{BOX_LABELS[selectedBox as LeitnerBox]}</p>}
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "4px 0 0" }}>{words.length} words</p>
        </div>
        <button onClick={() => setView("dashboard")} style={{
          width: "32px", height: "32px", border: "1px solid var(--color-border)", borderRadius: "50%",
          background: "var(--color-surface)", cursor: "pointer", color: "var(--color-ink)", display: "flex", alignItems: "center", justifyContent: "center",
        }}><X size={16} /></button>
      </div>

      {/* Select all + revise bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <button onClick={selectAll} style={{
          fontSize: "12px", fontWeight: 500, padding: "6px 12px", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)", background: "var(--color-surface)", cursor: "pointer", fontFamily: "var(--font-sans)",
        }}>
          {selectedIds.size === words.length ? "Deselect all" : "Select all"}
        </button>
        {selectedIds.size > 0 && (
          <button onClick={handleRevise} style={{
            fontSize: "13px", fontWeight: 600, padding: "8px 16px", border: "none",
            borderRadius: "var(--radius-md)", background: "var(--color-accent)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-sans)",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <RotateCcw size={14} /> Revise {selectedIds.size} words
          </button>
        )}
      </div>

      {/* Word list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {words.map((word) => {
          const isSelected = selectedIds.has(word.id);
          const topic = TOPICS.find((t) => t.id === word.topicId);

          return (
            <button key={word.id} onClick={() => toggleWord(word.id)} style={{
              display: "flex", alignItems: "flex-start", gap: "10px", textAlign: "left",
              padding: "10px 14px", border: isSelected ? `2px solid ${colors.fg}` : "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-md)", background: isSelected ? colors.bg : "var(--color-surface)",
              cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", boxSizing: "border-box",
            }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "2px",
                border: isSelected ? `2px solid ${colors.fg}` : "2px solid var(--color-border)",
                background: isSelected ? colors.fg : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px",
              }}>
                {isSelected && "✓"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{word.german}</div>
                <div style={{ fontSize: "12px", color: "var(--color-ink-muted)" }}>{word.english}</div>
              </div>
              {topic && (
                <span style={{ fontSize: "10px", color: topic.color, fontWeight: 500, flexShrink: 0, marginTop: "2px" }}>{topic.shortName}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Back button */}
      <button onClick={() => setView("dashboard")} style={{
        padding: "12px", fontSize: "14px", fontWeight: 600,
        border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)",
        background: "var(--color-surface)", color: "var(--color-ink)", cursor: "pointer", fontFamily: "var(--font-sans)",
      }}>Back to dashboard</button>
    </div>
  );
}
