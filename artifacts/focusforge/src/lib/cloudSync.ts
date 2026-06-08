import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import localforage from 'localforage';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { getTasks, getSessions, getFlashcards, getMockTests, getSettings, saveTasks, saveSessions, saveFlashcards, saveMockTests, saveSettings, DEFAULT_SETTINGS } from './store';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'unconfigured';

let syncStatusListeners: ((s: SyncStatus) => void)[] = [];
let currentStatus: SyncStatus = isFirebaseConfigured ? 'idle' : 'unconfigured';
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

async function getDeviceId(): Promise<string> {
  let id = await localforage.getItem<string>('pixel_device_id');
  if (!id) {
    id = `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    await localforage.setItem('pixel_device_id', id);
  }
  return id;
}

export async function syncToCloud(): Promise<void> {
  if (!isFirebaseConfigured) { setStatus('unconfigured'); return; }
  if (!navigator.onLine) { setStatus('offline'); return; }
  const db = getFirebaseDb();
  if (!db) { setStatus('unconfigured'); return; }

  setStatus('syncing');
  try {
    const [tasks, sessions, flashcards, mockTests, settings] = await Promise.all([
      getTasks(), getSessions(), getFlashcards(), getMockTests(), getSettings()
    ]);
    const deviceId = await getDeviceId();
    const docRef = doc(db, 'pixel_users', deviceId);
    await setDoc(docRef, {
      tasks,
      sessions,
      flashcards,
      mockTests,
      settings,
      syncedAt: serverTimestamp(),
    }, { merge: false });
    setStatus('success');
    await localforage.setItem('pixel_last_sync', new Date().toISOString());
  } catch (e) {
    console.warn('[cloudSync] sync failed', e);
    setStatus('error');
  }
}

export async function syncFromCloud(): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  if (!navigator.onLine) return false;
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const deviceId = await getDeviceId();
    const docRef = doc(db, 'pixel_users', deviceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    await Promise.all([
      saveTasks(data.tasks ?? []),
      saveSessions(data.sessions ?? []),
      saveFlashcards(data.flashcards ?? []),
      saveMockTests(data.mockTests ?? []),
      saveSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }),
    ]);
    return true;
  } catch (e) {
    console.warn('[cloudSync] pull failed', e);
    return false;
  }
}

export function scheduleSync(delayMs = 30_000) {
  if (!isFirebaseConfigured) return;
  if (pendingSync) clearTimeout(pendingSync);
  pendingSync = setTimeout(() => { syncToCloud(); }, delayMs);
}

export async function getLastSyncTime(): Promise<string | null> {
  return localforage.getItem<string>('pixel_last_sync');
}

export function setupPeriodicSync(intervalMs = 5 * 60 * 1000) {
  if (!isFirebaseConfigured) return;
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (navigator.onLine) syncToCloud();
  }, intervalMs);

  window.addEventListener('online', () => { syncToCloud(); });
}

export function teardownSync() {
  if (syncTimer) clearInterval(syncTimer);
  if (pendingSync) clearTimeout(pendingSync);
}
