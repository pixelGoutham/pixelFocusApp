---
name: Firebase cloud sync
description: How optional Firebase Firestore sync is implemented (graceful degradation when not configured).
---

## Rule
Firebase sync is enabled only when `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` env vars are all set.

**Why:** This is a no-backend offline app. Firebase is optional enhancement. All code paths must work without it.

## How to apply
- `isFirebaseConfigured` boolean in `lib/firebase.ts` gates all Firebase usage.
- `lib/cloudSync.ts` exports `syncToCloud()`, `syncFromCloud()`, `scheduleSync()`, `setupPeriodicSync()`, `onSyncStatusChange()`.
- StoreContext calls `scheduleSync()` (debounced 30s) after every data write, and `setupPeriodicSync()` (every 5 min) after initial load.
- On app start, `syncFromCloud()` is called once (pulls latest from Firestore if available).
- Firestore structure: `pixel_users/{deviceId}` — one document per device, full data snapshot.
- Device ID is a random string stored in localforage under `pixel_device_id`.
- Anonymous Firebase Auth is used (no login required).
- Settings page shows sync status badge and "Sync Now" button; shows setup instructions when unconfigured.
