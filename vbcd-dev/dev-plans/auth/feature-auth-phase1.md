---
feature_id: "auth-phase1"
title: "Authentication Foundation (Phase 1)"
version: "1.0"
created: "2025-01-30"
status: "pending"
source_design: "vbcd-dev/dev-plans/auth/spec-auth-feature.md"
---

# Feature: Authentication Foundation (Phase 1)

## Overview

Add user authentication to AreaCalc enabling users to sign in with Google account, sign out, and persist auth state across page refreshes. This establishes the foundation for future session persistence features.

## Background

AreaCalc currently operates as a fully client-side application with localStorage persistence. Users cannot access their measurements from other devices. This phase adds Firebase Authentication with Google Sign-In to establish user identity, which Phase 2 will use for cloud session storage.

## Goals

1. Enable Google Sign-In authentication via Firebase Auth
2. Provide sign-out functionality
3. Persist auth state across page refreshes
4. Support English and Hebrew locales with RTL
5. Non-blocking auth - app remains fully functional during auth loading

## Codebase Analysis

### Current Architecture
- **Framework**: Next.js 15.3.3 with Turbopack, TypeScript
- **State Management**: React hooks in page.tsx, no context providers except Toaster
- **UI Framework**: ShadCN UI (38 components), Tailwind CSS, Radix UI primitives
- **Firebase**: Already in package.json (`firebase: ^11.9.1`) but not initialized
- **Form Handling**: react-hook-form + zod available
- **Icons**: Lucide React

### Key Files to Modify
| File | Change |
|------|--------|
| `src/app/layout.tsx` | Wrap with AuthProvider and I18nProvider |
| `src/app/page.tsx` | Add AuthButton component |

### New Files to Create
| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase initialization & config |
| `src/contexts/auth-context.tsx` | Auth state provider |
| `src/components/auth-button.tsx` | Floating auth button |
| `src/components/login-modal.tsx` | Sign-in modal dialog |
| `src/types/auth.ts` | Auth-related TypeScript types |
| `src/i18n/index.ts` | i18n setup & locale detection |
| `src/i18n/translations/en.json` | English strings |
| `src/i18n/translations/he.json` | Hebrew strings |

### Existing Patterns to Follow
- **Dynamic imports**: Used for SSR-incompatible components (see AreaMap)
- **Toast notifications**: via `useToast()` hook
- **Styling**: Tailwind classes with `cn()` utility for conditional merging
- **Component structure**: ShadCN components in `src/components/ui/`

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Firebase SDK size impact | LOW | Tree-shaking, lazy loading |
| SSR compatibility | LOW | Firebase only used client-side, use dynamic imports |
| Environment variables | LOW | Clear documentation, .env.example |
| i18n complexity | MEDIUM | Start simple, expand as needed |

## Verification Process

### Build Verification
```bash
npm run build
npm run typecheck
npm run lint
```

### Development Verification
```bash
npm run dev
# Verify app loads at http://localhost:9002
# Verify auth button appears
# Test sign-in/sign-out flow
```

### Specific Verifications
- Firebase initializes without errors
- Auth state persists across page refresh
- Hebrew locale triggers RTL layout
- Popup blocked error displays correctly

---

# Phase 1: Core Infrastructure

## Phase Overview

Set up the foundational infrastructure: Firebase configuration, TypeScript types, and internationalization system. These are prerequisites for all other tasks.

## Phase Scope

- Firebase initialization with environment variables
- Auth-related TypeScript types
- i18n system with locale detection and translations

---

### Task 1.1: Create Firebase Configuration

**Description**

Initialize Firebase with Google Auth provider. Create the configuration file that will be imported by auth-related components.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/firebase.ts` | CREATE | Firebase initialization |
| `.env.local` | CREATE | Environment variables (gitignored) |
| `.env.example` | CREATE | Template for required env vars |
| `.gitignore` | MODIFY | Ensure .env.local is ignored |

**Implementation Details**

From the spec (Section 5.2):

```typescript
// src/lib/firebase.ts

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent multiple initializations
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
```

Environment variables template (`.env.example`):
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Important Considerations**

- Use `getApps().length === 0` check to prevent multiple initializations in dev mode (hot reload)
- All env vars use `NEXT_PUBLIC_` prefix for client-side access
- Firebase config is intentionally public - security comes from Firebase rules
- Storage is configured but will be used in Phase 2

**Test Requirements**

- Firebase module exports `auth`, `storage`, and `googleProvider`
- No initialization errors when env vars are set
- Multiple imports don't cause re-initialization

**Success Criteria**

- [ ] `src/lib/firebase.ts` exports auth, storage, googleProvider
- [ ] `.env.example` documents all required environment variables
- [ ] `.gitignore` includes `.env.local`
- [ ] App builds without errors

---

### Task 1.2: Create Auth TypeScript Types

**Description**

Define TypeScript interfaces for authentication state and user data. These types will be used throughout the auth system.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/types/auth.ts` | CREATE | Auth-related TypeScript types |

**Implementation Details**

From the spec (Section 4.1):

```typescript
// src/types/auth.ts

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

// Context interface (from Appendix B)
export interface UseAuth {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Important Considerations**

- `AuthUser` is a simplified subset of Firebase User
- Only include fields actually used in the UI
- Keep types minimal - expand only when needed

**Test Requirements**

- Types compile without errors
- Types can be imported and used in other files

**Success Criteria**

- [ ] Types directory created at `src/types/`
- [ ] All interfaces exported from `src/types/auth.ts`
- [ ] No TypeScript errors

---

### Task 1.3: Create Internationalization System

**Description**

Set up the i18n infrastructure with locale detection, translation loading, and RTL support. This task creates the foundation - translations for specific components will be added as those components are built.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/i18n/index.ts` | CREATE | i18n setup & locale detection |
| `src/i18n/translations/en.json` | CREATE | English strings |
| `src/i18n/translations/he.json` | CREATE | Hebrew strings |
| `src/contexts/i18n-context.tsx` | CREATE | i18n context provider |

**Implementation Details**

From the spec (Section 8):

```typescript
// src/i18n/index.ts

export type Locale = 'en' | 'he';

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('he')) return 'he';
  return 'en';
}

export function isRTL(locale: Locale): boolean {
  return locale === 'he';
}
```

Translation files (Section 8.2):

```json
// src/i18n/translations/en.json
{
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "signedInAs": "Signed in as {name}",
    "signedOut": "Signed out",
    "continueWithGoogle": "Continue with Google",
    "signInTitle": "Sign In",
    "signInSubtitle": "Save your measurements and access them from any device.",
    "termsNotice": "By signing in, you agree to our Terms of Service and Privacy Policy"
  },
  "errors": {
    "popupBlocked": "Please allow popups for this site to sign in",
    "networkError": "Network error. Please check your connection.",
    "unknownError": "Something went wrong. Please try again."
  },
  "common": {
    "cancel": "Cancel",
    "retry": "Retry"
  }
}
```

```json
// src/i18n/translations/he.json
{
  "auth": {
    "signIn": "התחברות",
    "signOut": "התנתקות",
    "signedInAs": "מחובר כ-{name}",
    "signedOut": "התנתקת",
    "continueWithGoogle": "המשך עם Google",
    "signInTitle": "התחברות",
    "signInSubtitle": "שמור את המדידות שלך וגש אליהן מכל מכשיר.",
    "termsNotice": "בהתחברות, אתה מסכים לתנאי השימוש ומדיניות הפרטיות"
  },
  "errors": {
    "popupBlocked": "אנא אפשר חלונות קופצים לאתר זה כדי להתחבר",
    "networkError": "שגיאת רשת. אנא בדוק את החיבור.",
    "unknownError": "משהו השתבש. אנא נסה שוב."
  },
  "common": {
    "cancel": "ביטול",
    "retry": "נסה שוב"
  }
}
```

i18n Context:

```typescript
// src/contexts/i18n-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectLocale, isRTL, type Locale } from '@/i18n';
import en from '@/i18n/translations/en.json';
import he from '@/i18n/translations/he.json';

const translations = { en, he };

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ t, locale, isRTL: isRTL(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
```

**Important Considerations**

- Locale detection runs client-side only (SSR returns 'en')
- RTL affects modal content direction and text alignment
- Parameter substitution uses `{name}` syntax
- Keep translations flat where possible for maintainability

**Test Requirements**

- `detectLocale()` returns 'he' for Hebrew browser language
- `detectLocale()` returns 'en' for all other languages
- `t()` function retrieves nested keys correctly
- Parameter substitution works: `t('auth.signedInAs', { name: 'John' })` → "Signed in as John"
- `isRTL` returns true for Hebrew locale

**Success Criteria**

- [ ] `src/i18n/` directory structure created
- [ ] Locale detection works based on browser language
- [ ] Translation function retrieves strings correctly
- [ ] RTL detection works for Hebrew
- [ ] Parameter substitution works

---

# Phase 2: Auth State Management

## Phase Overview

Implement the core authentication context that manages user state, sign-in, and sign-out operations. This context will wrap the entire application.

## Phase Scope

- Auth context provider with Firebase integration
- Sign-in with Google popup
- Sign-out functionality
- Auth state persistence across page refreshes

---

### Task 2.1: Create Auth Context Provider

**Description**

Create the authentication context that manages user state, provides sign-in/sign-out methods, and subscribes to Firebase auth state changes. This is the core of the auth system.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/contexts/auth-context.tsx` | CREATE | Auth state provider |

**Implementation Details**

From the spec (Section 7.1, 7.2, 7.4, Appendix B):

```typescript
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
import type { AuthUser, UseAuth } from '@/types/auth';

const AuthContext = createContext<UseAuth | null>(null);

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

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): UseAuth {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Important Considerations**

- `onAuthStateChanged` handles state restoration on page load
- Auth state updates are automatic via Firebase subscription
- Error codes map to i18n keys (not raw messages)
- `popup-closed-by-user` is silent (user intentionally cancelled)
- The `loading` state starts `true` and becomes `false` after first auth check

**Test Requirements**

- `loading` is true initially, false after auth check completes
- `user` is null when signed out
- `user` contains correct properties when signed in
- `signIn` calls `signInWithPopup` with correct provider
- `signOut` calls Firebase `signOut`
- Error codes are mapped correctly

**Success Criteria**

- [ ] AuthProvider wraps children correctly
- [ ] useAuth hook provides all required fields
- [ ] Auth state persists across page refresh
- [ ] Sign-in/sign-out methods work
- [ ] Error states are set correctly

---

### Task 2.2: Integrate Auth Provider into App Layout

**Description**

Wrap the application with AuthProvider and I18nProvider in the root layout. This enables auth state access throughout the app.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/layout.tsx` | MODIFY | Add providers |
| `src/components/providers.tsx` | CREATE | Client-side providers wrapper |

**Implementation Details**

Create a client-side providers component:

```typescript
// src/components/providers.tsx
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { I18nProvider } from '@/contexts/i18n-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </I18nProvider>
  );
}
```

Update layout:

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'AreaCalc',
  description: 'Calculate the size of an area using your location.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full w-full">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
```

**Important Considerations**

- Providers are client-side components (use 'use client')
- Keep layout.tsx as a server component where possible
- Toaster stays outside Providers (independent)
- I18nProvider wraps AuthProvider (auth may need translations)

**Test Requirements**

- App loads without errors
- useAuth can be called from page.tsx
- useI18n can be called from page.tsx

**Success Criteria**

- [ ] Providers component created as client component
- [ ] Layout wraps children with Providers
- [ ] App builds and runs without errors
- [ ] Hooks are accessible from page components

---

# Phase 3: UI Components

## Phase Overview

Build the user-facing authentication components: the floating auth button with dropdown menu and the login modal.

## Phase Scope

- Floating auth button (top-right corner)
- User dropdown menu (sign out)
- Login modal with Google sign-in

---

### Task 3.1: Create Login Modal Component

**Description**

Create the sign-in modal that appears when users click "Sign In". Contains the Google sign-in button and terms notice.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/login-modal.tsx` | CREATE | Sign-in modal dialog |

**Implementation Details**

From the spec (Section 6.2):

```typescript
// src/components/login-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { signIn, error } = useAuth();
  const { t, isRTL } = useI18n();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
      onOpenChange(false);
      toast({
        title: t('auth.signedInAs', { name: 'User' }), // Will show actual name from auth state
      });
      onSuccess?.();
    } catch (err) {
      // Error already set in auth context
      if (error && error !== 'popupBlocked') {
        // Only show toast for non-popup errors (popup shows inline)
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[400px]",
          isRTL && "rtl"
        )}
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {t('auth.signInTitle')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t('auth.signInSubtitle')}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive text-center">
              {t(`errors.${error}`)}
            </p>
          )}

          {/* Google Sign-In Button */}
          <Button
            variant="outline"
            className="w-full h-11 text-base"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {t('auth.continueWithGoogle')}
          </Button>
        </div>

        {/* Terms notice */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground text-center">
            {t('auth.termsNotice')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Important Considerations**

- Modal width: `min(400px, 90vw)` via `sm:max-w-[400px]`
- RTL support via `dir` attribute and conditional `rtl` class
- Google logo is inline SVG (no external dependency)
- Loading state disables button and shows spinner
- Error displays inline in modal
- Close via X button or click outside (handled by Dialog)

**Test Requirements**

- Modal opens when `open` is true
- Modal closes when X is clicked
- Modal closes when clicking outside
- Google button shows loading state during sign-in
- Error message displays when auth fails
- RTL layout applies for Hebrew locale

**Success Criteria**

- [ ] Modal renders correctly with all elements
- [ ] Google sign-in button triggers auth flow
- [ ] Loading state works correctly
- [ ] Error messages display inline
- [ ] RTL support works
- [ ] Modal closes on successful sign-in

---

### Task 3.2: Create Auth Button Component

**Description**

Create the floating auth button that appears in the top-right corner. Shows sign-in button when logged out, or user info with dropdown menu when logged in.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/auth-button.tsx` | CREATE | Floating auth button |

**Implementation Details**

From the spec (Section 6.1):

```typescript
// src/components/auth-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { LoginModal } from '@/components/login-modal';
import { Loader2, LogIn, LogOut, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthButtonProps {
  className?: string;
}

export function AuthButton({ className }: AuthButtonProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: t('auth.signedOut'),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('errors.unknownError'),
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        "bg-white rounded-lg shadow-md px-4 py-2",
        className
      )}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Signed out state
  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          className={cn(
            "bg-white shadow-md",
            className
          )}
          onClick={() => setLoginModalOpen(true)}
        >
          <LogIn className="h-4 w-4 mr-2" />
          {t('auth.signIn')}
        </Button>

        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
        />
      </>
    );
  }

  // Signed in state
  const initials = user.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "bg-white shadow-md",
            className
          )}
        >
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate">
            {user.displayName || user.email}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Important Considerations**

- Position is controlled by parent (page.tsx will add absolute positioning)
- Z-index same as map controls (z-[1000])
- Avatar shows user photo or initials fallback
- Display name truncated to prevent overflow
- Dropdown aligned to end (right side)
- Phase 1: Only sign out in dropdown (My Sessions, Save added in Phase 2)

**Test Requirements**

- Loading spinner shows during auth check
- Sign In button shows when logged out
- User avatar/name shows when logged in
- Dropdown opens on click
- Sign out works and shows toast

**Success Criteria**

- [ ] Three states render correctly (loading, signed out, signed in)
- [ ] Login modal opens when Sign In clicked
- [ ] Avatar displays user photo or initials
- [ ] Dropdown menu works
- [ ] Sign out updates state and shows toast

---

### Task 3.3: Add Auth Button to Page

**Description**

Add the AuthButton component to the main page, positioned in the top-right corner floating above the map.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/page.tsx` | MODIFY | Add AuthButton component |

**Implementation Details**

Add import and render AuthButton:

```typescript
// At the top of page.tsx, add import:
import { AuthButton } from '@/components/auth-button';

// Inside the Home component's return, add AuthButton
// It should be positioned absolutely in the top-right corner

// Find the outer div that contains the map and controls
// Add AuthButton as a sibling to existing content:

<AuthButton className="absolute top-4 right-4 z-[1000]" />
```

The exact placement depends on the page structure. The button should:
- Be absolutely positioned
- Top-right corner: `top-4 right-4` (16px from edges)
- Z-index 1000 to float above map controls

**Important Considerations**

- Don't modify existing functionality
- Button must not overlap with existing UI elements
- Z-index should match other floating elements (map controls)
- Test on both desktop and mobile viewports

**Test Requirements**

- Auth button appears in top-right corner
- Button doesn't interfere with existing functionality
- Button is visible on mobile
- Z-index is correct (floats above map)

**Success Criteria**

- [ ] AuthButton renders on page
- [ ] Position is top-right corner
- [ ] Z-index allows it to float above map
- [ ] No regression in existing functionality

---

# Phase 4: Error Handling & Polish

## Phase Overview

Implement proper error handling with translated messages and toast notifications. Add final polish for production readiness.

## Phase Scope

- Error message translation integration
- Toast notifications for auth events
- Popup blocked handling
- Network error handling

---

### Task 4.1: Implement Auth Error Handling with Toasts

**Description**

Enhance the auth flow with proper error handling, translated error messages, and toast notifications. Handle specific error cases like popup blocked and network errors.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/login-modal.tsx` | MODIFY | Enhanced error handling |
| `src/contexts/auth-context.tsx` | MODIFY | Clear errors appropriately |

**Implementation Details**

Update LoginModal to handle errors better:

```typescript
// In login-modal.tsx, update handleGoogleSignIn:

const handleGoogleSignIn = async () => {
  setIsSigningIn(true);
  try {
    await signIn();
    onOpenChange(false);
    // Toast handled after modal closes
  } catch (err: any) {
    // Error is set in auth context, display inline
    // Only show toast for certain errors
    if (err.code === 'auth/network-request-failed') {
      toast({
        variant: 'destructive',
        title: t('errors.networkError'),
        action: {
          label: t('common.retry'),
          onClick: () => handleGoogleSignIn(),
        },
      });
    }
  } finally {
    setIsSigningIn(false);
  }
};

// Clear error when modal opens
useEffect(() => {
  if (open) {
    // Could add a clearError function to auth context
  }
}, [open]);
```

From spec Section 9.1, error mapping:

| Error Code | Behavior |
|------------|----------|
| `auth/popup-blocked` | Show inline in modal |
| `auth/popup-closed-by-user` | Silent, no message |
| `auth/network-request-failed` | Toast with Retry button |
| Other errors | Generic error message |

**Important Considerations**

- `popup-closed-by-user` should be silent (user intentionally cancelled)
- Network errors should show Retry button (spec Section 9.3)
- Don't show duplicate errors (inline + toast)
- Clear errors when reopening modal

**Test Requirements**

- Popup blocked shows inline error in modal
- User cancelled shows no error
- Network error shows toast with Retry
- Retry button re-attempts sign-in
- Errors clear when modal reopens

**Success Criteria**

- [ ] Each error type handled appropriately
- [ ] Retry mechanism works for network errors
- [ ] No duplicate error messages
- [ ] User cancelled is silent

---

### Task 4.2: Add Success Toast for Sign-In

**Description**

Show a success toast notification when user successfully signs in, displaying their name.

**Relevant Files**

| File | Action | Purpose |
|------|--------|---------|
| `src/components/auth-button.tsx` | MODIFY | Add success toast |
| `src/components/login-modal.tsx` | MODIFY | Trigger success callback |

**Implementation Details**

The LoginModal's `onSuccess` callback should be used to show the toast after successful sign-in:

```typescript
// In auth-button.tsx, update LoginModal usage:

<LoginModal
  open={loginModalOpen}
  onOpenChange={setLoginModalOpen}
  onSuccess={() => {
    // Show success toast after modal closes
    // Need to wait for auth state to update
    setTimeout(() => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        toast({
          title: t('auth.signedInAs', {
            name: currentUser.displayName || currentUser.email || 'User'
          }),
        });
      }
    }, 100);
  }}
/>
```

Alternatively, use a useEffect to watch for user changes:

```typescript
// In auth-button.tsx
const prevUserRef = useRef(user);

useEffect(() => {
  if (!prevUserRef.current && user) {
    // User just signed in
    toast({
      title: t('auth.signedInAs', { name: user.displayName || user.email || 'User' }),
    });
  }
  prevUserRef.current = user;
}, [user, t, toast]);
```

**Important Considerations**

- Toast should show user's display name
- Fall back to email if no display name
- Don't show toast on page load (only on new sign-in)
- Toast duration: 3000ms (default)

**Test Requirements**

- Toast shows after successful sign-in
- Toast displays correct user name
- Toast doesn't show on page refresh
- Toast duration is appropriate

**Success Criteria**

- [ ] Success toast shows on sign-in
- [ ] User name displays correctly
- [ ] No toast on page refresh (existing session)
- [ ] Toast styling matches app theme

---

## Summary

### Phase Order and Dependencies

```
Phase 1: Core Infrastructure
├── Task 1.1: Firebase Configuration (no deps)
├── Task 1.2: Auth Types (no deps)
└── Task 1.3: i18n System (no deps)

Phase 2: Auth State Management
├── Task 2.1: Auth Context (depends on 1.1, 1.2)
└── Task 2.2: Provider Integration (depends on 2.1, 1.3)

Phase 3: UI Components
├── Task 3.1: Login Modal (depends on 2.2)
├── Task 3.2: Auth Button (depends on 3.1)
└── Task 3.3: Add to Page (depends on 3.2)

Phase 4: Error Handling & Polish
├── Task 4.1: Error Handling (depends on 3.1)
└── Task 4.2: Success Toast (depends on 3.2)
```

### Total Tasks: 9

### Required Environment Setup

Before running the application with auth:
1. Create Firebase project at console.firebase.google.com
2. Enable Google Sign-In in Authentication section
3. Set up Firebase Storage (for Phase 2)
4. Copy config values to `.env.local`

### Files Created (8 new files)

- `src/lib/firebase.ts`
- `src/types/auth.ts`
- `src/i18n/index.ts`
- `src/i18n/translations/en.json`
- `src/i18n/translations/he.json`
- `src/contexts/auth-context.tsx`
- `src/contexts/i18n-context.tsx`
- `src/components/providers.tsx`
- `src/components/login-modal.tsx`
- `src/components/auth-button.tsx`
- `.env.example`

### Files Modified (2 files)

- `src/app/layout.tsx`
- `src/app/page.tsx`
