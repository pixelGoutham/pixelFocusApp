import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Task, StudySession, Flashcard, MockTest, AppSettings,
  getTasks, saveTasks, getSessions, saveSessions,
  getFlashcards, saveFlashcards, getMockTests, saveMockTests,
  getSettings, saveSettings, DEFAULT_SETTINGS,
} from './store';
import { format, addDays } from 'date-fns';
import {
  scheduleSync, setupPeriodicSync, syncToCloud,
  fetchFromCloud, restoreFromSnapshot, setCurrentUser,
  CloudSnapshot,
} from './cloudSync';
import { isFirebaseConfigured } from './firebase';
import { useAuth } from './AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StoreContextType {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  sessions: StudySession[];
  setSessions: (sessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => void;
  flashcards: Flashcard[];
  setFlashcards: (flashcards: Flashcard[] | ((prev: Flashcard[]) => Flashcard[])) => void;
  mockTests: MockTest[];
  setMockTests: (mockTests: MockTest[] | ((prev: MockTest[]) => MockTest[])) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  isLoading: boolean;
  reloadAll: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [tasks, setTasksState]         = useState<Task[]>([]);
  const [sessions, setSessionsState]   = useState<StudySession[]>([]);
  const [flashcards, setFlashcardsState] = useState<Flashcard[]>([]);
  const [mockTests, setMockTestsState] = useState<MockTest[]>([]);
  const [settings, setSettingsState]   = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading]      = useState(true);

  // Conflict resolution state
  const [cloudConflict, setCloudConflict] = useState<CloudSnapshot | null>(null);
  const prevUidRef = useRef<string | null | undefined>(undefined);

  // ── Local data loader ────────────────────────────────────────────────────

  const loadLocal = async () => {
    const [t, s, f, m, set] = await Promise.all([
      getTasks(), getSessions(), getFlashcards(), getMockTests(), getSettings(),
    ]);
    setTasksState(t);
    setSessionsState(s);
    setFlashcardsState(f);
    setMockTestsState(m);
    setSettingsState(set);
  };

  const seedIfNeeded = async () => {
    const [t, set] = await Promise.all([getTasks(), getSettings()]);
    if (!set.onboardingDone && t.length === 0) {
      const today = new Date();
      const todayStr     = format(today, 'yyyy-MM-dd');
      const tomorrowStr  = format(addDays(today, 1), 'yyyy-MM-dd');
      const yesterdayStr = format(addDays(today, -1), 'yyyy-MM-dd');
      const seedTasks: Task[] = [
        { id: 't1', date: todayStr,     startTime: '09:00', endTime: '10:30', subject: 'Physics',   task: 'Kinematics practice',    priority: 'High',   quadrant: 'urgent-important',         completed: false, pomodoroSessions: 0, createdAt: today.toISOString() },
        { id: 't2', date: todayStr,     startTime: '11:00', endTime: '12:00', subject: 'Chemistry', task: 'Organic nomenclature',   priority: 'Medium', quadrant: 'not-urgent-important',     completed: false, pomodoroSessions: 0, createdAt: today.toISOString() },
        { id: 't3', date: tomorrowStr,  startTime: '14:00', endTime: '16:00', subject: 'Maths',     task: 'Calculus integration',   priority: 'High',   quadrant: 'urgent-important',         completed: false, pomodoroSessions: 0, createdAt: today.toISOString() },
      ];
      const seedSessions: StudySession[] = [
        { id: 's1', date: yesterdayStr, subject: 'Physics',   durationMinutes: 120, type: 'pomodoro' },
        { id: 's2', date: todayStr,     subject: 'Chemistry', durationMinutes: 60,  type: 'manual'   },
      ];
      const seedFlashcards: Flashcard[] = [
        { id: 'f1', front: "Newton's Second Law", back: 'F = ma',   subject: 'Physics',   nextReview: todayStr, difficulty: 'medium', reviewCount: 0 },
        { id: 'f2', front: 'Derivative of sin(x)', back: 'cos(x)',  subject: 'Maths',     nextReview: todayStr, difficulty: 'easy',   reviewCount: 0 },
        { id: 'f3', front: 'Atomic number of Carbon', back: '6',    subject: 'Chemistry', nextReview: todayStr, difficulty: 'easy',   reviewCount: 0 },
      ];
      const seedMockTests: MockTest[] = [
        { id: 'm1', name: 'Midterm 1', subject: 'Physics', score: 85, totalQuestions: 50, date: yesterdayStr, notes: 'Struggled with optics' },
      ];
      await Promise.all([
        saveTasks(seedTasks), saveSessions(seedSessions),
        saveFlashcards(seedFlashcards), saveMockTests(seedMockTests),
      ]);
      setTasksState(seedTasks);
      setSessionsState(seedSessions);
      setFlashcardsState(seedFlashcards);
      setMockTestsState(seedMockTests);
    } else {
      await loadLocal();
    }
    setSettingsState(await getSettings());
  };

  const loadData = async () => {
    setIsLoading(true);
    await seedIfNeeded();
    setIsLoading(false);
    setupPeriodicSync();
  };

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to auth state changes ──────────────────────────────────────────

  useEffect(() => {
    const uid = user?.uid ?? null;
    const prev = prevUidRef.current;
    prevUidRef.current = uid;

    // Update sync module's notion of current user
    setCurrentUser(uid);

    // Skip the very first render (undefined → null/uid is not a "sign-in" event)
    if (prev === undefined) return;

    if (uid && uid !== prev) {
      // User just signed in → check for cloud data
      handleSignIn(uid);
    } else if (!uid && prev) {
      // User just signed out → clear any pending conflict dialog
      setCloudConflict(null);
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = async (uid: string) => {
    const cloudData = await fetchFromCloud(uid);
    if (!cloudData) {
      // No cloud data → push local data to cloud silently
      await syncToCloud(uid);
      return;
    }

    // Check if local has meaningful data
    const localTasks = await getTasks();
    if (localTasks.length === 0) {
      // Local is empty → restore from cloud, no conflict
      await restoreFromSnapshot(cloudData);
      await loadLocal();
    } else {
      // Both local and cloud have data → ask user
      setCloudConflict(cloudData);
    }
  };

  const resolveConflict = async (choice: 'cloud' | 'local') => {
    if (choice === 'cloud' && cloudConflict) {
      await restoreFromSnapshot(cloudConflict);
      await loadLocal();
    } else if (choice === 'local' && user?.uid) {
      // Push local data to cloud
      await syncToCloud(user.uid);
    }
    setCloudConflict(null);
  };

  // ── Setters ───────────────────────────────────────────────────────────────

  const setTasks = (newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksState(prev => {
      const next = typeof newTasks === 'function' ? newTasks(prev) : newTasks;
      saveTasks(next);
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setSessions = (newSessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => {
    setSessionsState(prev => {
      const next = typeof newSessions === 'function' ? newSessions(prev) : newSessions;
      saveSessions(next);
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setFlashcards = (newFlashcards: Flashcard[] | ((prev: Flashcard[]) => Flashcard[])) => {
    setFlashcardsState(prev => {
      const next = typeof newFlashcards === 'function' ? newFlashcards(prev) : newFlashcards;
      saveFlashcards(next);
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setMockTests = (newMockTests: MockTest[] | ((prev: MockTest[]) => MockTest[])) => {
    setMockTestsState(prev => {
      const next = typeof newMockTests === 'function' ? newMockTests(prev) : newMockTests;
      saveMockTests(next);
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setSettings = (newSettings: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(prev => {
      const next = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
      saveSettings(next);
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const reloadAll = async () => {
    setIsLoading(true);
    await loadLocal();
    setIsLoading(false);
  };

  // ── Conflict resolution dialog ────────────────────────────────────────────

  const cloudDate = cloudConflict?.syncedAt
    ? new Date(cloudConflict.syncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'previously';

  return (
    <StoreContext.Provider value={{
      tasks, setTasks,
      sessions, setSessions,
      flashcards, setFlashcards,
      mockTests, setMockTests,
      settings, setSettings,
      isLoading,
      reloadAll,
    }}>
      {children}

      {/* Cloud vs local conflict dialog */}
      <Dialog open={!!cloudConflict} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>☁️</span> Cloud data found
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your account has data saved from <span className="text-foreground font-medium">{cloudDate}</span>.
            Do you want to restore it, or keep your local data?
          </p>
          <p className="text-xs text-muted-foreground">
            {cloudConflict && `${cloudConflict.tasks.length} tasks · ${cloudConflict.sessions.length} sessions · ${cloudConflict.flashcards.length} flashcards`}
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => resolveConflict('local')}>
              Keep local data
            </Button>
            <Button className="flex-1" onClick={() => resolveConflict('cloud')}>
              Restore from cloud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StoreContext.Provider>
  );
};
