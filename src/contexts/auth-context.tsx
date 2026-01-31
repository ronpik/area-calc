// src/contexts/auth-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  type User
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import type { AuthUser } from '@/types/auth';

// Extended interface to include clearError and email/password methods
interface UseAuthWithClearError {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

  // Map Firebase error codes to i18n keys
  const mapFirebaseError = (errorCode: string): string => {
    const errorMap: Record<string, string> = {
      'auth/invalid-email': 'invalidEmail',
      'auth/weak-password': 'weakPassword',
      'auth/email-already-in-use': 'emailInUse',
      'auth/user-not-found': 'userNotFound',
      'auth/wrong-password': 'wrongPassword',
      'auth/invalid-credential': 'invalidCredentials',
      'auth/too-many-requests': 'tooManyRequests',
      'auth/user-disabled': 'userDisabled',
      'auth/network-request-failed': 'networkError',
    };
    return errorMap[errorCode] || 'unknownError';
  };

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // State update handled by onAuthStateChanged
    } catch (err: any) {
      const mappedError = mapFirebaseError(err.code);
      setError(mappedError);
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        // Update local user state with display name
        setUser(mapFirebaseUser(userCredential.user));
      }
      // State update handled by onAuthStateChanged
    } catch (err: any) {
      const mappedError = mapFirebaseError(err.code);
      setError(mappedError);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const mappedError = mapFirebaseError(err.code);
      setError(mappedError);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signInWithEmail, signUpWithEmail, resetPassword, signOut, clearError }}>
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
