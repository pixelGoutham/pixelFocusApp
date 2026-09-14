import { useState, useRef } from "react";
import { format, startOfWeek, addDays, parseISO, isSameDay } from "date-fns";
import { ArrowLeft, ArrowRight, Plus, Upload, CalendarBlank, X, Check } from "@phosphor-icons/react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";
import type { Task } from "@/lib/store";

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 05:00 to 23:00

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
  const { tasks, setTasks } = useStore();
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [form, setForm] = useState(EMPTY_FORM);
  const [csvPreview, setCsvPreview] = useState<CsvRow[] | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);

  const handleSlotClick = (dayStr: string, hour: number) => {
    setSelectedDate(dayStr);
    setForm({ ...EMPTY_FORM, startTime: `${String(hour).padStart(2, "0")}:00`, endTime: `${String(hour + 1).padStart(2, "0")}:00` });
    setDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!form.task.trim()) return;
    const newTask: Task = {
      id: uid(),
      date: selectedDate,
      startTime: form.startTime,
      endTime: form.endTime,
      subject: form.subject || "General",
      task: form.task,
      priority: form.priority,
      quadrant: form.quadrant,
      completed: false,
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    toast({ title: "Task added to calendar" });
    setDialogOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvPreview(results.data);
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!csvPreview) return;
    setCsvImporting(true);
    const imported: Task[] = csvPreview.map(row => ({
      id: uid(),
      date: row.Date?.trim() || format(new Date(), "yyyy-MM-dd"),
      startTime: row.Start?.trim() || "09:00",
      endTime: row.End?.trim() || "10:00",
      subject: row.Subject?.trim() || "General",
      task: row.Task?.trim() || "Task",
      priority: (["High", "Medium", "Low"].includes(row.Priority?.trim()) ? row.Priority.trim() : "Medium") as Task["priority"],
      quadrant: priorityToQuadrant(row.Priority),
      completed: false,
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
    }));
    // Skip duplicates
    setTasks(prev => {
      const existingKeys = new Set(prev.map(t => `${t.date}-${t.startTime}-${t.subject}-${t.task}`));
      const fresh = imported.filter(t => !existingKeys.has(`${t.date}-${t.startTime}-${t.subject}-${t.task}`));
      return [...prev, ...fresh];
    });
    toast({ title: `Imported ${imported.length} tasks`, description: "CSV tasks added to calendar." });
    setCsvPreview(null);
    setCsvImporting(false);
  };

  // Compute task position in grid (row = hour slot)
  const getTaskStyle = (task: Task) => {
    const [sh, sm] = task.startTime.split(":").map(Number);
    const [eh, em] = task.endTime.split(":").map(Number);
    const startMinFromGrid = (sh - 5) * 60 + sm; // 05:00 = row 0
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    const rowH = 48; // px per hour
    return {
      top: `${(startMinFromGrid / 60) * rowH}px`,
      height: `${Math.max((durationMin / 60) * rowH, 24)}px`,
    };
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
            <ArrowLeft weight="fill" className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
            <ArrowRight weight="fill" className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <span className="text-sm font-medium">
          {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => fileRef.current?.click()} data-testid="button-import-csv">
          <Upload weight="fill" className="h-3.5 w-3.5 text-muted-foreground" />
          Import CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => { setSelectedDate(format(new Date(), "yyyy-MM-dd")); setForm(EMPTY_FORM); setDialogOpen(true); }} data-testid="button-add-task-cal">
          <Plus weight="fill" className="h-3.5 w-3.5 text-primary-foreground" />
          Add Task
        </Button>
      </div>

      {/* CSV Format hint */}
      <div className="text-xs text-muted-foreground flex-shrink-0">
        CSV format: <span className="font-mono text-muted-foreground/80">Date, Start, End, Subject, Task, Priority</span> — e.g. <span className="font-mono">2024-06-05, 05:00, 06:00, Physics, Electrostatics, High</span>
      </div>

      {/* Week Grid */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="flex min-w-[800px]">
          {/* Time labels */}
          <div className="w-14 flex-shrink-0">
            <div className="h-10" /> {/* Header spacer */}
            {HOURS.map(h => (
              <div key={h} className="h-12 flex items-start justify-end pr-2 pt-0.5">
                <span className="text-xs text-muted-foreground font-mono">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const isToday = isSameDay(day, new Date());
            const dayTasks = tasks.filter(t => t.date === dayStr);
            return (
              <div key={di} className="flex-1 min-w-0 border-l border-border">
                {/* Day header */}
                <div className={cn("h-10 flex flex-col items-center justify-center border-b border-border sticky top-0 bg-background/95 z-10",
                  isToday && "bg-primary/5"
                )}>
                  <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                  <span className={cn("text-sm font-semibold", isToday && "text-primary")}>{format(day, "d")}</span>
                </div>

                {/* Hour slots + tasks */}
                <div className="relative">
                  {/* Hour grid lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="h-12 border-b border-border/50 cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => handleSlotClick(dayStr, h)}
                    />
                  ))}

                  {/* Task blocks */}
                  {dayTasks.map(task => {
                    const style = getTaskStyle(task);
                    return (
                      <div
                        key={task.id}
                        data-testid={`cal-task-${task.id}`}
                        className={cn(
                          "absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden cursor-pointer border transition-opacity",
                          task.completed ? "opacity-40" : "opacity-100",
                          getSubjectColor(task.subject)
                        )}
                        style={style}
                        title={task.task}
                      >
                        <p className="text-xs font-medium truncate leading-tight">{task.task}</p>
                        <p className="text-xs opacity-75 leading-tight">{task.startTime}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task — {format(parseISO(selectedDate), "d MMMM yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div><Label>Task Name</Label><Input value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="e.g. Electrostatics revision" autoFocus data-testid="input-cal-task" /></div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} list="subjects-cal" placeholder="e.g. Physics" />
              <datalist id="subjects-cal">{subjects.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Task["priority"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quadrant</Label>
                <Select value={form.quadrant} onValueChange={v => setForm(f => ({ ...f, quadrant: v as Task["quadrant"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent-important">Urgent + Important</SelectItem>
                    <SelectItem value="not-urgent-important">Schedule</SelectItem>
                    <SelectItem value="urgent-not-important">Delegate</SelectItem>
                    <SelectItem value="neither">Eliminate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveTask} data-testid="button-save-cal-task">Add to Calendar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Preview Dialog */}
      <Dialog open={!!csvPreview} onOpenChange={() => setCsvPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload weight="fill" className="h-4 w-4 text-muted-foreground" />
              Import {csvPreview?.length} Tasks from CSV
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-auto scrollbar-thin rounded border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  {["Date", "Start", "End", "Subject", "Task", "Priority"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview?.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-mono">{row.Date}</td>
                    <td className="px-3 py-1.5 font-mono">{row.Start}</td>
                    <td className="px-3 py-1.5 font-mono">{row.End}</td>
                    <td className="px-3 py-1.5"><Badge variant="outline" className={cn("text-xs border", getSubjectColor(row.Subject))}>{row.Subject}</Badge></td>
                    <td className="px-3 py-1.5 max-w-48 truncate">{row.Task}</td>
                    <td className="px-3 py-1.5">{row.Priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCsvPreview(null)} className="gap-2">
              <X weight="fill" className="h-4 w-4 text-muted-foreground" /> Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={csvImporting} className="gap-2" data-testid="button-confirm-import">
              <Check weight="fill" className="h-4 w-4 text-primary-foreground" /> Import All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
