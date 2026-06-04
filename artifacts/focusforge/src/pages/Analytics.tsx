import { useMemo } from "react";
import { format, startOfWeek, addDays, subDays, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { useStore } from "@/lib/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Flame, BookOpen, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["hsl(263,70%,50%)", "hsl(186,94%,42%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(217,91%,60%)", "hsl(330,80%,60%)"];

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold font-mono">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { sessions, tasks, settings } = useStore();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekData = weekDays.map(day => {
    const str = format(day, "yyyy-MM-dd");
    const mins = sessions.filter(s => s.date === str).reduce((a, s) => a + s.durationMinutes, 0);
    return { day: format(day, "EEE"), mins, hours: +(mins / 60).toFixed(1) };
  });

  const subjectMap: Record<string, number> = {};
  sessions.forEach(s => { subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.durationMinutes; });
  const pieData = Object.entries(subjectMap).map(([name, mins]) => ({ name, value: mins, hours: +(mins / 60).toFixed(1) }));

  const totalMinutes = sessions.reduce((a, s) => a + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalPomodoros = sessions.filter(s => s.type === "pomodoro").length;
  const mostStudied = pieData.sort((a, b) => b.value - a.value)[0]?.name || "—";

  const last28 = Array.from({ length: 28 }, (_, i) => {
    const d = subDays(new Date(), 27 - i);
    const str = format(d, "yyyy-MM-dd");
    const mins = sessions.filter(s => s.date === str).reduce((a, s) => a + s.durationMinutes, 0);
    return { date: str, day: format(d, "d"), mins };
  });

  const subjectRows = Object.entries(subjectMap).map(([subject, mins]) => ({
    subject,
    hours: +(mins / 60).toFixed(1),
    sessions: sessions.filter(s => s.subject === subject).length,
    avg: +(mins / Math.max(sessions.filter(s => s.subject === subject).length, 1) / 60).toFixed(1),
  })).sort((a, b) => b.hours - a.hours);

  const weekGoalMins = settings.dailyGoalMinutes * 7;
  const weekActualMins = weekData.reduce((a, d) => a + d.mins, 0);
  const weekGoalPct = Math.min(Math.round((weekActualMins / weekGoalMins) * 100), 100);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-primary">{payload[0].value}h</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Total Study Hours" value={`${totalHours}h`} color="bg-primary/10 text-primary" />
        <StatCard icon={Flame} label="Current Streak" value={`${settings.currentStreak}d`} color="bg-amber-500/10 text-amber-400" />
        <StatCard icon={BookOpen} label="Most Studied" value={mostStudied} color="bg-cyan-500/10 text-cyan-400" />
        <StatCard icon={Timer} label="Total Pomodoros" value={`${totalPomodoros}`} color="bg-emerald-500/10 text-emerald-400" />
      </div>

      {/* Weekly Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Study Time This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Time by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No study sessions recorded yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65}>
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${(v / 60).toFixed(1)}h`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {pieData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate flex-1">{d.name}</span>
                      <span className="text-muted-foreground">{d.hours}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Streak Heatmap */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">28-Day Study Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 flex-wrap">
            {last28.map(d => {
              const intensity = d.mins === 0 ? 0 : d.mins < 60 ? 1 : d.mins < 180 ? 2 : d.mins < 360 ? 3 : 4;
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${(d.mins / 60).toFixed(1)}h`}
                  className={cn("h-7 w-7 rounded-sm transition-colors", [
                    "bg-muted",
                    "bg-primary/20",
                    "bg-primary/40",
                    "bg-primary/70",
                    "bg-primary",
                  ][intensity])}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 justify-end">
            {["None", "<1h", "1-3h", "3-6h", "6h+"].map((l, i) => (
              <div key={l} className="flex items-center gap-1">
                <div className={cn("h-3 w-3 rounded-sm", ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/70", "bg-primary"][i])} />
                <span className="text-xs text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Goal + Subject Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Weekly Goal Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{(weekActualMins / 60).toFixed(1)}h studied</span>
              <span className="text-muted-foreground">{(weekGoalMins / 60).toFixed(0)}h goal</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${weekGoalPct}%` }} />
            </div>
            <p className="text-sm font-semibold">{weekGoalPct}% of weekly goal</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Subject Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-1 border-b border-border">
                <span className="col-span-2">Subject</span><span>Hours</span><span>Sessions</span>
              </div>
              {subjectRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
              ) : subjectRows.map((r, i) => (
                <div key={r.subject} className="grid grid-cols-4 text-xs py-1.5 border-b border-border/50 last:border-0">
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate">{r.subject}</span>
                  </div>
                  <span className="font-mono">{r.hours}h</span>
                  <span className="text-muted-foreground">{r.sessions}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
