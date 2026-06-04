import { toDayIndex, type Task } from "./types";

/**
 * Browser-native notifications for task reminders.
 *
 * - Permission is requested lazily (first time the user toggles a bell).
 * - Each task gets its own `setTimeout`, keyed by `task.id`.
 * - `rescheduleAll` is the single entry point used by the React layer: it
 *   cancels everything in one go and re-schedules the current set.
 * - Notifications are scheduled for the *next* occurrence of the task's
 *   (day, time) tuple — i.e. once it fires, the caller should call
 *   `scheduleTask` again (or trigger a state change so `rescheduleAll`
 *   runs) to roll the timer forward by one week.
 */

type PermissionState = "unsupported" | "default" | "granted" | "denied";

const DAY_MS = 24 * 60 * 60 * 1000;

// taskId → timeoutId. We keep this on the module so HMR / re-renders
// don't pile up duplicate timers.
const scheduled = new Map<string, ReturnType<typeof setTimeout>>();

// Optional callback fired when a task's notification actually fires —
// the React layer can use it to roll the timer forward by a week.
type FiredHandler = (taskId: string) => void;
let onFired: FiredHandler | null = null;
export function setOnFired(handler: FiredHandler | null) {
  onFired = handler;
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): PermissionState {
  if (!isSupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

/**
 * Subscribe to permission changes. The browser's `Notification` API doesn't
 * fire a permission-change event, so we also re-read on `visibilitychange`
 * (the user just returned from a browser-settings tab) and on a 2s poll —
 * cheap, and only while a subscriber is mounted.
 */
type PermissionListener = (state: PermissionState) => void;
const permissionListeners = new Set<PermissionListener>();
let permissionPollId: ReturnType<typeof setInterval> | null = null;
let lastEmitted = getPermission();

function emitPermission() {
  const next = getPermission();
  if (next === lastEmitted) return;
  lastEmitted = next;
  for (const l of permissionListeners) l(next);
}

function startPolling() {
  if (permissionPollId !== null || typeof window === "undefined") return;
  permissionPollId = setInterval(emitPermission, 2000);
  document.addEventListener("visibilitychange", emitPermission);
}

function stopPolling() {
  if (permissionPollId !== null) {
    clearInterval(permissionPollId);
    permissionPollId = null;
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", emitPermission);
  }
}

export function subscribePermission(listener: PermissionListener): () => void {
  permissionListeners.add(listener);
  startPolling();
  if (permissionListeners.size === 0) {
    // edge case: if the only listener was removed before this branch runs
    stopPolling();
  }
  return () => {
    permissionListeners.delete(listener);
    if (permissionListeners.size === 0) stopPolling();
  };
}

export function getServerPermission(): PermissionState {
  // SSR fallback — the API isn't available, callers should treat as
  // "default" (requestable) so the UI shows the disabled state.
  return "default";
}

export async function requestPermission(): Promise<PermissionState> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const res = await Notification.requestPermission();
    return (res as PermissionState) ?? "default";
  } catch {
    return "denied";
  }
}

// JS: 0=Sun..6=Sat. App: 0=Mon..6=Sun. Convert.
function jsDayFromAppDay(appDay: number): number {
  return toDayIndex(appDay + 1);
}

/**
 * Next future Date matching (appDay, HH:mm) in the local timezone.
 * If today's slot hasn't passed yet, returns today's slot; otherwise
 * the same day next week.
 */
function nextOccurrenceOf(
  appDay: number,
  hhmm: string,
  now: Date = new Date(),
): Date {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    // Invalid — return a far-future date so the timeout is harmless.
    return new Date(now.getTime() + 365 * DAY_MS);
  }
  const targetJsDay = jsDayFromAppDay(appDay);
  const today = new Date(now);
  today.setHours(h, m, 0, 0);
  const todayJs = today.getDay();

  let diffDays = (targetJsDay - todayJs + 7) % 7;
  // If the target day is today but the time has already passed, push a week.
  if (diffDays === 0 && today.getTime() <= now.getTime()) diffDays = 7;

  const target = new Date(today);
  target.setDate(today.getDate() + diffDays);
  return target;
}

export interface ScheduleOptions {
  /** Pre-formatted weekday label, e.g. "Monday". Used in the notification body. */
  weekLabel: string;
}

export function scheduleTask(
  task: Task,
  opts: ScheduleOptions,
): ReturnType<typeof setTimeout> | null {
  // Always start by clearing any prior timer for this id.
  cancelTask(task.id);

  if (!task.notify || !task.time) return null;
  if (getPermission() !== "granted") return null;

  const target = nextOccurrenceOf(task.day, task.time);
  const delay = target.getTime() - Date.now();
  if (delay <= 0) return null; // safety — should not happen

  const id = setTimeout(() => {
    scheduled.delete(task.id);
    try {
      new Notification(`Nurali · ${opts.weekLabel}`, {
        body: `${task.time} — ${task.title}`,
        tag: task.id,
        silent: false,
      });
    } catch {
      // Notification API can throw in private mode / older browsers.
    }
    if (onFired) onFired(task.id);
  }, delay);
  scheduled.set(task.id, id);
  return id;
}

export function cancelTask(taskId: string): void {
  const id = scheduled.get(taskId);
  if (id !== undefined) {
    clearTimeout(id);
    scheduled.delete(taskId);
  }
}

export function rescheduleAll(
  tasks: Task[],
  weekLabel: (dayIndex: number) => string,
): void {
  // Cancel everything we know about.
  for (const id of Array.from(scheduled.keys())) cancelTask(id);
  // Then schedule the live set.
  for (const t of tasks) {
    scheduleTask(t, { weekLabel: weekLabel(t.day) });
  }
}

export function cancelAll(): void {
  for (const id of Array.from(scheduled.keys())) cancelTask(id);
}

export function sendTestNotification(): void {
  if (getPermission() !== "granted") return;
  try {
    new Notification("Nurali · test", {
      body: "Notifications are working — you'll get reminders for scheduled tasks.",
      tag: "nurali:test",
    });
  } catch {
    /* ignore */
  }
}
