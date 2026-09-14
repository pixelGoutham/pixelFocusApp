import { useMemo } from "react";
import { Link } from "wouter";
import { format, isToday, parseISO, startOfWeek, addDays } from "date-fns";
import { useStore } from "@/lib/StoreContext";
import { Clock, CheckSquare, Fire, Target, CalendarBlank, Timer, TrendUp } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SUBJECT_COLORS: Record<string, string> = {};
const PALETTE = [
  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
];

export function getSubjectColor(subject: string): string {
  if (!SUBJECT_COLORS[subject]) {
    const keys = Object.keys(SUBJECT_COLORS);
    SUBJECT_COLORS[subject] = PALETTE[keys.length % PALETTE.length];
  }
  return SUBJECT_COLORS[subject];
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-white/[0.03] border border-white/[0.08] rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.15] transition-colors">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-4xl font-semibold tracking-[-0.02em] leading-none font-mono">{value}</p>
              {sub && <p className="text-xs text-muted-foreground/50 tracking-wide mt-0.5">{sub}</p>}
            </div>
            <div className="flex items-center justify-center h-10 w-10 rounded-lg">
              <Icon weight="fill" className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CircularProgress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(value / max, 1);
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} strokeWidth="8" stroke="hsl(var(--border))" fill="none" />
          <circle
            cx="70" cy="70" r={r}
            strokeWidth="8"
            stroke="hsl(var(--primary))"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-xl font-bold font-mono">{Math.round(pct * 100)}%</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tasks, sessions, settings, setTasks } = useStore();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayTasks = useMemo(() => tasks.filter(t => t.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime)), [tasks, todayStr]);
  const completedToday = todayTasks.filter(t => t.completed).length;
  const todayMinutes = useMemo(() => sessions.filter(s => s.date === todayStr).reduce((acc, s) => acc + s.durationMinutes, 0), [sessions, todayStr]);
  const focusScore = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const upcoming = useMemo(() => tasks.filter(t => !t.completed && t.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).slice(0, 5), [tasks, todayStr]);

  const studyHours = Math.floor(todayMinutes / 60);
  const studyMins = todayMinutes % 60;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const heatmapDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = tasks.filter(t => t.date === dayStr);
    return { day, dayStr, tasks: dayTasks };
  });

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{greeting}, {settings.userName}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")} — Stay focused. Your future is built daily.</p>
        </div>
        <Link href="/pomodoro">
          <Button data-testid="button-start-focus" size="sm" className="gap-2 bg-primary text-primary-foreground shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
            <Timer className="h-4 w-4 text-muted-foreground" />
            Start Focus Session
          </Button>
        </Link>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Study Time" value={`${studyHours}h ${studyMins}m`} sub="today" />
        <StatCard icon={CheckSquare} label="Tasks Done" value={`${completedToday} / ${todayTasks.length}`} sub="today" />
        <StatCard icon={TrendUp} label="Focus Score" value={`${focusScore}%`} sub="today" />
        <StatCard icon={Fire} label="Day Streak" value={`${settings.currentStreak}`} sub="days" />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card className="h-full bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Today's Schedule</span>
                <Link href="/calendar"><span className="text-xs text-primary cursor-pointer hover:underline">View Calendar</span></Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CalendarBlank className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p>No tasks today. Import a CSV or add tasks in the calendar.</p>
                </div>
              ) : todayTasks.map(task => (
                <div
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    task.completed ? "opacity-50 border-border/50" : "border-border hover:border-primary/20"
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", task.completed && "line-through text-muted-foreground")}>{task.task}</p>
                    <p className="text-xs text-muted-foreground">{task.startTime} – {task.endTime}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs border", getSubjectColor(task.subject))}>
                    {task.subject}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Daily Progress */}
        <div className="flex flex-col gap-4">
          <Card className="bg-card border-border flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Daily Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 pb-4">
              <CircularProgress value={todayMinutes} max={settings.dailyGoalMinutes} label="of daily goal" />
              <p className="text-xs text-muted-foreground text-center">
                {studyHours}h {studyMins}m of {Math.floor(settings.dailyGoalMinutes / 60)}h goal
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Heatmap + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Heatmap */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Week Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {heatmapDays.map(({ day, dayStr, tasks: dayTasks }) => {
                const isTodays = isToday(day);
                return (
                  <div key={dayStr} className="flex-1 flex flex-col gap-1">
                    <p className={cn("text-xs text-center font-medium mb-1", isTodays ? "text-primary" : "text-muted-foreground")}>
                      {format(day, "EEE")}
                    </p>
                    {Array.from({ length: 12 }, (_, h) => {
                      const hour = h + 7;
                      const hasTask = dayTasks.some(t => {
                        const start = parseInt(t.startTime.split(":")[0]);
                        const end = parseInt(t.endTime.split(":")[0]);
                        return hour >= start && hour < end;
                      });
                      return (
                        <div
                          key={h}
                          className={cn(
                            "h-4 rounded-sm transition-colors",
                            hasTask ? "bg-primary/60" : "bg-muted"
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end">
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted" /><span className="text-xs text-muted-foreground">Empty</span></div>
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-primary/60" /><span className="text-xs text-muted-foreground">Scheduled</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming tasks</p>
            ) : upcoming.map(task => (
              <div key={task.id} data-testid={`upcoming-task-${task.id}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/20 transition-colors">
                <div className={cn("h-2 w-2 rounded-full flex-shrink-0", task.priority === "High" ? "bg-rose-400" : task.priority === "Medium" ? "bg-amber-400" : "bg-emerald-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.task}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(task.date), "d MMM")} • {task.startTime}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs border", getSubjectColor(task.subject))}>{task.subject}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
