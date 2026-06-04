// Core data types used throughout the Nurali app.
// Kept dependency-free so they can be migrated to Supabase without schema rewrites.

export type ID = string;

export interface Word {
  id: ID;
  en: string;
  ru: string;
  createdAt: number; // ms epoch
  /** Whether the user added this word themselves (vs. it being part of the built-in seed pool). */
  userAdded?: boolean;
}

/**
 * Day-of-week with 0 = Monday. Modeled as a branded number so we don't need
 * `as 0|1|...|6` casts in storage / schedule code — call `toDayIndex(n)` to
 * convert from a plain number.
 */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday

/** Convert any number (incl. negatives / overflow) into a valid `DayIndex`. */
export function toDayIndex(n: number): DayIndex {
  return (((n % 7) + 7) % 7) as DayIndex;
}

export interface Task {
  id: ID;
  day: DayIndex;
  title: string;
  done: boolean;
  createdAt: number;
  /** Local time in "HH:mm" — when the task is scheduled. Optional. */
  time?: string;
  /** Whether the browser should fire a notification at `time` on `day`. */
  notify?: boolean;
}

export interface TestResult {
  date: string; // YYYY-MM-DD local
  passedAt: number;
  correct: number;
  total: number;
}

export interface ProgressSnapshot {
  date: string; // YYYY-MM-DD
  tasksTotal: number;
  tasksDone: number;
  wordsLearned: number;
}

export interface AppState {
  words: Word[];
  tasks: Task[];
  testHistory: TestResult[];
  progress: ProgressSnapshot[];
  streak: number;
  lastTestDate: string | null;
}
