import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  isFirebaseConfigured,
  signInWithGoogle as fbSignInGoogle,
  signInWithApple as fbSignInApple,
  signOutUser as fbSignOut,
  subscribeToAuthState,
} from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthLoading: boolean;
  isFirebaseReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) { setIsAuthLoading(false); return; }
    const unsub = subscribeToAuthState((fbUser) => {
      setUser(fbUser ? toAuthUser(fbUser) : null);
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await fbSignInGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('popup-closed')) {
        setAuthError('Google sign-in failed. Please try again.');
      }
    }
  };

  const signInWithApple = async () => {
    setAuthError(null);
    try {
      await fbSignInApple();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('popup-closed')) {
        setAuthError(
          msg.includes('provider is not enabled') || msg.includes('auth/operation-not-allowed')
            ? 'Apple sign-in requires additional setup in your Firebase console. Enable Apple as an auth provider and configure your Apple Developer credentials.'
            : 'Apple sign-in failed. Please try again.'
        );
      }
    }
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      await fbSignOut();
      setUser(null);
    } catch (e: unknown) {
      setAuthError('Sign-out failed. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthLoading,
      isFirebaseReady: isFirebaseConfigured,
      signInWithGoogle,
      signInWithApple,
      signOut,
      authError,
      clearAuthError: () => setAuthError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}
