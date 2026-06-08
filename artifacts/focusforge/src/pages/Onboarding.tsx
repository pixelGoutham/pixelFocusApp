import { useState } from "react";
import { Zap, Clock, Plus, Trash2, BookOpen, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/StoreContext";
import { Subject } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays } from "date-fns";

const PALETTE = [
  "#7C3AED", "#3B82F6", "#06B6D4", "#22C55E",
  "#F59E0B", "#EF4444", "#EC4899", "#F97316",
  "#8B5CF6", "#14B8A6", "#84CC16", "#F43F5E",
];

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const variants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * 60, opacity: 0 }),
};

export default function Onboarding() {
  const { settings, setSettings } = useStore();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(480);

  // Step 2
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [newSubject, setNewSubject] = useState("");

  // Step 3 — plan[subjectName][dayShort] = hours
  const [plan, setPlan] = useState<Record<string, Record<string, number>>>({});

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (subjects.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    const nextColor = PALETTE[subjects.length % PALETTE.length];
    setSubjects(prev => [...prev, { name: trimmed, color: selectedColor }]);
    setNewSubject("");
    setSelectedColor(nextColor);
  };

  const removeSubject = (name: string) => {
    setSubjects(prev => prev.filter(s => s.name !== name));
    setPlan(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const setCell = (subject: string, day: string, val: number) => {
    setPlan(prev => ({
      ...prev,
      [subject]: { ...(prev[subject] ?? {}), [day]: val },
    }));
  };

  const handleFinish = () => {
    if (!name.trim()) return;

    // Convert day-name keys → current-week date keys for the planner
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const datePlan: Record<string, Record<string, number>> = {};
    for (const [subj, dayMap] of Object.entries(plan)) {
      datePlan[subj] = {};
      DAYS_SHORT.forEach((day, i) => {
        const hrs = dayMap[day];
        if (hrs && hrs > 0) {
          datePlan[subj][format(addDays(weekStart, i), "yyyy-MM-dd")] = hrs;
        }
      });
    }

    setSettings({
      ...settings,
      userName: name.trim(),
      dailyGoalMinutes: goal,
      subjects,
      studyPlan: datePlan,
      onboardingDone: true,
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-xl">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-border"
              )}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="p-8 md:p-10"
              >
                <div className="flex flex-col items-center gap-2 mb-8">
                  <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 mb-2">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Welcome to Pixel</h1>
                  <p className="text-sm text-muted-foreground text-center">
                    Your offline productivity OS. Study. Plan. Focus. Achieve.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      What should we call you?
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Arjun"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && name.trim() && goTo(2)}
                      className="h-11"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Daily study goal
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={60}
                        max={720}
                        step={30}
                        value={goal}
                        onChange={e => setGoal(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-sm font-mono font-semibold w-14 text-right tabular-nums">
                        {(goal / 60).toFixed(1)}h
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 font-semibold gap-2"
                    onClick={() => goTo(2)}
                    disabled={!name.trim()}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="p-8 md:p-10"
              >
                <div className="mb-7">
                  <h2 className="text-xl font-bold tracking-tight">What do you study?</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add the subjects you study. You can always change these later.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Add subject row */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PALETTE.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={cn(
                            "h-6 w-6 rounded-full border-2 transition-transform",
                            selectedColor === c ? "border-white scale-110" : "border-transparent"
                          )}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="h-10 w-10 rounded-md flex-shrink-0 flex items-center justify-center border border-border" style={{ background: selectedColor + "33" }}>
                        <div className="h-3 w-3 rounded-full" style={{ background: selectedColor }} />
                      </div>
                      <Input
                        placeholder="e.g. Physics, Maths, History…"
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addSubject()}
                        className="flex-1"
                      />
                      <Button size="sm" className="h-10 px-4 gap-1 flex-shrink-0" onClick={addSubject} disabled={!newSubject.trim()}>
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Subject chips */}
                  <div className="min-h-16">
                    {subjects.length === 0 ? (
                      <div className="flex items-center justify-center h-16 border border-dashed border-border rounded-lg">
                        <p className="text-xs text-muted-foreground">No subjects yet — add some above</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {subjects.map(s => (
                          <motion.div
                            key={s.name}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-border bg-muted/30 group"
                          >
                            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                            <span className="text-sm font-medium">{s.name}</span>
                            <button
                              onClick={() => removeSubject(s.name)}
                              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button variant="ghost" className="flex-1" onClick={() => goTo(1)}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 gap-2 font-semibold"
                      onClick={() => goTo(3)}
                    >
                      {subjects.length === 0 ? "Skip for now" : "Next"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="p-8 md:p-10"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold tracking-tight">Plan your typical week</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    How many hours per subject per day? You can fine-tune this anytime in Study Planner.
                  </p>
                </div>

                {subjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-border rounded-xl mb-6">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No subjects added — you can plan later.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border mb-6">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground w-28">Subject</th>
                          {DAYS_SHORT.map(d => (
                            <th key={d} className="text-center py-2.5 px-1 text-xs font-semibold text-muted-foreground min-w-[50px]">{d}</th>
                          ))}
                          <th className="text-center py-2.5 px-2 text-xs font-semibold text-primary">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((s, si) => {
                          const rowTotal = DAYS_SHORT.reduce((a, d) => a + (plan[s.name]?.[d] ?? 0), 0);
                          return (
                            <tr key={s.name} className={cn("border-b border-border last:border-b-0", si % 2 === 0 ? "" : "bg-muted/10")}>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                                  <span className="font-medium text-xs truncate max-w-[80px]">{s.name}</span>
                                </div>
                              </td>
                              {DAYS_SHORT.map(day => (
                                <td key={day} className="py-1 px-0.5 text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={12}
                                    step={0.5}
                                    value={plan[s.name]?.[day] || ""}
                                    onChange={e => setCell(s.name, day, Number(e.target.value))}
                                    className="w-11 h-8 text-center text-xs bg-muted border border-border rounded-md focus:outline-none focus:border-primary tabular-nums"
                                    placeholder="0"
                                  />
                                </td>
                              ))}
                              <td className="py-2 px-2 text-center font-mono font-bold text-xs text-primary">
                                {rowTotal > 0 ? rowTotal.toFixed(1) + "h" : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={() => goTo(2)}>
                    Back
                  </Button>
                  <Button className="flex-1 gap-2 font-semibold h-11" onClick={handleFinish}>
                    <Check className="h-4 w-4" />
                    Get Started
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          100% offline · no account required · data stays on your device
        </p>
      </div>
    </div>
  );
}
