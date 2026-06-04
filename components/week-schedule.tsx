"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Clock,
  Bell,
  BellOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedCheckbox } from "@/components/animated-checkbox";
import { cn } from "@/lib/utils";
import { requestPermission } from "@/lib/notifications";
import { toDayIndex, type DayIndex, type Task } from "@/lib/types";

const DAYS: { index: DayIndex; short: string; long: string }[] = [
  { index: 0, short: "Mon", long: "Monday" },
  { index: 1, short: "Tue", long: "Tuesday" },
  { index: 2, short: "Wed", long: "Wednesday" },
  { index: 3, short: "Thu", long: "Thursday" },
  { index: 4, short: "Fri", long: "Friday" },
  { index: 5, short: "Sat", long: "Saturday" },
  { index: 6, short: "Sun", long: "Sunday" },
];

function currentDayIndex(): DayIndex {
  // JS: 0 = Sun … 6 = Sat. App uses 0 = Mon … 6 = Sun.
  return toDayIndex(new Date().getDay() + 6);
}

interface WeekScheduleProps {
  tasks: Task[];
  onAdd: (
    day: number,
    title: string,
    opts?: { time?: string; notify?: boolean },
  ) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
  onUpdateTime: (id: string, time: string | null) => void;
  onSetNotify: (id: string, on: boolean) => void;
}

export function WeekSchedule({
  tasks,
  onAdd,
  onToggle,
  onRemove,
  onUpdate,
  onUpdateTime,
  onSetNotify,
}: WeekScheduleProps) {
  const today = currentDayIndex();
  const [activeDay, setActiveDay] = useState<DayIndex>(today);

  // Sort: tasks with a time come first (chronological), then by createdAt.
  const dayTasks = tasks
    .filter((t) => t.day === activeDay)
    .slice()
    .sort((a, b) => {
      const at = a.time ?? "99:99";
      const bt = b.time ?? "99:99";
      if (at !== bt) return at < bt ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  const total = dayTasks.length;
  const done = dayTasks.filter((t) => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const earliestTime = dayTasks
    .map((t) => t.time)
    .filter((x): x is string => Boolean(x))
    .sort()[0];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Weekly schedule
        </h1>
        <p className="text-sm text-muted-foreground">
          Plan each day, then check things off — your streak counts when the
          Gatekeeper passes, but progress lives here. Set a time and bell to
          get a browser notification on the day.
        </p>
      </header>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((d) => {
          const isActive = d.index === activeDay;
          const isToday = d.index === today;
          const count = tasks.filter((t) => t.day === d.index);
          const dayDone = count.filter((t) => t.done).length;
          return (
            <button
              key={d.index}
              type="button"
              onClick={() => setActiveDay(d.index)}
              className={cn(
                "group relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition-all",
                isActive
                  ? "border-foreground/30 bg-foreground/5"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <span className="font-medium">{d.short}</span>
              <span className="text-muted-foreground">
                {count.length === 0 ? "—" : `${dayDone}/${count.length}`}
              </span>
              {isToday && (
                <span className="absolute -top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active day panel */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground">
                {DAYS[activeDay].long}
              </div>
              <div className="mt-0.5 text-lg font-semibold">
                {done} of {total} done
                {total > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    · {pct}%
                    {earliestTime && <> · earliest {earliestTime}</>}
                  </span>
                )}
              </div>
            </div>
            <AddTaskInline
              onAdd={(title, opts) => onAdd(activeDay, title, opts)}
              placeholder={`Add a task for ${DAYS[activeDay].long}…`}
            />
          </div>

          <div className="h-px w-full bg-border" />

          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {dayTasks.length === 0 && (
                <motion.li
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Nothing planned for {DAYS[activeDay].long}. Add your first
                  task above.
                </motion.li>
              )}

              {dayTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => onToggle(t.id)}
                  onRemove={() => onRemove(t.id)}
                  onUpdate={(title) => onUpdate(t.id, title)}
                  onUpdateTime={(time) => onUpdateTime(t.id, time)}
                  onSetNotify={(on) => onSetNotify(t.id, on)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onRemove,
  onUpdate,
  onUpdateTime,
  onSetNotify,
}: {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (title: string) => void;
  onUpdateTime: (time: string | null) => void;
  onSetNotify: (on: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [editingTime, setEditingTime] = useState(false);
  const [timeDraft, setTimeDraft] = useState(task.time ?? "");
  const [permissionHint, setPermissionHint] = useState<string | null>(null);

  function commitTitle() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== task.title) onUpdate(draft.trim());
    else setDraft(task.title);
  }

  function commitTime() {
    setEditingTime(false);
    const next = timeDraft.trim();
    if (!next) {
      onUpdateTime(null);
      return;
    }
    if (next !== (task.time ?? "")) onUpdateTime(next);
  }

  async function toggleNotify() {
    if (!task.time) return; // guard — UI shouldn't allow this anyway
    if (task.notify) {
      onSetNotify(false);
      return;
    }
    const res = await requestPermission();
    if (res === "granted") {
      setPermissionHint(null);
      onSetNotify(true);
    } else if (res === "denied") {
      setPermissionHint("Notifications blocked — enable in browser settings.");
      onSetNotify(false);
    } else if (res === "unsupported") {
      setPermissionHint("This browser doesn't support notifications.");
    } else {
      setPermissionHint("Permission not granted.");
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3",
        task.done && "bg-secondary/40",
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <AnimatedCheckbox
          checked={task.done}
          onToggle={onToggle}
          ariaLabel={task.title}
        />

        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="h-8"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={cn(
              "flex-1 cursor-text select-none text-sm transition-all duration-300",
              task.done && "text-muted-foreground line-through opacity-60",
            )}
          >
            {task.title}
          </span>
        )}

        {/* Time badge / inline editor */}
        {editingTime ? (
          <Input
            type="time"
            autoFocus
            value={timeDraft}
            onChange={(e) => setTimeDraft(e.target.value)}
            onBlur={commitTime}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTime();
              if (e.key === "Escape") {
                setTimeDraft(task.time ?? "");
                setEditingTime(false);
              }
            }}
            className="h-8 w-28"
          />
        ) : task.time ? (
          <button
            type="button"
            onClick={() => {
              setTimeDraft(task.time ?? "");
              setEditingTime(true);
            }}
            title="Click to change the time"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs font-medium tabular-nums text-foreground/90 hover:bg-accent"
          >
            <Clock className="h-3 w-3 text-muted-foreground" />
            {task.time}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTimeDraft("");
              setEditingTime(true);
            }}
            title="Add a time"
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Clock className="h-3 w-3" />
            time
          </button>
        )}

        {/* Bell toggle — only meaningful when time is set */}
        {task.time && (
          <button
            type="button"
            onClick={toggleNotify}
            title={task.notify ? "Notification on — click to turn off" : "Notify me at this time"}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              task.notify
                ? "bg-violet-500/15 text-violet-400"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-label="Toggle notification"
          >
            {task.notify ? (
              <Bell className="h-3.5 w-3.5" />
            ) : (
              <BellOff className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {permissionHint && (
        <p className="text-xs text-rose-400 sm:basis-full">{permissionHint}</p>
      )}

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {editing ? (
          <button
            type="button"
            onClick={commitTitle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.li>
  );
}

function AddTaskInline({
  onAdd,
  placeholder,
}: {
  onAdd: (title: string, opts?: { time?: string; notify?: boolean }) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [time, setTime] = useState("");
  const [notify, setNotify] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function submit() {
    if (!value.trim()) return;
    const cleanTime = time.trim();
    let wantNotify = notify && cleanTime !== "";
    if (wantNotify) {
      const res = await requestPermission();
      if (res !== "granted") {
        wantNotify = false;
        if (res === "denied") {
          setHint("Notifications blocked — task saved without reminder.");
        } else if (res === "unsupported") {
          setHint("This browser doesn't support notifications.");
        }
      } else {
        setHint(null);
      }
    }
    onAdd(value, { time: cleanTime || undefined, notify: wantNotify });
    setValue("");
    setTime("");
    setNotify(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add task
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setValue("");
              setTime("");
              setNotify(false);
              setOpen(false);
            }
          }}
          className="h-9 w-56"
        />
        <Input
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            if (!e.target.value) setNotify(false);
          }}
          className="h-9 w-32"
          title="Optional time"
        />
        <Button
          size="icon"
          variant={notify ? "default" : "ghost"}
          onClick={() => {
            if (!time) return; // can't enable without time
            setNotify((v) => !v);
          }}
          disabled={!time}
          title={time ? "Toggle browser notification" : "Set a time first"}
          aria-label="Toggle notification"
        >
          {notify ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={submit} disabled={!value.trim()}>
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setValue("");
            setTime("");
            setNotify(false);
            setOpen(false);
          }}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {hint && (
        <p className="text-xs text-rose-400 sm:basis-full">{hint}</p>
      )}
    </div>
  );
}
