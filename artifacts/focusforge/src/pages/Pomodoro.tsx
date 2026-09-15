import { useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Play, Pause, SkipForward, ArrowCounterClockwise, Faders, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useTimer, PomodoroPhase } from "@/lib/TimerContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";
import { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

function playBeep(ctx: AudioContext | null) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

export default function Pomodoro() {
  const { tasks, sessions, setSessions, settings, setSettings, setTasks } = useStore();
  const { pom, pomSecondsLeft, updatePom, startPom, pausePom, resetPom, setPomPhaseCompleteCallback } = useTimer();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [draftWork, setDraftWork] = useState(pom.workDur);
  const [draftBreak, setDraftBreak] = useState(pom.breakDur);
  const [draftLong, setDraftLong] = useState(pom.longBreakDur);
  const { resolvedTheme } = useTheme();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);
  const todayTasks = tasks.filter(t => t.subject === pom.selectedSubject && !t.completed);
  const todaySessions = sessions.filter(s => s.date === todayStr && s.type === "pomodoro");

  const totalSeconds = pom.phase === "work" ? pom.workDur * 60 : pom.phase === "break" ? pom.breakDur * 60 : pom.longBreakDur * 60;
  const progress = 1 - pomSecondsLeft / totalSeconds;
  const mm = String(Math.floor(pomSecondsLeft / 60)).padStart(2, "0");
  const ss = String(pomSecondsLeft % 60).padStart(2, "0");
  const r = 110;
  const circumference = 2 * Math.PI * r;
  const strokeOffset = circumference * (1 - progress);

  // Register phase-complete callback — fires when timer naturally hits 0
  const onPhaseComplete = useCallback((newPom: typeof pom) => {
    if (!pom.muted) playBeep(getAudioCtx());

    if (pom.phase === "work") {
      const sessionRecord = {
        id: Date.now().toString(),
        date: todayStr,
        subject: pom.selectedSubject || "General",
        durationMinutes: pom.workDur,
        type: "pomodoro" as const,
      };
      setSessions(prev => [...prev, sessionRecord]);

      if (pom.selectedTask) {
        setTasks(prev => prev.map(t =>
          t.id === pom.selectedTask ? { ...t, pomodoroSessions: t.pomodoroSessions + 1 } : t
        ));
      }

      const today = format(new Date(), "yyyy-MM-dd");
      if (settings.lastActiveDate !== today) {
        setSettings(prev => ({ ...prev, lastActiveDate: today, currentStreak: prev.currentStreak + 1 }));
      }

      toast({
        title: "Pomodoro complete!",
        description: `Focus session recorded for ${pom.selectedSubject || "General"}.`,
      });
    } else {
      toast({ title: newPom.phase === "work" ? "Break over — time to focus!" : "Break started!" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pom.phase, pom.selectedSubject, pom.selectedTask, pom.workDur, pom.muted, todayStr, settings.lastActiveDate]);

  useEffect(() => {
    setPomPhaseCompleteCallback(onPhaseComplete);
  }, [onPhaseComplete, setPomPhaseCompleteCallback]);

  // Sync timer durations from app settings on first mount (if using defaults)
  useEffect(() => {
    if (pom.workDur === 25 && settings.pomodoroWork !== 25) {
      updatePom({
        workDur: settings.pomodoroWork,
        breakDur: settings.pomodoroBreak,
        longBreakDur: settings.pomodoroLongBreak,
        secondsLeftSnapshot: settings.pomodoroWork * 60,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhaseClick = (p: PomodoroPhase) => {
    if (pom.running) pausePom();
    const secs = p === "work" ? pom.workDur : p === "break" ? pom.breakDur : pom.longBreakDur;
    updatePom({ phase: p, running: false, timerEndTimestamp: null, secondsLeftSnapshot: secs * 60 });
  };

  const handleSaveSettings = () => {
    updatePom({
      workDur: draftWork,
      breakDur: draftBreak,
      longBreakDur: draftLong,
      phase: "work",
      running: false,
      timerEndTimestamp: null,
      secondsLeftSnapshot: draftWork * 60,
    });
    setSettings(prev => ({ ...prev, pomodoroWork: draftWork, pomodoroBreak: draftBreak, pomodoroLongBreak: draftLong }));
    setShowSettings(false);
    toast({ title: "Settings saved" });
  };

  const handleSkip = () => {
    pausePom();
    if (pom.phase === "work") {
      const newCount = pom.completedSessions + 1;
      const nextPhase = newCount % 4 === 0 ? "longBreak" : "break";
      const nextSecs = (nextPhase === "longBreak" ? pom.longBreakDur : pom.breakDur) * 60;
      updatePom({ phase: nextPhase, completedSessions: newCount, secondsLeftSnapshot: nextSecs, timerEndTimestamp: null, running: false });
    } else {
      updatePom({ phase: "work", secondsLeftSnapshot: pom.workDur * 60, timerEndTimestamp: null, running: false });
    }
  };

  const phaseLabel = pom.phase === "work" ? "Focus" : pom.phase === "break" ? "Short Break" : "Long Break";
  const phaseColor = resolvedTheme === 'dark'
    ? (pom.phase === "work"
      ? "white"
      : pom.phase === "break"
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(255, 255, 255, 0.2)"
    )
    : "black";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2">
          <Card className={cn(
            "bg-white/[0.03] border border-white/[0.08] rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
            resolvedTheme === 'dark' ? "" : "bg-black/[0.03] border border-black/[0.08] shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)]"
          )}
          >
            <CardContent className="p-8 flex flex-col items-center gap-6">
              <div className="flex gap-2">
                {(["work", "break", "longBreak"] as PomodoroPhase[]).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePhaseClick(p)}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      pom.phase === p
                        ? (resolvedTheme === 'dark' ? "bg-white text-black" : "bg-black text-white")
                        : (resolvedTheme === 'dark' ? "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white" : "bg-black/10 text-black/50 hover:bg-black/20 hover:text-black")
                    )}
                  >
                    {p === "work" ? "Focus" : p === "break" ? "Short Break" : "Long Break"}
                  </button>
                ))}
              </div>

              {/* Ring */}
              <div className="relative">
                <svg width="280" height="280" className="-rotate-90">
                  <circle cx="140" cy="140" r={r} strokeWidth="12" stroke="hsl(var(--border))" fill="none" />
                  <circle
                    cx="140" cy="140" r={r}
                    strokeWidth="12"
                    stroke={phaseColor}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: "stroke-dashoffset 0.5s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn(
                    "text-6xl font-semibold tracking-[-0.04em] font-mono tabular-nums leading-none",
                    resolvedTheme === 'dark' ? "text-white" : "text-black"
                  )}>{mm}:{ss}</span>
                  <span className="text-sm text-muted-foreground mt-1">{phaseLabel}</span>
                  {pom.selectedSubject && <span className="text-xs text-primary mt-1">{pom.selectedSubject}</span>}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={resetPom} data-testid="button-reset">
                  <ArrowCounterClockwise className="h-4 w-4" weight="bold" />
                </Button>
                <Button
                  size="lg"
                  className="px-10 h-12"
                  onClick={() => pom.running ? pausePom() : startPom()}
                  data-testid="button-play-pause"
                >
                  {pom.running ? <Pause className="h-5 w-5 mr-2" weight="fill" /> : <Play className="h-5 w-5 mr-2" weight="fill" />}
                  {pom.running ? "Pause" : "Start"}
                </Button>
                <Button variant="outline" size="icon" onClick={handleSkip} data-testid="button-skip">
                  <SkipForward className="h-4 w-4" weight="fill" />
                </Button>
              </div>

              {/* Session dots */}
              <div className="flex gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className={cn("h-3 w-3 rounded-full border-2 transition-colors",
                    i < (pom.completedSessions % 4)
                      ? (resolvedTheme === 'dark' ? "bg-white border-white" : "bg-black border-black")
                      : (resolvedTheme === 'dark' ? "border-white/20" : "border-black/20")
                  )} />
                ))}
              </div>

              <p className="text-xs text-muted-foreground">{pom.completedSessions} sessions completed today</p>

              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={pom.autoStart}
                    onCheckedChange={v => updatePom({ autoStart: v })}
                    data-testid="switch-autostart"
                  />
                  <span className="text-muted-foreground text-xs">Auto-start next</span>
                </label>
                <button onClick={() => updatePom({ muted: !pom.muted })} className="text-muted-foreground hover:text-foreground transition-colors">
                  {pom.muted ? <VolumeX className="h-4 w-4" weight="fill" /> : <SpeakerHigh className="h-4 w-4" weight="fill" />}
                </button>
                <button onClick={() => { setDraftWork(pom.workDur); setDraftBreak(pom.breakDur); setDraftLong(pom.longBreakDur); setShowSettings(s => !s); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Faders className="h-4 w-4" weight="bold" />
                </button>
              </div>

              {showSettings && (
                <div className="w-full border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold">Timer Settings</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs">Work (min)</Label><Input type="number" value={draftWork} onChange={e => setDraftWork(Number(e.target.value))} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Break (min)</Label><Input type="number" value={draftBreak} onChange={e => setDraftBreak(Number(e.target.value))} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Long Break</Label><Input type="number" value={draftLong} onChange={e => setDraftLong(Number(e.target.value))} className="h-8 text-sm" /></div>
                  </div>
                  <Button size="sm" onClick={handleSaveSettings} data-testid="button-save-settings">Save Settings</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className={cn(
            "bg-white/[0.03] border border-white/[0.08] rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
            resolvedTheme === 'dark' ? "" : "bg-black/[0.03] border border-black/[0.08] shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)]"
          )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Select Subject & Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={pom.selectedSubject}
                onValueChange={v => updatePom({ selectedSubject: v, selectedTask: "" })}
              >
                <SelectTrigger data-testid="select-subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {pom.selectedSubject && (
                <Select value={pom.selectedTask} onValueChange={v => updatePom({ selectedTask: v })}>
                  <SelectTrigger data-testid="select-task"><SelectValue placeholder="Select task (optional)" /></SelectTrigger>
                  <SelectContent>
                    {todayTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.task}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card className={cn(
            "bg-white/[0.03] border border-white/[0.08] rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
            resolvedTheme === 'dark' ? "" : "bg-black/[0.03] border border-black/[0.08] shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)]"
          )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today's Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions yet today</p>
              ) : todaySessions.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-4">#{i + 1}</span>
                  <Badge variant="outline" className={cn("text-xs border", getSubjectColor(s.subject),
                    resolvedTheme === 'dark' ? "!border-white/20 !bg-white/5 !text-white" : "!border-black/20 !bg-black/5 !text-black"
                  )}>{s.subject}</Badge>
                  <span className="text-muted-foreground ml-auto">{s.durationMinutes}m</span>
                </div>
              ))}
              {todaySessions.length > 0 && (
                <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Total: {todaySessions.reduce((a, s) => a + s.durationMinutes, 0)}m focus time
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}