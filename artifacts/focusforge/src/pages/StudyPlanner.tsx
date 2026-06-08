import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Plus, Trash2, BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/StoreContext";
import { Subject } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#7C3AED", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#F97316",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudyPlanner() {
  const { tasks, settings, setSettings } = useStore();
  const { toast } = useToast();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [subjects, setSubjects] = useState<Subject[]>(() => settings.subjects ?? []);
  const [newSubject, setNewSubject] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [plan, setPlan] = useState<Record<string, Record<string, number>>>(() => settings.studyPlan ?? {});

  // Keep settings in sync whenever subjects or plan change
  useEffect(() => {
    setSettings(prev => ({ ...prev, subjects, studyPlan: plan }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, plan]);

  const addSubject = () => {
    if (!newSubject.trim()) return;
    if (subjects.some(s => s.name.toLowerCase() === newSubject.trim().toLowerCase())) return;
    setSubjects(prev => [...prev, { name: newSubject.trim(), color: newColor }]);
    setNewSubject("");
    setNewColor(PALETTE[(subjects.length + 1) % PALETTE.length]);
  };

  const removeSubject = (name: string) => {
    setSubjects(prev => prev.filter(s => s.name !== name));
    setPlan(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const setCell = (subject: string, dayStr: string, val: number) => {
    setPlan(prev => ({
      ...prev,
      [subject]: { ...(prev[subject] || {}), [dayStr]: val },
    }));
  };

  const generateFromTasks = () => {
    const newPlan: Record<string, Record<string, number>> = {};

    // Ensure any task subjects exist in subjects list
    const existingNames = new Set(subjects.map(s => s.name));
    const newSubjects = [...subjects];
    tasks.forEach(task => {
      if (task.subject && !existingNames.has(task.subject)) {
        existingNames.add(task.subject);
        newSubjects.push({ name: task.subject, color: PALETTE[newSubjects.length % PALETTE.length] });
      }
    });
    if (newSubjects.length !== subjects.length) setSubjects(newSubjects);

    tasks.forEach(task => {
      const dayStr = task.date;
      const dayObj = new Date(dayStr + "T00:00:00");
      const dayOfWeek = (dayObj.getDay() + 6) % 7; // Mon=0
      if (dayOfWeek < 7) {
        const dStr = format(addDays(weekStart, dayOfWeek), "yyyy-MM-dd");
        const [sh, sm] = task.startTime.split(":").map(Number);
        const [eh, em] = task.endTime.split(":").map(Number);
        const hrs = (eh * 60 + em - (sh * 60 + sm)) / 60;
        if (!newPlan[task.subject]) newPlan[task.subject] = {};
        newPlan[task.subject][dStr] = (newPlan[task.subject][dStr] || 0) + Math.round(hrs * 10) / 10;
      }
    });
    setPlan(newPlan);
    toast({ title: "Generated from tasks", description: "Planner filled with scheduled task hours." });
  };

  const colTotal = (dayStr: string) => subjects.reduce((a, s) => a + (plan[s.name]?.[dayStr] || 0), 0);
  const rowTotal = (sub: string) => weekDays.reduce((a, d) => a + (plan[sub]?.[format(d, "yyyy-MM-dd")] || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Subject Management */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Subjects</span>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={generateFromTasks} data-testid="button-generate">
              <RefreshCw className="h-3 w-3" />
              Generate from Tasks
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => (
              <div key={s.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/30 group">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-sm font-medium">{s.name}</span>
                <button onClick={() => removeSubject(s.name)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" data-testid={`remove-subject-${s.name}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No subjects yet — add one below.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer bg-transparent" />
            <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="New subject name" className="flex-1" onKeyDown={e => e.key === "Enter" && addSubject()} data-testid="input-new-subject" />
            <Button size="sm" className="gap-1" onClick={addSubject} data-testid="button-add-subject">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Planner Grid */}
      <Card className="bg-card border-border overflow-x-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Weekly Planner — {format(weekStart, "d MMM")} to {format(addDays(weekStart, 6), "d MMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Add subjects above to start planning your week.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground w-32">Subject</th>
                    {weekDays.map((d, i) => (
                      <th key={i} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground min-w-16">
                        <div>{DAYS[i]}</div>
                        <div className="text-muted-foreground/60">{format(d, "d")}</div>
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.name} className="border-t border-border">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="font-medium truncate">{s.name}</span>
                        </div>
                      </td>
                      {weekDays.map((d, i) => {
                        const dayStr = format(d, "yyyy-MM-dd");
                        const val = plan[s.name]?.[dayStr] || 0;
                        return (
                          <td key={i} className="py-1 px-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={12}
                              step={0.5}
                              value={val || ""}
                              onChange={e => setCell(s.name, dayStr, Number(e.target.value))}
                              className="w-14 h-8 text-center text-sm bg-muted border border-border rounded-md focus:outline-none focus:border-primary tabular-nums"
                              placeholder="0"
                              data-testid={`cell-${s.name}-${dayStr}`}
                            />
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center font-mono font-medium text-sm text-primary">
                        {rowTotal(s.name).toFixed(1)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 pr-4 text-xs font-semibold text-muted-foreground">Daily Total</td>
                    {weekDays.map((d, i) => (
                      <td key={i} className="py-2 px-2 text-center text-xs font-mono font-semibold text-muted-foreground">
                        {colTotal(format(d, "yyyy-MM-dd")).toFixed(1)}h
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center text-xs font-mono font-bold text-primary">
                      {weekDays.reduce((a, d) => a + colTotal(format(d, "yyyy-MM-dd")), 0).toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
