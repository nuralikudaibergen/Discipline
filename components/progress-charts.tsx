"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  BarChart3,
  CalendarDays,
  Flame,
  Trophy,
  ThumbsDown,
} from "lucide-react";
import type { ProgressSnapshot, Task, Word } from "@/lib/types";

interface ProgressChartsProps {
  tasks: Task[];
  words: Word[];
  progress: ProgressSnapshot[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayDatum {
  date: string; // YYYY-MM-DD
  day: string; // Mon..Sun
  dayNum: number; // 1..31
  completion: number; // 0..100
  done: number;
  total: number;
  words: number;
}

interface MonthSection {
  key: string; // YYYY-MM
  title: string; // "June 2026"
  days: DayDatum[];
  totalDone: number;
  totalTasks: number;
  overallPct: number;
  bestDay: DayDatum | null;
  worstDay: DayDatum | null;
  testDays: number; // number of days with a recorded snapshot
  currentStreak: number; // longest run of consecutive days with at least 1 done task
}

/** Parse a "YYYY-MM-DD" local date key into a `Date` at local midnight. */
function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function appDayIndex(d: Date): number {
  // JS: 0 = Sun … 6 = Sat. App uses 0 = Mon … 6 = Sun.
  return ((d.getDay() + 6) % 7);
}

/**
 * Group `progress` snapshots by month (YYYY-MM) and build a dense day list
 * for each month — including days without data, so charts and the heatmap
 * show the calendar's real shape. Days with no snapshot are zeroed out.
 */
function groupByMonth(snapshots: ProgressSnapshot[]): MonthSection[] {
  if (snapshots.length === 0) return [];

  // Index snapshots by date for O(1) lookup.
  const byDate = new Map<string, ProgressSnapshot>();
  for (const s of snapshots) byDate.set(s.date, s);

  // Find the earliest and latest month present in the data.
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const first = parseKey(sorted[0].date);
  const last = parseKey(sorted[sorted.length - 1].date);

  // Walk month by month from `first` to `last`.
  const sections: MonthSection[] = [];
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  // Hard cap to avoid runaway if the stored data is corrupt.
  const HARD_CAP = 60;
  let safety = 0;
  while (cursor <= last && safety < HARD_CAP) {
    safety++;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: DayDatum[] = [];
    let totalDone = 0;
    let totalTasks = 0;
    let bestDay: DayDatum | null = null;
    let worstDay: DayDatum | null = null;
    let testDays = 0;
    let currentStreak = 0;
    let runStreak = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const k = dayKey(d);
      const snap = byDate.get(k);
      const jsDay = d.getDay();
      const wd = WEEKDAYS[appDayIndex(d)];
      if (snap) {
        const total = snap.tasksTotal;
        const done = snap.tasksDone;
        const completion = total === 0 ? 0 : Math.round((done / total) * 100);
        const datum: DayDatum = {
          date: k,
          day: wd,
          dayNum: day,
          completion,
          done,
          total,
          words: snap.wordsLearned,
        };
        days.push(datum);
        totalDone += done;
        totalTasks += total;
        testDays++;
        if (bestDay === null || completion > bestDay.completion) bestDay = datum;
        if (worstDay === null || completion < worstDay.completion) worstDay = datum;
        if (done > 0) {
          runStreak++;
          if (runStreak > currentStreak) currentStreak = runStreak;
        } else {
          runStreak = 0;
        }
      } else {
        days.push({
          date: k,
          day: wd,
          dayNum: day,
          completion: 0,
          done: 0,
          total: 0,
          words: 0,
        });
        runStreak = 0;
      }
      // Stop adding after the day that contains jsDay = Saturday (6) — no,
      // we want the full month. Keep building. (Intentionally no jsDay filter.)
      void jsDay;
    }

    const overallPct =
      totalTasks === 0 ? 0 : Math.round((totalDone / totalTasks) * 100);
    sections.push({
      key: monthKey,
      title: `${MONTH_NAMES[month]} ${year}`,
      days,
      totalDone,
      totalTasks,
      overallPct,
      bestDay,
      worstDay,
      testDays,
      currentStreak,
    });

    // Next month.
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Newest month first.
  return sections.reverse();
}

/**
 * Heatmap color: from `hsl(var(--secondary))` to emerald-500 by completion %.
 * Returns a CSS color string usable in `style={{ background }}`.
 */
function heatColor(pct: number): string {
  if (pct <= 0) return "hsl(var(--secondary))";
  if (pct >= 100) return "rgb(16 185 129)"; // emerald-500
  // Interpolate lightness from 22% (secondary) → 60% (emerald-500 family).
  const lightness = 22 + (60 - 22) * (pct / 100);
  const alpha = 0.35 + 0.55 * (pct / 100);
  return `hsl(160 84% ${lightness}% / ${alpha})`;
}

export function ProgressCharts({ tasks, words, progress }: ProgressChartsProps) {
  // The two charts are also driven by live state for the *current* month
  // (so the user sees today's bar even if the daily snapshot hasn't been
  // recorded yet). We merge it into the progress list before grouping.
  const enriched = useMemo<ProgressSnapshot[]>(() => {
    const today = new Date();
    const todayK = dayKey(today);
    const hasToday = progress.some((p) => p.date === todayK);
    if (hasToday) return progress;
    return [
      ...progress,
      {
        date: todayK,
        tasksTotal: tasks.length,
        tasksDone: tasks.filter((t) => t.done).length,
        wordsLearned: words.length,
      },
    ];
  }, [progress, tasks, words]);

  const months = useMemo(() => groupByMonth(enriched), [enriched]);

  // Global rollup for the top-of-page headline.
  const totalSnapshots = enriched.length;
  const totalDoneAll = enriched.reduce((s, p) => s + p.tasksDone, 0);
  const totalTasksAll = enriched.reduce((s, p) => s + p.tasksTotal, 0);
  const overallPctAll =
    totalTasksAll === 0 ? 0 : Math.round((totalDoneAll / totalTasksAll) * 100);

  if (months.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Progress
          </h1>
          <p className="text-sm text-muted-foreground">
            How your months are shaping up.
          </p>
        </header>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No progress yet — add a few tasks and check some off to start
            tracking. A snapshot is recorded every day you make a change.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Progress
        </h1>
        <p className="text-sm text-muted-foreground">
          One section per month — scroll down for history.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Days tracked" value={`${totalSnapshots}`} />
        <Stat label="Tasks done" value={`${totalDoneAll}`} />
        <Stat label="Overall completion" value={`${overallPctAll}%`} />
        <Stat label="Words in bank" value={`${words.length}`} />
      </div>

      {months.map((m) => (
        <MonthSection_ key={m.key} section={m} />
      ))}
    </div>
  );
}

function MonthSection_({ section }: { section: MonthSection }) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <CalendarDays className="h-4 w-4 text-violet-400" />
          {section.title}
        </h2>
        <div className="text-xs text-muted-foreground">
          {section.testDays} day{section.testDays === 1 ? "" : "s"} tracked
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Tasks done"
          value={`${section.totalDone} / ${section.totalTasks}`}
        />
        <Stat label="Completion" value={`${section.overallPct}%`} />
        <Stat
          label="Longest streak"
          value={`${section.currentStreak} d`}
          icon={<Flame className="h-3 w-3 text-orange-400" />}
        />
        <Stat
          label="Words in bank"
          value={`${section.days.at(-1)?.words ?? 0}`}
        />
      </div>

      {section.bestDay && section.worstDay && section.bestDay.date !== section.worstDay.date && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BestWorst
            tone="good"
            icon={<Trophy className="h-3.5 w-3.5 text-emerald-500" />}
            label="Best day"
            day={section.bestDay}
          />
          <BestWorst
            tone="bad"
            icon={<ThumbsDown className="h-3.5 w-3.5 text-rose-400" />}
            label="Worst day"
            day={section.worstDay}
          />
        </div>
      )}

      {/* Heatmap */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            Calendar heatmap
          </div>
          <Heatmap days={section.days} />
          <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
            <span>Less</span>
            {[0, 25, 50, 75, 100].map((p) => (
              <span
                key={p}
                className="inline-block h-3 w-3 rounded-sm border border-border"
                style={{ background: heatColor(p) }}
                aria-label={`${p}%`}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily completion bars */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            Daily completion
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={section.days}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="dayNum"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval={2}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Day ${v}`}
                  formatter={(v: number) => [`${v}%`, "Completion"]}
                />
                <Bar
                  dataKey="completion"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                >
                  {section.days.map((d) => (
                    <Cell
                      key={d.date}
                      fill={
                        d.total === 0
                          ? "hsl(var(--secondary))"
                          : d.completion >= 100
                            ? "rgb(16 185 129)"
                            : "hsl(var(--primary))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Word bank growth over the month */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            Word bank growth
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={section.days}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="dayNum"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval={2}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Day ${v}`}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="words"
                  name="Words saved"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function BestWorst({
  tone,
  icon,
  label,
  day,
}: {
  tone: "good" | "bad";
  icon: React.ReactNode;
  label: string;
  day: DayDatum;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div
          className={
            tone === "good"
              ? "text-[10px] uppercase tracking-widest text-emerald-500"
              : "text-[10px] uppercase tracking-widest text-rose-400"
          }
        >
          <span className="inline-flex items-center gap-1">
            {icon}
            {label}
          </span>
        </div>
        <div className="mt-1 text-sm font-medium">
          {parseKey(day.date).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {day.done} of {day.total} done · {day.completion}%
        </div>
      </CardContent>
    </Card>
  );
}

function Heatmap({ days }: { days: DayDatum[] }) {
  // 7 columns (Mon..Sun) × ceil(days/7) rows.
  // We pad the first row so the first day of the month lands on its weekday.
  const firstWeekday = appDayIndex(parseKey(days[0].date));
  const cells: ({ date: string; pct: number; dayNum: number } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (const d of days) cells.push({ date: d.date, pct: d.completion, dayNum: d.dayNum });
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center">
            {w[0]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) =>
          c ? (
            <div
              key={c.date}
              className="aspect-square rounded-sm border border-border"
              style={{ background: heatColor(c.pct) }}
              title={`${c.date} · ${c.pct}%`}
              aria-label={`${c.date}: ${c.pct}%`}
            />
          ) : (
            <div key={`pad-${i}`} className="aspect-square" />
          ),
        )}
      </div>
    </div>
  );
}
