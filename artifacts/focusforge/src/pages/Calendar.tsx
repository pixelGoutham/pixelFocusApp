import { useState, useRef, useEffect } from "react";
import { format, startOfWeek, addDays, parseISO, isSameDay, getHours, getMinutes } from "date-fns";
import { ArrowLeft, ArrowRight, Plus, Upload, X, Check } from "@phosphor-icons/react";
import Papa from "papaparse";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn, getSubjectColorByName } from "@/lib/utils";
import type { Task } from "@/lib/store";

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); 
const TOTAL_MINUTES = 19 * 60; 


const EMPTY_FORM = {
  task: "",
  subject: "",
  startTime: "09:00",
  endTime: "10:00",
  priority: "Medium" as Task["priority"],
  quadrant: "not-urgent-important" as Task["quadrant"],
};

interface CsvRow { Date: string; Start: string; End: string; Subject: string; Task: string; Priority: string }

function priorityToQuadrant(p: string): Task["quadrant"] {
  if (p?.toLowerCase() === "high") return "urgent-important";
  if (p?.toLowerCase() === "medium") return "not-urgent-important";
  return "neither";
}

export default function Calendar() {
  const { tasks, setTasks, settings } = useStore();
  const { toast } = useToast();
  
  const [view, setView] = useState<"Day" | "3-Day" | "Week">("Week");
  const [baseDate, setBaseDate] = useState(new Date());
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [form, setForm] = useState(EMPTY_FORM);
  const [csvPreview, setCsvPreview] = useState<CsvRow[] | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [now, setNow] = useState(new Date());
  const fileRef = useRef<HTMLInputElement>(null);

  const subjects = settings.subjects ?? [];

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  let displayStart = baseDate;
  if (view === "Week") {
    displayStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  }
  const numDays = view === "Week" ? 7 : view === "3-Day" ? 3 : 1;
  const visibleDays = Array.from({ length: numDays }, (_, i) => addDays(displayStart, i));

  const handleNext = () => setBaseDate(d => addDays(d, numDays));
  const handlePrev = () => setBaseDate(d => addDays(d, -numDays));
  const handleToday = () => setBaseDate(new Date());

  const handleSlotClick = (dayStr: string, hour: number) => {
    setSelectedDate(dayStr);
    setForm({ ...EMPTY_FORM, startTime: `${String(hour).padStart(2, "0")}:00`, endTime: `${String(hour + 1).padStart(2, "0")}:00` });
    setDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!form.task.trim()) return;
    const newTask: Task = {
      id: uid(), date: selectedDate, startTime: form.startTime, endTime: form.endTime,
      subject: form.subject || "General", task: form.task, priority: form.priority,
      quadrant: form.quadrant, completed: false, pomodoroSessions: 0, createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    toast({ title: "Task added to calendar" });
    setDialogOpen(false); setForm(EMPTY_FORM);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<CsvRow>(file, { header: true, skipEmptyLines: true, complete: (results) => setCsvPreview(results.data) });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!csvPreview) return;
    setCsvImporting(true);
    const imported: Task[] = csvPreview.map(row => ({
      id: uid(), date: row.Date?.trim() || format(new Date(), "yyyy-MM-dd"),
      startTime: row.Start?.trim() || "09:00", endTime: row.End?.trim() || "10:00",
      subject: row.Subject?.trim() || "General", task: row.Task?.trim() || "Task",
      priority: (["High", "Medium", "Low"].includes(row.Priority?.trim()) ? row.Priority.trim() : "Medium") as Task["priority"],
      quadrant: priorityToQuadrant(row.Priority), completed: false, pomodoroSessions: 0, createdAt: new Date().toISOString(),
    }));
    setTasks(prev => {
      const existingKeys = new Set(prev.map(t => `${t.date}-${t.startTime}-${t.subject}-${t.task}`));
      const fresh = imported.filter(t => !existingKeys.has(`${t.date}-${t.startTime}-${t.subject}-${t.task}`));
      return [...prev, ...fresh];
    });
    toast({ title: `Imported ${imported.length} tasks` });
    setCsvPreview(null); setCsvImporting(false);
  };

  const getTaskStyle = (task: Task) => {
    const [sh, sm] = task.startTime.split(":").map(Number);
    const [eh, em] = task.endTime.split(":").map(Number);
    const startMinFromGrid = (sh - 5) * 60 + sm;
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    return {
      top: `${(startMinFromGrid / TOTAL_MINUTES) * 100}%`,
      height: `${(durationMin / TOTAL_MINUTES) * 100}%`,
    };
  };

  const currentMonthYear = format(displayStart, "MMMM yyyy");
  const dateRangeStr = numDays === 1 
    ? format(displayStart, "EEEE, MMM d") 
    : `${format(displayStart, "MMM d")} – ${format(addDays(displayStart, numDays - 1), "MMM d")}`;

  return (
    <div className="h-full w-full flex flex-col pt-2 overflow-hidden">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2 pb-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-white">
            {currentMonthYear}
          </h1>
          <span className="text-sm text-zinc-400 font-medium">{dateRangeStr}</span>
        </div>

        <div className="flex items-center gap-3">
          
          <div className="hidden md:flex items-center rounded-full bg-[#1a1a1a] border border-white/10 p-1 relative">
            {(["Day", "3-Day", "Week"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative z-10 px-4 py-1.5 text-xs font-semibold rounded-full transition-colors",
                  view === v ? "text-black" : "text-zinc-400 hover:text-white"
                )}
              >
                {view === v && (
                  <motion.div
                    layoutId="view-toggle-bg"
                    className="absolute inset-0 bg-white rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] p-1 backdrop-blur-md">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/[0.08]" onClick={handlePrev}><ArrowLeft weight="bold" className="h-4 w-4" /></Button>
            <Button variant="ghost" className="h-8 px-4 rounded-full text-xs font-semibold hover:bg-white/[0.08]" onClick={handleToday}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/[0.08]" onClick={handleNext}><ArrowRight weight="bold" className="h-4 w-4" /></Button>
          </div>

          <Button className="h-10 rounded-full bg-white text-black hover:bg-zinc-200 gap-2 font-semibold shadow-lg shadow-white/10" onClick={() => { setSelectedDate(format(new Date(), "yyyy-MM-dd")); setForm(EMPTY_FORM); setDialogOpen(true); }}>
            <Plus weight="bold" className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c0c0c] shadow-2xl relative overflow-hidden mb-4">
        
        <div className="flex h-14 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl z-20 flex-shrink-0">
          <div className="w-14 border-r border-white/[0.04] flex-shrink-0" />
          {visibleDays.map((day, di) => (
            <div key={di} className="flex-1 flex flex-col items-center justify-center border-r border-white/[0.04] last:border-0">
              <span className={cn("text-[11px] font-semibold tracking-widest uppercase", isSameDay(day, now) ? "text-white" : "text-zinc-500")}>{format(day, "EEE")}</span>
              <span className={cn("text-lg font-medium", isSameDay(day, now) ? "text-white" : "text-zinc-300")}>{format(day, "d")}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative flex overflow-hidden">
          
          <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
            {HOURS.map(h => (
              <div key={h} className="flex-1 border-b border-white/[0.03] w-full" />
            ))}
          </div>

          <div className="w-14 flex-shrink-0 border-r border-white/[0.04] bg-background/50 backdrop-blur-xl z-10 relative">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute w-full flex justify-end pr-2" style={{ top: `${(i / 19) * 100}%` }}>
                <span className="text-[10px] text-zinc-500 font-medium -translate-y-1/2 bg-[#0c0c0c] px-1">{String(h).padStart(2, "0")}</span>
              </div>
            ))}
          </div>

          {visibleDays.map((day, di) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const isToday = isSameDay(day, now);
            const dayTasks = tasks.filter(t => t.date === dayStr);
            
            const currentHour = getHours(now);
            const currentMin = getMinutes(now);
            const isWithinGrid = currentHour >= 5 && currentHour <= 23;
            const redLineTop = isWithinGrid ? (((currentHour - 5) * 60 + currentMin) / TOTAL_MINUTES) * 100 : -10;

            return (
              <div key={di} className="flex-1 border-r border-white/[0.04] last:border-0 relative z-10">
                <div className="absolute inset-0 flex flex-col">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 cursor-crosshair hover:bg-white/[0.02] transition-colors" onClick={() => handleSlotClick(dayStr, h)} />
                  ))}
                </div>

                {isToday && isWithinGrid && (
                  <div className="absolute left-0 right-0 z-40 flex items-center pointer-events-none" style={{ top: `${redLineTop}%`, transform: 'translateY(-50%)' }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <div className="h-[2px] flex-1 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                  </div>
                )}

                {dayTasks.map(task => {
                  const style = getTaskStyle(task);
                  const rawColor = getSubjectColorByName(task.subject, subjects);
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: task.completed ? 0.4 : 1, scale: 1 }} transition={{ bounce: 0, duration: 0.4 }}
                      key={task.id} className="absolute left-1 right-1 rounded-lg px-2 py-1.5 overflow-hidden cursor-pointer shadow-lg active:scale-95 transition-all hover:brightness-110"
                      style={{ ...style, backgroundColor: `${rawColor}25`, borderLeft: `4px solid ${rawColor}`, border: `1px solid ${rawColor}40`, borderLeftWidth: '4px', backdropFilter: "blur(12px)" }}
                    >
                      <p className="text-xs font-semibold truncate leading-tight text-white/90">{task.task}</p>
                      <p className="text-[10px] opacity-70 leading-tight mt-0.5 font-medium">{task.startTime} - {task.endTime}</p>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 max-w-md bg-[#111] border-white/[0.08]">
            <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Task Name</Label><Input value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
                <div><Label>End</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
              </div>
              <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} list="subjects-cal" />
                <datalist id="subjects-cal">{subjects.map(s => <option key={s.name} value={s.name} />)}</datalist>
              </div>
              <Button className="w-full bg-white text-black hover:bg-zinc-200" onClick={handleSaveTask}>Add</Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}