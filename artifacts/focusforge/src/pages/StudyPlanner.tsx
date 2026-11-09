import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Plus, Trash, BookOpen, ArrowsClockwise } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/StoreContext";
import { Subject } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#4285F4", 
  "#EA4335", 
  "#FBBC05",
  "#34A853", 
  "#8B5CF6",
  "#0EA5E9",
  "#F97316", 
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

  const addSubject = () => {
    if (!newSubject.trim()) return;
    if (subjects.some(s => s.name.toLowerCase() === newSubject.trim().toLowerCase())) return;
    
    const updatedSubjects = [...subjects, { name: newSubject.trim(), color: newColor }];
    setSubjects(updatedSubjects);
    setSettings(prev => ({ ...prev, subjects: updatedSubjects }));
    
    setNewSubject("");
    setNewColor(PALETTE[(updatedSubjects.length) % PALETTE.length]);
  };

  const removeSubject = (name: string) => {
    const updatedSubjects = subjects.filter(s => s.name !== name);
    setSubjects(updatedSubjects);
    
    setPlan(prev => {
      const next = { ...prev };
      delete next[name];
      setSettings(prevSettings => ({ ...prevSettings, subjects: updatedSubjects, studyPlan: next }));
      return next;
    });
  };

  const setCell = (subject: string, dayStr: string, val: number) => {
    setPlan(prev => {
      const next = {
        ...prev,
        [subject]: { ...(prev[subject] || {}), [dayStr]: val },
      };
      setSettings(prevSettings => ({ ...prevSettings, studyPlan: next }));
      return next;
    });
  };

  const generateFromTasks = () => {
    const newPlan: Record<string, Record<string, number>> = {};
    const existingNames = new Set(subjects.map(s => s.name));
    const newSubjects = [...subjects];
    
    tasks.forEach(task => {
      if (task.subject && !existingNames.has(task.subject)) {
        existingNames.add(task.subject);
        newSubjects.push({ name: task.subject, color: PALETTE[newSubjects.length % PALETTE.length] });
      }
    });
    
    if (newSubjects.length !== subjects.length) {
      setSubjects(newSubjects);
    }

    tasks.forEach(task => {
      const dayStr = task.date;
      const dayObj = new Date(dayStr + "T00:00:00");
      const dayOfWeek = (dayObj.getDay() + 6) % 7; 
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
    setSettings(prev => ({ ...prev, subjects: newSubjects, studyPlan: newPlan }));
    toast({ title: "Generated from tasks", description: "Planner filled with scheduled task hours." });
  };

  const colTotal = (dayStr: string) => subjects.reduce((a, s) => a + (plan[s.name]?.[dayStr] || 0), 0);
  const rowTotal = (sub: string) => weekDays.reduce((a, d) => a + (plan[sub]?.[format(d, "yyyy-MM-dd")] || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 pt-2">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-white">
            Study Planner
          </h1>
          <span className="text-sm text-zinc-400 font-medium">
            {format(weekStart, "MMMM d")} – {format(addDays(weekStart, 6), "MMMM d, yyyy")}
          </span>
        </div>
        <Button 
          className="h-10 rounded-full bg-white text-black hover:bg-zinc-200 gap-2 font-semibold shadow-lg shadow-white/10 transition-all active:scale-95" 
          onClick={generateFromTasks}
        >
          <ArrowsClockwise className="h-4 w-4" weight="bold" />
          Auto-Fill from Tasks
        </Button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ bounce: 0, duration: 0.4 }}
        className="rounded-[2rem] border border-white/[0.08] bg-[#0c0c0c] shadow-2xl p-6 md:p-8 backdrop-blur-xl"
      >
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <AnimatePresence mode="popLayout">
              {subjects.map(s => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  key={s.name} 
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white group backdrop-blur-md"
                >
                  <div className="h-3 w-3 rounded-full shadow-inner flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}60` }} />
                  <span className="text-sm font-medium tracking-tight">{s.name}</span>
                  <button onClick={() => removeSubject(s.name)} className="ml-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all">
                    <Trash className="h-3.5 w-3.5" weight="fill" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {subjects.length === 0 && <p className="text-sm text-zinc-500 py-2">No subjects tracked yet.</p>}
          </div>

          <div className="flex items-center gap-3 bg-white/[0.03] p-1.5 rounded-full border border-white/[0.08]">
            <div className="relative h-8 w-8 ml-1 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-white/20" style={{ backgroundColor: newColor }} />
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
            <Input 
              value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubject()} 
              placeholder="Add subject..." 
              className="w-32 md:w-48 h-9 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 text-sm text-white placeholder:text-zinc-600" 
            />
            <Button size="icon" className="h-9 w-9 rounded-full bg-white text-black hover:bg-zinc-200 flex-shrink-0" onClick={addSubject}>
              <Plus className="h-4 w-4" weight="bold" />
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ bounce: 0, duration: 0.4, delay: 0.1 }}
        className="rounded-[2rem] border border-white/[0.08] bg-[#0c0c0c] shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <BookOpen className="h-12 w-12 mb-4 opacity-20" weight="duotone" />
            <p className="text-sm font-medium">Your study board is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="text-left py-4 pl-6 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest w-48">Subject</th>
                  {weekDays.map((d, i) => (
                    <th key={i} className="text-center py-4 px-2 min-w-[80px]">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">{DAYS[i]}</div>
                      <div className={cn("text-sm font-medium", isSameDay(d, new Date()) ? "text-white" : "text-zinc-400")}>{format(d, "d")}</div>
                    </th>
                  ))}
                  <th className="text-center py-4 pr-6 pl-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {subjects.map(s => (
                  <tr key={s.name} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}80` }} />
                        <span className="font-medium text-white truncate tracking-tight">{s.name}</span>
                      </div>
                    </td>
                    {weekDays.map((d, i) => {
                      const dayStr = format(d, "yyyy-MM-dd");
                      const val = plan[s.name]?.[dayStr] || 0;
                      return (
                        <td key={i} className="p-1">
                          <div className="flex justify-center">
                            <input
                              type="number" min={0} max={24} step={0.5} value={val || ""}
                              onChange={e => setCell(s.name, dayStr, Number(e.target.value))}
                              placeholder="-"
                              className="w-16 h-10 text-center text-sm font-mono rounded-lg bg-transparent border border-transparent text-zinc-300 transition-all tabular-nums hover:bg-white/[0.04] focus:bg-white/[0.08] focus:border-white/[0.2] focus:text-white focus:outline-none placeholder:text-zinc-700"
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 pr-6 pl-2 text-center font-mono font-medium text-sm text-zinc-300 tracking-tight">
                      {rowTotal(s.name) > 0 ? `${rowTotal(s.name).toFixed(1)}h` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/[0.02] border-t border-white/[0.08]">
                <tr>
                  <td className="py-4 pl-6 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Daily Load</td>
                  {weekDays.map((d, i) => {
                    const total = colTotal(format(d, "yyyy-MM-dd"));
                    return (
                      <td key={i} className={cn("py-4 px-2 text-center text-sm font-mono font-semibold tracking-tight", total > 0 ? "text-white" : "text-zinc-600")}>
                        {total > 0 ? `${total.toFixed(1)}h` : "-"}
                      </td>
                    );
                  })}
                  <td className="py-4 pr-6 pl-2 text-center text-sm font-mono font-bold text-white tracking-tight">
                    {weekDays.reduce((a, d) => a + colTotal(format(d, "yyyy-MM-dd")), 0).toFixed(1)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}