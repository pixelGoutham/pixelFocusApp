import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  Task, StudySession, Flashcard, MockTest, AppSettings,
  getTasks, saveTasks, getSessions, saveSessions,
  getFlashcards, saveFlashcards, getMockTests, saveMockTests,
  getSettings, saveSettings, DEFAULT_SETTINGS,
} from './store';
// date-fns no longer needed here after removing seed data
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
  reloadAll: (broadcastChange?: boolean) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

// ── BroadcastChannel key ─────────────────────────────────────────────────────
type StoreTable = 'tasks' | 'sessions' | 'flashcards' | 'mockTests' | 'settings' | 'all';
const CHANNEL_NAME = 'pixel-store-sync';

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

  // ── BroadcastChannel: sync across tabs ───────────────────────────────────
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Reload a specific table from IndexedDB and update state (no re-broadcast)
  const reloadTable = useCallback(async (table: StoreTable) => {
    if (table === 'tasks'      || table === 'all') setTasksState(await getTasks());
    if (table === 'sessions'   || table === 'all') setSessionsState(await getSessions());
    if (table === 'flashcards' || table === 'all') setFlashcardsState(await getFlashcards());
    if (table === 'mockTests'  || table === 'all') setMockTestsState(await getMockTests());
    if (table === 'settings'   || table === 'all') setSettingsState(await getSettings());
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<{ table: StoreTable }>) => {
      reloadTable(e.data.table);
    };
    return () => { channel.close(); channelRef.current = null; };
  }, [reloadTable]);

  const broadcast = (table: StoreTable) => {
    channelRef.current?.postMessage({ table });
  };

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

  const loadData = async () => {
    setIsLoading(true);
    await loadLocal();
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
      broadcast('tasks');
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setSessions = (newSessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => {
    setSessionsState(prev => {
      const next = typeof newSessions === 'function' ? newSessions(prev) : newSessions;
      saveSessions(next);
      broadcast('sessions');
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setFlashcards = (newFlashcards: Flashcard[] | ((prev: Flashcard[]) => Flashcard[])) => {
    setFlashcardsState(prev => {
      const next = typeof newFlashcards === 'function' ? newFlashcards(prev) : newFlashcards;
      saveFlashcards(next);
      broadcast('flashcards');
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setMockTests = (newMockTests: MockTest[] | ((prev: MockTest[]) => MockTest[])) => {
    setMockTestsState(prev => {
      const next = typeof newMockTests === 'function' ? newMockTests(prev) : newMockTests;
      saveMockTests(next);
      broadcast('mockTests');
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const setSettings = (newSettings: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(prev => {
      const next = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
      saveSettings(next);
      broadcast('settings');
      if (isFirebaseConfigured && user?.uid) scheduleSync();
      return next;
    });
  };

  const reloadAll = async (broadcastChange = false) => {
    setIsLoading(true);
    await loadLocal();
    setIsLoading(false);
    if (broadcastChange) broadcast('all');
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
