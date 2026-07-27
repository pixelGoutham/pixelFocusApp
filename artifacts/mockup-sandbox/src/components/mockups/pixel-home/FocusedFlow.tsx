import React from "react";
import { Plus, Play, Calendar, FileText, CheckCircle2, Circle, Clock, Flame, ArrowRight, BookOpen } from "lucide-react";

export function FocusedFlow() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white overflow-auto py-12 px-6" style={{ fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif' }}>
      <div className="max-w-[760px] mx-auto space-y-16">
        
        {/* TOP SECTION */}
        <header className="space-y-4">
          <div className="text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
            Tuesday · 8 July
          </div>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-zinc-100" style={{ fontFamily: '"Playfair Display", "Times New Roman", serif' }}>
            Good morning, Arjun.
          </h1>
          <div className="text-sm font-medium text-zinc-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-amber-500/90 bg-amber-500/10 px-2.5 py-1 rounded-full"><Flame size={14} /> 14 day streak</span>
            <span>·</span>
            <span>JEE Main in 47 days</span>
          </div>
        </header>

        {/* MISSION ZONE */}
        <section className="space-y-6">
          <div className="bg-[#111111] rounded-3xl border-l-[4px] border-l-amber-500 p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
               <BookOpen size={240} />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Today's Focus</span>
                <div className="flex items-center gap-2 bg-zinc-800/50 text-zinc-300 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Clock size={14} className="text-amber-500" />
                  25:00
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-5xl md:text-6xl font-semibold text-zinc-100 tracking-tight">Physics</h2>
                <p className="text-2xl text-zinc-400 font-light">Chapter 12 Revision</p>
                <div className="text-sm text-zinc-500 mt-2 font-medium tracking-wide">EST. ~2 HOURS</div>
              </div>

              <button className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 transition-all group mt-6">
                Begin Session <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <button className="bg-[#151515] hover:bg-[#1a1a1a] text-zinc-400 text-sm font-medium px-5 py-3 rounded-xl border border-zinc-800/50 transition-colors">
              Chemistry DPP
            </button>
            <button className="bg-[#151515] hover:bg-[#1a1a1a] text-zinc-400 text-sm font-medium px-5 py-3 rounded-xl border border-zinc-800/50 transition-colors">
              Math Mock
            </button>
          </div>
        </section>

        {/* MIDDLE SECTION - TIMELINE & CHECKLIST */}
        <section className="space-y-12 border-t border-zinc-900 pt-16">
          <div className="space-y-8">
            <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Today</h3>
            
            <div className="space-y-6">
              {/* Timeline Items */}
              <div className="flex gap-6 items-center group">
                <div className="w-16 text-right text-sm text-zinc-500 font-medium shrink-0 group-hover:text-amber-500 transition-colors">09:00</div>
                <div className="flex-1 bg-amber-500/10 border border-amber-500/20 py-4 px-6 rounded-2xl flex items-center justify-between transition-colors">
                   <div>
                     <div className="text-amber-500 font-medium text-lg">Physics Revision</div>
                     <div className="text-sm text-amber-500/70 mt-1">Chapter 12</div>
                   </div>
                   <span className="text-sm font-medium text-amber-500/50 bg-amber-500/10 px-3 py-1 rounded-full">2h</span>
                </div>
              </div>

              <div className="flex gap-6 items-center group opacity-80">
                <div className="w-16 text-right text-sm text-zinc-500 font-medium shrink-0">11:30</div>
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800/50 py-4 px-6 rounded-2xl flex items-center justify-between">
                   <div>
                     <div className="text-zinc-300 font-medium text-lg">Chemistry DPP</div>
                     <div className="text-sm text-zinc-500 mt-1">Organic Reactions</div>
                   </div>
                   <span className="text-sm font-medium text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full">1.5h</span>
                </div>
              </div>

              <div className="flex gap-6 items-center group opacity-80">
                <div className="w-16 text-right text-sm text-zinc-500 font-medium shrink-0">14:00</div>
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800/50 py-4 px-6 rounded-2xl flex items-center justify-between">
                   <div>
                     <div className="text-zinc-300 font-medium text-lg">Math Mock Test</div>
                     <div className="text-sm text-zinc-500 mt-1">Full Syllabus</div>
                   </div>
                   <span className="text-sm font-medium text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full">3h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-8">
            <div className="space-y-4">
              {[
                { label: "Review Physics Notes", subject: "Physics", done: true },
                { label: "Solve 50 Kinematics MCQs", subject: "Physics", done: true },
                { label: "Chemistry Daily Practice", subject: "Chemistry", done: true },
                { label: "Calculus Mock Test", subject: "Math", done: false },
                { label: "Analyse Mock Mistakes", subject: "Math", done: false },
              ].map((task, i) => (
                <div key={i} className={`flex items-center gap-5 py-3 group ${task.done ? 'opacity-40 hover:opacity-60' : 'hover:opacity-80'} transition-opacity cursor-pointer`}>
                  <button className="text-zinc-600 hover:text-amber-500 transition-colors shrink-0">
                    {task.done ? <CheckCircle2 size={26} className="text-amber-500" /> : <Circle size={26} />}
                  </button>
                  <div className={`flex-1 text-lg font-medium ${task.done ? 'text-zinc-500 line-through decoration-zinc-700' : 'text-zinc-200'}`}>
                    {task.label}
                  </div>
                  <div className="text-xs font-bold tracking-wider text-zinc-500 uppercase bg-[#151515] px-3 py-1.5 rounded-md border border-zinc-800">
                    {task.subject}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM SECTION - PROGRESS */}
        <section className="space-y-10 border-t border-zinc-900 pt-16">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Progress</h3>
          
          <div className="grid grid-cols-2 gap-8 md:gap-12">
            <div>
              <div className="text-6xl font-light text-zinc-100 tracking-tight mb-3">4.5<span className="text-3xl text-zinc-500">h</span></div>
              <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Studied today</div>
            </div>
            <div>
              <div className="text-6xl font-light text-zinc-100 tracking-tight mb-3">8 <span className="text-3xl text-zinc-500">/ 12</span></div>
              <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Tasks done</div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="h-3 w-full bg-[#151515] rounded-full overflow-hidden border border-zinc-800/50">
              <div className="h-full bg-amber-500 w-[66%] rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
            </div>
          </div>

          <div className="pt-8 flex gap-4 md:gap-8 justify-center overflow-x-auto pb-4">
            {/* Heatmap implementation - simple grid */}
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, col) => (
                <div key={col} className="flex flex-col gap-2">
                  {Array.from({ length: 7 }).map((_, row) => {
                    const intensity = Math.floor(Math.random() * 5);
                    const bgClass = [
                      'bg-[#151515]',
                      'bg-amber-500/20',
                      'bg-amber-500/40',
                      'bg-amber-500/60',
                      'bg-amber-500'
                    ][intensity];
                    return (
                      <div key={row} className={`w-5 h-5 md:w-6 md:h-6 rounded-sm ${bgClass}`} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex gap-2 opacity-50">
              {Array.from({ length: 4 }).map((_, col) => (
                <div key={col} className="flex flex-col gap-2">
                  {Array.from({ length: 7 }).map((_, row) => {
                    const bgClass = Math.random() > 0.7 ? 'bg-amber-500/20' : 'bg-[#151515]';
                    return (
                      <div key={row} className={`w-5 h-5 md:w-6 md:h-6 rounded-sm ${bgClass}`} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex gap-2 opacity-20">
              {Array.from({ length: 4 }).map((_, col) => (
                <div key={col} className="flex flex-col gap-2">
                  {Array.from({ length: 7 }).map((_, row) => (
                      <div key={row} className={`w-5 h-5 md:w-6 md:h-6 rounded-sm bg-[#151515]`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER QUICK ACTIONS */}
        <footer className="pt-16 pb-12 border-t border-zinc-900 mt-20">
          <div className="flex justify-between items-center max-w-sm mx-auto">
            <button className="flex flex-col items-center gap-3 text-zinc-500 hover:text-amber-500 transition-colors">
              <div className="w-14 h-14 rounded-full bg-[#111111] border border-zinc-800/50 flex items-center justify-center hover:bg-[#1a1a1a] hover:border-amber-500/50 transition-all">
                <Plus size={22} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Task</span>
            </button>
            <button className="flex flex-col items-center gap-3 text-zinc-500 hover:text-amber-500 transition-colors">
              <div className="w-14 h-14 rounded-full bg-[#111111] border border-zinc-800/50 flex items-center justify-center hover:bg-[#1a1a1a] hover:border-amber-500/50 transition-all">
                <Play size={22} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Timer</span>
            </button>
            <button className="flex flex-col items-center gap-3 text-zinc-500 hover:text-amber-500 transition-colors">
              <div className="w-14 h-14 rounded-full bg-[#111111] border border-zinc-800/50 flex items-center justify-center hover:bg-[#1a1a1a] hover:border-amber-500/50 transition-all">
                <Calendar size={22} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Plan</span>
            </button>
            <button className="flex flex-col items-center gap-3 text-zinc-500 hover:text-amber-500 transition-colors">
              <div className="w-14 h-14 rounded-full bg-[#111111] border border-zinc-800/50 flex items-center justify-center hover:bg-[#1a1a1a] hover:border-amber-500/50 transition-all">
                <FileText size={22} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Test</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
