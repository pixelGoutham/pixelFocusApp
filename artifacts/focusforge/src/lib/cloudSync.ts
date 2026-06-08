import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import localforage from 'localforage';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import {
  getTasks, getSessions, getFlashcards, getMockTests, getSettings,
  saveTasks, saveSessions, saveFlashcards, saveMockTests, saveSettings,
  DEFAULT_SETTINGS, Task, StudySession, Flashcard, MockTest, AppSettings,
} from './store';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'unconfigured' | 'signed-out';

export interface CloudSnapshot {
  tasks: Task[];
  sessions: StudySession[];
  flashcards: Flashcard[];
  mockTests: MockTest[];
  settings: AppSettings;
  syncedAt?: string;
}

let syncStatusListeners: ((s: SyncStatus) => void)[] = [];
let currentStatus: SyncStatus = isFirebaseConfigured ? 'signed-out' : 'unconfigured';
let syncTimer: ReturnType<typeof setInterval> | null = null;
let pendingSync: ReturnType<typeof setTimeout> | null = null;

export function getSyncStatus(): SyncStatus { return currentStatus; }

export function onSyncStatusChange(fn: (s: SyncStatus) => void): () => void {
  syncStatusListeners.push(fn);
  fn(currentStatus);
  return () => { syncStatusListeners = syncStatusListeners.filter(l => l !== fn); };
}

function setStatus(s: SyncStatus) {
  currentStatus = s;
  syncStatusListeners.forEach(fn => fn(s));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDeviceId(): Promise<string> {
  let id = await localforage.getItem<string>('pixel_device_id');
  if (!id) {
    id = `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    await localforage.setItem('pixel_device_id', id);
  }
  return id;
}

function getDocKey(uid: string | null | undefined): Promise<string> {
  return uid ? Promise.resolve(uid) : getDeviceId();
}

// ── Core sync ─────────────────────────────────────────────────────────────────

export async function syncToCloud(uid?: string | null): Promise<void> {
  if (!isFirebaseConfigured) { setStatus('unconfigured'); return; }
  if (!uid) { setStatus('signed-out'); return; }
  if (!navigator.onLine) { setStatus('offline'); return; }
  const db = getFirebaseDb();
  if (!db) { setStatus('unconfigured'); return; }

  setStatus('syncing');
  try {
    const [tasks, sessions, flashcards, mockTests, settings] = await Promise.all([
      getTasks(), getSessions(), getFlashcards(), getMockTests(), getSettings(),
    ]);
    const key = await getDocKey(uid);
    const docRef = doc(db, 'pixel_users', key);
    await setDoc(docRef, {
      tasks, sessions, flashcards, mockTests, settings,
      syncedAt: serverTimestamp(),
    });
    setStatus('success');
    await localforage.setItem('pixel_last_sync', new Date().toISOString());
  } catch (e) {
    console.warn('[cloudSync] sync failed', e);
    setStatus('error');
  }
}

export async function fetchFromCloud(uid: string): Promise<CloudSnapshot | null> {
  if (!isFirebaseConfigured || !navigator.onLine) return null;
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const key = await getDocKey(uid);
    const snap = await getDoc(doc(db, 'pixel_users', key));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      tasks:      d.tasks      ?? [],
      sessions:   d.sessions   ?? [],
      flashcards: d.flashcards ?? [],
      mockTests:  d.mockTests  ?? [],
      settings:   { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
      syncedAt:   d.syncedAt?.toDate?.()?.toISOString() ?? undefined,
    };
  } catch (e) {
    console.warn('[cloudSync] fetch failed', e);
    return null;
  }
}

export async function restoreFromSnapshot(snapshot: CloudSnapshot): Promise<void> {
  await Promise.all([
    saveTasks(snapshot.tasks),
    saveSessions(snapshot.sessions),
    saveFlashcards(snapshot.flashcards),
    saveMockTests(snapshot.mockTests),
    saveSettings(snapshot.settings),
  ]);
  await localforage.setItem('pixel_last_sync', new Date().toISOString());
}

// ── Scheduled sync ────────────────────────────────────────────────────────────

let currentUid: string | null = null;

export function setCurrentUser(uid: string | null) {
  currentUid = uid;
  if (!uid) { setStatus('signed-out'); }
}

export function scheduleSync(delayMs = 30_000) {
  if (!isFirebaseConfigured || !currentUid) return;
  if (pendingSync) clearTimeout(pendingSync);
  pendingSync = setTimeout(() => { syncToCloud(currentUid); }, delayMs);
}

export function setupPeriodicSync(intervalMs = 5 * 60 * 1000) {
  if (!isFirebaseConfigured) return;
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (navigator.onLine && currentUid) syncToCloud(currentUid);
  }, intervalMs);
  window.addEventListener('online', () => {
    if (currentUid) syncToCloud(currentUid);
  });
}

export function teardownSync() {
  if (syncTimer) clearInterval(syncTimer);
  if (pendingSync) clearTimeout(pendingSync);
}

export async function getLastSyncTime(): Promise<string | null> {
  return localforage.getItem<string>('pixel_last_sync');
}
