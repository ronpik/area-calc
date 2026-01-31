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
