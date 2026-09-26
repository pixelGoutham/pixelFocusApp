import { useState, useMemo, useEffect } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Plus, Trash2, Edit3, Flame, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";
import { useDraggable } from "@/hooks/use-draggable";
import type { Task } from "@/lib/store";

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const EMPTY_FORM = {
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "09:00",
  endTime: "10:00",
  subject: "",
  task: "",
  quadrant: "not-urgent-important" as Task["quadrant"],
};

export default function Tasks() {
  const { tasks, setTasks } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showStartTimeOptions, setShowStartTimeOptions] = useState(false);
  const [showEndTimeOptions, setShowEndTimeOptions] = useState(false);

  // Hide time options when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogOpen) {
        // Check if click is outside time inputs
        const target = e.target as HTMLElement;
        if (!target.closest('input[type="time"]')) {
          setShowStartTimeOptions(false);
          setShowEndTimeOptions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dialogOpen]);

  const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterSubject !== "all" && t.subject !== filterSubject) return false;
    if (filterStatus === "done" && !t.completed) return false;
    if (filterStatus === "pending" && t.completed) return false;
    if (search && !t.task.toLowerCase().includes(search.toLowerCase()) && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)), [tasks, filterSubject, filterStatus, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ date: task.date, startTime: task.startTime, endTime: task.endTime, subject: task.subject, task: task.task, quadrant: task.quadrant });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.task.trim()) return;
    if (editing) {
      setTasks(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } : t));
      toast({ title: "Task updated" });
    } else {
      const newTask: Task = { id: uid(), ...form, completed: false, pomodoroSessions: 0, createdAt: new Date().toISOString() };
      setTasks(prev => [...prev, newTask]);
      toast({ title: "Task added" });
    }
    setDialogOpen(false);
  };

  const toggleTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id: string) => { setTasks(prev => prev.filter(t => t.id !== id)); toast({ title: "Task deleted" }); };

  
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
          data-testid="input-search-tasks"
        />
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-36" data-testid="filter-subject"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32" data-testid="filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button className="gap-2" onClick={openAdd} data-testid="button-add-task">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Task List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Filter className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks found. Add one or adjust filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(task => {
            const [ref, style, setStyle] = useDraggable({
              boundary: { left: -200, right: 0 },
              rubberbandResistance: 0.5,
              onDragEnd: (event, velocity) => {
                // Parse current translation
                const match = style.transform?.match(/translate\((-?\d+\.?\d*)px, (-?\d+\.?\d*)px\)/);
                if (match) {
                  const translateX = parseFloat(match[1]);
                  // Delete if dragged more than halfway or flicked with sufficient velocity
                  if (translateX < -100 || velocity.x < -500) {
                    deleteTask(task.id);
                    return;
                  }
                }
                // Snap back to 0 if not deleted
                setStyle({
                  transform: "translate(0, 0)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                });
              }
            });

            return (
              <div
                ref={ref}
                style={{ transform: style.transform, transition: style.transition }}
                key={task.id}
                data-testid={`task-row-${task.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
                  task.completed && "opacity-50",
                  style.transform && !style.transform.includes("translate(0") && "bg-muted/50"
                )}
              >
                <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} data-testid={`checkbox-${task.id}`} />
                <div className="h-2 w-2 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", task.completed && "line-through")}>{task.task}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(task.date), "d MMM")} • {task.startTime}–{task.endTime}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs border hidden sm:flex", getSubjectColor(task.subject))}>{task.subject}</Badge>
                                {task.pomodoroSessions > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-400 hidden md:flex">
                    <Flame className="h-3 w-3" />{task.pomodoroSessions}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(task)} className="text-muted-foreground hover:text-foreground transition-colors p-1" data-testid={`edit-task-${task.id}`}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" data-testid={`delete-task-${task.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Task" : "Add Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Task Name</Label><Input value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="e.g. Electrostatics revision" data-testid="input-task-name" /></div>
              <div>
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} list="subjects-dl" placeholder="Subject" />
                  <datalist id="subjects-dl">{subjects.map(s => <option key={s} value={s} />)}</datalist>
                </div>
              <div className="space-y-4">
      <div className="bg-white/[0.03] dark:bg-white/[0.05] rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setForm(f => ({ ...f, date: format(new Date(), "yyyy-MM-dd") }))} className="px-3 py-2 text-sm font-medium rounded hover:bg-white/[0.05] dark:hover:bg-white/[0.1] transition-all duration-200">Today</button>
          <button onClick={() => setForm(f => ({ ...f, date: format(addDays(new Date(), 1), "yyyy-MM-dd") }))} className="px-3 py-2 text-sm font-medium rounded hover:bg-white/[0.05] dark:hover:bg-white/[0.1] transition-all duration-200">Tomorrow</button>
          <button onClick={() => {
              const today = new Date();
              const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
              const diff = (0 - day + 7) % 7; // Days until next Sunday
              const nextSunday = addDays(today, diff);
              setForm(f => ({ ...f, date: format(nextSunday, "yyyy-MM-dd") }));
            }} className="px-3 py-2 text-sm font-medium rounded hover:bg-white/[0.05] dark:hover:bg-white/[0.1] transition-all duration-200">Sunday</button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Date</Label>
        <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-sm" />
      </div>
    </div>
              <div className="space-y-8">
              <div className="bg-white/[0.03] dark:bg-white/[0.05] rounded-lg p-5">
                <Label className="text-sm font-medium text-muted-foreground mb-2">Start Time</Label>
                <div>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="input-sm input-lg"
                    onFocus={() => setShowStartTimeOptions(true)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStartTimeOptions(true);
                    }}
                  />
                </div>
                {showStartTimeOptions && (
                  <div className="mt-5">
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Quick Times</div>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "09:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">9:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "10:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">10:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "11:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">11:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "12:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">12:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "13:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">13:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "14:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">14:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "15:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">15:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, startTime: "16:00" }));
                          setShowStartTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">16:00</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-px bg-white/[0.1] dark:bg-white/[0.2] my-8" />
              <div className="bg-white/[0.03] dark:bg-white/[0.05] rounded-lg p-5">
                <Label className="text-sm font-medium text-muted-foreground mb-2">End Time</Label>
                <div>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="input-sm input-lg"
                    onFocus={() => setShowEndTimeOptions(true)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEndTimeOptions(true);
                    }}
                  />
                </div>
                {showEndTimeOptions && (
                  <div className="mt-5">
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Quick Times</div>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "09:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">9:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "10:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">10:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "11:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">11:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "12:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">12:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "13:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">13:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "14:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">14:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "15:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">15:00</button>
                        <button onClick={() => {
                          setForm(f => ({ ...f, endTime: "16:00" }));
                          setShowEndTimeOptions(false);
                        }} className="px-3 py-2 text-sm rounded hover:bg-white/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200">16:00</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
              <div>
                <Label>Quadrant</Label>
                <Select value={form.quadrant} onValueChange={v => setForm(f => ({ ...f, quadrant: v as Task["quadrant"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent-important">Urgent + Important</SelectItem>
                    <SelectItem value="not-urgent-important">Not Urgent + Important</SelectItem>
                    <SelectItem value="urgent-not-important">Urgent + Not Important</SelectItem>
                    <SelectItem value="neither">Neither</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleSave} data-testid="button-save-task">{editing ? "Save Changes" : "Add Task"}</Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
