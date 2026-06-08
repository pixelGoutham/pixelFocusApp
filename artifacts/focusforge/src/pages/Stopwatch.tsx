import { format } from "date-fns";
import { Play, Pause, Flag, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useTimer } from "@/lib/TimerContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";

function fmt(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export default function Stopwatch() {
  const { tasks, sessions, setSessions } = useStore();
  const { sw, swElapsed, updateSw, startSw, pauseSw, resetSw } = useTimer();
  const { toast } = useToast();

  const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);
  const laps = sw.laps;

  const handleStartStop = () => {
    if (sw.running) {
      pauseSw();
    } else {
      startSw();
    }
  };

  const handleLap = () => {
    if (!sw.running) return;
    const lapTime = swElapsed - sw.lapStart;
    updateSw({
      laps: [...sw.laps, { lap: sw.laps.length + 1, split: lapTime, total: swElapsed }],
      lapStart: swElapsed,
    });
  };

  const handleReset = () => {
    resetSw();
  };

  const handleSave = () => {
    const minutes = Math.floor(swElapsed / 60000);
    if (minutes < 1) {
      toast({ title: "Too short", description: "Session must be at least 1 minute." });
      return;
    }
    setSessions(prev => [...prev, {
      id: Date.now().toString(),
      date: format(new Date(), "yyyy-MM-dd"),
      subject: sw.selectedSubject || "General",
      durationMinutes: minutes,
      type: "stopwatch",
    }]);
    toast({ title: "Session logged", description: `${minutes} minutes recorded for ${sw.selectedSubject || "General"}.` });
    handleReset();
  };

  const minLap = laps.length > 0 ? Math.min(...laps.map(l => l.split)) : null;
  const maxLap = laps.length > 0 ? Math.max(...laps.map(l => l.split)) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="bg-card border-border">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          {/* Subject */}
          <Select
            value={sw.selectedSubject}
            onValueChange={v => updateSw({ selectedSubject: v })}
          >
            <SelectTrigger className="w-48" data-testid="select-stopwatch-subject">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Display */}
          <div className="text-center">
            <div
              data-testid="stopwatch-display"
              className="text-6xl font-mono font-bold tabular-nums tracking-tight"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {fmt(swElapsed)}
            </div>
            {sw.selectedSubject && (
              <Badge variant="outline" className={cn("mt-2 text-xs border", getSubjectColor(sw.selectedSubject))}>
                {sw.selectedSubject}
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleLap} disabled={!sw.running} data-testid="button-lap">
              <Flag className="h-4 w-4" />
            </Button>
            <Button size="lg" className="px-10 h-12" onClick={handleStartStop} data-testid="button-startstop">
              {sw.running ? <><Pause className="h-5 w-5 mr-2" />Pause</> : <><Play className="h-5 w-5 mr-2" />Start</>}
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset} data-testid="button-reset-sw">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {!sw.running && swElapsed > 0 && (
            <Button variant="outline" className="gap-2" onClick={handleSave} data-testid="button-save-session">
              <Save className="h-4 w-4" />
              Log as Study Session
            </Button>
          )}
        </CardContent>
      </Card>

      {laps.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Laps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground pb-1 border-b border-border">
                <span>Lap</span>
                <span>Split</span>
                <span>Total</span>
              </div>
              {[...laps].reverse().map(lap => (
                <div key={lap.lap} className={cn("grid grid-cols-3 text-sm py-1.5 font-mono border-b border-border/50 last:border-0",
                  lap.split === minLap ? "text-emerald-400" : lap.split === maxLap && laps.length > 1 ? "text-rose-400" : ""
                )}>
                  <span className="text-muted-foreground">#{lap.lap}</span>
                  <span>{fmt(lap.split)}</span>
                  <span>{fmt(lap.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />Fastest</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />Slowest</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
