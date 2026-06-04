"use client";

import { useMemo, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Flame, LayoutDashboard, ArrowLeft } from "lucide-react";
import { Gatekeeper } from "@/components/gatekeeper";
import { Dashboard } from "@/components/dashboard";
import { useAppState } from "@/lib/use-app-state";
import { todayKey } from "@/lib/storage";
import { pickDailyWords } from "@/lib/word-pool";
import {
  rescheduleAll,
  cancelAll,
  sendTestNotification,
  scheduleTask,
  setOnFired,
} from "@/lib/notifications";
import type { Task } from "@/lib/types";

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type View = "gatekeeper" | "dashboard";

export function App() {
  const {
    state,
    hydrated,
    passTest,
    addWord,
    removeWord,
    addTask,
    toggleTask,
    removeTask,
    updateTaskTitle,
    updateTaskTime,
    setTaskNotify,
    refreshProgress,
    resetGate,
  } = useAppState();

  // Today's date key, refreshed on every render — bumping it (e.g. by
  // crossing midnight or by `resetGate`) re-rolls the daily cards.
  const today = state ? todayKey() : "";
  // Manual "re-roll" trigger for the same day — incremented on every
  // `resetGate` so the user gets a fresh random sample on demand.
  const [rerollSeed, setRerollSeed] = useState(0);
  // The Gatekeeper is the default view on every page load. The user can
  // switch to the Dashboard from the topbar and back.
  const [view, setView] = useState<View>("gatekeeper");

  const userWordCount = state?.words.length ?? 0;

  const dailyWords = useMemo(() => {
    if (!state) return [];
    // User words only — no seed mix. The Gatekeeper renders an empty state
    // when the bank is empty.
    return pickDailyWords(state.words, 10);
    // We intentionally key on `state?.words` (not `state`) so unrelated
    // state mutations (e.g. toggling a task) don't reshuffle the cards the
    // user is currently studying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.words, today, rerollSeed]);

  // Wrap `resetGate` so a click on "Re-test gate" both clears the daily
  // gate and asks the daily-word memo to pick a new random sample.
  const resetGateAndReroll = useCallback(() => {
    setRerollSeed((n) => n + 1);
    resetGate();
    setView("gatekeeper");
  }, [resetGate]);

  // Re-record progress whenever tasks or word count change — keeps the
  // chart in sync without needing a separate "save" action. We no longer
  // gate this on `hasPassedToday` since the Gatekeeper is always visible.
  useEffect(() => {
    if (state) refreshProgress();
  }, [state, refreshProgress]);

  // Re-schedule all task notifications whenever the task list changes.
  useEffect(() => {
    if (!state) return;
    rescheduleAll(state.tasks, (d) => DAY_LABELS[d] ?? "Today");
    return () => {
      // Per-edit cleanup happens inside `rescheduleAll` itself.
    };
  }, [state]);

  // When a notification fires, roll the timer forward by one week.
  const rollForward = useCallback(
    (taskId: string) => {
      if (!state) return;
      const t = state.tasks.find((x) => x.id === taskId) as Task | undefined;
      if (!t || !t.notify || !t.time) return;
      scheduleTask(t, { weekLabel: DAY_LABELS[t.day] ?? "Today" });
    },
    [state],
  );

  useEffect(() => {
    setOnFired(rollForward);
    return () => setOnFired(null);
  }, [rollForward]);

  useEffect(() => {
    return () => cancelAll();
  }, []);

  if (!hydrated || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Loading Nurali…
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full">
      <TopBar
        view={view}
        streak={state.streak}
        wordCount={userWordCount}
        onSwitchView={setView}
      />

      <AnimatePresence mode="wait">
        {view === "gatekeeper" ? (
          <motion.div
            key={`gatekeeper-${today}-${rerollSeed}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-12"
          >
            <Gatekeeper
              words={dailyWords}
              onPass={passTest}
              onJumpToWords={() => setView("dashboard")}
              onOpenDashboard={() => setView("dashboard")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <Dashboard
              state={state}
              onAddWord={addWord}
              onRemoveWord={removeWord}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onRemoveTask={removeTask}
              onUpdateTask={updateTaskTitle}
              onUpdateTaskTime={updateTaskTime}
              onSetTaskNotify={setTaskNotify}
              onResetGate={resetGateAndReroll}
              onTestNotification={sendTestNotification}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function TopBar({
  view,
  streak,
  wordCount,
  onSwitchView,
}: {
  view: View;
  streak: number;
  wordCount: number;
  onSwitchView: (v: View) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-sky-500/30 ring-1 ring-border">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Nurali</div>
            <div className="-mt-0.5 text-[11px] text-muted-foreground">
              {wordCount} {wordCount === 1 ? "word" : "words"} in your bank
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-medium">{streak}</span>
            <span className="text-muted-foreground">streak</span>
          </div>
          {view === "gatekeeper" ? (
            <button
              type="button"
              onClick={() => onSwitchView("dashboard")}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSwitchView("gatekeeper")}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Today&apos;s test
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
