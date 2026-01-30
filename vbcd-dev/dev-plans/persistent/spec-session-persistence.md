# Session Persistence Feature - Design Specification (Phase 2 & 3)

**Status:** Ready for Implementation
**Version:** 1.0
**Last Updated:** 2025-01-30
**Scope:** Phase 2 (Session Persistence) and Phase 3 (Session Management)
**Depends On:** [Authentication Feature Spec (Phase 1)](../auth/spec-auth-feature.md)

> **Prerequisite:** Phase 1 (Authentication) must be completed first. This spec assumes Firebase is configured and auth context is available.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Models](#2-data-models)
3. [Storage Architecture](#3-storage-architecture)
4. [Current Session Tracking](#4-current-session-tracking)
5. [Storage Operations](#5-storage-operations)
6. [UI Integration](#6-ui-integration)
7. [Session Flows](#7-session-flows)
8. [Data Migration](#8-data-migration)
9. [LocalStorage Synchronization](#9-localstorage-synchronization)
10. [Error Handling](#10-error-handling)
11. [Edge Cases](#11-edge-cases)
12. [Implementation Details](#12-implementation-details)
13. [Testing Requirements](#13-testing-requirements)

---

## 1. Overview

### 1.1 Feature Summary

Enable authenticated users to persist measurement sessions to Firebase Cloud Storage, providing:
- Save current measurement to cloud
- Update existing sessions or save as new
- Load saved sessions from any device
- Manage sessions (view, rename, delete)
- Track "current session" state for seamless updates

### 1.2 Key Decisions

| Decision | Choice |
|----------|--------|
| Storage Backend | Firebase Cloud Storage |
| Data Format | JSON files |
| Session Names | Non-unique (ID is unique identifier) |
| Save Behavior | Prompt: "Update existing" or "Save as new" |
| Current Session | Track active session, show in UI |
| Unsaved Changes | Rely on localStorage backup (no warning) |
| Auto-save Prompt | On login if localStorage differs from cloud |
| Points Limit | No limit |
| Schema Versioning | Migration on load |

### 1.3 Scope

**In Scope:**
- CRUD operations for sessions (Create, Read, Update, Delete)
- Session index management
- Current session tracking
- localStorage ↔ cloud synchronization logic
- Data migration for schema changes

**Out of Scope (Future):**
- Offline queue (save when back online)
- Session sharing between users
- Thumbnails/map previews
- Export/import bulk operations
- Real-time sync between devices

---

## 2. Data Models

### 2.1 Session Metadata (Index Entry)

Stored in the user's index file for quick listing without fetching full session data.

```typescript
// src/types/session.ts

/**
 * Metadata for a single session (stored in index file)
 * Used for list display - minimal data for fast loading
 */
interface SessionMeta {
  id: string;                    // UUID v4 - unique identifier
  name: string;                  // User-provided or auto-generated (non-unique)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  area: number;                  // Calculated area in m² (for display)
  pointCount: number;            // Number of tracked points (for display)
}
```

**Field Details:**

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | string | UUID v4, unique per user | Generated on first save |
| `name` | string | 1-100 chars, not unique | User can have multiple "Back Yard" sessions |
| `createdAt` | string | ISO 8601 | Set once on creation, never changes |
| `updatedAt` | string | ISO 8601 | Updated on every save/rename |
| `area` | number | >= 0, in m² | Cached for list display |
| `pointCount` | number | >= 1 | Minimum 1 point to save |

### 2.2 Full Session Data

Complete session data stored in individual session files.

```typescript
/**
 * Full session data (stored in individual session file)
 * Contains all data needed to restore a measurement
 */
interface SessionData {
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
 * Current schema version
 * Increment when TrackedPoint or SessionData structure changes
 */
const CURRENT_SCHEMA_VERSION = 1;
```

### 2.3 TrackedPoint (Existing Type)

From existing codebase - included here for reference and versioning.

```typescript
/**
 * Schema Version 1 - Current
 * Represents a single GPS point in the measurement
 */
interface TrackedPoint {
  point: {
    lat: number;                 // Latitude (-90 to 90)
    lng: number;                 // Longitude (-180 to 180)
  };
  type: 'manual' | 'auto';       // How the point was recorded
  timestamp: number;             // Unix timestamp in milliseconds
}
```

### 2.4 User Session Index

Aggregates all session metadata for a user.

```typescript
/**
 * User's session index (one per user)
 * Loaded to display "My Sessions" list
 */
interface UserSessionIndex {
  version: number;               // Index schema version (currently 1)
  sessions: SessionMeta[];       // Array of session metadata
  lastModified: string;          // ISO 8601 - when index was last updated
}
```

**Example Index File:**
```json
{
  "version": 1,
  "lastModified": "2025-01-30T14:30:00.000Z",
  "sessions": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Back Yard",
      "createdAt": "2025-01-28T10:00:00.000Z",
      "updatedAt": "2025-01-30T14:30:00.000Z",
      "area": 245.7,
      "pointCount": 12
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Back Yard",
      "createdAt": "2025-01-29T14:30:00.000Z",
      "updatedAt": "2025-01-29T14:45:00.000Z",
      "area": 189.3,
      "pointCount": 8
    }
  ]
}
```

### 2.5 Current Session State

Tracks the currently loaded/active session in the app.

```typescript
/**
 * Current session context - tracks what session is "active"
 * null when working with unsaved/new measurement
 */
interface CurrentSession {
  id: string;                    // Session ID if loaded from cloud
  name: string;                  // Session name
  savedAt: string;               // When it was last saved (for dirty detection)
  pointsHash: string;            // Hash of points at save time (for change detection)
}

// In app state
interface AppState {
  // ... existing state
  currentSession: CurrentSession | null;
}
```

---

## 3. Storage Architecture

### 3.1 Firebase Storage Structure

```
Firebase Storage Bucket
└── users/
    └── {uid}/
        ├── index.json                           # UserSessionIndex
        └── sessions/
            ├── f47ac10b-58cc-4372-a567-0e02b2c3d479.json   # SessionData
            ├── 7c9e6679-7425-40de-944b-e07fc1f90ae7.json   # SessionData
            └── ...
```

### 3.2 File Paths

```typescript
// Path builders
const getUserBasePath = (uid: string) => `users/${uid}`;
const getIndexPath = (uid: string) => `users/${uid}/index.json`;
const getSessionPath = (uid: string, sessionId: string) =>
  `users/${uid}/sessions/${sessionId}.json`;
```

### 3.3 Storage Limits & Considerations

| Aspect | Specification |
|--------|---------------|
| Max file size | Unlimited (practical: ~10MB for huge sessions) |
| Max sessions per user | Unlimited |
| Max points per session | Unlimited |
| File format | JSON (UTF-8) |
| Compression | None (JSON is human-readable for debugging) |

**Size Estimates:**
- 1 point ≈ 100 bytes
- 100 points ≈ 10 KB
- 1000 points ≈ 100 KB
- Index with 100 sessions ≈ 15 KB

---

## 4. Current Session Tracking

### 4.1 State Definition

```typescript
// src/types/session.ts

interface CurrentSessionState {
  /** Session ID from cloud storage */
  id: string;

  /** Session name for display */
  name: string;

  /** ISO timestamp of last cloud save */
  lastSavedAt: string;

  /**
   * Hash of points array at last save
   * Used to detect if local changes exist
   */
  pointsHashAtSave: string;
}
```

### 4.2 State Transitions

```
┌─────────────────────────────────────────────────────────────────────┐
│ currentSession = null                                               │
│ (New/unsaved measurement)                                           │
└─────────────────────────────────────────────────────────────────────┘
        │                                    ▲
        │ User saves as new session          │ User clears points
        │                                    │ OR starts new measurement
        ▼                                    │
┌─────────────────────────────────────────────────────────────────────┐
│ currentSession = { id, name, lastSavedAt, pointsHashAtSave }        │
│ (Working on saved session)                                          │
└─────────────────────────────────────────────────────────────────────┘
        │                                    ▲
        │ User loads different session       │ User updates (saves changes)
        │                                    │
        └────────────────────────────────────┘
```

### 4.3 UI Indicators

When `currentSession !== null`, display session context:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Current Session Indicator (top of control panel or near area)       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   📁 Back Yard                              [unsaved indicator*]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

* "unsaved indicator" shown only if points changed since last save
  (compare current pointsHash with pointsHashAtSave)
```

**Visual Specs:**
- Small, non-intrusive indicator
- Truncate long names with ellipsis (max ~20 chars visible)
- Optional: subtle dot/badge if unsaved changes exist

### 4.4 Hash Generation

```typescript
/**
 * Generate deterministic hash of points array
 * Used to detect changes since last save
 */
function generatePointsHash(points: TrackedPoint[]): string {
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

---

## 5. Storage Operations

### 5.1 Hook Interface

```typescript
// src/hooks/use-storage.ts

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
  deleteAllSessions: () => Promise<void>;  // For account deletion

  // State
  loading: boolean;
  error: string | null;
  clearError: () => void;
}
```

### 5.2 Save New Session

```typescript
async function saveNewSession(
  name: string,
  points: TrackedPoint[],
  area: number
): Promise<SessionMeta> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();

  // 1. Build session data
  const sessionData: SessionData = {
    id: sessionId,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    points,
    area
  };

  // 2. Build metadata for index
  const sessionMeta: SessionMeta = {
    id: sessionId,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    area,
    pointCount: points.length
  };

  // 3. Upload session file
  const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
  await uploadString(sessionRef, JSON.stringify(sessionData), 'raw', {
    contentType: 'application/json'
  });

  // 4. Update index (fetch, append, upload)
  const index = await fetchIndexInternal(user.uid) || createEmptyIndex();
  index.sessions.push(sessionMeta);
  index.lastModified = now;

  const indexRef = ref(storage, getIndexPath(user.uid));
  await uploadString(indexRef, JSON.stringify(index), 'raw', {
    contentType: 'application/json'
  });

  return sessionMeta;
}
```

### 5.3 Update Existing Session

```typescript
async function updateSession(
  sessionId: string,
  points: TrackedPoint[],
  area: number
): Promise<SessionMeta> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();

  // 1. Fetch existing session to preserve createdAt and name
  const existingSession = await loadSession(sessionId);

  // 2. Build updated session data
  const sessionData: SessionData = {
    ...existingSession,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    points,
    area
  };

  // 3. Upload updated session file
  const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
  await uploadString(sessionRef, JSON.stringify(sessionData), 'raw', {
    contentType: 'application/json'
  });

  // 4. Update index entry
  const index = await fetchIndexInternal(user.uid);
  if (!index) throw new Error('Index not found');

  const entryIndex = index.sessions.findIndex(s => s.id === sessionId);
  if (entryIndex === -1) throw new Error('Session not in index');

  const updatedMeta: SessionMeta = {
    ...index.sessions[entryIndex],
    updatedAt: now,
    area,
    pointCount: points.length
  };

  index.sessions[entryIndex] = updatedMeta;
  index.lastModified = now;

  const indexRef = ref(storage, getIndexPath(user.uid));
  await uploadString(indexRef, JSON.stringify(index), 'raw', {
    contentType: 'application/json'
  });

  return updatedMeta;
}
```

### 5.4 Load Session

```typescript
async function loadSession(sessionId: string): Promise<SessionData> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));

  try {
    const url = await getDownloadURL(sessionRef);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }

    const data: SessionData = await response.json();

    // Migrate if needed
    return migrateSessionData(data);

  } catch (error) {
    if (isStorageError(error) && error.code === 'storage/object-not-found') {
      throw new Error('Session not found');
    }
    throw error;
  }
}
```

### 5.5 Rename Session

```typescript
async function renameSession(sessionId: string, newName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const trimmedName = newName.trim();
  if (!trimmedName) throw new Error('Name cannot be empty');
  if (trimmedName.length > 100) throw new Error('Name too long');

  const now = new Date().toISOString();

  // 1. Update session file
  const session = await loadSession(sessionId);
  session.name = trimmedName;
  session.updatedAt = now;

  const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
  await uploadString(sessionRef, JSON.stringify(session), 'raw', {
    contentType: 'application/json'
  });

  // 2. Update index
  const index = await fetchIndexInternal(user.uid);
  if (!index) throw new Error('Index not found');

  const entry = index.sessions.find(s => s.id === sessionId);
  if (!entry) throw new Error('Session not in index');

  entry.name = trimmedName;
  entry.updatedAt = now;
  index.lastModified = now;

  const indexRef = ref(storage, getIndexPath(user.uid));
  await uploadString(indexRef, JSON.stringify(index), 'raw', {
    contentType: 'application/json'
  });
}
```

### 5.6 Delete Session

```typescript
async function deleteSession(sessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // 1. Delete session file
  const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
  try {
    await deleteObject(sessionRef);
  } catch (error) {
    // Ignore if already deleted
    if (!isStorageError(error) || error.code !== 'storage/object-not-found') {
      throw error;
    }
  }

  // 2. Remove from index
  const index = await fetchIndexInternal(user.uid);
  if (index) {
    index.sessions = index.sessions.filter(s => s.id !== sessionId);
    index.lastModified = new Date().toISOString();

    const indexRef = ref(storage, getIndexPath(user.uid));
    await uploadString(indexRef, JSON.stringify(index), 'raw', {
      contentType: 'application/json'
    });
  }
}
```

### 5.7 Delete All Sessions (Account Deletion)

```typescript
async function deleteAllSessions(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // 1. Fetch index to get all session IDs
  const index = await fetchIndexInternal(user.uid);

  if (index) {
    // 2. Delete all session files
    const deletePromises = index.sessions.map(session => {
      const sessionRef = ref(storage, getSessionPath(user.uid, session.id));
      return deleteObject(sessionRef).catch(() => {
        // Ignore individual deletion errors
      });
    });

    await Promise.all(deletePromises);
  }

  // 3. Delete index file
  const indexRef = ref(storage, getIndexPath(user.uid));
  try {
    await deleteObject(indexRef);
  } catch (error) {
    // Ignore if doesn't exist
  }
}
```

---

## 6. UI Integration

### 6.1 Modified Components

| Component | Changes |
|-----------|---------|
| `page.tsx` | Add `currentSession` state, session indicator, integrate with save flow |
| `auth-button.tsx` | "Save Current" triggers save flow with update/new choice |
| `save-session-modal.tsx` | Add mode: 'new' \| 'update' \| 'choose' |
| `sessions-modal.tsx` | On load, set `currentSession` state |

### 6.2 Session Indicator Component

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

### 6.3 Save Session Modal - Updated

The save modal needs to handle three scenarios:

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
  onSaveComplete: (session: CurrentSessionState) => void;
}
```

**Modal UI - Choose Mode:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Save Session                                              [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're working on "{currentSession.name}"                      │
│                                                                 │
│  Current measurement:                                           │
│  • 312.5 m²                                                     │
│  • 15 points                                                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Update "{currentSession.name}"               │  │
│  │              Save changes to existing session             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Save as New Session                    │  │
│  │              Keep original, create a copy                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                        Cancel                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Modal UI - New Session (after choosing "Save as New" or when no current session):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Save New Session                                          [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session Name                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Area 3                                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Current measurement:                                           │
│  • 312.5 m²                                                     │
│  • 15 points                                                    │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │       Cancel        │    │              Save               │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Default Session Name Generation

```typescript
/**
 * Generate default name for new session
 * Format: "Area {n}" where n is sessionCount + 1
 */
function generateDefaultSessionName(existingSessionCount: number): string {
  return `Area ${existingSessionCount + 1}`;
}
```

---

## 7. Session Flows

### 7.1 Save Flow (Complete)

```
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks "Save Current" from auth dropdown                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Check: points.length > 0?                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────────┐
│ NO                      │     │ YES                                 │
│ Toast: "No points to    │     └─────────────────────────────────────┘
│ save"                   │                   │
└─────────────────────────┘                   ▼
                          ┌─────────────────────────────────────────────┐
                          │ Check: currentSession !== null?             │
                          └─────────────────────────────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
              ┌─────────────────────────┐     ┌─────────────────────────┐
              │ YES (has current)       │     │ NO (new measurement)    │
              │ Show CHOOSE modal       │     │ Show NEW modal          │
              └─────────────────────────┘     └─────────────────────────┘
                              │                               │
                              ▼                               │
              ┌─────────────────────────┐                     │
              │ User selects:           │                     │
              │ - "Update existing" ────┼──────┐              │
              │ - "Save as new" ────────┼──────┼──────────────┤
              │ - "Cancel" ─────────────┼──┐   │              │
              └─────────────────────────┘  │   │              │
                                           │   │              │
                                           │   │              ▼
                                           │   │  ┌─────────────────────┐
                                           │   │  │ Show name input     │
                                           │   │  │ Default: "Area {n}" │
                                           │   │  └─────────────────────┘
                                           │   │              │
                                           │   │              ▼
                                           │   │  ┌─────────────────────┐
                                           │   │  │ User enters name,   │
                                           │   │  │ clicks Save         │
                                           │   │  └─────────────────────┘
                                           │   │              │
                                           │   ▼              ▼
                                           │  ┌─────────────────────────┐
                                           │  │ Call updateSession()   │
                                           │  │ OR saveNewSession()    │
                                           │  └─────────────────────────┘
                                           │              │
                                           │              ▼
                                           │  ┌─────────────────────────┐
                                           │  │ SUCCESS:               │
                                           │  │ - Update currentSession│
                                           │  │ - Close modal          │
                                           │  │ - Toast: "Saved"       │
                                           │  │                        │
                                           │  │ FAILURE:               │
                                           │  │ - Show error in modal  │
                                           │  │ - Enable retry         │
                                           │  └─────────────────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │ Close modal, no action  │
                              └─────────────────────────┘
```

### 7.2 Load Flow (Complete)

```
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks session in "My Sessions" list                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Check: current points.length > 0?                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────────┐
│ YES (has points)        │     │ NO (empty state)                    │
│ Show confirmation:      │     │ Skip confirmation                   │
│ "Replace current        │     └─────────────────────────────────────┘
│ points?"                │                   │
└─────────────────────────┘                   │
              │                               │
              ▼                               │
┌─────────────────────────┐                   │
│ User confirms?          │                   │
│ - Yes ──────────────────┼───────────────────┤
│ - No (cancel) ──────────┼──┐                │
└─────────────────────────┘  │                │
                             │                ▼
                             │   ┌─────────────────────────────────────┐
                             │   │ Show loading state in modal         │
                             │   └─────────────────────────────────────┘
                             │                │
                             │                ▼
                             │   ┌─────────────────────────────────────┐
                             │   │ Call loadSession(sessionId)         │
                             │   └─────────────────────────────────────┘
                             │                │
                             │    ┌───────────┴───────────┐
                             │    │                       │
                             │    ▼                       ▼
                             │  ┌───────────┐  ┌─────────────────────────┐
                             │  │ SUCCESS   │  │ FAILURE                 │
                             │  └───────────┘  │ - Show error toast      │
                             │        │        │ - Offer retry           │
                             │        │        └─────────────────────────┘
                             │        ▼
                             │  ┌─────────────────────────────────────────┐
                             │  │ 1. Replace app points with loaded      │
                             │  │ 2. Update localStorage                 │
                             │  │ 3. Set currentSession state            │
                             │  │ 4. Close My Sessions modal             │
                             │  │ 5. Toast: "Loaded {name}"              │
                             │  │ 6. Map fits to loaded points           │
                             │  └─────────────────────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────────────────┐
              │ Close confirmation, stay in modal       │
              └─────────────────────────────────────────┘
```

### 7.3 Auto-Save on Login Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ User completes sign-in successfully                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Check: localStorage has points?                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────────┐
│ NO: points.length === 0 │     │ YES: points.length > 0              │
│ Done (no action)        │     └─────────────────────────────────────┘
└─────────────────────────┘                   │
                                              ▼
                          ┌─────────────────────────────────────────────┐
                          │ Fetch user's session index                  │
                          └─────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌─────────────────────────────────────────────┐
                          │ Check: Do any saved sessions have the same  │
                          │ points hash as current localStorage?        │
                          └─────────────────────────────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
              ┌─────────────────────────┐     ┌─────────────────────────┐
              │ YES: Matching session   │     │ NO: Different data      │
              │ exists                  │     │                         │
              │                         │     │ Open Save Session Modal │
              │ Set as currentSession   │     │ (isAutoSave = true)     │
              │ (user is resuming work) │     │                         │
              └─────────────────────────┘     └─────────────────────────┘
                                                          │
                                                          ▼
                                              ┌─────────────────────────┐
                                              │ User saves or skips     │
                                              │ (see Save Flow above)   │
                                              └─────────────────────────┘
```

**Note on "matching session" detection:**

For simplicity in v1, we can skip the hash comparison and always prompt to save if localStorage has points. The "matching session" optimization can be added later.

Simplified v1 flow:
- If localStorage has points → prompt to save
- User can cancel to skip (data stays in localStorage)

### 7.4 Start New Measurement Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks "+" button in session indicator                         │
│ OR clicks "Clear All" from points menu                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Clear all points from state                                      │
│ 2. Clear localStorage                                               │
│ 3. Set currentSession = null                                        │
│ 4. Map resets to default view                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** No confirmation needed - localStorage was the "backup" and we're explicitly starting fresh.

---

## 8. Data Migration

### 8.1 Migration Strategy

Migrations are applied **on load** - when a session is fetched from storage, it's transformed to the current schema before being used. The original file in storage is NOT automatically updated (lazy migration).

### 8.2 Migration Function

```typescript
// src/lib/session-migration.ts

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migrate session data to current schema version
 * Called when loading a session from storage
 */
function migrateSessionData(data: unknown): SessionData {
  // Handle missing version (pre-versioning data)
  const version = (data as any).schemaVersion ?? 0;

  let migrated = data as SessionData;

  // Apply migrations sequentially
  if (version < 1) {
    migrated = migrateV0ToV1(migrated);
  }

  // Future migrations:
  // if (version < 2) {
  //   migrated = migrateV1ToV2(migrated);
  // }

  // Ensure current version is set
  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;

  return migrated;
}

/**
 * Migrate from v0 (no version) to v1
 * - Add schemaVersion field
 * - Ensure all required fields exist
 */
function migrateV0ToV1(data: any): SessionData {
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
```

### 8.3 Index Migration

```typescript
/**
 * Migrate index to current version
 */
function migrateIndex(data: unknown): UserSessionIndex {
  const version = (data as any).version ?? 0;

  if (version < 1) {
    // v0 had sessions directly as array
    const sessions = Array.isArray(data)
      ? data as SessionMeta[]
      : (data as any).sessions || [];

    return {
      version: 1,
      lastModified: new Date().toISOString(),
      sessions: sessions.map(migrateSessionMeta)
    };
  }

  return data as UserSessionIndex;
}

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

### 8.4 Future Schema Changes

When adding new fields or changing structure:

1. Increment `CURRENT_SCHEMA_VERSION`
2. Add migration function `migrateVxToVy`
3. Add migration step in `migrateSessionData`
4. Document changes in this spec

**Example future migration (v1 → v2):**
```typescript
// Hypothetical: Adding "unit" field for area measurement
function migrateV1ToV2(data: SessionData): SessionDataV2 {
  return {
    ...data,
    schemaVersion: 2,
    unit: 'sqm' // Default to square meters
  };
}
```

---

## 9. LocalStorage Synchronization

### 9.1 Overview

localStorage remains the primary working storage during a session. Cloud storage is for persistence across devices/sessions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User's Device                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐                   ┌─────────────────────────┐ │
│   │   App State     │ ◄───────────────► │     localStorage        │ │
│   │   (points[])    │   sync on change  │   (recordedPoints)      │ │
│   └─────────────────┘                   └─────────────────────────┘ │
│           │                                                         │
│           │ explicit save/load                                      │
│           │ (user action)                                           │
│           ▼                                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Firebase Cloud Storage                    │   │
│   │                    (users/{uid}/sessions/*.json)            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Sync Rules

| Event | localStorage | Cloud Storage |
|-------|--------------|---------------|
| Point added/removed | Updated immediately | Not affected |
| Session saved (new) | No change | New session created |
| Session saved (update) | No change | Session updated |
| Session loaded | Replaced with loaded data | Not affected |
| Clear/new measurement | Cleared | Not affected |
| Sign out | Preserved | Not affected |
| App closed | Preserved | Not affected |

### 9.3 localStorage Key

```typescript
const STORAGE_KEY = 'recordedPoints';  // Existing key, maintain compatibility

// On every points change in page.tsx
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedPoints));
}, [trackedPoints]);
```

---

## 10. Error Handling

### 10.1 Error Types

```typescript
// src/types/errors.ts

type StorageErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'SESSION_NOT_FOUND'
  | 'INDEX_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_DATA'
  | 'UNKNOWN';

interface StorageError {
  code: StorageErrorCode;
  message: string;
  retry: boolean;  // Can this operation be retried?
}
```

### 10.2 Error Mapping

```typescript
function mapFirebaseError(error: unknown): StorageError {
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

  if (error instanceof TypeError && error.message.includes('fetch')) {
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
```

### 10.3 Error UI

**In Modal (Save/Load failures):**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     ⚠️  {error.message}                                         │
│                                                                 │
│     [Retry]  (only if error.retry === true)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Toast (for less critical errors):**
```typescript
toast({
  variant: 'destructive',
  title: t(`errors.${errorCode}`),
  action: error.retry ? (
    <ToastAction altText="Retry" onClick={retryFn}>
      {t('common.retry')}
    </ToastAction>
  ) : undefined,
  duration: 5000
});
```

---

## 11. Edge Cases

### 11.1 Session File Missing from Storage

**Scenario:** Index lists a session, but the .json file doesn't exist (manual deletion, corruption).

**Detection:** `loadSession()` returns 404 / object-not-found.

**Handling:**
```typescript
try {
  const session = await loadSession(sessionId);
} catch (error) {
  if (error.code === 'SESSION_NOT_FOUND') {
    // Offer to clean up index
    const shouldRemove = await confirmDialog({
      title: 'Session Not Found',
      message: 'This session no longer exists. Remove it from your list?',
      confirmLabel: 'Remove',
      variant: 'destructive'
    });

    if (shouldRemove) {
      await removeFromIndex(sessionId);
      refreshSessionList();
    }
  }
}
```

### 11.2 Index File Corrupted

**Scenario:** index.json is malformed or invalid structure.

**Detection:** JSON parse error or schema validation failure.

**Handling:**
```typescript
async function fetchIndex(): Promise<UserSessionIndex | null> {
  try {
    const data = await fetchRawIndex();
    return migrateIndex(JSON.parse(data));
  } catch (parseError) {
    // Log for debugging
    console.error('Index corruption detected:', parseError);

    // Return empty state - user will see "no sessions"
    // Individual session files are preserved
    return {
      version: 1,
      lastModified: new Date().toISOString(),
      sessions: []
    };

    // Note: Could offer "Rebuild index" feature that scans
    // sessions/ folder - but not in v1
  }
}
```

### 11.3 Concurrent Modifications

**Scenario:** User has app open on two devices, saves from both.

**Behavior:** Last write wins. No conflict resolution in v1.

**Mitigation:**
- Index includes `lastModified` timestamp
- Future: Could compare timestamps and warn if stale

### 11.4 Session with 0 Points (Impossible State)

**Prevention:**
- Save button disabled when `points.length === 0`
- `saveNewSession` / `updateSession` validate `points.length > 0`

```typescript
if (points.length === 0) {
  throw new Error('Cannot save session with no points');
}
```

### 11.5 Very Large Session (10,000+ points)

**Impact:**
- Larger file size (~1MB)
- Longer upload/download time
- Map rendering may slow

**Handling:**
- No artificial limit
- Loading shows progress indicator
- Consider: Future pagination or streaming

### 11.6 Offline Save Attempt

**Detection:** Network error on Firebase operation.

**Handling:**
```typescript
// v1: Show error, rely on localStorage
toast({
  variant: 'destructive',
  title: t('errors.networkError'),
  description: t('errors.offlineHint'), // "Your data is saved locally"
  duration: 5000
});
```

**Future:** Queue save, sync when online.

### 11.7 Auth Token Expired During Operation

**Detection:** `storage/unauthorized` error mid-operation.

**Handling:** Firebase SDK auto-refreshes tokens. If error persists:
```typescript
if (error.code === 'storage/unauthorized') {
  // Token refresh failed - need re-auth
  toast({
    variant: 'destructive',
    title: 'Session expired',
    description: 'Please sign in again'
  });
  signOut();  // Clear invalid state
}
```

### 11.8 Unicode/Special Characters in Session Name

**Handling:**
- Allow any Unicode characters
- Trim whitespace
- Limit to 100 characters
- JSON encoding handles special chars

```typescript
function validateSessionName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Name cannot be empty');
  }
  if (trimmed.length > 100) {
    throw new Error('Name too long (max 100 characters)');
  }
  return trimmed;
}
```

---

## 12. Implementation Details

### 12.1 File Organization

```
src/
├── hooks/
│   └── use-storage.ts           # Firebase Storage operations hook
├── lib/
│   ├── storage-paths.ts         # Path builders
│   ├── session-migration.ts     # Schema migration logic
│   └── points-hash.ts           # Hash generation for change detection
├── types/
│   └── session.ts               # All session-related types
└── components/
    ├── session-indicator.tsx    # Current session display
    └── save-session-modal.tsx   # Updated with choose mode
```

### 12.2 Constants

```typescript
// src/lib/constants.ts

export const CURRENT_SCHEMA_VERSION = 1;
export const INDEX_VERSION = 1;
export const SESSION_NAME_MAX_LENGTH = 100;
export const LOCALSTORAGE_KEY = 'recordedPoints';
```

### 12.3 Type Exports

```typescript
// src/types/session.ts

export interface SessionMeta { ... }
export interface SessionData { ... }
export interface UserSessionIndex { ... }
export interface CurrentSessionState { ... }
export interface TrackedPoint { ... }

export type { SessionMeta, SessionData, UserSessionIndex, CurrentSessionState };
```

### 12.4 Integration Points

| File | Integration |
|------|-------------|
| `page.tsx` | Add `currentSession` state, pass to components |
| `auth-button.tsx` | Pass `currentSession` to save modal |
| `sessions-modal.tsx` | Call `onLoadSession` with full session data |
| `save-session-modal.tsx` | Handle all three save modes |

---

## 13. Testing Requirements

### 13.1 Unit Tests

| Module | Test Cases |
|--------|------------|
| `use-storage` | Save new, update, load, rename, delete, error handling |
| `session-migration` | v0→v1 migration, missing fields, invalid data |
| `points-hash` | Deterministic output, different inputs → different hashes |
| Path builders | Correct path generation |

### 13.2 Integration Tests

| Flow | Test Cases |
|------|------------|
| Save New | Valid save, name validation, network error, retry |
| Update | Update existing, session not found, permission error |
| Load | Load into empty state, load with confirmation, network error |
| Delete | Delete with confirmation, cascade to index |
| Current Session | Tracking after load, clearing on new measurement |

### 13.3 E2E Tests

| Scenario | Steps |
|----------|-------|
| Full save/load cycle | Sign in → Add points → Save → Clear → Load → Verify |
| Update flow | Load session → Add point → Save (update) → Reload → Verify |
| Multi-session | Create 3 sessions → Load each → Verify correct data |
| Cross-device simulation | Save on "device A" (clear storage) → Load on "device B" |

### 13.4 Manual Testing Checklist

- [ ] Save new session with custom name
- [ ] Save new session with default name
- [ ] Update existing session (choose "Update")
- [ ] Save as new from existing (choose "Save as New")
- [ ] Load session when app has points (confirmation shown)
- [ ] Load session when app is empty (no confirmation)
- [ ] Rename session from list
- [ ] Delete session from list
- [ ] Session indicator shows current session name
- [ ] Session indicator shows unsaved changes dot
- [ ] Start new measurement clears current session
- [ ] Auto-save prompt on login with local data
- [ ] Cancel auto-save keeps local data
- [ ] Network error during save shows retry option
- [ ] Network error during load shows retry option
- [ ] Hebrew UI for all session operations
- [ ] RTL layout for Hebrew

---

## Appendix A: i18n Keys (Session-Specific)

Reference to auth spec section 9.2, plus these additions:

```json
{
  "sessions": {
    "currentSession": "Current: {name}",
    "unsavedChanges": "Unsaved changes",
    "startNew": "Start new measurement",
    "updateExisting": "Update \"{name}\"",
    "updateExistingHint": "Save changes to existing session",
    "saveAsNew": "Save as New Session",
    "saveAsNewHint": "Keep original, create a copy",
    "workingOn": "You're working on \"{name}\"",
    "noPointsToSave": "No points to save",
    "sessionUpdated": "Session updated",
    "defaultName": "Area {n}"
  }
}
```

---

## Appendix B: State Diagram

```
                           ┌──────────────────────┐
                           │   App Initialized    │
                           │   currentSession=null│
                           │   points=[]          │
                           └──────────┬───────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │ User adds point │     │ User loads      │     │ User logs in    │
    │ (manual/auto)   │     │ session         │     │ (has local pts) │
    └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
             │                       │                       │
             ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │ currentSession  │     │ currentSession  │     │ Auto-save       │
    │ = null          │     │ = {loaded}      │     │ prompt          │
    │ points=[...new] │     │ points=[loaded] │     └────────┬────────┘
    └────────┬────────┘     └────────┬────────┘              │
             │                       │              ┌────────┴────────┐
             │                       │              ▼                 ▼
             │                       │     ┌──────────────┐  ┌──────────────┐
             │                       │     │ User saves   │  │ User skips   │
             │                       │     │ (new session)│  │              │
             │                       │     └──────┬───────┘  └──────┬───────┘
             │                       │            │                 │
             │                       │            ▼                 ▼
             │                       │     ┌──────────────┐  ┌──────────────┐
             │                       │     │ currentSess  │  │ currentSess  │
             │                       │     │ = {new}      │  │ = null       │
             │                       │     └──────────────┘  │ (stays local)│
             │                       │                       └──────────────┘
             └───────────────────────┼───────────────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ User clicks     │
                            │ "Save Current"  │
                            └────────┬────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
          ┌─────────────────┐               ┌─────────────────┐
          │ currentSession  │               │ currentSession  │
          │ = null          │               │ != null         │
          │                 │               │                 │
          │ → NEW modal     │               │ → CHOOSE modal  │
          └────────┬────────┘               └────────┬────────┘
                   │                                 │
                   │                    ┌────────────┴────────────┐
                   │                    ▼                         ▼
                   │          ┌─────────────────┐       ┌─────────────────┐
                   │          │ "Update"        │       │ "Save as New"   │
                   │          │ → updateSession │       │ → NEW modal     │
                   │          └─────────────────┘       └────────┬────────┘
                   │                                             │
                   └─────────────────────────────────────────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ currentSession  │
                                  │ = {saved/new}   │
                                  └─────────────────┘
```

---

*End of Specification*
