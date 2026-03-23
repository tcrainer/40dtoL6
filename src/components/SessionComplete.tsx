import { useStore } from "@/store/useStore";
import { getWordById } from "@/data/vocabulary";
import { BOX_COLORS } from "@/types";
import type { LeitnerBox } from "@/types";
import { Trophy, TrendingUp, TrendingDown, ArrowLeft, RotateCcw, Star } from "lucide-react";
import { motion } from "motion/react";

export function SessionComplete() {
  const setView = useStore((s) => s.setView);
  const getSessionSummary = useStore((s) => s.getSessionSummary);
  const startReviewSession = useStore((s) => s.startReviewSession);
  const getWordState = useStore((s) => s.getWordState);
  const getDueWordIds = useStore((s) => s.getDueWordIds);

  const summary = getSessionSummary();
  const dueCount = getDueWordIds().length;

  const totalAnswers = summary.correct + summary.close + summary.wrong;
  const accuracyPct =
    totalAnswers > 0 ? Math.round(((summary.correct + summary.close) / totalAnswers) * 100) : 0;

  const ringSize = 120;
  const strokeWidth = 10;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracyPct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        >
          <Trophy
            size={36}
            style={{
              color: "var(--color-accent)",
              margin: "0 auto 8px",
              display: "block",
            }}
          />
        </motion.div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 4px" }}>
          {summary.type === "learn" ? "Words learned!" : "Session complete!"}
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: 0 }}>
          {summary.totalCards} answers across{" "}
          {new Set(
            [...summary.promoted, ...summary.demoted].filter(Boolean)
          ).size || Math.ceil(summary.totalCards / 2)}{" "}
          words
        </p>
      </div>

      {/* Accuracy ring + stats */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
        }}
      >
        {/* Ring */}
        <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
          <svg
            width={ringSize}
            height={ringSize}
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--color-surface-sunken)"
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
              }}
            >
              {accuracyPct}%
            </span>
            <span style={{ fontSize: "10px", color: "var(--color-ink-muted)" }}>
              accuracy
            </span>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <StatPill
            label="Correct"
            count={summary.correct}
            color="var(--color-correct)"
            bg="var(--color-correct-bg)"
          />
          <StatPill
            label="Close"
            count={summary.close}
            color="var(--color-close)"
            bg="var(--color-close-bg)"
          />
          <StatPill
            label="Wrong"
            count={summary.wrong}
            color="var(--color-wrong)"
            bg="var(--color-wrong-bg)"
          />
        </div>
      </div>

      {/* Promoted words */}
      {summary.promoted.length > 0 && (
        <WordListSection
          title="Promoted"
          icon={<TrendingUp size={14} style={{ color: "var(--color-correct)" }} />}
          wordIds={summary.promoted}
          getWordState={getWordState}
          accentColor="var(--color-correct)"
        />
      )}

      {/* Newly mastered */}
      {summary.newlyMastered.length > 0 && (
        <WordListSection
          title="Mastered!"
          icon={<Star size={14} style={{ color: "var(--color-box6)" }} />}
          wordIds={summary.newlyMastered}
          getWordState={getWordState}
          accentColor="var(--color-box6)"
        />
      )}

      {/* Demoted words */}
      {summary.demoted.length > 0 && (
        <WordListSection
          title="Back to Box 1"
          icon={<TrendingDown size={14} style={{ color: "var(--color-wrong)" }} />}
          wordIds={summary.demoted}
          getWordState={getWordState}
          accentColor="var(--color-wrong)"
        />
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        <button
          onClick={() => setView("dashboard")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "14px",
            fontSize: "14px",
            fontWeight: 600,
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        {dueCount > 0 && (
          <button
            onClick={() => startReviewSession()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-accent)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            <RotateCcw size={16} />
            Review more ({dueCount})
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatPill({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: bg,
        borderRadius: "var(--radius-sm)",
        padding: "6px 12px",
        minWidth: "120px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "16px",
          fontWeight: 700,
          color,
          minWidth: "24px",
        }}
      >
        {count}
      </span>
      <span style={{ fontSize: "12px", color, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function WordListSection({
  title,
  icon,
  wordIds,
  getWordState,
  accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  wordIds: string[];
  getWordState: (id: string) => { box: number };
  accentColor: string;
}) {
  // Deduplicate
  const uniqueIds = [...new Set(wordIds)];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        {icon}
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title} ({uniqueIds.length})
        </span>
      </div>
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {uniqueIds.slice(0, 10).map((id, i) => {
          const word = getWordById(id);
          const ws = getWordState(id);
          const boxColors = BOX_COLORS[ws.box as LeitnerBox];
          if (!word) return null;

          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 14px",
                borderBottom:
                  i < Math.min(uniqueIds.length, 10) - 1
                    ? "1px solid var(--color-border)"
                    : "none",
              }}
            >
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
              {boxColors && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    background: boxColors.bg,
                    color: boxColors.fg,
                    flexShrink: 0,
                  }}
                >
                  B{ws.box}
                </span>
              )}
            </div>
          );
        })}
        {uniqueIds.length > 10 && (
          <div
            style={{
              padding: "6px 14px",
              fontSize: "11px",
              color: "var(--color-ink-faint)",
              textAlign: "center",
            }}
          >
            +{uniqueIds.length - 10} more
          </div>
        )}
      </div>
    </div>
  );
}
