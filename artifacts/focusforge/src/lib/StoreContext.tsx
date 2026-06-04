import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  Task, StudySession, Flashcard, MockTest, AppSettings, 
  getTasks, saveTasks, getSessions, saveSessions, 
  getFlashcards, saveFlashcards, getMockTests, saveMockTests, 
  getSettings, saveSettings, DEFAULT_SETTINGS 
} from './store';
import { format, addDays } from 'date-fns';

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
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [sessions, setSessionsState] = useState<StudySession[]>([]);
  const [flashcards, setFlashcardsState] = useState<Flashcard[]>([]);
  const [mockTests, setMockTestsState] = useState<MockTest[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [t, s, f, m, set] = await Promise.all([
      getTasks(),
      getSessions(),
      getFlashcards(),
      getMockTests(),
      getSettings()
    ]);
    
    // Seed data if onboarding is not done and no tasks exist
    if (!set.onboardingDone && t.length === 0) {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
      const yesterdayStr = format(addDays(today, -1), 'yyyy-MM-dd');

      const seedTasks: Task[] = [
        { id: 't1', date: todayStr, startTime: '09:00', endTime: '10:30', subject: 'Physics', task: 'Kinematics practice', priority: 'High', quadrant: 'urgent-important', completed: false, pomodoroSessions: 0, createdAt: today.toISOString() },
        { id: 't2', date: todayStr, startTime: '11:00', endTime: '12:00', subject: 'Chemistry', task: 'Organic nomenclature', priority: 'Medium', quadrant: 'not-urgent-important', completed: false, pomodoroSessions: 0, createdAt: today.toISOString() },
        { id: 't3', date: tomorrowStr, startTime: '14:00', endTime: '16:00', subject: 'Maths', task: 'Calculus integration', priority: 'High', quadrant: 'urgent-important', completed: false, pomodoroSessions: 0, createdAt: today.toISOString() },
      ];
      const seedSessions: StudySession[] = [
        { id: 's1', date: yesterdayStr, subject: 'Physics', durationMinutes: 120, type: 'pomodoro' },
        { id: 's2', date: todayStr, subject: 'Chemistry', durationMinutes: 60, type: 'manual' },
      ];
      const seedFlashcards: Flashcard[] = [
        { id: 'f1', front: 'Newton\'s Second Law', back: 'F = ma', subject: 'Physics', nextReview: todayStr, difficulty: 'medium', reviewCount: 0 },
        { id: 'f2', front: 'Derivative of sin(x)', back: 'cos(x)', subject: 'Maths', nextReview: todayStr, difficulty: 'easy', reviewCount: 0 },
        { id: 'f3', front: 'Atomic number of Carbon', back: '6', subject: 'Chemistry', nextReview: todayStr, difficulty: 'easy', reviewCount: 0 },
      ];
      const seedMockTests: MockTest[] = [
        { id: 'm1', name: 'Midterm 1', subject: 'Physics', score: 85, totalQuestions: 50, date: yesterdayStr, notes: 'Struggled with optics' }
      ];

      await Promise.all([
        saveTasks(seedTasks),
        saveSessions(seedSessions),
        saveFlashcards(seedFlashcards),
        saveMockTests(seedMockTests)
      ]);

      setTasksState(seedTasks);
      setSessionsState(seedSessions);
      setFlashcardsState(seedFlashcards);
      setMockTestsState(seedMockTests);
    } else {
      setTasksState(t);
      setSessionsState(s);
      setFlashcardsState(f);
      setMockTestsState(m);
    }
    
    setSettingsState(set);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const setTasks = (newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksState(prev => {
      const next = typeof newTasks === 'function' ? newTasks(prev) : newTasks;
      saveTasks(next);
      return next;
    });
  };

  const setSessions = (newSessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => {
    setSessionsState(prev => {
      const next = typeof newSessions === 'function' ? newSessions(prev) : newSessions;
      saveSessions(next);
      return next;
    });
  };

  const setFlashcards = (newFlashcards: Flashcard[] | ((prev: Flashcard[]) => Flashcard[])) => {
    setFlashcardsState(prev => {
      const next = typeof newFlashcards === 'function' ? newFlashcards(prev) : newFlashcards;
      saveFlashcards(next);
      return next;
    });
  };

  const setMockTests = (newMockTests: MockTest[] | ((prev: MockTest[]) => MockTest[])) => {
    setMockTestsState(prev => {
      const next = typeof newMockTests === 'function' ? newMockTests(prev) : newMockTests;
      saveMockTests(next);
      return next;
    });
  };

  const setSettings = (newSettings: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(prev => {
      const next = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
      saveSettings(next);
      return next;
    });
  };

  return (
    <StoreContext.Provider value={{
      tasks, setTasks,
      sessions, setSessions,
      flashcards, setFlashcards,
      mockTests, setMockTests,
      settings, setSettings,
      isLoading,
      reloadAll: loadData
    }}>
      {children}
    </StoreContext.Provider>
  );
};