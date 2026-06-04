import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Play, Pause, SkipForward, RotateCcw, Settings2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";

type Phase = "work" | "break" | "longBreak";

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
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(settings.pomodoroWork * 60);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [autoStart, setAutoStart] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [workDur, setWorkDur] = useState(settings.pomodoroWork);
  const [breakDur, setBreakDur] = useState(settings.pomodoroBreak);
  const [longBreakDur, setLongBreakDur] = useState(settings.pomodoroLongBreak);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTasks = tasks.filter(t => t.subject === selectedSubject && !t.completed);
  const todaySessions = sessions.filter(s => s.date === todayStr && s.type === "pomodoro");

  const totalSeconds = phase === "work" ? workDur * 60 : phase === "break" ? breakDur * 60 : longBreakDur * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const r = 110;
  const circumference = 2 * Math.PI * r;
  const strokeOffset = circumference * (1 - progress);

  const advancePhase = useCallback(() => {
    if (!muted) playBeep(getAudioCtx());
    if (phase === "work") {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      const sessionRecord = {
        id: Date.now().toString(),
        date: todayStr,
        subject: selectedSubject || "General",
        durationMinutes: workDur,
        type: "pomodoro" as const,
      };
      setSessions(prev => [...prev, sessionRecord]);
      if (selectedTask) {
        setTasks(prev => prev.map(t => t.id === selectedTask ? { ...t, pomodoroSessions: t.pomodoroSessions + 1 } : t));
      }
      // Update streak
      const today = format(new Date(), "yyyy-MM-dd");
      if (settings.lastActiveDate !== today) {
        setSettings(prev => ({ ...prev, lastActiveDate: today, currentStreak: prev.currentStreak + 1 }));
      }
      toast({ title: "Pomodoro complete!", description: `Focus session recorded for ${selectedSubject || "General"}.` });
      const nextPhase = newCount % 4 === 0 ? "longBreak" : "break";
      setPhase(nextPhase);
      setSecondsLeft(nextPhase === "longBreak" ? longBreakDur * 60 : breakDur * 60);
    } else {
      setPhase("work");
      setSecondsLeft(workDur * 60);
    }
    setRunning(autoStart);
  }, [phase, completedSessions, workDur, breakDur, longBreakDur, selectedSubject, selectedTask, autoStart, muted, todayStr]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            advancePhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, advancePhase]);

  const handleReset = () => {
    setRunning(false);
    setPhase("work");
    setSecondsLeft(workDur * 60);
    setCompletedSessions(0);
  };

  const handleSaveSettings = () => {
    setSettings(prev => ({ ...prev, pomodoroWork: workDur, pomodoroBreak: breakDur, pomodoroLongBreak: longBreakDur }));
    setSecondsLeft(workDur * 60);
    setPhase("work");
    setShowSettings(false);
    toast({ title: "Settings saved" });
  };

  const phaseLabel = phase === "work" ? "Focus" : phase === "break" ? "Short Break" : "Long Break";
  const phaseColor = phase === "work" ? "hsl(var(--primary))" : phase === "break" ? "hsl(var(--chart-3))" : "hsl(var(--chart-2))";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardContent className="p-8 flex flex-col items-center gap-6">
              <div className="flex gap-2">
                {(["work", "break", "longBreak"] as Phase[]).map(p => (
                  <button
                    key={p}
                    data-testid={`phase-btn-${p}`}
                    onClick={() => { setPhase(p); setRunning(false); setSecondsLeft((p === "work" ? workDur : p === "break" ? breakDur : longBreakDur) * 60); }}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      phase === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-mono font-bold tabular-nums">{mm}:{ss}</span>
                  <span className="text-sm text-muted-foreground mt-1">{phaseLabel}</span>
                  {selectedSubject && <span className="text-xs text-primary mt-1">{selectedSubject}</span>}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handleReset} data-testid="button-reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  className="px-10 h-12"
                  onClick={() => setRunning(r => !r)}
                  data-testid="button-play-pause"
                >
                  {running ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button variant="outline" size="icon" onClick={advancePhase} data-testid="button-skip">
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Session dots */}
              <div className="flex gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className={cn("h-3 w-3 rounded-full border-2 transition-colors",
                    i < (completedSessions % 4) ? "bg-primary border-primary" : "border-muted-foreground"
                  )} />
                ))}
              </div>

              <p className="text-xs text-muted-foreground">{completedSessions} sessions completed today</p>

              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={autoStart} onCheckedChange={setAutoStart} data-testid="switch-autostart" />
                  <span className="text-muted-foreground text-xs">Auto-start next</span>
                </label>
                <button onClick={() => setMuted(m => !m)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={() => setShowSettings(s => !s)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>

              {showSettings && (
                <div className="w-full border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold">Timer Settings</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs">Work (min)</Label><Input type="number" value={workDur} onChange={e => setWorkDur(Number(e.target.value))} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Break (min)</Label><Input type="number" value={breakDur} onChange={e => setBreakDur(Number(e.target.value))} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Long Break</Label><Input type="number" value={longBreakDur} onChange={e => setLongBreakDur(Number(e.target.value))} className="h-8 text-sm" /></div>
                  </div>
                  <Button size="sm" onClick={handleSaveSettings} data-testid="button-save-settings">Save Settings</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Select Subject & Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTask(""); }}>
                <SelectTrigger data-testid="select-subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedSubject && (
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger data-testid="select-task"><SelectValue placeholder="Select task (optional)" /></SelectTrigger>
                  <SelectContent>
                    {todayTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.task}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today's Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions yet today</p>
              ) : todaySessions.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-4">#{i + 1}</span>
                  <Badge variant="outline" className={cn("text-xs border", getSubjectColor(s.subject))}>{s.subject}</Badge>
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
