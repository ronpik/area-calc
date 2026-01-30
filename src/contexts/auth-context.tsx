// src/contexts/auth-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import type { AuthUser } from '@/types/auth';

// Extended interface to include clearError
interface UseAuthWithClearError {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<UseAuthWithClearError | null>(null);

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // State update handled by onAuthStateChanged
    } catch (err: any) {
      // Error codes from spec Section 9.1
      if (err.code === 'auth/popup-blocked') {
        setError('popupBlocked');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Silent - user cancelled
        setError(null);
      } else if (err.code === 'auth/network-request-failed') {
        setError('networkError');
      } else {
        setError('unknownError');
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      // State update handled by onAuthStateChanged
    } catch (err) {
      setError('unknownError');
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): UseAuthWithClearError {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
