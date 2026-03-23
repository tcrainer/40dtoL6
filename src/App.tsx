import { useStore } from "@/store/useStore";
import { Dashboard } from "@/components/Dashboard";
import { Flashcard } from "@/components/Flashcard";
import { SessionComplete } from "@/components/SessionComplete";
import { VocabBrowser } from "@/components/VocabBrowser";
import { TopicDetail } from "@/components/TopicDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "motion/react";

export function App() {
  const view = useStore((s) => s.view);

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", paddingTop: "24px", paddingBottom: "40px" }}>
        <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <Dashboard />
            </motion.div>
          )}
          {view === "session" && (
            <motion.div key="session" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <Flashcard />
            </motion.div>
          )}
          {view === "session-complete" && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }}>
              <SessionComplete />
            </motion.div>
          )}
          {view === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <VocabBrowser />
            </motion.div>
          )}
          {view === "topic-detail" && (
            <motion.div key="topic" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}>
              <TopicDetail />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
