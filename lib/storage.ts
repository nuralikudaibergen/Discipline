import type { AppState, ProgressSnapshot, Task, TestResult, Word } from "./types";
import { toDayIndex } from "./types";
import { SEED_WORDS } from "./word-pool";

// ---- Date helpers ---------------------------------------------------------
// All date logic uses LOCAL time so the "today" gate is consistent across
// timezones and DST shifts.

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(d: Date = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

// ---- Storage keys ---------------------------------------------------------
const STORAGE_KEY = "nurali:state:v1";

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Seed a handful of tasks across the week so the schedule and charts have
// real shape on first open. Picked to look like a balanced study/work week.
const SEED_TASK_TITLES: { day: number; title: string }[] = [
  { day: 0, title: "Morning run · 30 min" },
  { day: 0, title: "Read 20 pages of Atomic Habits" },
  { day: 1, title: "Deep work block · 90 min" },
  { day: 1, title: "Review yesterday's vocabulary" },
  { day: 2, title: "Push code · ship Nurali v1" },
  { day: 2, title: "Call with mom" },
  { day: 3, title: "Spanish lesson · 45 min" },
  { day: 3, title: "Grocery run" },
  { day: 4, title: "Long run · 8 km" },
  { day: 4, title: "Plan the weekend" },
  { day: 5, title: "Coffee with Alex" },
  { day: 5, title: "Clean the apartment" },
  { day: 6, title: "Family dinner" },
  { day: 6, title: "Reset for next week" },
];

function buildInitialState(): AppState {
  const now = Date.now();
  return {
    words: SEED_WORDS.map((w, i) => ({
      id: makeId(),
      en: w.en,
      ru: w.ru,
      createdAt: now - (SEED_WORDS.length - i) * 1000,
      userAdded: false,
    })),
    tasks: SEED_TASK_TITLES.map((t, i) => ({
      id: makeId(),
      day: toDayIndex(t.day),
      title: t.title,
      done: false,
      createdAt: now - (SEED_TASK_TITLES.length - i) * 1000,
    })),
    testHistory: [],
    progress: [],
    streak: 0,
    lastTestDate: null,
  };
}

// ---- Public API -----------------------------------------------------------

export function loadState(): AppState {
  if (typeof window === "undefined") return buildInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = buildInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as AppState;
    // Lightweight shape guard — fall back to seed if structure is broken.
    if (!parsed || !Array.isArray(parsed.words) || !Array.isArray(parsed.tasks)) {
      const fresh = buildInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    // Migration: any word without `userAdded` predates the tagging change.
    // We treat unknowns as "user-added" so the user keeps full credit for
    // anything they typed themselves; seed words are re-seeded below if the
    // bank is empty.
    for (const w of parsed.words) {
      if (w.userAdded === undefined) w.userAdded = true;
    }
    // Backfill: older stored states may have an empty task list. Don't
    // stomp on a real user's plan — only seed if they have none yet.
    if (parsed.tasks.length === 0) {
      const now = Date.now();
      parsed.tasks = SEED_TASK_TITLES.map((t, i) => ({
        id: makeId(),
        day: toDayIndex(t.day),
        title: t.title,
        done: false,
        createdAt: now - (SEED_TASK_TITLES.length - i) * 1000,
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return buildInitialState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or serialization issue — silently ignore in MVP.
  }
}

// ---- Word operations ------------------------------------------------------

export function addWord(state: AppState, en: string, ru: string): AppState {
  const cleaned = en.trim().toLowerCase();
  if (!cleaned) return state;
  // Avoid duplicates — case-insensitive.
  if (state.words.some((w) => w.en.toLowerCase() === cleaned)) return state;
  const word: Word = {
    id: makeId(),
    en: cleaned,
    ru: ru.trim() || "(translation pending)",
    createdAt: Date.now(),
    userAdded: true,
  };
  return { ...state, words: [word, ...state.words] };
}

export function removeWord(state: AppState, id: string): AppState {
  return { ...state, words: state.words.filter((w) => w.id !== id) };
}

// ---- Task operations ------------------------------------------------------

// Strict "HH:mm" — 24h, zero-padded. We do not allow 24:00 etc.
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function normalizeTime(t: string | undefined | null): string | undefined {
  if (!t) return undefined;
  const v = t.trim();
  return HHMM.test(v) ? v : undefined;
}

export interface AddTaskOptions {
  time?: string;
  notify?: boolean;
}

export function addTask(
  state: AppState,
  day: number,
  title: string,
  opts: AddTaskOptions = {},
): AppState {
  const t = title.trim();
  if (!t) return state;
  const time = normalizeTime(opts.time);
  const task: Task = {
    id: makeId(),
    day: toDayIndex(day),
    title: t,
    done: false,
    createdAt: Date.now(),
    time,
    notify: Boolean(time && opts.notify),
  };
  return { ...state, tasks: [task, ...state.tasks] };
}

export function toggleTask(state: AppState, id: string): AppState {
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  };
}

export function removeTask(state: AppState, id: string): AppState {
  return { ...state, tasks: state.tasks.filter((t) => t.id !== id) };
}

export function updateTaskTitle(
  state: AppState,
  id: string,
  title: string,
): AppState {
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, title } : t)),
  };
}

export function updateTaskTime(
  state: AppState,
  id: string,
  time: string | null,
): AppState {
  const next = normalizeTime(time ?? undefined);
  return {
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.id !== id) return t;
      // Clearing the time also disables the notification.
      if (!next) return { ...t, time: undefined, notify: false };
      return { ...t, time: next };
    }),
  };
}

export function setTaskNotify(
  state: AppState,
  id: string,
  on: boolean,
): AppState {
  return {
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.id !== id) return t;
      // Notifications only make sense when there's a time set.
      if (on && !t.time) return t;
      return { ...t, notify: on };
    }),
  };
}

// ---- Gatekeeper / streak --------------------------------------------------

export function hasPassedToday(state: AppState): boolean {
  return state.lastTestDate === todayKey();
}

/**
 * Records a successful test. Streak rules:
 *  - First ever pass → streak = 1
 *  - Last test was yesterday → streak + 1
 *  - Last test was today     → no change (idempotent)
 *  - Anything else (gap)    → streak resets to 1
 */
export function recordTestPass(
  state: AppState,
  correct: number,
  total: number,
): AppState {
  const today = todayKey();
  const yest = yesterdayKey();

  let nextStreak = state.streak;
  if (state.lastTestDate === today) {
    // idempotent — re-passing today shouldn't double the streak
    nextStreak = state.streak || 1;
  } else if (state.lastTestDate === yest) {
    nextStreak = state.streak + 1;
  } else {
    nextStreak = 1;
  }

  const result: TestResult = {
    date: today,
    passedAt: Date.now(),
    correct,
    total,
  };

  return {
    ...state,
    lastTestDate: today,
    streak: nextStreak,
    testHistory: [...state.testHistory.filter((r) => r.date !== today), result],
  };
}

// ---- Progress snapshots ---------------------------------------------------

export function recordProgress(state: AppState): AppState {
  const today = todayKey();
  const todayTasks = state.tasks; // snapshot is global — MVP simple
  const total = todayTasks.length;
  const done = todayTasks.filter((t) => t.done).length;
  const wordsLearned = state.words.length;

  const snap: ProgressSnapshot = {
    date: today,
    tasksTotal: total,
    tasksDone: done,
    wordsLearned,
  };

  const filtered = state.progress.filter((p) => p.date !== today);
  return { ...state, progress: [...filtered, snap] };
}
