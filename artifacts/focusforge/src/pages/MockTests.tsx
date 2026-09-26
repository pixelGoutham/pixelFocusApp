import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MockTest } from "@/lib/store";

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const EMPTY = { name: "", subject: "", score: "", totalQuestions: "", date: format(new Date(), "yyyy-MM-dd"), notes: "" };

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
      score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
      score >= 60 ? "bg-amber-500/20 text-amber-400" :
      "bg-rose-500/20 text-rose-400"
    )}>
      {score}%
    </span>
  );
}

export default function MockTests() {
  const { mockTests, setMockTests, tasks } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const subjects = Array.from(new Set([...tasks.map(t => t.subject), ...mockTests.map(t => t.subject)])).filter(Boolean);

  const handleAdd = () => {
    if (!form.name.trim() || !form.score) return;
    const test: MockTest = {
      id: uid(),
      name: form.name,
      subject: form.subject || "General",
      score: Number(form.score),
      totalQuestions: Number(form.totalQuestions) || 0,
      date: form.date,
      notes: form.notes,
    };
    setMockTests(prev => [...prev, test]);
    toast({ title: "Test recorded" });
    setOpen(false);
    setForm(EMPTY);
  };

  const deleteTest = (id: string) => {
    setMockTests(prev => prev.filter(t => t.id !== id));
    toast({ title: "Test deleted" });
  };

  // Chart data per subject
  const subjectMap: Record<string, MockTest[]> = {};
  mockTests.forEach(t => { (subjectMap[t.subject] = subjectMap[t.subject] || []).push(t); });
  const chartSubject = Object.keys(subjectMap)[0] || "";
  const chartData = (subjectMap[chartSubject] || [])
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => ({ date: format(parseISO(t.date), "d MMM"), score: t.score, name: t.name }));

  const sorted = [...mockTests].sort((a, b) => b.date.localeCompare(a.date));
  const avg = mockTests.length ? Math.round(mockTests.reduce((a, t) => a + t.score, 0) / mockTests.length) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {mockTests.length} tests recorded · Average: {avg}%
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)} data-testid="button-add-test">
          <Plus className="h-4 w-4" />
          Add Test Result
        </Button>
      </div>

      {/* Score trend chart */}
      {chartData.length >= 2 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Trend — {chartSubject}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tests Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No test results yet. Record your first one.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map(test => (
                <div key={test.id} data-testid={`test-row-${test.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{test.name}</p>
                    <p className="text-xs text-muted-foreground">{test.subject} · {format(parseISO(test.date), "d MMM yyyy")}{test.totalQuestions ? ` · ${test.totalQuestions} Qs` : ""}</p>
                    {test.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate italic">{test.notes}</p>}
                  </div>
                  <ScoreBadge score={test.score} />
                  <button onClick={() => deleteTest(test.id)} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`delete-test-${test.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 max-w-md w-full bg-background border border-border shadow-lg rounded-xl">
            <DialogHeader><DialogTitle>Add Test Result</DialogTitle></DialogHeader>
            <div className="space-y-4 p-1">
              <div><Label>Test Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Physics Unit Test 2" data-testid="input-test-name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} list="subjects-mt" placeholder="Subject" />
                  <datalist id="subjects-mt">{subjects.map(s => <option key={s} value={s} />)}</datalist>
                </div>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Score (%)</Label><Input type="number" min={0} max={100} value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} placeholder="0–100" data-testid="input-score" /></div>
                <div><Label>Total Questions</Label><Input type="number" min={0} value={form.totalQuestions} onChange={e => setForm(f => ({ ...f, totalQuestions: e.target.value }))} placeholder="Optional" /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What went well? What to improve?" rows={3} /></div>
              <Button className="w-full" onClick={handleAdd} data-testid="button-save-test">Save Test Result</Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}