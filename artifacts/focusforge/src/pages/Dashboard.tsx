import { useCallback, useMemo, useState, useEffect } from "react";
import {Link} from 'wouter';
import {format, isToday, parseISO, startOfWeek, addDays} from 'date-fns';
import {useStore} from '@/lib/StoreContext';
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";
import {Clock, CheckSquare, Fire, Target, CalendarBlank, Timer, TrendUp, Sparkle} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence} from 'framer-motion';
import { cn, getSubjectColorByName } from "@/lib/utils";
import { time } from "node:console";
import { Numerals } from "react-day-picker";

const SPRING_CRITICALLY_DAMPED = { type: 'spring' as const, bounce: 0, duration: 0.4 };
const SPRING_MOMENTUM =   { type: 'spring' as const, bounce: 0.2, duration: 0.35};

const GLASS_SURFACE = 
'bg-white/[0.025] dark:bg-white/[0.025] border border-white/[0/08] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255, 255, 255, 0.1)]';

function timeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function StatBento ({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  accentColor,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  accentColor: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      transition={{ ...SPRING_CRITICALLY_DAMPED, delay}}
      whileTap={{ scale: 0.98}}
      className="h-full"
    >
      <Card
        className={cn(
          GLASS_SURFACE, 'h-full rounded-2xl hover:border-white/[0.16] transition-colors overflow-hidden relative group'
        )}
      >
        <div
          className="N-glow absolute -top-12 -right-12 h-28 w-28 rounded-full blur-2xl opacity-15 group-hover:opacity-30 transition-opacity pointer-events-none"
          style={{ backgroundColor: accentColor}}
        />
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-betweent">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
              {label}
            </span>
            <div 
              className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/[0.08]"
              style={{ backgroundColor: `${accentColor}18`, color: accentColor}}
            >
              <Icon weight='fill' className='h-4 w-4' />
            </div>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.05] font-mono tabular-nums text-foreground">
              <span>{sub}</span>
              {typeof progress === 'number' && (
                <span className="font-mono text-[11px] text-foreground/80">
                  {Math.round(Math.min(progress, 100))}%
                </span>
              )}
            </p>
          </div>

          {typeof progress === 'number' && (
            <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.max(progress, 2), 100)}`}}
                transition={SPRING_CRITICALLY_DAMPED}
                className="h-full rounded-full"
                style={{ backgroundColor: accentColor}}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CircularGoalRing({
  value,
  max,
  streak,
}: {
  value: number;
  max: number;
  streak: number;
}) {
  const safeMax = Math.max(max, 1);
  const pct = Math.min(value / safeMax, 1);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct );

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width='132' height='132' className="-rotate-90">
        <circle
          cx='66'
          cy='66'
          r={r}
          strokeWidth='8'
          stroke='rgba(255, 255, 255, 0.06)'
          fill="none"
        />
        <circle
          cx='66'
          cy='66'
          r={r}
          strokeWidth='8'
          stroke='hsl(var(--primary))'
          fill='none'
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)'}}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold font-mono tabular-nums tracking-[-0.03em] leading-none">
          {Math.round(pct * 100)}%
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
          Daily Goal
        </span>
        {streak > 0 && (
          <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
            <Fire weight="fill" className="h-2.5 w-2.5" />
            {streak}d
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tasks, sessions, settings, setTasks } = useStore();
  const [now, setNow] = useState(() => new Date());
  const [scheduleTab, setScheduleTab] = useState<'all' | 'remaining' | 'completed'>('all');
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval)
  })
}