import { useCallback, useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { format, isToday, parseISO, startOfWeek, addDays } from "date-fns";
import { useStore } from "@/lib/StoreContext";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";
import { Clock, CheckSquare, Fire, Target, CalendarBlank, Timer, TrendUp, Sparkle, Circle } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SPRING_CRITICALLY_DAMPED = { type: "spring" as const, bounce: 0, duration: 0.4 };
const SPRING_MOMENTUM = { type: "spring" as const, bounce: 0.2, duration: 0.35 };

const GLASS_SURFACE =
  "bg-white/[0.03] dark:bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]";


const PRIMARY = 'hsl(var(--primary))';
const MUTED_FG = 'hsl(var(--muted-foreground))';

function timeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function StatBento({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_CRITICALLY_DAMPED, delay }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          GLASS_SURFACE,
          "rounded-2xl hover:border-white/[0.12] transition-colors overflow-hidden"
        )}
      >
        <CardContent className="p-3.5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] truncate">
                {label}
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-xl font-semibold tracking-[-0.02em] leading-none font-mono tabular-nums text-foreground">
                  {value}
                </p>
                <span className="text-xs text-muted-foreground truncate">{sub}</span>
              </div>
            </div>

            <div
              className="flex items-center justify-center h-7 w-7 rounded-lg border border-white/[0.08] shrink-0"
              style={{ backgroundColor: 'hsl(var(--primary)/0.1)', color: PRIMARY}}
            >
              <Icon weight="fill" className="h-3.5 w-3.5" />
            </div>
          </div>

          {typeof progress === "number" && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.max(progress, 2), 100)}%` }}
                  transition={SPRING_CRITICALLY_DAMPED}
                  className="h-full rounded-full"
                  style={{ backgroundColor: PRIMARY }}
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(Math.min(progress, 100))}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CircularGoalRing({
  value,
  max,
  streak,
}: {
  value: number;
  max: number;
  streak: number;
}) {
  const safeMax = Math.max(max, 1);
  const pct = Math.min(value / safeMax, 1);
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={r}
          strokeWidth="6"
          stroke="hsl(var(--border))"
          fill="none"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          strokeWidth="6"
          stroke={PRIMARY}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)", filter: 'drop-shadow(0 0 4px hsl(var(--primary)/0.3))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-bold font-mono tabular-nums tracking-[-0.03em] leading-none">
          {Math.round(pct * 100)}%
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">
          Goal
        </span>
        {streak > 0 && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
            <Fire weight="fill" className="h-2 w-2" />
            {streak}d
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tasks, sessions, settings, setTasks } = useStore();
  const [now, setNow] = useState(() => new Date());
  const [scheduleTab, setScheduleTab] = useState<"all" | "remaining" | "completed">("all");
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [, setIsCaptureOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = format(now, "yyyy-MM-dd");
  const currentHour = now.getHours();
  const currentTotalMinutes = currentHour * 60 + now.getMinutes();

  const greeting =
    currentHour < 5
      ? "Late night grind"
      : currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  const toggleCapture = useCallback(() => setIsCaptureOpen((prev) => !prev), []);
  useKeyboardShortcut(
    ["ctrl", "k"],
    () => {
      toggleCapture();
    },
    { description: "Open Pixel Flow capture", id: "pixel-flow-capture" }
  );

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.date === todayStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [tasks, todayStr]
  );

  const completedToday = useMemo(
    () => todayTasks.filter((t) => t.completed).length,
    [todayTasks]
  );

  const todayMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.date === todayStr)
        .reduce((acc, s) => acc + s.durationMinutes, 0),
    [sessions, todayStr]
  );

  const focusScore = useMemo(() => {
    if (todayTasks.length === 0) return 0;
    const taskRatio = completedToday / todayTasks.length;
    const goalRatio = Math.min(todayMinutes / Math.max(settings.dailyGoalMinutes, 60), 1);
    return Math.round(taskRatio * 70 + goalRatio * 30);
  }, [todayTasks.length, completedToday, todayMinutes, settings.dailyGoalMinutes]);

  const activeOrNextTask = useMemo(() => {
    const uncompleted = todayTasks.filter((t) => !t.completed);
    if (uncompleted.length === 0) return null;

    const inProgress = uncompleted.find((t) => {
      const start = timeToMinutes(t.startTime);
      const end = timeToMinutes(t.endTime);
      return currentTotalMinutes >= start && currentTotalMinutes <= end;
    });
    if (inProgress) return { task: inProgress, status: "LIVE NOW" as const };

    const nextUp = uncompleted.find((t) => timeToMinutes(t.startTime) > currentTotalMinutes);
    if (nextUp) return { task: nextUp, status: "UP NEXT" as const };

    return { task: uncompleted[0], status: "PENDING" as const };
  }, [todayTasks, currentTotalMinutes]);

  const upcoming = useMemo(() => {
    const futureTasks = tasks
      .filter((t) => !t.completed && t.date > todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const remainingToday = tasks
      .filter((t) => !t.completed && t.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return [...futureTasks, ...remainingToday].slice(0, 6);
  }, [tasks, todayStr]);

  const filteredTodayTasks = useMemo(() => {
    if (scheduleTab === "remaining") return todayTasks.filter((t) => !t.completed);
    if (scheduleTab === "completed") return todayTasks.filter((t) => t.completed);
    return todayTasks;
  }, [todayTasks, scheduleTab]);

  const subjectBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; completed: number; minutes: number }> = {};
    tasks.forEach((t) => {
      const subj = t.subject || "General";
      if (!counts[subj]) counts[subj] = { total: 0, completed: 0, minutes: 0 };
      counts[subj].total += 1;
      if (t.completed) counts[subj].completed += 1;
      const dur = Math.max(timeToMinutes(t.endTime) - timeToMinutes(t.startTime), 30);
      counts[subj].minutes += dur;
    });

    const totalMinutesAll = Object.values(counts).reduce((acc, c) => acc + c.minutes, 0) || 1;

    return Object.entries(counts)
      .map(([subject, data]) => ({
        subject,
        ...data,
        sharePct: Math.round((data.minutes / totalMinutesAll) * 100),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [tasks, settings.subjects]);

  const studyHours = Math.floor(todayMinutes / 60);
  const studyMins = todayMinutes % 60;
  const goalHours = Math.floor(settings.dailyGoalMinutes / 60);
  const remainingGoalMins = Math.max(settings.dailyGoalMinutes - todayMinutes, 0);

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const heatmapDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayTasks = tasks.filter((t) => t.date === dayStr);
        return { day, dayStr, tasks: dayTasks };
      }),
    [weekStart, tasks]
  );

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const dayStartMins = 6 * 60;
  const daySpanMins = 17 * 60;
  const nowTimelinePct = Math.min(
    Math.max(((currentTotalMinutes - dayStartMins) / daySpanMins) * 100, 0),
    100
  );

  return (
    <div className="lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)] flex flex-col gap-3 lg:overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_CRITICALLY_DAMPED}
        className="flex items-center justify-between gap-4 shrink-0"
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em] leading-none truncate">
            {greeting}, {settings.userName}
          </h2>
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Ready
          </span>
          <p className="hidden xl:block text-muted-foreground text-xs truncate">
            {format(now, "EEEE, d MMMM yyyy")} — Stay focused. Your future is built daily.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            onClick={() => {
              setIsCaptureOpen(true);
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
              );
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_CRITICALLY_DAMPED}
            className={cn(
              GLASS_SURFACE,
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:border-white/[0.2] transition-colors cursor-pointer"
            )}
          >
            <Sparkle weight="fill" className="h-3.5 w-3.5 text-primary" />
            <span>Pixel Flow AI</span>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white/[0.06] border border-white/[0.1] rounded text-foreground/70">
              Ctrl+K
            </kbd>
          </motion.button>

          <Link href="/pomodoro">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
              <Button
                data-testid="button-start-focus"
                size="sm"
                className="gap-1.5 rounded-xl px-3.5 h-8 text-xs font-semibold cursor-pointer"
              >
                <Timer weight="fill" className="h-3.5 w-3.5 text-primary-foreground" />
                Start Focus Session
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_CRITICALLY_DAMPED}
          className="lg:col-span-8"
        >
          <Card
            className={cn(
              GLASS_SURFACE,
              "h-full rounded-2xl overflow-hidden flex flex-col justify-between"
            )}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full gap-3 relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border",
                        activeOrNextTask?.status === "LIVE NOW"
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-white/[0.06] text-muted-foreground border-white/[0.1]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          activeOrNextTask?.status === "LIVE NOW"
                            ? "bg-primary animate-ping"
                            : "bg-primary"
                        )}
                      />
                      {activeOrNextTask ? activeOrNextTask.status : "ALL CLEAR TODAY"}
                    </span>

                    {activeOrNextTask && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-white/[0.1] bg-white/[0.04] text-muted-foreground">
                        {activeOrNextTask.task.subject}
                      </span>
                    )}

                    {activeOrNextTask && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {activeOrNextTask.task.startTime} – {activeOrNextTask.task.endTime}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold tracking-[-0.02em] truncate">
                    {activeOrNextTask
                      ? activeOrNextTask.task.task
                      : todayTasks.length > 0
                      ? "Every scheduled block for today is complete!"
                      : "No study blocks locked in for today yet"}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeOrNextTask && (
                    <motion.div whileTap={{ scale: 0.95 }} transition={SPRING_MOMENTUM}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTask(activeOrNextTask.task.id)}
                        className="h-8 rounded-xl gap-1.5 text-xs cursor-pointer"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Done
                      </Button>
                    </motion.div>
                  )}
                  <Link href="/pomodoro">
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        className="h-8 rounded-xl gap-1.5 text-xs font-semibold px-3.5 cursor-pointer"
                      >
                        <Timer weight="fill" className="h-3.5 w-3.5" />
                        Lock In Timer
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <span>06:00</span>
                  <span className="text-foreground/80 font-semibold">
                    Day Horizon • {format(now, "HH:mm")}
                  </span>
                  <span>23:00</span>
                </div>

                <div className="relative h-4 w-full rounded-md bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                  {todayTasks.map((t) => {
                    const startM = timeToMinutes(t.startTime);
                    const endM = Math.max(timeToMinutes(t.endTime), startM + 30);
                    const leftPct = Math.min(
                      Math.max(((startM - dayStartMins) / daySpanMins) * 100, 0),
                      98
                    );
                    const widthPct = Math.min(
                      Math.max(((endM - startM) / daySpanMins) * 100, 2.5),
                      100 - leftPct
                    );
                    const isCompleted = t.completed;

                    return (
                      <div
                        key={t.id}
                        title={`${t.task} (${t.startTime}–${t.endTime})`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: isCompleted ? 'hsl(var(--border))':PRIMARY,
                        }}
                        className={cn(
                          "absolute top-0.5 bottom-0.5 rounded-xs transition-opacity",
                          isCompleted? "opacity-30" : "opacity-80 hover:opacity-100"
                        )}
                      />
                    );
                  })}

                  <div
                    style={{ left: `${nowTimelinePct}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.6)] z-20 pointer-events-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_CRITICALLY_DAMPED, delay: 0.04 }}
          className="lg:col-span-4"
        >
          <Card className={cn(GLASS_SURFACE, "h-full rounded-2xl")}>
            <CardContent className="p-4 flex items-center justify-between gap-3 h-full">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Target weight="fill" className="h-3.5 w-3.5 text-primary" />
                  <span>Daily Target</span>
                </div>
                <p className="text-xl font-bold font-mono tabular-nums tracking-tight">
                  {studyHours}h {studyMins}m
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / {goalHours}h
                  </span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {remainingGoalMins > 0
                    ? `${Math.floor(remainingGoalMins / 60)}h ${
                        remainingGoalMins % 60
                      }m left to target`
                    : "Daily target crushed!"}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Circle weight="fill" className="h-1.5 w-1.5 text-primary" />
                  <span>
                    {completedToday} of {todayTasks.length} blocks done
                  </span>
                </div>
              </div>

              <CircularGoalRing
                value={todayMinutes}
                max={settings.dailyGoalMinutes}
                streak={settings.currentStreak}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <StatBento
          icon={Clock}
          label="Study Time"
          value={`${studyHours}h ${studyMins}m`}
          sub="today"
          progress={(todayMinutes / Math.max(settings.dailyGoalMinutes, 1)) * 100}
          delay={0.03}
        />
        <StatBento
          icon={CheckSquare}
          label="Tasks Done"
          value={`${completedToday} / ${todayTasks.length}`}
          sub="blocks"
          progress={
            todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0
          }
          delay={0.06}
        />
        <StatBento
          icon={TrendUp}
          label="Focus Score"
          value={`${focusScore}%`}
          sub="index"
          progress={focusScore}
          delay={0.09}
        />
        <StatBento
          icon={Fire}
          label="Day Streak"
          value={`${settings.currentStreak}`}
          sub="days"
          progress={Math.min((settings.currentStreak / 30) * 100, 100)}
          delay={0.12}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr_0.95fr_0.95fr] gap-3 flex-1 min-h-0">
        <Card className={cn(GLASS_SURFACE, "rounded-2xl flex flex-col min-h-0 overflow-hidden")}>
          <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-semibold tracking-tight">
                Today's Schedule
              </CardTitle>
              <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
                {(["all", "remaining", "completed"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setScheduleTab(tab)}
                    className={cn(
                      "px-2 py-0.5 rounded-md capitalize transition-colors cursor-pointer",
                      scheduleTab === tab
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <Link href="/calendar">
              <span className="text-xs text-primary font-medium cursor-pointer hover:underline">
                Calendar →
              </span>
            </Link>
          </CardHeader>

          <CardContent className="p-3.5 pt-1 space-y-1.5 flex-1 overflow-y-auto min-h-0">
            {filteredTodayTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs py-4">
                <CalendarBlank className="h-6 w-6 mb-1.5 text-muted-foreground/30" />
                <p>
                  {todayTasks.length === 0
                    ? "No tasks today. Add tasks in Calendar."
                    : `No ${scheduleTab} tasks today.`}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredTodayTasks.map((task) => {
                  const startM = timeToMinutes(task.startTime);
                  const endM = timeToMinutes(task.endTime);
                  const isLive =
                    !task.completed &&
                    currentTotalMinutes >= startM &&
                    currentTotalMinutes <= endM;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={SPRING_CRITICALLY_DAMPED}
                      data-testid={`task-row-${task.id}`}
                      style={{ borderLeftColor: task.completed ? 'hsl(var(--border))' : PRIMARY }}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-xl border border-l-[3px] transition-all",
                        task.completed
                          ? "opacity-45 bg-white/[0.01] border-white/[0.05]"
                          : isLive
                          ? "bg-primary/5 border-primary/20"
                          : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04]"
                      )}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                        data-testid={`checkbox-task-${task.id}`}
                        className="cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs font-medium truncate",
                            task.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {task.task}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {task.startTime} – {task.endTime}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] shrink-0">
                          {task.subject}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        <Card className={cn(GLASS_SURFACE, "rounded-2xl flex flex-col min-h-0 overflow-hidden")}>
          <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
            <CardTitle className="text-xs font-semibold">Upcoming Tasks</CardTitle>
            <Link href="/tasks">
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                All Tasks →
              </span>
            </Link>
          </CardHeader>

          <CardContent className="p-3.5 pt-1 space-y-1.5 flex-1 overflow-y-auto min-h-0">
            {upcoming.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No upcoming tasks
              </div>
            ) : (
              upcoming.map((task) => {
                const taskDateObj = parseISO(task.date);
                const isTaskToday = isToday(taskDateObj);

                return (
                  <div
                    key={task.id}
                    data-testid={`upcoming-task-${task.id}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <Circle
                      weight="fill"
                      className={`h-2 w-2 shrink-0 ${
                        task.priority === 'High' ? 'text-rose-500':
                        task.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{task.task}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {isTaskToday ? "Today" : format(taskDateObj, "d MMM")} •{" "}
                        {task.startTime}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] shrink-0">
                      {task.subject}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className={cn(GLASS_SURFACE, "rounded-2xl flex flex-col min-h-0 overflow-hidden")}>
          <CardHeader className="p-3.5 pb-2 shrink-0">
            <CardTitle className="text-xs font-semibold flex items-center justify-between">
              <span>Subject Balance</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">
                {tasks.length} blocks
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-3.5 pt-1 flex-1 flex flex-col justify-between min-h-0">
            {subjectBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center">
                Schedule tasks to view subject balance.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden flex gap-0.5 p-0.5 border border-white/[0.06]">
                    {subjectBreakdown.map((item, index) => (
                      <div
                        key={item.subject}
                        style={{
                          width: `${Math.max(item.sharePct, 6)}%`,
                          backgroundColor: index % 2 === 0 ? PRIMARY : 'hsl(var(--muted))',
                        }}
                        title={`${item.subject}: ${item.sharePct}%`}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Proportional allocation across subjects
                  </p>
                </div>

                <div className="space-y-2 my-auto py-1">
                  {subjectBreakdown.slice(0, 3).map((item, index) => (
                    <div key={item.subject} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                          <Circle
                            weight="fill"
                            className="h-2 w-2 shrink-0"
                            style={{ color: index % 2 === 0 ? PRIMARY : MUTED_FG}}
                          />
                          {item.subject}
                        </span>
                        <span className="font-mono text-muted-foreground text-xs shrink-0">
                          {item.completed}/{item.total} • {item.sharePct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.sharePct}%`,
                            backgroundColor: index % 2 === 0 ? PRIMARY: MUTED_FG,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-muted-foreground shrink-0">
                  <span>Least scheduled:</span>
                  <span className="font-semibold text-foreground">
                    {subjectBreakdown[subjectBreakdown.length - 1]?.subject}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(GLASS_SURFACE, "rounded-2xl flex flex-col min-h-0 overflow-hidden")}>
          <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
            <CardTitle className="text-xs font-semibold">Week Heatmap</CardTitle>
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[130px]">
              {hoveredSlot || "07:00 – 18:00"}
            </span>
          </CardHeader>

          <CardContent className="p-3.5 pt-1 flex-1 flex flex-col justify-between min-h-0">
            <div className="flex gap-1 flex-1 min-h-0">
              {heatmapDays.map(({ day, dayStr, tasks: dayTasks }) => {
                const isTodays = isToday(day);
                return (
                  <div key={dayStr} className="flex-1 flex flex-col gap-1 min-h-0">
                    <p
                      className={cn(
                        "text-xs text-center font-medium shrink-0",
                        isTodays ? "text-primary font-bold" : "text-muted-foreground"
                      )}
                    >
                      {format(day, "EEE")}
                    </p>
                    <div className="flex-1 flex flex-col gap-0.5 min-h-0">
                      {Array.from({ length: 12 }, (_, h) => {
                        const hourSlot = h + 7;
                        const matchingTask = dayTasks.find((t) => {
                          const start = parseInt(t.startTime.split(":")[0]);
                          const end = parseInt(t.endTime.split(":")[0]);
                          return hourSlot >= start && hourSlot < end;
                        });
                        const hasTask = Boolean(matchingTask);
                        return (
                          <div
                            key={h}
                            onMouseEnter={() =>
                              setHoveredSlot(
                                matchingTask
                                  ? `${format(day, "EEE")} ${hourSlot}:00 • ${matchingTask.task}`
                                  : `${format(day, "EEE")} ${hourSlot}:00 • Free`
                              )
                            }
                            onMouseLeave={() => setHoveredSlot(null)}
                            style={
                              hasTask
                                ? {
                                    backgroundColor: matchingTask?.completed
                                      ? 'hsl(var(--primary)/0.6)'
                                      : 'hsl(var(--primary)/0.35)',
                                  }
                                : undefined
                            }
                            className={cn(
                              "flex-1 min-h-[5px] rounded-[2px] transition-opacity",
                              !hasTask && "bg-white/[0.04]"
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-2 justify-end shrink-0">
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded-xs bg-white/[0.04]" />
                <span className="text-xs text-muted-foreground">Empty</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: 'hsl(var(--primary)/0.35)' }} />
                <span className="text-xs text-muted-foreground">Scheduled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}