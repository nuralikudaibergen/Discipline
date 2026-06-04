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
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";
import { toDayIndex, type Task, type Word } from "@/lib/types";

interface ProgressChartsProps {
  tasks: Task[];
  words: Word[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayDatum {
  day: string;
  completion: number; // 0..100
  done: number;
  total: number;
  words: number;
}

/**
 * Build a stable 7-day series anchored on the current week (Mon..Sun).
 * If the user has no task history yet, the chart renders a soft 0 line —
 * no NaN, no error, no broken axis.
 */
function buildWeeklyData(tasks: Task[], words: Word[]): DayDatum[] {
  // Anchor "today" to the same Mon-indexed day as the rest of the app.
  const todayIndex = toDayIndex(new Date().getDay() + 6);

  return WEEKDAYS.map((label, i) => {
    const dayTasks = tasks.filter((t) => t.day === i);
    const total = dayTasks.length;
    const done = dayTasks.filter((t) => t.done).length;
    const completion = total === 0 ? 0 : Math.round((done / total) * 100);
    const isFuture = i > todayIndex;
    return {
      day: label,
      completion: isFuture ? 0 : completion,
      done: isFuture ? 0 : done,
      total,
      words: words.length, // bank size is global; line will be flat for now
    };
  });
}

export function ProgressCharts({ tasks, words }: ProgressChartsProps) {
  const data = useMemo(() => buildWeeklyData(tasks, words), [tasks, words]);
  const hasAnyData = tasks.length > 0;

  // Aggregate stats
  const totalThisWeek = data.reduce((s, d) => s + d.total, 0);
  const doneThisWeek = data.reduce((s, d) => s + d.done, 0);
  const overallPct =
    totalThisWeek === 0 ? 0 : Math.round((doneThisWeek / totalThisWeek) * 100);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Progress
        </h1>
        <p className="text-sm text-muted-foreground">
          How your week is shaping up.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Tasks this week" value={`${doneThisWeek} / ${totalThisWeek}`} />
        <Stat label="Completion" value={`${overallPct}%`} />
        <Stat label="Words mastered" value={`${words.length}`} />
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            Daily completion
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
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
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`${v}%`, "Completion"]}
                />
                <Bar
                  dataKey="completion"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!hasAnyData && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              No tasks tracked yet — add some in the schedule to populate this
              chart.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            Word bank growth
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="words"
                  name="Words saved"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#a78bfa" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
