"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarRange, BarChart3, BookText, Flame, Sparkles, RotateCcw, BellRing } from "lucide-react";
import { WeekSchedule } from "@/components/week-schedule";
import { ProgressCharts } from "@/components/progress-charts";
import { VocabularyPanel } from "@/components/vocabulary-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPermission, getServerPermission, subscribePermission } from "@/lib/notifications";
import type { AppState } from "@/lib/types";

type Tab = "schedule" | "progress" | "words";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "schedule", label: "Schedule", icon: <CalendarRange className="h-4 w-4" /> },
  { id: "progress", label: "Progress", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "words", label: "Words", icon: <BookText className="h-4 w-4" /> },
];

interface DashboardProps {
  state: AppState;
  onAddWord: (en: string, ru: string) => void;
  onRemoveWord: (id: string) => void;
  onAddTask: (day: number, title: string, opts?: { time?: string; notify?: boolean }) => void;
  onToggleTask: (id: string) => void;
  onRemoveTask: (id: string) => void;
  onUpdateTask: (id: string, title: string) => void;
  onUpdateTaskTime: (id: string, time: string | null) => void;
  onSetTaskNotify: (id: string, on: boolean) => void;
  onResetGate: () => void;
  onTestNotification: () => void;
}

export function Dashboard({
  state,
  onAddWord,
  onRemoveWord,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onUpdateTask,
  onUpdateTaskTime,
  onSetTaskNotify,
  onResetGate,
  onTestNotification,
}: DashboardProps) {
  const [tab, setTab] = useState<Tab>("schedule");
  // Re-read on every permission change so the button updates if the user
  // toggled a bell and granted it (or flipped it off in browser settings).
  const permission = useSyncExternalStore(
    subscribePermission,
    getPermission,
    getServerPermission,
  );
  const canNotify = permission === "granted";

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
        {/* Top bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-sky-500/30 ring-1 ring-border">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Nurali</div>
              <div className="-mt-0.5 text-xs text-muted-foreground">
                Plan. Learn. Repeat.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-medium">{state.streak}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onTestNotification}
              disabled={!canNotify}
              title={
                canNotify
                  ? "Send a test notification"
                  : "Enable notifications on a task to allow test alerts"
              }
            >
              <BellRing className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Test notification</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetGate}
              title="Re-run the morning Gatekeeper for demo / testing"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Re-test gate</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-xl border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm transition-colors",
                tab === t.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg bg-secondary"
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative inline-flex items-center gap-2">
                {t.icon}
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "schedule" && (
              <WeekSchedule
                tasks={state.tasks}
                onAdd={onAddTask}
                onToggle={onToggleTask}
                onRemove={onRemoveTask}
                onUpdate={onUpdateTask}
                onUpdateTime={onUpdateTaskTime}
                onSetNotify={onSetTaskNotify}
              />
            )}
            {tab === "progress" && (
              <ProgressCharts
                tasks={state.tasks}
                words={state.words}
                progress={state.progress}
              />
            )}
            {tab === "words" && (
              <VocabularyPanel
                words={state.words}
                onAdd={onAddWord}
                onRemove={onRemoveWord}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          State persists in LocalStorage · MVP — Supabase migration-ready
        </footer>
      </div>
    </div>
  );
}
