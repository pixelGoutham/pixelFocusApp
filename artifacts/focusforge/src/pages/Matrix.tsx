import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";
import type { Task } from "@/lib/store";

type Quadrant = Task["quadrant"];

const QUADRANTS: { key: Quadrant; label: string; sub: string; color: string; accent: string }[] = [
  { key: "urgent-important", label: "Urgent + Important", sub: "Do First", color: "border-rose-500/40 bg-rose-500/5", accent: "bg-rose-500/20 text-rose-300" },
  { key: "not-urgent-important", label: "Not Urgent + Important", sub: "Schedule", color: "border-blue-500/40 bg-blue-500/5", accent: "bg-blue-500/20 text-blue-300" },
  { key: "urgent-not-important", label: "Urgent + Not Important", sub: "Delegate", color: "border-amber-500/40 bg-amber-500/5", accent: "bg-amber-500/20 text-amber-300" },
  { key: "neither", label: "Neither", sub: "Eliminate", color: "border-zinc-600/40 bg-zinc-800/30", accent: "bg-zinc-700 text-zinc-400" },
];

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function Matrix() {
  const { tasks, setTasks } = useStore();
  const { toast } = useToast();
  const [addingTo, setAddingTo] = useState<Quadrant | null>(null);
  const [form, setForm] = useState({ task: "", subject: "", date: format(new Date(), "yyyy-MM-dd"), priority: "Medium" as Task["priority"] });

  const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);
  const incomplete = tasks.filter(t => !t.completed);

  const handleAdd = () => {
    if (!form.task.trim() || !addingTo) return;
    const newTask: Task = {
      id: uid(),
      date: form.date,
      startTime: "09:00",
      endTime: "10:00",
      subject: form.subject || "General",
      task: form.task,
      priority: form.priority,
      quadrant: addingTo,
      completed: false,
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    toast({ title: "Task added" });
    setAddingTo(null);
    setForm({ task: "", subject: "", date: format(new Date(), "yyyy-MM-dd"), priority: "Medium" });
  };

  const moveTask = (taskId: string, newQuadrant: Quadrant) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, quadrant: newQuadrant } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast({ title: "Task removed" });
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-2 grid-rows-2 gap-3">
      {QUADRANTS.map(q => {
        const qTasks = incomplete.filter(t => t.quadrant === q.key);
        return (
          <div
            key={q.key}
            data-testid={`quadrant-${q.key}`}
            className={cn("rounded-xl border p-4 flex flex-col gap-3 overflow-hidden", q.color)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const taskId = e.dataTransfer.getData("taskId");
              if (taskId) moveTask(taskId, q.key);
            }}
          >
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-sm">{q.label}</h3>
                <p className={cn("text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block", q.accent)}>{q.sub}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setAddingTo(q.key)}
                data-testid={`add-task-${q.key}`}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1">
              {qTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Drop tasks here</p>
              ) : qTasks.map(task => (
                <div
                  key={task.id}
                  data-testid={`matrix-task-${task.id}`}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
                  className="group bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{task.task}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(task.date), "d MMM")} • {task.startTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className={cn("text-xs border", getSubjectColor(task.subject))}>{task.subject}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex-shrink-0">{qTasks.length} task{qTasks.length !== 1 ? "s" : ""}</p>
          </div>
        );
      })}

      <Dialog open={!!addingTo} onOpenChange={() => setAddingTo(null)}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
            <DialogHeader>
              <DialogTitle>Add Task to {QUADRANTS.find(q => q.key === addingTo)?.label}</DialogTitle>
            </DialogHeader>
          <div className="space-y-4">
            <div><Label>Task</Label><Input value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="Task description" data-testid="input-matrix-task" /></div>
            <div>
              <Label>Subject</Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
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
            <Button className="w-full" onClick={handleAdd} data-testid="button-confirm-add">Add Task</Button>
          </div>
        </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
