import { format } from "date-fns";
import { Play, Pause, Flag, RotateCcw, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useTimer } from "@/lib/TimerContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function fmt(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export default function Stopwatch() {
  const { tasks, sessions, setSessions, settings } = useStore();
  const { sw, swElapsed, updateSw, startSw, pauseSw, resetSw } = useTimer();
  const { toast } = useToast();

  const subjects = settings.subjects ?? [];
  const laps = sw.laps;

  const handleStartStop = () => {
    if (sw.running) pauseSw();
    else startSw();
  };

  const handleLap = () => {
    if (!sw.running) return;
    const lapTime = swElapsed - sw.lapStart;
    updateSw({
      laps: [...sw.laps, { lap: sw.laps.length + 1, split: lapTime, total: swElapsed }],
      lapStart: swElapsed,
    });
  };

  const handleReset = () => resetSw();

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

  const h = Math.floor(swElapsed / 3600000);
  const m = Math.floor((swElapsed % 3600000) / 60000);
  const s = Math.floor((swElapsed % 60000) / 1000);
  const centis = Math.floor((swElapsed % 1000) / 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
      
      {/* Main Glassmorphism Stopwatch Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ bounce: 0, duration: 0.4 }}
        className="w-full relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-[#0c0c0c] shadow-2xl p-10 md:p-16 flex flex-col items-center"
      >
        <div className={cn(
          "absolute inset-0 bg-white/[0.02] transition-opacity duration-700 pointer-events-none",
          sw.running ? "opacity-100" : "opacity-0"
        )} />

        {/* Subject Selector Pill - Strictly Monochrome */}
        <div className="z-10 mb-12">
          <Select value={sw.selectedSubject} onValueChange={v => updateSw({ selectedSubject: v })}>
            <SelectTrigger className="w-48 rounded-full bg-white/[0.03] border-white/[0.08] text-white backdrop-blur-md focus:ring-0">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/[0.08] bg-[#111] text-white">
              <SelectItem value="General">General</SelectItem>
              {subjects.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <AnimatePresence>
            {sw.selectedSubject && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-center mt-3">
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-white/10 bg-transparent text-zinc-500 px-3 py-0.5">
                  {sw.selectedSubject}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Massive Apple-Style Display - Red Milliseconds */}
        <div className="z-10 text-center mb-16 select-none">
          <div className="flex items-baseline justify-center gap-1 font-mono font-bold tracking-tighter tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="text-7xl md:text-[9rem] leading-none text-white drop-shadow-lg">
              {h > 0 ? `${h}:${String(m).padStart(2, "0")}` : String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
            <span className="text-4xl md:text-6xl text-red-600">
              .{String(centis).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* High-Contrast Controls */}
        <div className="z-10 flex items-center justify-center gap-6 w-full max-w-sm">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-16 w-16 rounded-full border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-white backdrop-blur-md transition-all active:scale-90" 
            onClick={handleReset}
          >
            <RotateCcw className="h-6 w-6 text-zinc-400" />
          </Button>

          <Button 
            className={cn(
              "flex-1 h-16 rounded-full text-lg font-semibold tracking-wide transition-all active:scale-95 shadow-lg",
              sw.running ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10" : "bg-white text-black hover:bg-zinc-200 shadow-white/10"
            )} 
            onClick={handleStartStop}
          >
            {sw.running ? <><Pause className="h-5 w-5 mr-2" /> Pause</> : <><Play className="h-5 w-5 mr-2 fill-current" /> Start</>}
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-16 w-16 rounded-full border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-white backdrop-blur-md transition-all active:scale-90 disabled:opacity-30" 
            onClick={handleLap} 
            disabled={!sw.running}
          >
            <Flag className="h-6 w-6 text-zinc-400" />
          </Button>
        </div>

        {/* Log Session Action - Stealth Neutral */}
        <AnimatePresence>
          {!sw.running && swElapsed > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }} 
              animate={{ opacity: 1, height: "auto", marginTop: 24 }} 
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="z-10 overflow-hidden"
            >
              <Button variant="outline" className="gap-2 rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] transition-colors px-6" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Log as Study Session
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Laps List - Monochrome & Red */}
      <AnimatePresence>
        {laps.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-2xl rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-lg p-6 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              <span>Lap</span>
              <span>Split</span>
              <span>Total</span>
            </div>
            
            <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
              <AnimatePresence initial={false}>
                {[...laps].reverse().map((lap) => (
                  <motion.div 
                    key={lap.lap}
                    layout
                    initial={{ opacity: 0, x: -20, backgroundColor: "rgba(255,255,255,0)" }}
                    animate={{ opacity: 1, x: 0, backgroundColor: "rgba(255,255,255,0.03)" }}
                    className={cn(
                      "grid grid-cols-3 text-sm py-3 px-4 rounded-xl font-mono tabular-nums mb-1",
                      lap.split === minLap ? "text-white bg-white/[0.08] border border-white/[0.12]" : 
                      lap.split === maxLap && laps.length > 1 ? "text-red-500 bg-red-500/10 border border-red-500/20" : 
                      "text-zinc-500 border border-transparent"
                    )}
                  >
                    <span className="text-zinc-600 font-medium">#{String(lap.lap).padStart(2, '0')}</span>
                    <span className="text-center">{fmt(lap.split)}</span>
                    <span className="text-right">{fmt(lap.total)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}