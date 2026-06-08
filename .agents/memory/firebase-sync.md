---
name: Firebase cloud sync + Google/Apple auth
description: How optional Firebase Auth (Google/Apple sign-in) + Firestore sync is implemented with graceful degradation.
---

## Rule
Firebase features are enabled only when `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` env vars are set. Everything works offline without them.

**Why:** This is a no-backend offline-first app. Auth and cloud sync are optional enhancements.

## Provider hierarchy
AuthProvider (outermost) → StoreProvider (calls useAuth()) → TimerProvider → MusicProvider.
AuthProvider MUST wrap StoreProvider — StoreProvider calls useAuth() internally.

## Auth files
- `lib/AuthContext.tsx` — auth state, exports useAuth(), signInWithGoogle(), signInWithApple(), signOut()
- `lib/firebase.ts` — Firebase init, GoogleAuthProvider + OAuthProvider('apple.com'), signInWithPopup wrappers
- Google sign-in: GoogleAuthProvider + signInWithPopup (one click, no manual keys for end user)
- Apple sign-in: OAuthProvider('apple.com') + signInWithPopup (requires Apple Developer setup)

## Conflict resolution on sign-in
StoreContext checks cloud vs local data when UID changes from null→value:
- Only cloud data: restore silently
- Only local data: push to cloud silently
- Both exist: Dialog asks "Restore from cloud" vs "Keep local data"
Dialog is rendered inside StoreContext.Provider JSX (not a separate file).

## Sync
- `setCurrentUser(uid)` in cloudSync.ts — call when auth changes; gates scheduler
- `syncToCloud(uid)` — writes all data to Firestore `pixel_users/{uid}`
- `fetchFromCloud(uid)` — returns CloudSnapshot | null
- Firestore document: pixel_users/{uid} with tasks, sessions, flashcards, mockTests, settings, syncedAt
- scheduleSync() debounced 30s after any write; setupPeriodicSync() every 5 min + window.online

## UI
- Settings: "Account & Cloud Sync" card — Google + Apple sign-in buttons, avatar, last sync, manual sync
- Sidebar: AuthIndicator shows avatar/name or "Sign in"; sync dot (green=synced, blue=syncing)
