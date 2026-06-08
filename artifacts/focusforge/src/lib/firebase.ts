import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth, Auth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let _app:  FirebaseApp | null = null;
let _db:   Firestore   | null = null;
let _auth: Auth        | null = null;

function ensureInitialized() {
  if (_app) return;
  _app  = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  _db   = getFirestore(_app);
  _auth = getAuth(_app);
}

export function getFirebaseDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  ensureInitialized();
  return _db;
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  ensureInitialized();
  return _auth;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth()!;
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithApple(): Promise<User> {
  const auth = getFirebaseAuth()!;
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth()!;
  await fbSignOut(auth);
}

export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}
