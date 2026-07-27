import React from "react";
import { 
  Play, 
  Calendar as CalendarIcon, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Circle,
  Flame,
  Clock,
  Target,
  BarChart,
  BookOpen
} from "lucide-react";

const tasks = [
  { id: 1, title: "Physics — Chapter 12 Revision", done: false, priority: "high" },
  { id: 2, title: "Chemistry — DPP Set 5", done: false, priority: "medium" },
  { id: 3, title: "Math Mock Test (2 hrs)", done: false, priority: "high" },
  { id: 4, title: "Review past mistakes", done: true, priority: "low" },
  { id: 5, title: "Biology diagram practice", done: false, priority: "low" },
  { id: 6, title: "Physics numericals", done: true, priority: "high" },
  { id: 7, title: "English reading", done: true, priority: "low" },
  { id: 8, title: "Math formulas revision", done: false, priority: "medium" },
];

export function CommandCentre() {
  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-auto font-sans antialiased selection:bg-amber-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-12">
        
        {/* HERO ZONE */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-stretch">
          
          {/* LEFT: 60% */}
          <div className="flex-1 space-y-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm font-medium text-white/50 tracking-wide uppercase">
                <span className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <Flame size={14} /> 14 day streak
                </span>
                <span>Thursday, Oct 24</span>
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
                  JEE Main · 47 days
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white/90">
                Good morning, Arjun
              </h1>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl shadow-black/50">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-semibold text-white/80">Today's Mission</h2>
                  <p className="text-white/40 text-sm mt-1">Your top priorities to crush today.</p>
                </div>
              </div>

              <div className="space-y-3">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
                    <div className="mt-0.5">
                      <Circle size={18} className="text-white/20 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 font-medium group-hover:text-white transition-colors">{task.title}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${task.priority === 'high' ? 'bg-amber-500' : task.priority === 'medium' ? 'bg-white/40' : 'bg-white/20'}`} />
                  </div>
                ))}
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-4 px-6 rounded-xl transition-all active:scale-[0.98]">
                <Play size={18} className="fill-black" />
                Continue Studying
              </button>
            </div>
          </div>

          {/* RIGHT: 40% */}
          <div className="lg:w-[40%] flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#151515] to-[#0d0d0d] border border-white/5 rounded-3xl relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative w-64 h-64 flex items-center justify-center mb-8">
              {/* SVG Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="128" cy="128" r="120" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="128" cy="128" r="120" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="753.98" strokeDashoffset="200" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              </svg>
              
              <div className="text-center z-10">
                <div className="text-6xl font-bold tracking-tighter text-white font-mono">25:00</div>
                <div className="text-amber-500 font-medium tracking-widest uppercase text-sm mt-2 flex items-center justify-center gap-2">
                  <BookOpen size={14} /> Physics
                </div>
              </div>
            </div>

            <p className="text-white/40 text-sm text-center">Resume yesterday's session</p>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-3 p-4 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60">
              <Plus size={20} />
            </div>
            <span className="text-sm font-medium text-white/70">New Task</span>
          </button>
          <button className="flex flex-col items-center gap-3 p-4 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Play size={20} className="fill-amber-500" />
            </div>
            <span className="text-sm font-medium text-amber-500">Start Timer</span>
          </button>
          <button className="flex flex-col items-center gap-3 p-4 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60">
              <CalendarIcon size={20} />
            </div>
            <span className="text-sm font-medium text-white/70">Calendar</span>
          </button>
          <button className="flex flex-col items-center gap-3 p-4 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60">
              <FileText size={20} />
            </div>
            <span className="text-sm font-medium text-white/70">Mock Test</span>
          </button>
        </div>

        {/* BOTTOM SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Progress Snapshot */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white/80">Snapshot</h3>
            <div className="space-y-4">
              <div className="bg-[#151515] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white/90">4.5h</div>
                  <div className="text-sm text-white/40">Study hours today</div>
                </div>
              </div>
              <div className="bg-[#151515] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Flame size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white/90">6/7</div>
                  <div className="text-sm text-white/40">Weekly streak</div>
                </div>
              </div>
              <div className="bg-[#151515] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Target size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white/90">8/12</div>
                  <div className="text-sm text-white/40">Tasks done</div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Heatmap */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timeline */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white/80">Timeline</h3>
              <div className="bg-[#151515] p-6 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4 text-xs font-mono text-white/40 mb-2">
                  <span>9am</span>
                  <span>12pm</span>
                  <span>3pm</span>
                  <span>6pm</span>
                  <span>9pm</span>
                </div>
                <div className="h-12 w-full bg-black/50 rounded-lg flex overflow-hidden border border-white/5 relative">
                  {/* Timeline blocks */}
                  <div className="absolute left-[10%] w-[15%] h-full bg-blue-500/20 border-l border-blue-500/50" title="Physics"></div>
                  <div className="absolute left-[30%] w-[20%] h-full bg-purple-500/20 border-l border-purple-500/50" title="Math"></div>
                  <div className="absolute left-[60%] w-[10%] h-full bg-amber-500/20 border-l border-amber-500/50" title="Chemistry"></div>
                  
                  {/* Current time indicator */}
                  <div className="absolute left-[45%] top-0 bottom-0 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"></div>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white/80">Consistency</h3>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-white/5"></div>
                    <div className="w-3 h-3 rounded-sm bg-amber-500/30"></div>
                    <div className="w-3 h-3 rounded-sm bg-amber-500/60"></div>
                    <div className="w-3 h-3 rounded-sm bg-amber-500/90"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
              <div className="bg-[#151515] p-6 rounded-2xl border border-white/5 overflow-x-auto">
                <div className="grid grid-rows-4 grid-flow-col gap-2 min-w-max">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const intensity = Math.random();
                    let bgClass = "bg-white/5";
                    if (intensity > 0.8) bgClass = "bg-amber-500/90";
                    else if (intensity > 0.5) bgClass = "bg-amber-500/60";
                    else if (intensity > 0.2) bgClass = "bg-amber-500/30";
                    
                    return (
                      <div key={i} className={`w-6 h-6 rounded-md ${bgClass} transition-colors hover:ring-2 ring-white/20`} />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
