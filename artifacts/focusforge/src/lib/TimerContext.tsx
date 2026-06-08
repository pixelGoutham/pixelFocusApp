import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import localforage from 'localforage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PomodoroPhase = 'work' | 'break' | 'longBreak';

export interface PomodoroState {
  phase: PomodoroPhase;
  running: boolean;
  completedSessions: number;
  selectedSubject: string;
  selectedTask: string;
  autoStart: boolean;
  muted: boolean;
  workDur: number;
  breakDur: number;
  longBreakDur: number;
  // Wall-clock anchor: when the current phase should end (ms epoch). null when paused.
  timerEndTimestamp: number | null;
  // Seconds left snapshot (used when paused / restored).
  secondsLeftSnapshot: number;
}

export interface StopwatchLap {
  lap: number;
  split: number;
  total: number;
}

export interface StopwatchState {
  running: boolean;
  elapsed: number;         // total ms elapsed (snapshot at last pause/start)
  laps: StopwatchLap[];
  lapStart: number;        // ms elapsed when last lap began
  selectedSubject: string;
  // Wall-clock anchor: when the stopwatch last started (ms epoch). null when paused.
  startWallTimestamp: number | null;
  elapsedAtStart: number;  // elapsed ms when the stopwatch last started
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_POMODORO: PomodoroState = {
  phase: 'work',
  running: false,
  completedSessions: 0,
  selectedSubject: '',
  selectedTask: '',
  autoStart: false,
  muted: false,
  workDur: 25,
  breakDur: 5,
  longBreakDur: 15,
  timerEndTimestamp: null,
  secondsLeftSnapshot: 25 * 60,
};

const DEFAULT_STOPWATCH: StopwatchState = {
  running: false,
  elapsed: 0,
  laps: [],
  lapStart: 0,
  selectedSubject: '',
  startWallTimestamp: null,
  elapsedAtStart: 0,
};

const POMODORO_KEY = 'pixel_pomodoro_state';
const STOPWATCH_KEY = 'pixel_stopwatch_state';

// ─── Context ──────────────────────────────────────────────────────────────────

interface TimerContextType {
  // Pomodoro
  pom: PomodoroState;
  pomSecondsLeft: number;
  updatePom: (patch: Partial<PomodoroState>) => void;
  startPom: () => void;
  pausePom: () => void;
  resetPom: () => void;
  onPomPhaseComplete: ((newPom: PomodoroState) => void) | null;
  setPomPhaseCompleteCallback: (fn: ((newPom: PomodoroState) => void) | null) => void;

  // Stopwatch
  sw: StopwatchState;
  swElapsed: number;
  updateSw: (patch: Partial<StopwatchState>) => void;
  startSw: () => void;
  pauseSw: () => void;
  resetSw: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be inside TimerProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [pom, setPomRaw] = useState<PomodoroState>(DEFAULT_POMODORO);
  const [sw, setSwRaw] = useState<StopwatchState>(DEFAULT_STOPWATCH);

  // Live display values — computed every tick from wall-clock
  const [pomSecondsLeft, setPomSecondsLeft] = useState(DEFAULT_POMODORO.secondsLeftSnapshot);
  const [swElapsed, setSwElapsed] = useState(0);

  const phaseCompleteRef = useRef<((newPom: PomodoroState) => void) | null>(null);
  const pomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swRafRef = useRef<number | null>(null);

  // ── Persist helpers ────────────────────────────────────────────────────────

  const savePom = useCallback((state: PomodoroState) => {
    localforage.setItem(POMODORO_KEY, state).catch(() => {});
  }, []);

  const saveSw = useCallback((state: StopwatchState) => {
    localforage.setItem(STOPWATCH_KEY, state).catch(() => {});
  }, []);

  // ── Load from localforage on mount ─────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      localforage.getItem<PomodoroState>(POMODORO_KEY),
      localforage.getItem<StopwatchState>(STOPWATCH_KEY),
    ]).then(([savedPom, savedSw]) => {
      if (savedPom) {
        // If it was running, recalculate seconds left from wall clock
        if (savedPom.running && savedPom.timerEndTimestamp) {
          const secLeft = Math.max(0, Math.ceil((savedPom.timerEndTimestamp - Date.now()) / 1000));
          setPomSecondsLeft(secLeft);
          // If it expired while in background, mark as not running and zero
          if (secLeft === 0) {
            const updated = { ...savedPom, running: false, secondsLeftSnapshot: 0 };
            setPomRaw(updated);
          } else {
            setPomRaw(savedPom);
          }
        } else {
          setPomSecondsLeft(savedPom.secondsLeftSnapshot);
          setPomRaw(savedPom);
        }
      }
      if (savedSw) {
        if (savedSw.running && savedSw.startWallTimestamp) {
          const elapsed = savedSw.elapsedAtStart + (Date.now() - savedSw.startWallTimestamp);
          setSwElapsed(elapsed);
        } else {
          setSwElapsed(savedSw.elapsed);
        }
        setSwRaw(savedSw);
      }
    });
  }, []);

  // ── Pomodoro interval ──────────────────────────────────────────────────────

  const tickPom = useCallback(() => {
    setPomRaw(prev => {
      if (!prev.running || !prev.timerEndTimestamp) return prev;
      const secLeft = Math.max(0, Math.ceil((prev.timerEndTimestamp - Date.now()) / 1000));
      setPomSecondsLeft(secLeft);

      if (secLeft <= 0) {
        // Phase complete
        if (pomIntervalRef.current) clearInterval(pomIntervalRef.current);
        // Determine next state
        let newPom: PomodoroState;
        if (prev.phase === 'work') {
          const newCount = prev.completedSessions + 1;
          const nextPhase = newCount % 4 === 0 ? 'longBreak' : 'break';
          const nextSecs = nextPhase === 'longBreak' ? prev.longBreakDur * 60 : prev.breakDur * 60;
          newPom = {
            ...prev,
            running: prev.autoStart,
            phase: nextPhase,
            completedSessions: newCount,
            secondsLeftSnapshot: nextSecs,
            timerEndTimestamp: prev.autoStart ? Date.now() + nextSecs * 1000 : null,
          };
        } else {
          const nextSecs = prev.workDur * 60;
          newPom = {
            ...prev,
            running: prev.autoStart,
            phase: 'work',
            secondsLeftSnapshot: nextSecs,
            timerEndTimestamp: prev.autoStart ? Date.now() + nextSecs * 1000 : null,
          };
        }
        setPomSecondsLeft(newPom.secondsLeftSnapshot);
        savePom(newPom);
        // Fire callback (for logging sessions)
        if (phaseCompleteRef.current) {
          phaseCompleteRef.current(newPom);
        }
        return newPom;
      }
      return prev;
    });
  }, [savePom]);

  useEffect(() => {
    if (pom.running) {
      if (pomIntervalRef.current) clearInterval(pomIntervalRef.current);
      pomIntervalRef.current = setInterval(tickPom, 500);
    } else {
      if (pomIntervalRef.current) {
        clearInterval(pomIntervalRef.current);
        pomIntervalRef.current = null;
      }
    }
    return () => {
      if (pomIntervalRef.current) clearInterval(pomIntervalRef.current);
    };
  }, [pom.running, tickPom]);

  // ── Stopwatch RAF ──────────────────────────────────────────────────────────

  const tickSw = useCallback(() => {
    setSwRaw(prev => {
      if (!prev.running || !prev.startWallTimestamp) return prev;
      const elapsed = prev.elapsedAtStart + (Date.now() - prev.startWallTimestamp);
      setSwElapsed(elapsed);
      return prev;
    });
    swRafRef.current = requestAnimationFrame(tickSw);
  }, []);

  useEffect(() => {
    if (sw.running) {
      swRafRef.current = requestAnimationFrame(tickSw);
    } else {
      if (swRafRef.current) {
        cancelAnimationFrame(swRafRef.current);
        swRafRef.current = null;
      }
    }
    return () => {
      if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
    };
  }, [sw.running, tickSw]);

  // ── Visibility change — recalculate from wall clock when tab returns ───────

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setPomRaw(prev => {
          if (prev.running && prev.timerEndTimestamp) {
            const secLeft = Math.max(0, Math.ceil((prev.timerEndTimestamp - Date.now()) / 1000));
            setPomSecondsLeft(secLeft);
          }
          return prev;
        });
        setSwRaw(prev => {
          if (prev.running && prev.startWallTimestamp) {
            setSwElapsed(prev.elapsedAtStart + (Date.now() - prev.startWallTimestamp));
          }
          return prev;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Pomodoro actions ───────────────────────────────────────────────────────

  const updatePom = useCallback((patch: Partial<PomodoroState>) => {
    setPomRaw(prev => {
      const next = { ...prev, ...patch };
      savePom(next);
      return next;
    });
  }, [savePom]);

  const startPom = useCallback(() => {
    setPomRaw(prev => {
      const secLeft = prev.secondsLeftSnapshot > 0 ? prev.secondsLeftSnapshot : prev.workDur * 60;
      const next: PomodoroState = {
        ...prev,
        running: true,
        timerEndTimestamp: Date.now() + secLeft * 1000,
        secondsLeftSnapshot: secLeft,
      };
      savePom(next);
      return next;
    });
  }, [savePom]);

  const pausePom = useCallback(() => {
    setPomRaw(prev => {
      const secLeft = prev.timerEndTimestamp
        ? Math.max(0, Math.ceil((prev.timerEndTimestamp - Date.now()) / 1000))
        : prev.secondsLeftSnapshot;
      const next: PomodoroState = {
        ...prev,
        running: false,
        timerEndTimestamp: null,
        secondsLeftSnapshot: secLeft,
      };
      setPomSecondsLeft(secLeft);
      savePom(next);
      return next;
    });
  }, [savePom]);

  const resetPom = useCallback(() => {
    setPomRaw(prev => {
      const secLeft = prev.workDur * 60;
      const next: PomodoroState = {
        ...prev,
        running: false,
        phase: 'work',
        completedSessions: 0,
        timerEndTimestamp: null,
        secondsLeftSnapshot: secLeft,
      };
      setPomSecondsLeft(secLeft);
      savePom(next);
      return next;
    });
  }, [savePom]);

  // ── Stopwatch actions ──────────────────────────────────────────────────────

  const updateSw = useCallback((patch: Partial<StopwatchState>) => {
    setSwRaw(prev => {
      const next = { ...prev, ...patch };
      saveSw(next);
      return next;
    });
  }, [saveSw]);

  const startSw = useCallback(() => {
    setSwRaw(prev => {
      const now = Date.now();
      const next: StopwatchState = {
        ...prev,
        running: true,
        startWallTimestamp: now,
        elapsedAtStart: prev.elapsed,
      };
      saveSw(next);
      return next;
    });
  }, [saveSw]);

  const pauseSw = useCallback(() => {
    setSwRaw(prev => {
      const elapsed = prev.startWallTimestamp
        ? prev.elapsedAtStart + (Date.now() - prev.startWallTimestamp)
        : prev.elapsed;
      const next: StopwatchState = {
        ...prev,
        running: false,
        elapsed,
        startWallTimestamp: null,
      };
      setSwElapsed(elapsed);
      saveSw(next);
      return next;
    });
  }, [saveSw]);

  const resetSw = useCallback(() => {
    const next: StopwatchState = {
      ...DEFAULT_STOPWATCH,
      selectedSubject: sw.selectedSubject,
    };
    setSwRaw(next);
    setSwElapsed(0);
    saveSw(next);
  }, [saveSw, sw.selectedSubject]);

  // ── Phase-complete callback setter ─────────────────────────────────────────

  const setPomPhaseCompleteCallback = useCallback(
    (fn: ((newPom: PomodoroState) => void) | null) => {
      phaseCompleteRef.current = fn;
    },
    []
  );

  return (
    <TimerContext.Provider value={{
      pom, pomSecondsLeft, updatePom, startPom, pausePom, resetPom,
      onPomPhaseComplete: phaseCompleteRef.current,
      setPomPhaseCompleteCallback,
      sw, swElapsed, updateSw, startSw, pauseSw, resetSw,
    }}>
      {children}
    </TimerContext.Provider>
  );
}
