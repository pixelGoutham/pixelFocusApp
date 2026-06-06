import React, { useMemo } from 'react';
import { useStore } from '@/lib/StoreContext';
import { differenceInCalendarDays, parseISO, format, subDays } from 'date-fns';
import { Flame, Trophy, Clock, CalendarDays, Star, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Level definitions ───────────────────────────────────────────────────────
const LEVELS = [
  { name: 'Seedling',      emoji: '🌱', minHours: 0,   color: '#86efac', maxDepth: 1 },
  { name: 'Sprout',        emoji: '🌿', minHours: 5,   color: '#4ade80', maxDepth: 2 },
  { name: 'Sapling',       emoji: '🪴', minHours: 15,  color: '#22c55e', maxDepth: 3 },
  { name: 'Young Tree',    emoji: '🌳', minHours: 30,  color: '#16a34a', maxDepth: 4 },
  { name: 'Tree',          emoji: '🌲', minHours: 60,  color: '#15803d', maxDepth: 5 },
  { name: 'Mature Tree',   emoji: '🌲', minHours: 100, color: '#166534', maxDepth: 6 },
  { name: 'Ancient Tree',  emoji: '🌳', minHours: 200, color: '#14532d', maxDepth: 7 },
  { name: 'Legendary',     emoji: '✨', minHours: 500, color: '#fbbf24', maxDepth: 8 },
];

const LEVEL_XP = [0, 300, 900, 1800, 3600, 6000, 12000, 30000];

// ─── Achievement definitions ─────────────────────────────────────────────────
interface Achievement {
  id: string; emoji: string; label: string; desc: string;
  unlocked: (totalH: number, streak: number, days: number) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id:'first',  emoji:'⭐', label:'First Hour',      desc:'Study 1 hour total',         unlocked:(h)=>h>=1 },
  { id:'3day',   emoji:'🌤️', label:'3-Day Streak',    desc:'3 days in a row',            unlocked:(_,s)=>s>=3 },
  { id:'10h',    emoji:'📚', label:'10 Hours',        desc:'10 total study hours',       unlocked:(h)=>h>=10 },
  { id:'7day',   emoji:'🔥', label:'Week on Fire',    desc:'7-day study streak',         unlocked:(_,s)=>s>=7 },
  { id:'25h',    emoji:'🌟', label:'Quarter Century', desc:'25 total study hours',       unlocked:(h)=>h>=25 },
  { id:'14day',  emoji:'💪', label:'Two Weeks!',      desc:'14 days in a row',           unlocked:(_,s)=>s>=14 },
  { id:'50h',    emoji:'🎓', label:'Scholar',         desc:'50 total study hours',       unlocked:(h)=>h>=50 },
  { id:'30day',  emoji:'🏆', label:'Month Master',    desc:'30-day study streak',        unlocked:(_,s)=>s>=30 },
  { id:'100h',   emoji:'💯', label:'Century Club',    desc:'100 total study hours',      unlocked:(h)=>h>=100 },
  { id:'50days', emoji:'📅', label:'Fifty Days',      desc:'50 unique study days',       unlocked:(_,_2,d)=>d>=50 },
  { id:'200h',   emoji:'🦅', label:'Eagle Scholar',   desc:'200 total study hours',      unlocked:(h)=>h>=200 },
  { id:'365day', emoji:'👑', label:'Year King',       desc:'365 unique study days',      unlocked:(_,_2,d)=>d>=365 },
];

// ─── Tree generator (deterministic SVG recursive branching) ──────────────────
interface Branch { x1:number; y1:number; x2:number; y2:number; w:number; }
interface Leaf   { cx:number; cy:number; r:number; }

function buildTree(maxDepth: number): { branches: Branch[]; leaves: Leaf[] } {
  const branches: Branch[] = [];
  const leaves:   Leaf[]   = [];

  // Tiny seeded RNG so tree shape is stable across renders
  let seed = 9001;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };

  function recurse(x: number, y: number, angleDeg: number, len: number, w: number, depth: number) {
    if (depth > maxDepth || len < 3) return;
    const rad = (angleDeg - 90) * Math.PI / 180;
    const x2 = x + Math.cos(rad) * len;
    const y2 = y + Math.sin(rad) * len;
    branches.push({ x1: x, y1: y, x2, y2, w });
    if (depth === maxDepth) {
      leaves.push({ cx: x2, cy: y2, r: 6 + rand() * 5 });
      return;
    }
    const jitter = (rand() - 0.5) * 12;
    recurse(x2, y2, angleDeg - 22 + jitter, len * 0.71, w * 0.63, depth + 1);
    recurse(x2, y2, angleDeg + 22 + jitter, len * 0.71, w * 0.63, depth + 1);
  }

  if (maxDepth === 0) {
    // Tiny sprout
    branches.push({ x1:200, y1:390, x2:200, y2:360, w:4 });
    leaves.push({ cx:200, cy:354, r:8 });
    return { branches, leaves };
  }

  const trunkLen = 55 + maxDepth * 11;
  recurse(200, 390, 0, trunkLen, 9 + maxDepth * 1.6, 0);
  return { branches, leaves };
}

// ─── Streak calculator ───────────────────────────────────────────────────────
function computeStreaks(studyDates: Set<string>): { current: number; longest: number } {
  if (studyDates.size === 0) return { current: 0, longest: 0 };
  const today = format(new Date(), 'yyyy-MM-dd');
  const sorted = [...studyDates].sort().reverse();

  let current = 0;
  let check = today;
  // Allow today or yesterday as starting point
  if (!studyDates.has(today)) {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (!studyDates.has(yesterday)) return { current: 0, longest: computeLongest(studyDates) };
    check = yesterday;
  }
  for (let i = 0; ; i++) {
    const d = format(subDays(new Date(), i + (check === today ? 0 : 1)), 'yyyy-MM-dd');
    if (studyDates.has(d)) current++;
    else break;
    if (i > 1000) break;
  }
  return { current, longest: Math.max(current, computeLongest(studyDates)) };
}

function computeLongest(dates: Set<string>): number {
  const sorted = [...dates].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
    cur = diff === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return best;
}

// ─── Leaf colour based on streak ─────────────────────────────────────────────
function leafColor(streak: number, level: number): string {
  if (streak === 0) return '#4b5563';       // grey — inactive
  if (streak < 4)   return '#86efac';       // light green
  if (streak < 8)   return '#22c55e';       // green
  if (streak < 15)  return '#16a34a';       // deep green
  if (level >= 7)   return '#fbbf24';       // gold for legends
  return '#4ade80';                         // vibrant
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Consistency() {
  const { sessions } = useStore();

  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((s, ses) => s + ses.durationMinutes, 0);
    const totalHours   = totalMinutes / 60;
    const xp           = Math.round(totalMinutes);
    const studyDates   = new Set(sessions.map(s => s.date));
    const uniqueDays   = studyDates.size;
    const { current: streak, longest } = computeStreaks(studyDates);

    const levelIdx = LEVELS.reduce((best, l, i) => totalHours >= l.minHours ? i : best, 0);
    const level    = LEVELS[levelIdx];
    const nextLevel = LEVELS[levelIdx + 1] ?? null;
    const xpForNext = nextLevel ? Math.round(nextLevel.minHours * 60) : null;
    const xpForCur  = Math.round(level.minHours * 60);
    const xpPct     = nextLevel
      ? Math.min(100, ((xp - xpForCur) / ((xpForNext! - xpForCur))) * 100)
      : 100;

    const treeData  = buildTree(level.maxDepth);
    const leafCol   = leafColor(streak, levelIdx);

    const unlocked  = ACHIEVEMENTS.filter(a => a.unlocked(totalHours, streak, uniqueDays));
    const locked    = ACHIEVEMENTS.filter(a => !a.unlocked(totalHours, streak, uniqueDays));

    // Last 28 days activity
    const today = new Date();
    const heatmap = Array.from({ length: 28 }, (_, i) => {
      const d = format(subDays(today, 27 - i), 'yyyy-MM-dd');
      const mins = sessions.filter(s => s.date === d).reduce((a, s) => a + s.durationMinutes, 0);
      return { date: d, mins };
    });

    return { totalHours, totalMinutes, xp, uniqueDays, streak, longest,
             levelIdx, level, nextLevel, xpForNext, xpForCur, xpPct,
             treeData, leafCol, unlocked, locked, heatmap };
  }, [sessions]);

  const { level, levelIdx, treeData, leafCol } = stats;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Consistency Tree</h1>
        <p className="text-sm text-muted-foreground mt-1">Your study habits — visualised as a growing tree</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── Tree panel ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Level badge */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{level.emoji}</span>
                <div>
                  <div className="font-bold text-lg">{level.name}</div>
                  <div className="text-xs text-muted-foreground">Level {levelIdx + 1} of {LEVELS.length}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{stats.xp.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">XP earned</div>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="px-5 py-3 border-b border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{level.name}</span>
                {stats.nextLevel
                  ? <span>Next: {stats.nextLevel.name} ({stats.nextLevel.emoji})</span>
                  : <span>MAX LEVEL 🏆</span>}
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${stats.xpPct}%` }}
                />
              </div>
              {stats.nextLevel && (
                <div className="text-right text-xs text-muted-foreground mt-1">
                  {stats.xp} / {stats.xpForNext} XP
                </div>
              )}
            </div>

            {/* SVG Tree */}
            <div className="flex items-center justify-center p-4 bg-gradient-to-b from-transparent to-emerald-950/20">
              <svg viewBox="0 0 400 420" className="w-full max-w-md" style={{ maxHeight: 380 }}>
                {/* Sky gradient */}
                <defs>
                  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={leafCol} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={leafCol} stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="40%" stopColor="#92400e" />
                    <stop offset="100%" stopColor="#57230a" />
                  </linearGradient>
                  <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#14532d" />
                  </linearGradient>
                </defs>

                {/* Ground */}
                <ellipse cx="200" cy="405" rx="110" ry="18" fill="url(#groundGrad)" opacity="0.9" />
                <ellipse cx="200" cy="400" rx="70" ry="10" fill="#15803d" opacity="0.7" />

                {/* Leaf glow (only when active) */}
                {stats.streak > 0 && (
                  <ellipse cx="200" cy="200" rx="150" ry="160" fill="url(#glow)" />
                )}

                {/* Branches */}
                {treeData.branches.map((b, i) => (
                  <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
                    stroke={i === 0 ? 'url(#trunkGrad)' : '#7c4119'}
                    strokeWidth={Math.max(b.w, 1)}
                    strokeLinecap="round"
                  />
                ))}

                {/* Leaves */}
                {treeData.leaves.map((l, i) => (
                  <circle key={i} cx={l.cx} cy={l.cy} r={l.r}
                    fill={leafCol} opacity={stats.streak > 0 ? 0.88 : 0.35}
                  />
                ))}

                {/* Seedling special: little green shoot */}
                {levelIdx === 0 && (
                  <text x="200" y="340" textAnchor="middle" fontSize="12" fill="#6ee7b7" opacity="0.7">
                    Start studying to grow! 🌱
                  </text>
                )}
              </svg>
            </div>
          </div>

          {/* 28-day heatmap */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold mb-3">Last 28 Days</div>
            <div className="grid grid-cols-7 gap-1.5">
              {['S','M','T','W','T','F','S'].map((d,i) => (
                <div key={i} className="text-center text-xs text-muted-foreground">{d}</div>
              ))}
              {/* Pad start */}
              {Array.from({ length: new Date(stats.heatmap[0].date + 'T00:00:00').getDay() }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {stats.heatmap.map(({ date, mins }) => {
                const intensity = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4;
                const colors = ['bg-muted', 'bg-primary/20', 'bg-primary/40', 'bg-primary/65', 'bg-primary'];
                return (
                  <div key={date} title={`${date}: ${Math.round(mins)}min`}
                    className={cn('aspect-square rounded-sm', colors[intensity])}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end text-xs text-muted-foreground">
              <span>Less</span>
              {['bg-muted','bg-primary/20','bg-primary/40','bg-primary/65','bg-primary'].map((c,i) => (
                <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-4">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Flame className="h-5 w-5 text-orange-400" />}
              label="Current Streak" value={`${stats.streak}d`}
              sub={stats.streak > 0 ? 'Keep it going! 🔥' : 'Start today!'}
              highlight={stats.streak >= 7}
            />
            <StatCard icon={<Trophy className="h-5 w-5 text-yellow-400" />}
              label="Best Streak" value={`${stats.longest}d`} sub="All time record" />
            <StatCard icon={<Clock className="h-5 w-5 text-blue-400" />}
              label="Total Hours" value={`${stats.totalHours.toFixed(1)}h`}
              sub={`${Math.round(stats.totalMinutes)} min`} />
            <StatCard icon={<CalendarDays className="h-5 w-5 text-emerald-400" />}
              label="Study Days" value={`${stats.uniqueDays}`} sub="Unique days" />
          </div>

          {/* Achievements */}
          <div className="rounded-xl border border-border bg-card p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">Achievements</div>
              <div className="text-xs text-muted-foreground">
                {stats.unlocked.length} / {ACHIEVEMENTS.length} unlocked
              </div>
            </div>

            <div className="space-y-2">
              {/* Unlocked first */}
              {stats.unlocked.map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                  <span className="text-xl">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-primary truncate">{a.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  </div>
                  <Star className="h-3.5 w-3.5 text-primary flex-shrink-0 fill-primary" />
                </div>
              ))}

              {/* Locked */}
              {stats.locked.map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border px-3 py-2 opacity-50">
                  <span className="text-xl grayscale">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{a.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  </div>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 bg-card',
      highlight ? 'border-orange-500/50 bg-orange-500/5' : 'border-border'
    )}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium text-muted-foreground mt-0.5">{label}</div>
      <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>
    </div>
  );
}
