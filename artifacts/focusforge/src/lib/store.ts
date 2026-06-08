import localforage from 'localforage';

// Configure localforage
localforage.config({ name: 'pixel', storeName: 'data' });

export interface Task {
  id: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  subject: string;
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  quadrant: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'neither';
  completed: boolean;
  pomodoroSessions: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  date: string;
  subject: string;
  durationMinutes: number;
  type: 'pomodoro' | 'manual' | 'stopwatch';
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  nextReview: string;  // YYYY-MM-DD
  difficulty: 'easy' | 'medium' | 'hard';
  reviewCount: number;
}

export interface MockTest {
  id: string;
  name: string;
  subject: string;
  score: number;       // 0-100 percentage
  totalQuestions: number;
  date: string;
  notes: string;
}

export interface Subject {
  name: string;
  color: string;
}

export interface AppSettings {
  userName: string;
  pomodoroWork: number;
  pomodoroBreak: number;
  pomodoroLongBreak: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  lastActiveDate: string;
  onboardingDone: boolean;
  subjects: Subject[];
  studyPlan: Record<string, Record<string, number>>; // subjectName -> "yyyy-MM-dd" -> hours
}

// Storage keys
const KEYS = {
  tasks: 'tasks',
  sessions: 'sessions',
  flashcards: 'flashcards',
  mockTests: 'mockTests',
  settings: 'settings',
};

// Generic CRUD helpers
export async function getAll<T>(key: string): Promise<T[]> {
  return (await localforage.getItem<T[]>(key)) ?? [];
}
export async function saveAll<T>(key: string, items: T[]): Promise<void> {
  await localforage.setItem(key, items);
}

// Tasks
export const getTasks = () => getAll<Task>(KEYS.tasks);
export const saveTasks = (tasks: Task[]) => saveAll(KEYS.tasks, tasks);

// Sessions
export const getSessions = () => getAll<StudySession>(KEYS.sessions);
export const saveSessions = (s: StudySession[]) => saveAll(KEYS.sessions, s);

// Flashcards
export const getFlashcards = () => getAll<Flashcard>(KEYS.flashcards);
export const saveFlashcards = (f: Flashcard[]) => saveAll(KEYS.flashcards, f);

// Mock Tests
export const getMockTests = () => getAll<MockTest>(KEYS.mockTests);
export const saveMockTests = (m: MockTest[]) => saveAll(KEYS.mockTests, m);

// Settings
export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  pomodoroWork: 25,
  pomodoroBreak: 5,
  pomodoroLongBreak: 15,
  dailyGoalMinutes: 480,
  currentStreak: 0,
  lastActiveDate: '',
  onboardingDone: false,
  subjects: [],
  studyPlan: {},
};
export const getSettings = async (): Promise<AppSettings> => {
  const saved = await localforage.getItem<AppSettings>(KEYS.settings);
  if (!saved) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...saved };
};
export const saveSettings = (s: AppSettings) => localforage.setItem(KEYS.settings, s);

// Export all data as JSON blob for backup
export async function exportData(): Promise<string> {
  const [tasks, sessions, flashcards, mockTests, settings] = await Promise.all([
    getTasks(), getSessions(), getFlashcards(), getMockTests(), getSettings()
  ]);
  return JSON.stringify({ tasks, sessions, flashcards, mockTests, settings, exportedAt: new Date().toISOString() }, null, 2);
}

// Import data from JSON backup
export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);
  await Promise.all([
    saveTasks(data.tasks ?? []),
    saveSessions(data.sessions ?? []),
    saveFlashcards(data.flashcards ?? []),
    saveMockTests(data.mockTests ?? []),
    saveSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }),
  ]);
}
