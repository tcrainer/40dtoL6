import { useStore } from "@/store/useStore";
import { getAllWords } from "@/data/vocabulary";
import { TOPICS, BOX_COLORS, LEITNER_BOXES, BOX_LABELS } from "@/types";
import type { LeitnerBox } from "@/types";
import { ArrowLeft, Search, X, Filter } from "lucide-react";
import { useState, useMemo } from "react";

export function VocabBrowser() {
  const setView = useStore((s) => s.setView);
  const wordStates = useStore((s) => s.wordStates);
  const currentDay = useStore((s) => s.currentDay);

  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | "all">("all");
  const [boxFilter, setBoxFilter] = useState<LeitnerBox | "all" | "new">("all");
  const [showFilters, setShowFilters] = useState(false);

  const allWords = useMemo(() => getAllWords(), []);

  const filtered = useMemo(() => {
    let words = allWords.filter((w) => w.day <= currentDay);

    if (topicFilter !== "all") {
      words = words.filter((w) => w.topicId === topicFilter);
    }

    if (boxFilter !== "all") {
      if (boxFilter === "new") {
        words = words.filter((w) => !wordStates[w.id]);
      } else {
        words = words.filter((w) => {
          const ws = wordStates[w.id];
          return ws && ws.box === boxFilter;
        });
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      words = words.filter(
        (w) =>
          w.german.toLowerCase().includes(q) ||
          w.english.toLowerCase().includes(q)
      );
    }

    return words;
  }, [allWords, currentDay, topicFilter, boxFilter, search, wordStates]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
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
          Dashboard
        </button>
        <span
          style={{
            fontSize: "13px",
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {filtered.length} words
        </span>
      </div>

      <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
        Vocabulary browser
      </h1>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-ink-faint)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search German or English..."
          style={{
            width: "100%",
            paddingLeft: "36px",
            paddingRight: search ? "36px" : "14px",
            boxSizing: "border-box",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-faint)",
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          fontWeight: 500,
          color: showFilters ? "var(--color-accent)" : "var(--color-ink-muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          fontFamily: "var(--font-sans)",
        }}
      >
        <Filter size={14} />
        Filters
        {(topicFilter !== "all" || boxFilter !== "all") && (
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--color-accent)",
            }}
          />
        )}
      </button>

      {/* Filters panel */}
      {showFilters && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
          }}
        >
          {/* Topic filter */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--color-ink-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              Topic
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              <FilterChip
                label="All"
                active={topicFilter === "all"}
                onClick={() => setTopicFilter("all")}
              />
              {TOPICS.map((t) => (
                <FilterChip
                  key={t.id}
                  label={t.shortName}
                  active={topicFilter === t.id}
                  onClick={() => setTopicFilter(t.id)}
                  dotColor={t.color}
                />
              ))}
            </div>
          </div>

          {/* Box filter */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--color-ink-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              Box
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              <FilterChip
                label="All"
                active={boxFilter === "all"}
                onClick={() => setBoxFilter("all")}
              />
              <FilterChip
                label="New"
                active={boxFilter === "new"}
                onClick={() => setBoxFilter("new")}
              />
              {LEITNER_BOXES.map((box) => (
                <FilterChip
                  key={box}
                  label={`Box ${box}`}
                  active={boxFilter === box}
                  onClick={() => setBoxFilter(box)}
                  dotColor={BOX_COLORS[box].fg}
                />
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {(topicFilter !== "all" || boxFilter !== "all") && (
            <button
              onClick={() => {
                setTopicFilter("all");
                setBoxFilter("all");
              }}
              style={{
                fontSize: "12px",
                color: "var(--color-ink-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
                fontFamily: "var(--font-sans)",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                alignSelf: "flex-start",
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Word list */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--color-ink-faint)",
              fontSize: "13px",
            }}
          >
            No words match your filters.
          </div>
        ) : (
          filtered.slice(0, 100).map((word, i) => {
            const ws = wordStates[word.id];
            const box = ws ? ws.box : null;
            const boxColors = box ? BOX_COLORS[box as LeitnerBox] : null;
            const topic = TOPICS.find((t) => t.id === word.topicId);

            return (
              <div
                key={word.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 14px",
                  borderBottom:
                    i < Math.min(filtered.length, 100) - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                }}
              >
                {/* Topic dot */}
                {topic && (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: topic.color,
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* German */}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {word.german}
                </span>

                {/* English */}
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-ink-muted)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {word.english}
                </span>

                {/* Day badge */}
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-ink-faint)",
                    flexShrink: 0,
                    minWidth: "22px",
                    textAlign: "center",
                  }}
                >
                  d{word.day}
                </span>

                {/* Box badge */}
                {boxColors ? (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: boxColors.bg,
                      color: boxColors.fg,
                      flexShrink: 0,
                      minWidth: "22px",
                      textAlign: "center",
                    }}
                  >
                    B{box}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 500,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: "var(--color-surface-sunken)",
                      color: "var(--color-ink-faint)",
                      flexShrink: 0,
                      minWidth: "22px",
                      textAlign: "center",
                    }}
                  >
                    new
                  </span>
                )}
              </div>
            );
          })
        )}

        {filtered.length > 100 && (
          <div
            style={{
              padding: "10px 14px",
              fontSize: "12px",
              color: "var(--color-ink-faint)",
              textAlign: "center",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            Showing first 100 of {filtered.length} words. Use search or filters
            to narrow down.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filter chip component ───────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
  dotColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "12px",
        fontWeight: active ? 600 : 400,
        padding: "4px 10px",
        borderRadius: "14px",
        border: active
          ? "1.5px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        background: active ? "var(--color-accent-light)" : "transparent",
        color: active ? "var(--color-accent-text)" : "var(--color-ink-muted)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        transition: "all 0.15s",
      }}
    >
      {dotColor && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: dotColor,
          }}
        />
      )}
      {label}
    </button>
  );
}
