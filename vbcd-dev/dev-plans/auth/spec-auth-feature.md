# Authentication Feature - Design Specification (Phase 1)

**Status:** Ready for Implementation
**Version:** 1.1
**Last Updated:** 2025-01-30
**Scope:** Phase 1 - Authentication Foundation Only

> **Note:** This specification covers **Phase 1 (Authentication)** only. For session persistence (Phase 2) and session management (Phase 3), see [Session Persistence Spec](../persistent/spec-session-persistence.md).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technical Stack](#2-technical-stack)
3. [File Structure](#3-file-structure)
4. [Data Models](#4-data-models)
5. [Firebase Configuration](#5-firebase-configuration)
6. [UI Components](#6-ui-components)
7. [Auth Flow Specifications](#7-auth-flow-specifications)
8. [Internationalization](#8-internationalization)
9. [Error Handling](#9-error-handling)
10. [Security](#10-security)
11. [Edge Cases](#11-edge-cases)
12. [Testing Requirements](#12-testing-requirements)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Overview

### 1.1 Feature Summary

Add user authentication to AreaCalc (Phase 1), enabling users to:
- Sign in with Google account (single-click authentication)
- Sign out from the application
- Persistent auth state across page refreshes
- Foundation for session persistence (Phase 2)

**Future Phases:**
- Phase 2: Save/load measurement sessions (see [Session Persistence Spec](../persistent/spec-session-persistence.md))
- Phase 3: Manage sessions - rename, delete (see [Session Persistence Spec](../persistent/spec-session-persistence.md))
- Phase 4: Account management - delete account (see [Account Management Spec](./spec-account-management.md))

### 1.2 Key Decisions (Phase 1 - Auth Only)

| Decision | Choice |
|----------|--------|
| Auth Provider | Firebase Auth with Google Sign-In |
| Sign-in Method | Popup window |
| Storage Backend | Firebase Cloud Storage (configured in Phase 1, used in Phase 2) |
| Auth Button Location | Floating button, top-right corner |
| Language Support | Device locale detection (English/Hebrew) |

**Decisions deferred to Phase 2/3 (see persistence spec):**
- Session limit, naming, load behavior
- Current session tracking
- Update vs save-as-new behavior

---

## 2. Technical Stack

### 2.1 Dependencies to Add

```json
{
  "firebase": "^10.x.x"
}
```

### 2.2 Firebase Services Used

| Service | Purpose |
|---------|---------|
| Firebase Auth | User authentication via Google |
| Firebase Storage | Persist session JSON files |

---

## 3. File Structure

### 3.1 New Files to Create (Phase 1)

```
src/
├── lib/
│   └── firebase.ts              # Firebase initialization & config
├── contexts/
│   └── auth-context.tsx         # Auth state provider
├── components/
│   ├── auth-button.tsx          # Floating auth button
│   └── login-modal.tsx          # Sign-in modal dialog
├── types/
│   └── auth.ts                  # Auth-related TypeScript types
└── i18n/
    ├── index.ts                 # i18n setup & locale detection
    └── translations/
        ├── en.json              # English strings (auth subset)
        └── he.json              # Hebrew strings (auth subset)
```

### 3.2 Files Added in Phase 2/3 (see persistence spec)

```
src/
├── hooks/
│   └── use-storage.ts           # Firebase Storage operations
├── components/
│   ├── sessions-modal.tsx       # "My Sessions" list modal
│   ├── save-session-modal.tsx   # Save/name session dialog
│   ├── session-indicator.tsx    # Current session display
│   └── confirm-dialog.tsx       # Reusable confirmation dialog
└── types/
    └── session.ts               # Session-related TypeScript types
```

### 3.3 Files to Modify (Phase 1)

```
src/
├── app/
│   ├── layout.tsx               # Wrap with AuthProvider
│   └── page.tsx                 # Add AuthButton component
└── components/
    └── area-map.tsx             # No changes expected
```

---

## 4. Data Models

### 4.1 Auth State (Phase 1)

```typescript
// src/types/auth.ts

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}
```

### 4.2 Session Types (Phase 2 - See Persistence Spec)

Session data models are defined in the [Session Persistence Spec](../persistent/spec-session-persistence.md#2-data-models), including:
- `SessionMeta` - Index entry with metadata
- `SessionData` - Full session with points and `schemaVersion`
- `UserSessionIndex` - User's session list
- `CurrentSessionState` - Tracks active session for update/save-as-new flow
- `TrackedPoint` - GPS point structure (existing type)

### 4.3 Storage Paths (Configured in Phase 1, Used in Phase 2)

```
Firebase Storage Structure:
users/
└── {uid}/
    ├── index.json                      # UserSessionIndex
    └── sessions/
        ├── {sessionId}.json            # SessionData
        └── ...
```

---

## 5. Firebase Configuration

### 5.1 Environment Variables

```bash
# .env.local (not committed to git)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5.2 Firebase Initialization

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

### 5.3 Firebase Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own data
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 6. UI Components

### 6.1 Auth Button (Floating, Top-Right)

**Location:** Top-right corner of the screen, outside the main card
**Z-index:** Same level as map controls (z-[1000])

#### 6.1.1 States (Phase 1)

**Loading State (during initial auth check):**
```
┌──────────────┐
│   ◌ ...      │  (spinner + ellipsis)
└──────────────┘
```

**Signed Out State:**
```
┌──────────────┐
│ 👤 Sign In   │
└──────────────┘
```

**Signed In State (Phase 1 - Minimal):**
```
┌──────────────────────────┐
│ 🔵 {displayName} ▾      │
└──────────────────────────┘
      │
      ▼ (dropdown on click)
┌──────────────────────────┐
│ 🚪 Sign Out              │
└──────────────────────────┘
```

**Signed In State (Phase 2/3 - Extended):**
```
┌──────────────────────────┐
│ 🔵 {displayName} ▾      │
└──────────────────────────┘
      │
      ▼ (dropdown on click)
┌──────────────────────────┐
│ 📁 My Sessions           │  (Phase 2)
├──────────────────────────┤
│ 💾 Save Current          │  (Phase 2)
├──────────────────────────┤
│ 🚪 Sign Out              │
├──────────────────────────┤
│ 🗑️ Delete Account        │  (Phase 3, destructive)
└──────────────────────────┘
```

#### 6.1.2 Visual Specifications

```typescript
// AuthButton visual specs
{
  position: 'absolute',
  top: '1rem',           // 16px
  right: '1rem',         // 16px
  zIndex: 1000,

  // Button styling
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  padding: '0.5rem 1rem',

  // User avatar (when signed in)
  avatarSize: '24px',
  avatarBorderRadius: '50%',
}
```

### 6.2 Login Modal

**Trigger:** Click "Sign In" button, or attempt protected action while signed out

```
┌─────────────────────────────────────────┐
│                                    [X]  │
│                                         │
│              🗺️                         │
│                                         │
│           Sign In                       │
│                                         │
│   Save your measurements and access     │
│   them from any device.                 │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │    [G] Continue with Google     │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ────────────────────────────────────  │
│                                         │
│   By signing in, you agree to our       │
│   Terms of Service and Privacy Policy   │
│                                         │
└─────────────────────────────────────────┘
```

**Modal Specifications:**
- Width: `min(400px, 90vw)`
- Centered vertically and horizontally
- Backdrop: Semi-transparent black overlay
- Close: X button or click outside
- Google button: Use Google's brand guidelines (white bg, Google logo)

### 6.3 Session UI Components (Phase 2/3)

The following components are implemented in Phase 2/3. See [Session Persistence Spec](../persistent/spec-session-persistence.md#6-ui-integration) for detailed specifications:

- **My Sessions Modal** (Phase 2) - List, load saved sessions
- **Save Session Modal** (Phase 2) - Save new or update existing, with "choose" mode
- **Session Indicator** (Phase 2) - Shows current session name with unsaved changes indicator
- **Confirmation Dialog** (Phase 2/3) - Reusable for load, delete, account deletion

---

## 7. Auth Flow Specifications

### 7.1 App Load (Auth State Restoration)

```
┌─────────────────────────────────────────────────────────────┐
│ App Starts                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ AuthProvider initializes                                    │
│ - Sets loading = true                                       │
│ - Subscribes to onAuthStateChanged                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ App renders immediately (no blocking)                       │
│ - Map loads normally                                        │
│ - AuthButton shows loading spinner                          │
│ - All other functionality available                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│ Firebase: User exists   │     │ Firebase: No user           │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│ - Set user state        │     │ - Set user = null           │
│ - Set loading = false   │     │ - Set loading = false       │
│ - AuthButton shows user │     │ - AuthButton shows Sign In  │
└─────────────────────────┘     └─────────────────────────────┘
```

**Timing Expectations:**
- Firebase auth check: typically 100-500ms
- During loading: auth button shows spinner
- No blocking of main app functionality

### 7.2 Sign In Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Sign In" button                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Login Modal opens                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Continue with Google"                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Button shows loading state                                  │
│ Google popup opens (signInWithPopup)                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│ SUCCESS                 │     │ FAILURE                     │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│ 1. Close modal          │     │ Show error in modal:        │
│ 2. Update auth state    │     │ - "Popup blocked" →         │
│ 3. Toast: "Signed in    │     │   "Please allow popups"     │
│    as {displayName}"    │     │ - "Cancelled" → no message  │
│ 4. Check for local data │     │ - Network error → show msg  │
│    (see 7.3)            │     │ - Other → generic error     │
└─────────────────────────┘     └─────────────────────────────┘
```

### 7.3 Post-Login: Auto-Save Local Data (Phase 2)

This flow is implemented in Phase 2. See [Session Persistence Spec - Auto-Save on Login](../persistent/spec-session-persistence.md#73-auto-save-on-login-flow) for the detailed flow.

**Summary:** After sign-in, if localStorage has points, prompt user to save to cloud.

### 7.4 Sign Out Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Sign Out" from dropdown                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Call firebase signOut()                                     │
│ (No confirmation dialog)                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Auth state updates (user = null)                         │
│ 2. Toast: "Signed out"                                      │
│ 3. Keep localStorage data intact                            │
│ 4. Keep current map/points visible (offline-first)          │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 Delete Account Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Delete Account" from dropdown                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Show Confirmation Dialog:                                   │
│ "All your data will be permanently deleted."                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│ User confirms           │     │ User cancels                │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│ 1. Show loading state   │     │ Close dialog (no action)    │
│ 2. Delete all files in  │     └─────────────────────────────┘
│    users/{uid}/ from    │
│    Firebase Storage     │
│ 3. Delete Firebase Auth │
│    account              │
│ 4. Sign out             │
│ 5. Toast: "Account      │
│    deleted"             │
└─────────────────────────┘
```

**Note:** Firebase Auth account deletion may require recent authentication. If `auth/requires-recent-login` error occurs:
1. Show message: "For security, please sign in again to delete your account"
2. Trigger re-authentication flow
3. Retry deletion

---

## 8. Internationalization

### 8.1 Locale Detection

```typescript
// src/i18n/index.ts

type Locale = 'en' | 'he';

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('he')) return 'he';
  return 'en';
}
```

### 8.2 Translation Keys (Phase 1 - Auth Only)

```json
// src/i18n/translations/en.json (Phase 1 subset)
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
// src/i18n/translations/he.json (Phase 1 subset)
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

**Phase 2/3 translations** (sessions, delete account) are defined in the [Session Persistence Spec - Appendix A](../persistent/spec-session-persistence.md#appendix-a-i18n-keys-session-specific).

### 8.3 RTL Support

When Hebrew locale is detected:
- Modal content direction: `rtl`
- Text alignment: right
- Button order: may need reversal (confirm on right for RTL)

---

## 9. Error Handling

### 9.1 Error Types & Messages (Phase 1 - Auth Only)

| Error Code | User Message (EN) | User Message (HE) | Recovery |
|------------|-------------------|-------------------|----------|
| `auth/popup-blocked` | Please allow popups for this site to sign in | אנא אפשר חלונות קופצים לאתר זה כדי להתחבר | User must allow popups |
| `auth/popup-closed-by-user` | (No message - silent) | (No message - silent) | User can retry |
| `auth/network-request-failed` | Network error. Please check your connection. | שגיאת רשת. אנא בדוק את החיבור. | Retry button |
| Network timeout | Network error. Please check your connection. | שגיאת רשת. אנא בדוק את החיבור. | Retry button |

**Phase 2/3 errors** (storage errors, session errors) are defined in the [Session Persistence Spec - Error Handling](../persistent/spec-session-persistence.md#10-error-handling).

### 9.2 Toast Notifications

```typescript
// Toast configuration
interface ToastConfig {
  variant: 'default' | 'destructive';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration: number; // ms
}

// Success toasts: 3000ms, no action
// Error toasts: 5000ms, with Retry action where applicable
```

### 9.3 Retry Mechanism

When "Retry" is clicked on an error toast:
1. Re-execute the failed operation
2. Show loading state (if applicable)
3. On success: show success toast
4. On failure: show error toast again (with Retry)

No automatic retries. All retries are user-initiated.

---

## 10. Security

### 10.1 Authentication Security

- **Token handling:** Firebase SDK manages tokens automatically
- **Token refresh:** Automatic (Firebase handles expiration)
- **Sensitive data:** No sensitive data stored client-side beyond Firebase auth state

### 10.2 Storage Security

- **Access control:** Firebase Storage rules restrict access to user's own data
- **Data isolation:** Users cannot access other users' data
- **HTTPS:** All Firebase communication over HTTPS

### 10.3 Client-Side Considerations

- **localStorage:** Contains only session points (not sensitive)
- **No credentials:** User credentials never handled by app (delegated to Firebase/Google)
- **Environment variables:** Firebase config is public (by design) - security via rules

---

## 11. Edge Cases

### 11.1 Offline Sign-In Attempt

**Behavior:**
- Auth operations fail gracefully (show network error)
- User can continue using app offline with localStorage
- Sign-in can be retried when online

### 11.2 Popup Blocker

**Detection:** `auth/popup-blocked` error from Firebase.

**Handling:**
1. Show message: "Please allow popups for this site to sign in"
2. User must manually allow popups and retry

### 11.3 Sign-In Cancelled

**Behavior:** User closes Google sign-in popup before completing.

**Handling:** Silent - no error message, user can retry when ready.

### 11.4 Firebase Quota/Limits

**Awareness:**
- Firebase Auth: 10k verifications/month (free tier)
- Firebase Storage (configured but used in Phase 2): 5GB storage, 1GB/day download
- Monitor usage in Firebase Console

### 11.5 Session-Related Edge Cases (Phase 2/3)

See [Session Persistence Spec - Edge Cases](../persistent/spec-session-persistence.md#11-edge-cases) for:
- Concurrent sessions on multiple devices
- Session file missing but in index
- Index file corruption
- Very long session names
- Empty sessions, rapid save clicks

---

## 12. Testing Requirements

### 12.1 Unit Tests (Phase 1)

| Component | Test Cases |
|-----------|------------|
| `auth-context` | Initial loading state, user restoration, sign-in success, sign-in failure, sign-out, error handling |
| `i18n` | Locale detection, translation lookup, RTL detection |

### 12.2 Integration Tests (Phase 1)

| Flow | Test Cases |
|------|------------|
| Sign In | Successful login, popup blocked, user cancelled, network error |
| Sign Out | Successful logout, auth state cleared |
| Auth State | Persists across page refresh, restored on app load |

### 12.3 E2E Tests (Phase 1)

| Scenario | Steps |
|----------|-------|
| Basic auth flow | Sign in → Verify user shown → Sign out → Verify signed out state |
| Auth persistence | Sign in → Refresh page → Verify still signed in |
| Error handling | Block popups → Attempt sign in → Verify error message |

### 12.4 Manual Testing Checklist (Phase 1)

- [ ] Sign in with Google (desktop Chrome)
- [ ] Sign in with Google (mobile Safari)
- [ ] Sign in with Google (mobile Chrome)
- [ ] Popup blocker handling
- [ ] Sign out
- [ ] Auth state persists across page refresh
- [ ] Hebrew locale display
- [ ] RTL layout for Hebrew
- [ ] Offline behavior (graceful error)
- [ ] Network error recovery

**Phase 2/3 testing** is defined in the [Session Persistence Spec - Testing Requirements](../persistent/spec-session-persistence.md#13-testing-requirements).

---

## 13. Implementation Phases

> **This specification (Auth Feature) covers Phase 1 only.**
> For Phase 2-3, see [Session Persistence Spec](../persistent/spec-session-persistence.md).

### Phase 1: Authentication Foundation (This Spec)

**Scope:** Firebase setup, auth context, basic sign-in/out, i18n foundation

**Deliverables:**
1. Firebase project configuration
2. Environment variables setup
3. `src/lib/firebase.ts` - Firebase initialization
4. `src/contexts/auth-context.tsx` - Auth state management
5. `src/components/auth-button.tsx` - Floating button (sign in/out only)
6. `src/components/login-modal.tsx` - Google sign-in modal
7. `src/i18n/` - Basic i18n setup with auth translations
8. Integration in `layout.tsx` and `page.tsx`

**Acceptance Criteria:**
- User can sign in with Google
- User can sign out
- Auth state persists across page refresh
- Loading state shown during auth check
- Basic Hebrew/English locale detection works

### Phase 2: Session Persistence (See Persistence Spec)

**Scope:** Save/load sessions, current session tracking

**See:** [Session Persistence Spec - Section 7](../persistent/spec-session-persistence.md#7-session-flows)

**Key Features:**
- Save new session with name
- Update existing session (vs save as new)
- Load session (with confirmation)
- Current session indicator
- Auto-save prompt after login

### Phase 3: Session Management (See Persistence Spec)

**Scope:** Rename and delete sessions

**See:** [Session Persistence Spec - Sections 5.5-5.6](../persistent/spec-session-persistence.md#55-rename-session)

**Key Features:**
- Rename sessions
- Delete individual sessions

### Phase 4: Account Management

**Scope:** Account deletion with full data cleanup

**See:** [Account Management Spec](./spec-account-management.md)

**Key Features:**
- Delete Account menu item in user dropdown
- Confirmation dialog with destructive warning
- Re-authentication flow when Firebase requires it
- Complete data cleanup (storage + auth account)

---

## Appendix A: Component Props Interfaces (Phase 1)

```typescript
// AuthButton (Phase 1)
interface AuthButtonProps {
  className?: string;
}

// LoginModal (Phase 1)
interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;  // Called after successful login
}
```

**Phase 2/3 component interfaces** (SessionsModal, SaveSessionModal, ConfirmDialog, SessionIndicator) are defined in the [Session Persistence Spec](../persistent/spec-session-persistence.md#6-ui-integration).

---

## Appendix B: Hook Interfaces (Phase 1)

```typescript
// useAuth (from AuthContext) - Phase 1
interface UseAuth {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

// useI18n - Phase 1
interface UseI18n {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: 'en' | 'he';
  isRTL: boolean;
}
```

**Phase 4 addition to useAuth:**
```typescript
// Added in Phase 4
interface UseAuth {
  // ... Phase 1 fields
  deleteAccount: () => Promise<void>;  // Phase 4
}
```

**useStorage interface** is defined in the [Session Persistence Spec - Hook Interface](../persistent/spec-session-persistence.md#51-hook-interface).

---

*End of Specification*