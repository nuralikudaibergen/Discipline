"use client";

import { useEffect, useState, useCallback } from "react";
import {
  loadState,
  saveState,
  addWord,
  addTask,
  toggleTask,
  removeTask,
  removeWord,
  updateTaskTitle,
  updateTaskTime,
  setTaskNotify,
  recordTestPass,
  recordProgress,
  todayKey,
} from "@/lib/storage";
import type { AppState } from "@/lib/types";

/**
 * Single source of truth for app state. Hydrates from LocalStorage on mount,
 * persists on every change. Designed so we can swap the body of these calls
 * for Supabase queries without touching the consumers.
 */
export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const addWordAction = useCallback(
    (en: string, ru: string) => setState((s) => (s ? addWord(s, en, ru) : s)),
    [],
  );
  const removeWordAction = useCallback(
    (id: string) => setState((s) => (s ? removeWord(s, id) : s)),
    [],
  );

  const addTaskAction = useCallback(
    (day: number, title: string, opts?: { time?: string; notify?: boolean }) =>
      setState((s) => (s ? addTask(s, day, title, opts) : s)),
    [],
  );
  const updateTaskTimeAction = useCallback(
    (id: string, time: string | null) =>
      setState((s) => (s ? updateTaskTime(s, id, time) : s)),
    [],
  );
  const setTaskNotifyAction = useCallback(
    (id: string, on: boolean) =>
      setState((s) => (s ? setTaskNotify(s, id, on) : s)),
    [],
  );
  const toggleTaskAction = useCallback(
    (id: string) => setState((s) => (s ? toggleTask(s, id) : s)),
    [],
  );
  const removeTaskAction = useCallback(
    (id: string) => setState((s) => (s ? removeTask(s, id) : s)),
    [],
  );
  const updateTaskTitleAction = useCallback(
    (id: string, title: string) =>
      setState((s) => (s ? updateTaskTitle(s, id, title) : s)),
    [],
  );

  const passTest = useCallback(
    (correct: number, total: number) =>
      setState((s) => {
        if (!s) return s;
        const next = recordTestPass(s, correct, total);
        return recordProgress(next);
      }),
    [],
  );

  const refreshProgress = useCallback(
    () =>
      setState((s) => {
        if (!s) return s;
        // Idempotent: if today's snapshot already matches the current
        // tasks/word count, skip the update so we don't re-render forever.
        const today = todayKey();
        const total = s.tasks.length;
        const done = s.tasks.filter((t) => t.done).length;
        const wordsLearned = s.words.length;
        const current = s.progress.find((p) => p.date === today);
        if (
          current &&
          current.tasksTotal === total &&
          current.tasksDone === done &&
          current.wordsLearned === wordsLearned
        ) {
          return s; // no change → no re-render loop
        }
        return recordProgress(s);
      }),
    [],
  );

  // Clear `lastTestDate` so the Gatekeeper runs again. Goes through the same
  // setState pipeline as every other mutation — no localStorage hack, no
  // window.location.reload().
  const resetGate = useCallback(
    () =>
      setState((s) => (s ? { ...s, lastTestDate: null } : s)),
    [],
  );

  return {
    state,
    hydrated,
    addWord: addWordAction,
    removeWord: removeWordAction,
    addTask: addTaskAction,
    toggleTask: toggleTaskAction,
    removeTask: removeTaskAction,
    updateTaskTitle: updateTaskTitleAction,
    updateTaskTime: updateTaskTimeAction,
    setTaskNotify: setTaskNotifyAction,
    passTest,
    refreshProgress,
    resetGate,
  };
}
