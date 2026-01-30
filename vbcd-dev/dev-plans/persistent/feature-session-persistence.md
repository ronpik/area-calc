---
feature_id: "session-persistence"
title: "Session Persistence (Phase 2 & 3)"
version: "1.0"
created: "2025-01-31"
status: "pending"
source_design: "vbcd-dev/dev-plans/persistent/spec-session-persistence.md"
---

# Feature: Session Persistence (Phase 2 & 3)

## Overview

Enable authenticated users to persist measurement sessions to Firebase Cloud Storage, providing:
- Save current measurement to cloud with naming
- Update existing sessions or save as new
- Load saved sessions from any device
- Manage sessions (view, rename, delete)
- Track "current session" state for seamless updates

This builds on Phase 1 (Authentication) to provide cloud-based session storage, enabling users to access their measurements from any device.

## Background

AreaCalc currently persists measurements to localStorage only, limiting users to a single device. With Firebase Authentication in place (Phase 1), users can now be identified. This phase adds cloud persistence, allowing measurements to sync across devices and be permanently stored.

The design uses Firebase Cloud Storage with JSON files, organized by user ID. Each user has an index file (listing all sessions) and individual session files (containing full data). This approach balances simplicity with scalability.

## Goals

- [ ] Enable saving current measurement to Firebase Cloud Storage
- [ ] Provide "Update" vs "Save as New" choice when saving existing sessions
- [ ] Allow loading saved sessions from session list
- [ ] Enable session management (rename, delete)
- [ ] Track current session for seamless update experience
- [ ] Show session indicator when working on saved session
- [ ] Support localStorage as working storage with cloud as persistence
- [ ] Prompt to save on login if localStorage has unsaved data

## Non-Goals

- Offline queue (save when back online) - Future
- Session sharing between users - Future
- Thumbnails/map previews - Future
- Export/import bulk operations - Future
- Real-time sync between devices - Future
- Conflict resolution (last write wins in v1)

## Dependencies

**External:**
- Firebase Cloud Storage (configured in Phase 1)

**Internal:**
- Phase 1 (Authentication) must be complete
- `useAuth` hook provides `user.uid` for storage paths
- `auth.currentUser` for storage operations
- Firebase `storage` export from `src/lib/firebase.ts`

## Architecture Notes

### Storage Structure
```
Firebase Storage Bucket
└── users/
    └── {uid}/
        ├── index.json                           # UserSessionIndex
        └── sessions/
            ├── {sessionId}.json                 # SessionData
            └── ...
```

### State Flow
- localStorage remains primary working storage during a session
- Cloud storage is for persistence across devices/sessions
- `currentSession` state tracks which cloud session is active
- Points hash detects changes since last save

### Key Decisions
| Decision | Choice |
|----------|--------|
| Storage Backend | Firebase Cloud Storage |
| Data Format | JSON files |
| Session Names | Non-unique (ID is unique identifier) |
| Save Behavior | Prompt: "Update existing" or "Save as new" |
| Current Session | Track active session, show in UI |
| Unsaved Changes | Rely on localStorage backup (no warning) |
| Auto-save Prompt | On login if localStorage has points |
| Schema Versioning | Migration on load |

## Codebase Analysis

### Existing Patterns Identified

**Hook Pattern:**
- Reference: `src/hooks/use-toast.ts`
- Notes: Hooks export interfaces and provide state + methods

**Context Pattern:**
- Reference: `src/contexts/auth-context.tsx` (from Phase 1)
- Notes: Providers wrap children, hooks throw if used outside provider

**Modal Pattern:**
- Reference: `src/components/login-modal.tsx` (from Phase 1)
- Notes: Use ShadCN Dialog, controlled via open/onOpenChange, support RTL

**Firebase Usage:**
- Reference: `src/lib/firebase.ts`
- Notes: Already exports `auth` and `storage`

**Toast Notifications:**
- Reference: `src/hooks/use-toast.ts`
- Notes: Use for success/error feedback, support action buttons

### Integration Points

- `src/app/page.tsx` - Add currentSession state, modify save flow
- `src/components/auth-button.tsx` - Add "Save Current" and "My Sessions" menu items
- `src/contexts/auth-context.tsx` - May need auth state for storage operations
- `src/lib/firebase.ts` - Already has `storage` export

### Reusable Utilities

- `useAuth()` - Get current user for storage paths
- `useI18n()` - Translation function
- `useToast()` - Notifications
- `cn()` - Conditional class names
- ShadCN Dialog, Button, DropdownMenu components

## Risk Assessment

### Medium Risks

**Firebase Storage Operations (Task 1.2, 1.3)**
- Risk: Network errors during save/load could lose data
- Likelihood: Medium
- Impact: Medium
- Mitigation: localStorage backup persists data; show clear error messages with retry options

**Index File Corruption (Task 1.3)**
- Risk: Index could become corrupted, orphaning session files
- Likelihood: Low
- Impact: Medium
- Mitigation: Graceful handling returns empty list; individual sessions preserved

**Concurrent Modifications (All tasks)**
- Risk: User saves from two devices simultaneously
- Likelihood: Low
- Impact: Low
- Mitigation: Last write wins; v1 accepts this limitation

### Low Risks

**Large Session Files (Task 1.3)**
- Risk: Sessions with many points could be slow
- Likelihood: Low
- Impact: Low
- Mitigation: No limit, but practical testing shows JSON handles thousands of points

**Schema Migration (Task 1.4)**
- Risk: Future schema changes could break old data
- Likelihood: Medium
- Impact: Low
- Mitigation: Version field + migration on load

### Accepted Risks

- No conflict resolution (last write wins)
- No offline queue (data stays in localStorage)
- No real-time sync between devices

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
# Test save/load/rename/delete flows
```

### Specific Verifications
- Task 1.2: Firebase Storage paths are correct for user
- Task 2.2: Save modal shows correct mode (new vs choose)
- Task 2.3: Current session indicator appears after load
- Task 3.1: Session list loads and displays correctly
- Task 3.3: Delete removes both file and index entry

---

# Phase 1: Storage Infrastructure

## Phase Overview

Create the foundational types, storage operations hook, and migration utilities. These are prerequisites for all UI components. This phase establishes the data layer without any UI changes.

### Phase Scope

**Included:**
- Session-related TypeScript types
- Firebase Storage path builders
- `useStorage` hook with CRUD operations
- Points hash generation for change detection
- Schema migration utilities
- Storage error handling

**Excluded:**
- UI components (Phase 2, 3)
- page.tsx modifications (Phase 2)
- i18n additions (added with each UI component)

### Phase Success Criteria

- [ ] All session types defined and exported
- [ ] useStorage hook provides all CRUD operations
- [ ] Storage operations work with Firebase (manual testing)
- [ ] Schema migration handles missing version gracefully
- [ ] Build passes without errors

---

## Tasks:

### Task 1.1: Create Session TypeScript Types

**Status:** pending

**Description:**

Define all TypeScript interfaces for session persistence: session metadata for index entries, full session data, user session index, and current session tracking state. These types are referenced throughout the feature and must match the spec exactly.

Key considerations:
- Types must match Firebase JSON structure
- `TrackedPoint` already exists in page.tsx - reuse it
- `CurrentSessionState` tracks working session with hash for dirty detection
- Schema version enables future migrations

**Relevant Files:**

*To Create:*
- `src/types/session.ts` - All session-related types

*To Reference (patterns):*
- `src/types/auth.ts` - Type definition pattern from Phase 1
- `src/app/page.tsx` - Existing `TrackedPoint` interface

**Schemas & Code Context:**

*From Design Document (Section 2):*

```typescript
// src/types/session.ts

import type { TrackedPoint } from '@/app/page';

/**
 * Metadata for a single session (stored in index file)
 * Used for list display - minimal data for fast loading
 */
export interface SessionMeta {
  id: string;                    // UUID v4 - unique identifier
  name: string;                  // User-provided or auto-generated (non-unique)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  area: number;                  // Calculated area in m² (for display)
  pointCount: number;            // Number of tracked points (for display)
}

/**
 * Full session data (stored in individual session file)
 * Contains all data needed to restore a measurement
 */
export interface SessionData {
  id: string;                    // UUID v4 (matches filename and index entry)
  name: string;                  // Session name
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  schemaVersion: number;         // Data schema version for migrations
  points: TrackedPoint[];        // Full points array
  area: number;                  // Calculated area in m²
  notes?: string;                // Optional user notes (future use)
}

/**
 * User's session index (one per user)
 * Loaded to display "My Sessions" list
 */
export interface UserSessionIndex {
  version: number;               // Index schema version (currently 1)
  sessions: SessionMeta[];       // Array of session metadata
  lastModified: string;          // ISO 8601 - when index was last updated
}

/**
 * Current session context - tracks what session is "active"
 * null when working with unsaved/new measurement
 */
export interface CurrentSessionState {
  id: string;                    // Session ID from cloud storage
  name: string;                  // Session name for display
  lastSavedAt: string;           // ISO timestamp of last cloud save
  pointsHashAtSave: string;      // Hash of points at save time (for change detection)
}

/**
 * Current schema version
 * Increment when TrackedPoint or SessionData structure changes
 */
export const CURRENT_SCHEMA_VERSION = 1;
export const INDEX_VERSION = 1;
export const SESSION_NAME_MAX_LENGTH = 100;
```

**Implementation Notes:**

*Design Decisions:*
- `SessionMeta` is lightweight for fast list loading
- `SessionData` includes full points array for complete restore
- Schema versioning enables future migrations

*Codebase Alignment:*
- Export TrackedPoint from page.tsx or duplicate type here
- Follow TypeScript patterns from auth.ts

*Constraints:*
- Types must serialize cleanly to JSON
- All dates as ISO 8601 strings (JSON compatible)

**Implementation Steps:**

1. Create `src/types/session.ts` file
2. Export `TrackedPoint` from `page.tsx` or re-export here
3. Add all interfaces from spec Section 2
4. Add constants for schema versions and limits
5. Verify imports work from other files

**Test Requirements:**

*Unit Tests:*
- Types compile without errors
- Constants export correctly

*Edge Cases:*
- N/A (type definitions only)

**Success Criteria:**

- [ ] `src/types/session.ts` created with all interfaces
- [ ] All types match spec Section 2 exactly
- [ ] Constants exported for CURRENT_SCHEMA_VERSION, INDEX_VERSION, SESSION_NAME_MAX_LENGTH
- [ ] Types can be imported in other files
- [ ] Build passes without TypeScript errors

---

### Task 1.2: Create Storage Path Builders and Constants

**Status:** pending

**Description:**

Create utility functions for building Firebase Storage paths and define storage-related constants. These ensure consistent path structure across all storage operations.

Key considerations:
- Paths must match spec Section 3.1 structure exactly
- User-specific paths use uid for isolation
- Path builders used by useStorage hook

**Relevant Files:**

*To Create:*
- `src/lib/storage-paths.ts` - Path builders and constants

*To Reference:*
- `src/lib/firebase.ts` - Storage instance export

*From Previous Tasks:*
- `src/types/session.ts` - Created in Task 1.1, contains session types

**Schemas & Code Context:**

*From Design Document (Section 3.2):*

```typescript
// src/lib/storage-paths.ts

/**
 * LocalStorage key for points (existing, maintain compatibility)
 */
export const LOCALSTORAGE_KEY = 'recordedPoints';

/**
 * Path builders for Firebase Storage
 */
export const getUserBasePath = (uid: string) => `users/${uid}`;

export const getIndexPath = (uid: string) => `users/${uid}/index.json`;

export const getSessionPath = (uid: string, sessionId: string) =>
  `users/${uid}/sessions/${sessionId}.json`;
```

**Implementation Steps:**

1. Create `src/lib/storage-paths.ts`
2. Add localStorage key constant
3. Add path builder functions from spec
4. Export all functions and constants

**Test Requirements:**

*Unit Tests:*
- `getUserBasePath('uid123')` returns `'users/uid123'`
- `getIndexPath('uid123')` returns `'users/uid123/index.json'`
- `getSessionPath('uid123', 'sess456')` returns `'users/uid123/sessions/sess456.json'`

**Success Criteria:**

- [ ] `src/lib/storage-paths.ts` created
- [ ] All path builders match spec exactly
- [ ] Functions handle various uid/sessionId values
- [ ] Constants exported correctly

---

### Task 1.3: Create Points Hash Utility

**Status:** pending

**Description:**

Implement the deterministic hash function for points arrays. This hash is used to detect if the current points have changed since the last save, enabling the "unsaved changes" indicator.

Key considerations:
- Hash must be deterministic (same points → same hash)
- Not cryptographically secure (just for comparison)
- Serialize relevant fields only (lat, lng, type, timestamp)

**Relevant Files:**

*To Create:*
- `src/lib/points-hash.ts` - Hash generation utility

*From Previous Tasks:*
- `src/types/session.ts` - TrackedPoint type

**Schemas & Code Context:**

*From Design Document (Section 4.4):*

```typescript
// src/lib/points-hash.ts

import type { TrackedPoint } from '@/types/session';

/**
 * Generate deterministic hash of points array
 * Used to detect changes since last save
 */
export function generatePointsHash(points: TrackedPoint[]): string {
  // Simple approach: stringify and hash
  const serialized = JSON.stringify(
    points.map(p => ({
      lat: p.point.lat,
      lng: p.point.lng,
      type: p.type,
      timestamp: p.timestamp
    }))
  );

  // Use simple hash (no crypto needed - not security sensitive)
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
```

**Implementation Notes:**

*Watch Out For:*
- Empty array should return consistent hash
- Point order matters (different order = different hash)
- Hash collisions acceptable (just for dirty detection)

**Implementation Steps:**

1. Create `src/lib/points-hash.ts`
2. Implement `generatePointsHash` function
3. Test with various point arrays
4. Verify deterministic behavior

**Test Requirements:**

*Unit Tests:*
- Same points array → same hash
- Different points → different hash
- Empty array returns valid hash
- Order matters (reversed array → different hash)
- Hash is a valid string (base36)

*Edge Cases:*
- Empty array: `[]`
- Single point
- Points with same coordinates but different timestamps

**Success Criteria:**

- [ ] `src/lib/points-hash.ts` created
- [ ] Hash function is deterministic
- [ ] Returns valid base36 string
- [ ] Performance acceptable for 1000+ points

---

### Task 1.4: Create Schema Migration Utilities

**Status:** pending

**Description:**

Implement migration functions that transform older session data to the current schema version. Migrations are applied on load (lazy migration), not stored back automatically.

Key considerations:
- Handle missing schemaVersion (pre-versioned data)
- Apply migrations sequentially (v0→v1, v1→v2, etc.)
- Handle both session data and index migrations
- Be defensive with missing/malformed data

**Relevant Files:**

*To Create:*
- `src/lib/session-migration.ts` - Migration logic

*From Previous Tasks:*
- `src/types/session.ts` - Session types and CURRENT_SCHEMA_VERSION

**Schemas & Code Context:**

*From Design Document (Section 8):*

```typescript
// src/lib/session-migration.ts

import type { SessionData, SessionMeta, UserSessionIndex, TrackedPoint } from '@/types/session';
import { CURRENT_SCHEMA_VERSION, INDEX_VERSION } from '@/types/session';

/**
 * Migrate session data to current schema version
 * Called when loading a session from storage
 */
export function migrateSessionData(data: unknown): SessionData {
  // Handle missing version (pre-versioning data)
  const version = (data as any).schemaVersion ?? 0;

  let migrated = data as SessionData;

  // Apply migrations sequentially
  if (version < 1) {
    migrated = migrateSessionV0ToV1(migrated);
  }

  // Future migrations:
  // if (version < 2) {
  //   migrated = migrateSessionV1ToV2(migrated);
  // }

  // Ensure current version is set
  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;

  return migrated;
}

/**
 * Migrate from v0 (no version) to v1
 */
function migrateSessionV0ToV1(data: any): SessionData {
  return {
    id: data.id,
    name: data.name || 'Unnamed Session',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    schemaVersion: 1,
    points: migratePointsV0ToV1(data.points || []),
    area: data.area || 0,
    notes: data.notes
  };
}

/**
 * Migrate points array if structure changed
 */
function migratePointsV0ToV1(points: any[]): TrackedPoint[] {
  return points.map(p => {
    // Handle old format: { lat, lng, type, timestamp }
    if ('lat' in p && 'lng' in p) {
      return {
        point: { lat: p.lat, lng: p.lng },
        type: p.type || 'manual',
        timestamp: p.timestamp || Date.now()
      };
    }
    // Already in new format
    return p as TrackedPoint;
  });
}

/**
 * Migrate index to current version
 */
export function migrateIndex(data: unknown): UserSessionIndex {
  const version = (data as any).version ?? 0;

  if (version < 1) {
    // v0 had sessions directly as array
    const sessions = Array.isArray(data)
      ? data as SessionMeta[]
      : (data as any).sessions || [];

    return {
      version: INDEX_VERSION,
      lastModified: new Date().toISOString(),
      sessions: sessions.map(migrateSessionMeta)
    };
  }

  return data as UserSessionIndex;
}

/**
 * Migrate individual session metadata entry
 */
function migrateSessionMeta(meta: any): SessionMeta {
  return {
    id: meta.id,
    name: meta.name || 'Unnamed',
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || meta.createdAt || new Date().toISOString(),
    area: meta.area || 0,
    pointCount: meta.pointCount || 0
  };
}
```

**Implementation Notes:**

*Design Decisions:*
- Lazy migration (on load) vs eager migration (on save)
- Default values for missing fields
- Sequential migration allows skipping versions

*Watch Out For:*
- Don't mutate input data
- Handle null/undefined gracefully
- Preserve all existing valid data

**Implementation Steps:**

1. Create `src/lib/session-migration.ts`
2. Implement `migrateSessionData` with version checking
3. Implement `migrateSessionV0ToV1` with defaults
4. Implement `migratePointsV0ToV1` for format conversion
5. Implement `migrateIndex` and `migrateSessionMeta`
6. Add defensive null checks throughout

**Test Requirements:**

*Unit Tests:*
- Data with no schemaVersion gets migrated to v1
- Data with schemaVersion=1 passes through unchanged
- Missing fields get default values
- Old point format (flat lat/lng) converts to nested format
- Index array format converts to object format

*Edge Cases:*
- Completely empty data object
- Null/undefined fields
- Extra unexpected fields (should be preserved)

**Success Criteria:**

- [ ] `src/lib/session-migration.ts` created
- [ ] Session migration handles v0→v1
- [ ] Index migration handles array→object format
- [ ] All missing fields get sensible defaults
- [ ] No data loss during migration

---

### Task 1.5: Create Storage Error Handling

**Status:** pending

**Description:**

Define error types and create a Firebase error mapper that converts Firebase errors to user-friendly error codes. These codes map to i18n keys for translation.

Key considerations:
- Map Firebase error codes to semantic error codes
- Include retry flag for transient errors
- User-friendly messages via i18n keys

**Relevant Files:**

*To Create:*
- `src/types/storage-errors.ts` - Error types
- `src/lib/storage-errors.ts` - Error mapper

**Schemas & Code Context:**

*From Design Document (Section 10):*

```typescript
// src/types/storage-errors.ts

export type StorageErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'SESSION_NOT_FOUND'
  | 'INDEX_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_DATA'
  | 'UNKNOWN';

export interface StorageError {
  code: StorageErrorCode;
  message: string;
  retry: boolean;  // Can this operation be retried?
}
```

```typescript
// src/lib/storage-errors.ts

import { FirebaseError } from 'firebase/app';
import type { StorageError, StorageErrorCode } from '@/types/storage-errors';

/**
 * Check if error is a Firebase storage error
 */
export function isStorageError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError;
}

/**
 * Map Firebase errors to StorageError
 */
export function mapFirebaseError(error: unknown): StorageError {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'storage/object-not-found':
        return {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          retry: false
        };
      case 'storage/unauthorized':
        return {
          code: 'PERMISSION_DENIED',
          message: 'Access denied. Please sign in again.',
          retry: false
        };
      case 'storage/quota-exceeded':
        return {
          code: 'QUOTA_EXCEEDED',
          message: 'Storage quota exceeded',
          retry: false
        };
      case 'storage/retry-limit-exceeded':
      case 'storage/network-error':
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          retry: true
        };
      default:
        return {
          code: 'UNKNOWN',
          message: 'Something went wrong. Please try again.',
          retry: true
        };
    }
  }

  if (error instanceof TypeError && (error as Error).message?.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
      retry: true
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Something went wrong. Please try again.',
    retry: true
  };
}

/**
 * Create a "not authenticated" error
 */
export function notAuthenticatedError(): StorageError {
  return {
    code: 'NOT_AUTHENTICATED',
    message: 'Not authenticated',
    retry: false
  };
}
```

**Implementation Steps:**

1. Create `src/types/storage-errors.ts` with error types
2. Create `src/lib/storage-errors.ts` with mapper
3. Handle all Firebase storage error codes
4. Handle network/fetch errors
5. Provide sensible defaults for unknown errors

**Test Requirements:**

*Unit Tests:*
- Firebase `storage/object-not-found` → `SESSION_NOT_FOUND`
- Firebase `storage/unauthorized` → `PERMISSION_DENIED`
- Firebase `storage/network-error` → `NETWORK_ERROR` with retry=true
- Unknown Firebase errors → `UNKNOWN` with retry=true
- TypeError with 'fetch' → `NETWORK_ERROR`
- Generic errors → `UNKNOWN`

**Success Criteria:**

- [ ] `src/types/storage-errors.ts` created with error types
- [ ] `src/lib/storage-errors.ts` created with mapper
- [ ] All Firebase storage errors mapped correctly
- [ ] `retry` flag set appropriately for each error type

---

### Task 1.6: Create useStorage Hook

**Status:** pending

**Description:**

Create the main storage hook that provides all CRUD operations for sessions. This is the core of the storage layer, used by all UI components.

Key considerations:
- All operations require authenticated user
- Index and session files updated atomically where possible
- Loading and error states exposed for UI
- Proper error handling with mapped errors

**Relevant Files:**

*To Create:*
- `src/hooks/use-storage.ts` - Main storage hook

*From Previous Tasks:*
- `src/types/session.ts` - Session types (Task 1.1)
- `src/lib/storage-paths.ts` - Path builders (Task 1.2)
- `src/lib/session-migration.ts` - Migration utilities (Task 1.4)
- `src/lib/storage-errors.ts` - Error handling (Task 1.5)

*To Reference:*
- `src/lib/firebase.ts` - Storage instance
- `src/contexts/auth-context.tsx` - Auth context for user

**Schemas & Code Context:**

*From Design Document (Section 5):*

```typescript
// src/hooks/use-storage.ts

'use client';

import { useState, useCallback } from 'react';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '@/lib/firebase';
import { getIndexPath, getSessionPath } from '@/lib/storage-paths';
import { migrateSessionData, migrateIndex } from '@/lib/session-migration';
import { mapFirebaseError, notAuthenticatedError, isStorageError } from '@/lib/storage-errors';
import type {
  SessionMeta,
  SessionData,
  UserSessionIndex,
  CURRENT_SCHEMA_VERSION,
  INDEX_VERSION
} from '@/types/session';
import type { StorageError } from '@/types/storage-errors';

interface UseStorageReturn {
  // Index operations
  fetchIndex: () => Promise<UserSessionIndex | null>;

  // Session CRUD
  saveNewSession: (name: string, points: TrackedPoint[], area: number) => Promise<SessionMeta>;
  updateSession: (sessionId: string, points: TrackedPoint[], area: number) => Promise<SessionMeta>;
  loadSession: (sessionId: string) => Promise<SessionData>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Batch operations
  deleteAllSessions: () => Promise<void>;

  // State
  loading: boolean;
  error: StorageError | null;
  clearError: () => void;
}

// Helper to create empty index
function createEmptyIndex(): UserSessionIndex {
  return {
    version: INDEX_VERSION,
    lastModified: new Date().toISOString(),
    sessions: []
  };
}

export function useStorage(): UseStorageReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StorageError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Internal: fetch index without state management
  const fetchIndexInternal = useCallback(async (uid: string): Promise<UserSessionIndex | null> => {
    const indexRef = ref(storage, getIndexPath(uid));
    try {
      const url = await getDownloadURL(indexRef);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch index');
      const data = await response.json();
      return migrateIndex(data);
    } catch (err) {
      if (isStorageError(err) && err.code === 'storage/object-not-found') {
        return null;
      }
      throw err;
    }
  }, []);

  const fetchIndex = useCallback(async (): Promise<UserSessionIndex | null> => {
    const user = auth.currentUser;
    if (!user) {
      setError(notAuthenticatedError());
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      return await fetchIndexInternal(user.uid);
    } catch (err) {
      setError(mapFirebaseError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchIndexInternal]);

  const saveNewSession = useCallback(async (
    name: string,
    points: TrackedPoint[],
    area: number
  ): Promise<SessionMeta> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();
    if (points.length === 0) throw new Error('Cannot save session with no points');

    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const sessionId = crypto.randomUUID();

      // Build session data
      const sessionData: SessionData = {
        id: sessionId,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        points,
        area
      };

      // Build metadata for index
      const sessionMeta: SessionMeta = {
        id: sessionId,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        area,
        pointCount: points.length
      };

      // Upload session file
      const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
      await uploadString(sessionRef, JSON.stringify(sessionData), 'raw', {
        contentType: 'application/json'
      });

      // Update index
      const index = await fetchIndexInternal(user.uid) || createEmptyIndex();
      index.sessions.push(sessionMeta);
      index.lastModified = now;

      const indexRef = ref(storage, getIndexPath(user.uid));
      await uploadString(indexRef, JSON.stringify(index), 'raw', {
        contentType: 'application/json'
      });

      return sessionMeta;
    } catch (err) {
      const storageError = mapFirebaseError(err);
      setError(storageError);
      throw storageError;
    } finally {
      setLoading(false);
    }
  }, [fetchIndexInternal]);

  // ... (additional methods follow same pattern)
  // updateSession, loadSession, renameSession, deleteSession, deleteAllSessions

  return {
    fetchIndex,
    saveNewSession,
    updateSession,
    loadSession,
    renameSession,
    deleteSession,
    deleteAllSessions,
    loading,
    error,
    clearError
  };
}
```

**Implementation Notes:**

*Design Decisions:*
- Use `auth.currentUser` directly (sync check)
- Fetch-then-update pattern for index modifications
- JSON content type for all uploads

*Codebase Alignment:*
- Follow hook patterns from `use-toast.ts`
- Use useCallback for stable function references
- Expose loading/error state like auth context

*Watch Out For:*
- Always check `auth.currentUser` before operations
- Handle race conditions in index updates (last write wins)
- Ensure proper cleanup in error cases

**Implementation Steps:**

1. Create `src/hooks/use-storage.ts`
2. Add imports for Firebase storage, types, utilities
3. Implement `fetchIndex` with migration
4. Implement `saveNewSession` with index update
5. Implement `updateSession` preserving createdAt
6. Implement `loadSession` with migration
7. Implement `renameSession` updating both file and index
8. Implement `deleteSession` removing file and index entry
9. Implement `deleteAllSessions` for account deletion support
10. Add loading/error state management

**Test Requirements:**

*Unit Tests:*
- All methods throw when not authenticated
- saveNewSession creates session and updates index
- updateSession preserves createdAt
- loadSession applies migrations
- renameSession updates both file and index
- deleteSession removes from both file and index
- deleteAllSessions removes all files and index

*Edge Cases:*
- Empty index (first save)
- Session not found during load/update/delete
- Network errors during multi-step operations

**Success Criteria:**

- [ ] `src/hooks/use-storage.ts` created with all methods
- [ ] All CRUD operations work with Firebase Storage
- [ ] Loading state updates correctly
- [ ] Errors are mapped and exposed
- [ ] Index stays in sync with session files

---

# Phase 2: Save Flow UI

## Phase Overview

Implement the save functionality UI: the save modal with "new" vs "update" choice, session indicator showing current session, and integration with the auth button dropdown. This phase enables users to save their measurements to the cloud.

### Phase Scope

**Included:**
- Save session modal (new, update, choose modes)
- Session indicator component
- Current session state in page.tsx
- Auth button dropdown with "Save Current" option
- i18n translations for save flow

**Excluded:**
- Sessions list modal (Phase 3)
- Rename/delete functionality (Phase 3)
- Auto-save on login prompt (Phase 3)

### Phase Dependencies

**Requires:**
- Phase 1 complete (storage hook, types)
- Phase 1 Auth complete (auth context, auth button)

### Phase Success Criteria

- [ ] User can save new session with custom name
- [ ] User can update existing session
- [ ] Session indicator shows current session name
- [ ] "Save Current" appears in auth dropdown when signed in
- [ ] Build passes without errors

---

## Tasks:

### Task 2.1: Add Session i18n Translations

**Status:** pending

**Description:**

Add all session-related translation keys to both English and Hebrew translation files. These translations are used by save modal, session indicator, and sessions list components.

Key considerations:
- Follow existing i18n key structure
- Include parameter placeholders `{name}`, `{count}`, `{value}`
- Hebrew translations must be accurate and natural

**Relevant Files:**

*To Modify:*
- `src/i18n/translations/en.json` - Add sessions and errors keys
- `src/i18n/translations/he.json` - Add sessions and errors keys

*To Reference:*
- Spec Appendix A for complete translation keys

**Schemas & Code Context:**

*From Design Document (Appendix A):*

```json
// Add to en.json
{
  "sessions": {
    "mySessions": "My Sessions",
    "saveCurrent": "Save Current",
    "noSessions": "No saved sessions yet",
    "noSessionsHint": "Start measuring an area and save it to access it later from any device.",
    "loadingSessions": "Loading sessions...",
    "loadFailed": "Failed to load sessions",
    "save": "Save",
    "cancel": "Cancel",
    "saveSession": "Save Session",
    "saveNewSession": "Save New Session",
    "sessionName": "Session Name",
    "sessionSaved": "Session saved",
    "sessionLoaded": "Loaded {name}",
    "sessionDeleted": "Session deleted",
    "sessionRenamed": "Session renamed",
    "noPointsToSave": "No points to save",
    "rename": "Rename",
    "delete": "Delete",
    "deleteConfirmTitle": "Delete \"{name}\"?",
    "deleteConfirmMessage": "This session will be permanently deleted. This cannot be undone.",
    "loadConfirmTitle": "Load \"{name}\"?",
    "loadConfirmMessage": "Your current points will be replaced. This cannot be undone.",
    "load": "Load",
    "points": "{count} points",
    "area": "{value} m²",
    "currentSession": "Current: {name}",
    "unsavedChanges": "Unsaved changes",
    "startNew": "Start new measurement",
    "updateExisting": "Update \"{name}\"",
    "updateExistingHint": "Save changes to existing session",
    "saveAsNew": "Save as New Session",
    "saveAsNewHint": "Keep original, create a copy",
    "workingOn": "You're working on \"{name}\"",
    "sessionUpdated": "Session updated",
    "defaultName": "Area {n}"
  },
  "errors": {
    "saveFailed": "Failed to save session",
    "loadFailed": "Failed to load session",
    "deleteFailed": "Failed to delete session",
    "renameFailed": "Failed to rename session"
  }
}
```

Hebrew translations from spec Appendix A (already provided in spec).

**Implementation Steps:**

1. Open `src/i18n/translations/en.json`
2. Add `sessions` key with all translations
3. Add session error keys to `errors` section
4. Open `src/i18n/translations/he.json`
5. Add corresponding Hebrew translations
6. Verify JSON syntax is valid

**Test Requirements:**

*Unit Tests:*
- All new keys accessible via `t()` function
- Parameter substitution works: `t('sessions.sessionLoaded', { name: 'Test' })`

**Success Criteria:**

- [ ] All session keys added to en.json
- [ ] All session keys added to he.json
- [ ] JSON files are valid (no syntax errors)
- [ ] Build passes

---

### Task 2.2: Create Save Session Modal

**Status:** pending

**Description:**

Create the save session modal that handles three scenarios:
1. **New mode**: No current session - show name input
2. **Choose mode**: Has current session - offer "Update" or "Save as New"
3. **Update mode**: Direct update (after choosing "Update")

The modal shows session stats (area, point count) and validates input.

Key considerations:
- Three distinct UI states based on mode
- Default name generation "Area {n}"
- Name validation (1-100 chars, trimmed)
- RTL support for Hebrew
- Loading state during save

**Relevant Files:**

*To Create:*
- `src/components/save-session-modal.tsx` - Save modal component

*From Previous Tasks:*
- `src/hooks/use-storage.ts` - saveNewSession, updateSession (Task 1.6)
- `src/types/session.ts` - CurrentSessionState (Task 1.1)

*To Reference:*
- `src/components/login-modal.tsx` - Modal pattern from Phase 1

**Schemas & Code Context:**

*From Design Document (Section 6.3):*

```typescript
// src/components/save-session-modal.tsx

type SaveMode =
  | 'new'           // Saving new session (no current session)
  | 'update'        // Updating existing session directly
  | 'choose';       // User chooses: update existing or save as new

interface SaveSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: TrackedPoint[];
  area: number;
  currentSession: CurrentSessionState | null;
  sessionCount: number;  // For default name generation
  onSaveComplete: (session: CurrentSessionState) => void;
}
```

Modal UI from spec Section 6.3 shows:
- Choose mode: Two large buttons ("Update" and "Save as New")
- New mode: Name input field with Save/Cancel buttons
- Both: Current measurement stats (area, points)

**Implementation Notes:**

*Design Decisions:*
- Modal width 400px max (sm:max-w-[400px])
- RTL via `dir` attribute and `rtl` class
- Show error inline, not as toast

*Watch Out For:*
- Validate name before save (1-100 chars)
- Generate default name only in new mode
- Clear any previous errors on open
- Update currentSession state after save

**Implementation Steps:**

1. Create `src/components/save-session-modal.tsx`
2. Define props interface with all required props
3. Implement mode detection logic
4. Build "choose" mode UI with two option buttons
5. Build "new" mode UI with name input
6. Integrate useStorage hook for save operations
7. Handle success: close modal, call onSaveComplete
8. Handle errors: show inline with retry option
9. Add RTL support with isRTL from useI18n
10. Generate default name using sessionCount

**Test Requirements:**

*Unit Tests:*
- Modal renders correctly in each mode
- Name validation prevents empty/long names
- Save calls correct storage method
- Modal closes on successful save
- Error displays inline

*Edge Cases:*
- Very long session name (100 char limit)
- Network error during save
- Save with 1 point (minimum)

**Success Criteria:**

- [ ] Modal supports all three modes
- [ ] Name validation works (1-100 chars)
- [ ] Save creates/updates session correctly
- [ ] Loading state shown during save
- [ ] Error handling with inline display
- [ ] RTL layout works for Hebrew
- [ ] onSaveComplete called with new session state

---

### Task 2.3: Create Session Indicator Component

**Status:** pending

**Description:**

Create a small, non-intrusive indicator that shows the current session name when working on a saved session. Includes an optional "unsaved changes" dot and a button to start a new measurement.

Key considerations:
- Only visible when currentSession is not null
- Truncate long names with ellipsis
- Amber dot indicates unsaved changes
- "+" button clears to start new measurement

**Relevant Files:**

*To Create:*
- `src/components/session-indicator.tsx` - Session indicator

*From Previous Tasks:*
- `src/types/session.ts` - CurrentSessionState (Task 1.1)
- `src/lib/points-hash.ts` - generatePointsHash (Task 1.3)

**Schemas & Code Context:**

*From Design Document (Section 6.2):*

```typescript
// src/components/session-indicator.tsx

interface SessionIndicatorProps {
  currentSession: CurrentSessionState | null;
  hasUnsavedChanges: boolean;
  onClear: () => void;  // Start new measurement
}

function SessionIndicator({
  currentSession,
  hasUnsavedChanges,
  onClear
}: SessionIndicatorProps) {
  if (!currentSession) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <FileIcon className="h-4 w-4" />
      <span className="truncate max-w-[150px]" title={currentSession.name}>
        {currentSession.name}
      </span>
      {hasUnsavedChanges && (
        <span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        title="Start new measurement"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

**Implementation Notes:**

*Design Decisions:*
- Max width 150px for name with ellipsis
- Use lucide-react icons (File, Plus)
- Ghost button for minimal visual weight
- Amber (not red) for unsaved indicator

*Codebase Alignment:*
- Use `cn()` for conditional classes
- Follow button patterns from auth-button

**Implementation Steps:**

1. Create `src/components/session-indicator.tsx`
2. Import icons from lucide-react
3. Implement null check (return null if no session)
4. Build layout with name, indicator, button
5. Add title attributes for tooltips
6. Export component

**Test Requirements:**

*Unit Tests:*
- Returns null when currentSession is null
- Shows name when session exists
- Shows amber dot when hasUnsavedChanges is true
- Calls onClear when + button clicked
- Long names truncate with ellipsis

**Success Criteria:**

- [ ] Component renders when session exists
- [ ] Returns null when no session
- [ ] Name truncates at 150px
- [ ] Unsaved changes indicator visible when true
- [ ] Clear button triggers onClear callback

---

### Task 2.4: Add Current Session State to Page

**Status:** pending

**Description:**

Add `currentSession` state to page.tsx and integrate the session indicator. Also add the logic to detect unsaved changes by comparing current points hash with saved hash.

Key considerations:
- State null by default (no current session)
- Compute hasUnsavedChanges using points hash
- Clear currentSession when starting new measurement
- Integrate SessionIndicator in UI

**Relevant Files:**

*To Modify:*
- `src/app/page.tsx` - Add state and integrate indicator

*From Previous Tasks:*
- `src/components/session-indicator.tsx` - Indicator component (Task 2.3)
- `src/lib/points-hash.ts` - generatePointsHash (Task 1.3)
- `src/types/session.ts` - CurrentSessionState (Task 1.1)

**Implementation Steps:**

1. Import `CurrentSessionState` type
2. Import `generatePointsHash` function
3. Import `SessionIndicator` component
4. Add `currentSession` state: `useState<CurrentSessionState | null>(null)`
5. Add `useMemo` for hasUnsavedChanges calculation
6. Add SessionIndicator to UI (near control panel or area display)
7. Create `handleClearSession` function that clears points and sets currentSession to null
8. Export TrackedPoint type for use by other modules

**Schemas & Code Context:**

```typescript
// In page.tsx

import type { CurrentSessionState } from '@/types/session';
import { generatePointsHash } from '@/lib/points-hash';
import { SessionIndicator } from '@/components/session-indicator';

// Add state
const [currentSession, setCurrentSession] = useState<CurrentSessionState | null>(null);

// Compute unsaved changes
const hasUnsavedChanges = useMemo(() => {
  if (!currentSession) return false;
  return generatePointsHash(points) !== currentSession.pointsHashAtSave;
}, [currentSession, points]);

// Clear handler
const handleClearSession = useCallback(() => {
  setPoints([]);
  setCurrentSession(null);
  localStorage.removeItem(LOCALSTORAGE_KEY);
}, []);

// In JSX, add SessionIndicator
<SessionIndicator
  currentSession={currentSession}
  hasUnsavedChanges={hasUnsavedChanges}
  onClear={handleClearSession}
/>
```

**Success Criteria:**

- [ ] currentSession state added to page.tsx
- [ ] hasUnsavedChanges computed correctly
- [ ] SessionIndicator integrated in UI
- [ ] Clear functionality works
- [ ] TrackedPoint exported for other modules
- [ ] No regression in existing functionality

---

### Task 2.5: Add Save to Auth Button Dropdown

**Status:** pending

**Description:**

Add "Save Current" menu item to the auth button dropdown (when signed in). This triggers the save modal. Also pass currentSession to the save modal.

Key considerations:
- Only show when signed in
- Disabled when no points to save
- Opens save modal with current session state
- Need access to points and area for modal

**Relevant Files:**

*To Modify:*
- `src/components/auth-button.tsx` - Add dropdown item
- `src/app/page.tsx` - Pass required props to AuthButton

*From Previous Tasks:*
- `src/components/save-session-modal.tsx` - Save modal (Task 2.2)

**Implementation Steps:**

1. Update AuthButton props to receive points, area, currentSession, sessionCount, onSaveComplete
2. Add SaveSessionModal import
3. Add state for save modal open
4. Add "Save Current" DropdownMenuItem
5. Disable when points.length === 0
6. Show toast if trying to save with no points
7. Open save modal on click
8. Update page.tsx to pass new props to AuthButton

**Schemas & Code Context:**

```typescript
// Updated AuthButton props
interface AuthButtonProps {
  className?: string;
  points: TrackedPoint[];
  area: number;
  currentSession: CurrentSessionState | null;
  sessionCount: number;
  onSaveComplete: (session: CurrentSessionState) => void;
}

// In dropdown (signed in state)
<DropdownMenuContent align="end">
  <DropdownMenuItem
    onClick={handleSaveClick}
    disabled={points.length === 0}
  >
    <Save className="h-4 w-4 mr-2" />
    {t('sessions.saveCurrent')}
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={handleSignOut}>
    <LogOut className="h-4 w-4 mr-2" />
    {t('auth.signOut')}
  </DropdownMenuItem>
</DropdownMenuContent>

<SaveSessionModal
  open={saveModalOpen}
  onOpenChange={setSaveModalOpen}
  points={points}
  area={area}
  currentSession={currentSession}
  sessionCount={sessionCount}
  onSaveComplete={onSaveComplete}
/>
```

**Success Criteria:**

- [ ] "Save Current" appears in dropdown when signed in
- [ ] Disabled when no points
- [ ] Opens save modal on click
- [ ] Modal receives correct props
- [ ] onSaveComplete updates currentSession in page.tsx
- [ ] Toast shown for "no points to save"

---

# Phase 3: Session Management UI

## Phase Overview

Implement session list and management: the "My Sessions" modal showing all saved sessions, load functionality with confirmation, rename and delete operations. This phase completes the session persistence feature.

### Phase Scope

**Included:**
- My Sessions modal with session list
- Load session with confirmation dialog
- Rename session inline or via dialog
- Delete session with confirmation
- Auto-save prompt on login (optional)
- Confirmation dialog component (reusable)

**Excluded:**
- Account deletion (separate spec)
- Bulk operations
- Session sharing

### Phase Dependencies

**Requires:**
- Phase 1 complete (storage hook)
- Phase 2 complete (save modal, current session state)

### Phase Success Criteria

- [ ] User can view all saved sessions
- [ ] User can load a session (with confirmation if points exist)
- [ ] User can rename sessions
- [ ] User can delete sessions
- [ ] Empty state shows helpful message
- [ ] All operations show appropriate feedback

---

## Tasks:

### Task 3.1: Create Confirmation Dialog Component

**Status:** pending

**Description:**

Create a reusable confirmation dialog for destructive or replacing actions. Used for load session (replaces points) and delete session. Supports destructive variant with red button.

Key considerations:
- Reusable across multiple use cases
- Supports custom title, message, action labels
- Destructive variant for delete operations
- Loading state during async confirmation

**Relevant Files:**

*To Create:*
- `src/components/confirm-dialog.tsx` - Reusable dialog

*To Reference:*
- `src/components/login-modal.tsx` - Dialog pattern

**Schemas & Code Context:**

*From Design Document (Section 6.6):*

```typescript
// src/components/confirm-dialog.tsx

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}
```

Configurations from spec:
- Load Session: title, message, "Load" button (default variant)
- Delete Session: title, message, "Delete" button (destructive variant)

**Implementation Steps:**

1. Create `src/components/confirm-dialog.tsx`
2. Use AlertDialog from ShadCN (or Dialog)
3. Support both variants via button className
4. Handle async onConfirm with loading state
5. Add RTL support

**Success Criteria:**

- [ ] Dialog renders with custom content
- [ ] Destructive variant shows red button
- [ ] Loading state disables buttons
- [ ] RTL layout works
- [ ] Closes on cancel and confirm

---

### Task 3.2: Create Sessions Modal Component

**Status:** pending

**Description:**

Create the "My Sessions" modal that displays all saved sessions with options to load, rename, and delete. Shows loading, empty, and error states appropriately.

Key considerations:
- Fetch sessions on open
- Show loading spinner during fetch
- Empty state with helpful message
- Each session shows name, area, points, date
- Three-dot menu for rename/delete
- Click session to load

**Relevant Files:**

*To Create:*
- `src/components/sessions-modal.tsx` - Sessions list modal

*From Previous Tasks:*
- `src/hooks/use-storage.ts` - fetchIndex, loadSession, renameSession, deleteSession
- `src/components/confirm-dialog.tsx` - Confirmation for load/delete (Task 3.1)
- `src/types/session.ts` - SessionMeta, SessionData

**Schemas & Code Context:**

*From Design Document (Section 6.5):*

```typescript
interface SessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSession: (session: SessionData, meta: SessionMeta) => void;
}
```

UI States from spec:
- Loading: spinner + "Loading sessions..."
- Empty: icon + "No saved sessions yet" + hint
- Error: icon + error message + Retry button
- List: scrollable list of session cards

Each session card shows:
- Session name (truncated)
- Area in m²
- Point count
- Updated date
- Three-dot menu (rename, delete)

**Implementation Steps:**

1. Create `src/components/sessions-modal.tsx`
2. Fetch index on open using useStorage
3. Implement loading state UI
4. Implement empty state UI
5. Implement error state with retry
6. Build session card layout
7. Implement three-dot dropdown menu
8. Implement load click with confirmation (if points exist)
9. Implement rename flow (inline edit or small modal)
10. Implement delete flow with confirmation
11. Add RTL support

**Test Requirements:**

*Unit Tests:*
- Modal fetches index on open
- Loading state shows during fetch
- Empty state shows when no sessions
- Error state shows with retry button
- Session cards display correct info
- Load triggers confirmation when needed
- Delete triggers confirmation

**Success Criteria:**

- [ ] Modal opens and fetches sessions
- [ ] All UI states render correctly
- [ ] Sessions display with correct metadata
- [ ] Load works with confirmation
- [ ] Rename works with validation
- [ ] Delete works with confirmation
- [ ] RTL layout works

---

### Task 3.3: Add My Sessions to Auth Button

**Status:** pending

**Description:**

Add "My Sessions" menu item to the auth button dropdown. Opens the sessions modal.

Key considerations:
- Only show when signed in
- Position above "Save Current"
- Need callback for session load

**Relevant Files:**

*To Modify:*
- `src/components/auth-button.tsx` - Add dropdown item
- `src/app/page.tsx` - Handle loaded session

*From Previous Tasks:*
- `src/components/sessions-modal.tsx` - Sessions modal (Task 3.2)

**Implementation Steps:**

1. Import SessionsModal
2. Add state for sessions modal open
3. Add "My Sessions" DropdownMenuItem
4. Add handler for loaded session
5. Pass onLoadSession callback
6. Update page.tsx to handle loaded session (set points, currentSession)

**Schemas & Code Context:**

```typescript
// Handler for loaded session (in page.tsx or passed to AuthButton)
const handleLoadSession = useCallback((session: SessionData, meta: SessionMeta) => {
  setPoints(session.points);
  setCurrentSession({
    id: session.id,
    name: session.name,
    lastSavedAt: session.updatedAt,
    pointsHashAtSave: generatePointsHash(session.points)
  });
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(session.points));
  toast({ title: t('sessions.sessionLoaded', { name: session.name }) });
  // Map could fit to loaded points bounds
}, [setPoints, setCurrentSession, toast, t]);
```

**Success Criteria:**

- [ ] "My Sessions" appears in dropdown
- [ ] Opens sessions modal on click
- [ ] Loaded session updates points and currentSession
- [ ] Map shows loaded points
- [ ] Toast confirms load
- [ ] localStorage updated with loaded points

---

### Task 3.4: Implement Auto-Save Prompt on Login

**Status:** pending

**Description:**

When user logs in and localStorage has points, prompt to save them to cloud. This ensures users don't lose work from before signing in.

Key considerations:
- Only prompt if localStorage has points
- Show save modal with isAutoSave flag
- User can skip (cancel) to keep data local only
- Don't prompt if points match an existing session (v2 optimization)

**Relevant Files:**

*To Modify:*
- `src/components/auth-button.tsx` or `src/app/page.tsx` - Detect login and trigger prompt

**Schemas & Code Context:**

*From Design Document (Section 7.3 - simplified v1):*

> Simplified v1 flow:
> - If localStorage has points → prompt to save
> - User can cancel to skip (data stays in localStorage)

```typescript
// In page.tsx or auth-button.tsx, watch for user change
const { user } = useAuth();
const prevUserRef = useRef(user);

useEffect(() => {
  // User just signed in
  if (!prevUserRef.current && user) {
    // Check localStorage for points
    const storedPoints = localStorage.getItem(LOCALSTORAGE_KEY);
    if (storedPoints) {
      const points = JSON.parse(storedPoints);
      if (Array.isArray(points) && points.length > 0) {
        // Open save modal
        setAutoSaveModalOpen(true);
      }
    }
  }
  prevUserRef.current = user;
}, [user]);
```

**Implementation Steps:**

1. Add auto-save modal state
2. Detect new sign-in via user state change
3. Check localStorage for points
4. Open save modal if points exist
5. Handle cancel gracefully (no action, data stays local)

**Success Criteria:**

- [ ] Prompt appears after sign-in when localStorage has points
- [ ] No prompt if localStorage is empty
- [ ] User can save or cancel
- [ ] Cancel leaves data in localStorage
- [ ] No prompt on page refresh (existing auth)

---

### Task 3.5: Handle Edge Cases and Polish

**Status:** pending

**Description:**

Handle edge cases identified in spec Section 11: session file missing, index corruption, session name validation with unicode characters. Add final polish for production readiness.

Key considerations:
- Missing session file: offer to remove from index
- Index corruption: return empty list, preserve session files
- Unicode names: allow, just validate length after trim
- Empty session (0 points): prevent via validation

**Relevant Files:**

*To Modify:*
- `src/hooks/use-storage.ts` - Edge case handling
- `src/components/sessions-modal.tsx` - Missing file handling
- `src/components/save-session-modal.tsx` - Name validation

**Implementation Steps:**

1. Add index corruption recovery in fetchIndex
2. Add missing file detection in loadSession
3. Offer to remove missing sessions from index
4. Validate session name allows unicode, enforces length
5. Validate points.length > 0 before save
6. Add logging for debugging (console.error)

**Success Criteria:**

- [ ] Missing session offers removal from index
- [ ] Corrupted index returns empty list without crash
- [ ] Unicode names work (Hebrew, emoji, etc.)
- [ ] Name length enforced (100 chars after trim)
- [ ] Zero-point save prevented

---

# Summary

## Phase Order and Dependencies

```
Phase 1: Storage Infrastructure
├── Task 1.1: Session Types (no deps)
├── Task 1.2: Storage Paths (no deps)
├── Task 1.3: Points Hash (depends on 1.1)
├── Task 1.4: Schema Migration (depends on 1.1)
├── Task 1.5: Storage Errors (no deps)
└── Task 1.6: useStorage Hook (depends on 1.1-1.5)

Phase 2: Save Flow UI
├── Task 2.1: Session i18n (no deps)
├── Task 2.2: Save Modal (depends on 1.6, 2.1)
├── Task 2.3: Session Indicator (depends on 1.1, 1.3)
├── Task 2.4: Page State (depends on 2.3)
└── Task 2.5: Auth Button Save (depends on 2.2, 2.4)

Phase 3: Session Management UI
├── Task 3.1: Confirm Dialog (no deps)
├── Task 3.2: Sessions Modal (depends on 1.6, 3.1)
├── Task 3.3: Auth Button Sessions (depends on 3.2, 2.4)
├── Task 3.4: Auto-Save Prompt (depends on 2.2, 2.4)
└── Task 3.5: Edge Cases (depends on all)
```

## Total Tasks: 14

## Files Created (10 new files)

- `src/types/session.ts`
- `src/types/storage-errors.ts`
- `src/lib/storage-paths.ts`
- `src/lib/points-hash.ts`
- `src/lib/session-migration.ts`
- `src/lib/storage-errors.ts`
- `src/hooks/use-storage.ts`
- `src/components/save-session-modal.tsx`
- `src/components/session-indicator.tsx`
- `src/components/confirm-dialog.tsx`
- `src/components/sessions-modal.tsx`

## Files Modified (4 files)

- `src/i18n/translations/en.json` - Add session translations
- `src/i18n/translations/he.json` - Add session translations
- `src/components/auth-button.tsx` - Add Save/Sessions menu items
- `src/app/page.tsx` - Add currentSession state, integrate components

---

# Appendix

## Glossary

| Term | Definition |
|------|------------|
| Session | A saved measurement with points, area, and metadata |
| Current Session | The session currently being worked on (loaded or saved) |
| Index | JSON file listing all user's sessions (metadata only) |
| Schema Version | Version number for data format migration |
| Points Hash | Deterministic hash of points array for change detection |

## References

- [Session Persistence Spec](spec-session-persistence.md)
- [Account Management Spec](../auth/spec-account-management.md)
- [Auth Phase 1 Feature](../auth/feature-auth-phase1.md)

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-31 | 1.0 | Initial breakdown from design document |
