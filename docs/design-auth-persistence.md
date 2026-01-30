# Authentication & Session Persistence Design

This document specifies the design for user authentication and cloud-based session persistence in AreaCalc.

## Overview

Enable users to:
- Sign in with their Google account
- Save measurement sessions to the cloud
- Access saved sessions from any device
- Manage (view, load, delete) their saved sessions

## Technology Stack

| Component | Technology |
|-----------|------------|
| Authentication | Firebase Auth (Google provider) |
| Cloud Storage | Firebase Cloud Storage |
| Local Storage | Browser localStorage (existing) |

---

## Authentication

### Provider

**Google Sign-In** via Firebase Auth - single click authentication with no password management required.

### Auth State

```typescript
interface AuthState {
  user: User | null;        // Firebase User object
  loading: boolean;         // True during initial auth check
  error: string | null;     // Auth error message if any
}

interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}
```

### Firebase Configuration

Required environment variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Auth UX Flow

### UI Components

#### 1. Header Auth Button

Located in the app header/toolbar area.

**Signed Out State:**
```
[👤 Sign In]
```

**Signed In State:**
```
[🔵 {displayName} ▼]
  └─ Dropdown menu:
     - My Sessions
     - Sign Out
```

#### 2. Login Modal

Triggered by various user actions. Modal dialog with:

```
┌─────────────────────────────────────┐
│           Sign In              [X]  │
├─────────────────────────────────────┤
│                                     │
│   Save your measurements and        │
│   access them from any device       │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  🔵 Continue with Google    │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Trigger Points

| User Action | Behavior |
|-------------|----------|
| Click "Sign In" button | Open login modal |
| Click "Save to Cloud" (not authenticated) | Open login modal → on success, proceed with save |
| Click "My Sessions" (not authenticated) | Open login modal → on success, show sessions |
| App load (previously authenticated) | Silent auth state restoration (Firebase persistence) |

### Post-Login Behavior

1. Modal closes automatically
2. Toast notification: "Signed in as {displayName}"
3. If there was a pending action (save/view sessions), execute it
4. Header updates to show user info

### Sign Out Behavior

1. Clear auth state
2. Keep current localStorage data intact (offline-first)
3. Toast notification: "Signed out"
4. Header reverts to "Sign In" button

---

## Session Persistence

### Storage Strategy

- **localStorage**: Primary storage during active session (existing behavior)
- **Firebase Cloud Storage**: Persistent backup, cross-device access
- **Sync model**: Explicit save action (not auto-sync)

### Firebase Storage Structure

```
users/
└── {uid}/
    ├── index.json                    # Session metadata list
    └── sessions/
        ├── {sessionId}.json          # Full session data
        ├── {sessionId}.json
        └── ...
```

### Data Model

#### Index File Schema

**Path:** `users/{uid}/index.json`

```typescript
interface UserSessionIndex {
  version: 1;                    // Schema version for future migrations
  sessions: SessionMeta[];       // Array of session metadata
}

interface SessionMeta {
  id: string;                    // UUID
  name: string;                  // User-provided or auto-generated name
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  area: number;                  // Calculated area in m² (for list display)
  pointCount: number;            // Number of tracked points
  thumbnail?: string;            // Optional: base64 encoded small preview
}
```

**Example:**
```json
{
  "version": 1,
  "sessions": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Back Yard",
      "createdAt": "2025-01-28T10:00:00.000Z",
      "updatedAt": "2025-01-28T10:15:00.000Z",
      "area": 245.7,
      "pointCount": 12
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Front Garden",
      "createdAt": "2025-01-29T14:30:00.000Z",
      "updatedAt": "2025-01-29T14:45:00.000Z",
      "area": 89.3,
      "pointCount": 8
    }
  ]
}
```

#### Session File Schema

**Path:** `users/{uid}/sessions/{sessionId}.json`

```typescript
interface SessionData {
  id: string;                    // UUID (matches filename)
  name: string;                  // Session name
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  points: TrackedPoint[];        // Full points array
  area: number;                  // Calculated area in m²
  notes?: string;                // Optional user notes
}

interface TrackedPoint {
  lat: number;                   // Latitude
  lng: number;                   // Longitude
  type: 'manual' | 'auto';       // Recording method
  timestamp: number;             // Unix timestamp (ms)
}
```

**Example:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Back Yard",
  "createdAt": "2025-01-28T10:00:00.000Z",
  "updatedAt": "2025-01-28T10:15:00.000Z",
  "area": 245.7,
  "notes": "Includes garden area, excludes shed",
  "points": [
    {
      "lat": 32.0853,
      "lng": 34.7818,
      "type": "manual",
      "timestamp": 1706436000000
    },
    {
      "lat": 32.0854,
      "lng": 34.7820,
      "type": "auto",
      "timestamp": 1706436060000
    }
  ]
}
```

---

## Operations

### List Sessions ("My Sessions")

```
1. Fetch: users/{uid}/index.json
2. Display list with: name, area, date, point count
3. If index.json doesn't exist, show empty state
```

### Load Session

```
1. User selects session from list
2. Fetch: users/{uid}/sessions/{sessionId}.json
3. Load points into app state
4. Update localStorage with loaded points
5. Close "My Sessions" view
6. Map updates to show loaded points
```

### Save Session

```
1. Generate sessionId (UUID) if new session
2. Prompt for session name (or use default "Area {n}")
3. Build SessionData object from current app state
4. Write: users/{uid}/sessions/{sessionId}.json
5. Update index.json:
   - If new: append SessionMeta to sessions array
   - If existing: update matching SessionMeta entry
6. Toast: "Session saved"
```

### Delete Session

```
1. Confirm deletion with user
2. Delete: users/{uid}/sessions/{sessionId}.json
3. Update index.json: remove matching SessionMeta
4. Toast: "Session deleted"
5. Refresh sessions list
```

### Rename Session

```
1. Update session name in:
   - users/{uid}/sessions/{sessionId}.json
   - users/{uid}/index.json (matching entry)
2. Toast: "Session renamed"
```

---

## Firebase Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own data
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Network error during save | Toast error, data remains in localStorage |
| Network error during load | Toast error, offer retry |
| Session not found | Toast error, refresh sessions list |
| Auth token expired | Silent refresh (Firebase handles this) |
| Index file corrupted | Rebuild from individual session files |

---

## Future Considerations

- **Offline sync**: Queue saves when offline, sync when back online
- **Session sharing**: Generate shareable links to sessions
- **Thumbnails**: Generate map preview images for session list
- **Export/Import**: Bulk export all sessions, import from file
- **Session versioning**: Track edit history within a session