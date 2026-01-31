// src/hooks/use-storage.ts

'use client';

import { useState, useCallback } from 'react';
import { ref, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage, auth } from '@/lib/firebase';
import { getIndexPath, getSessionPath, getUserBasePath } from '@/lib/storage-paths';
import { migrateSessionData, migrateIndex } from '@/lib/session-migration';
import { mapFirebaseError, notAuthenticatedError, sessionNotFoundError, isStorageError } from '@/lib/storage-errors';
import type {
  SessionMeta,
  SessionData,
  UserSessionIndex,
} from '@/types/session';
import { CURRENT_SCHEMA_VERSION, INDEX_VERSION } from '@/types/session';
import type { StorageError } from '@/types/storage-errors';
import type { TrackedPoint } from '@/app/page';

interface UseStorageReturn {
  // Index operations
  fetchIndex: () => Promise<UserSessionIndex | null>;
  removeFromIndex: (sessionId: string) => Promise<void>;

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
  // Handles corruption by returning empty index and preserving session files
  const fetchIndexInternal = useCallback(async (uid: string): Promise<UserSessionIndex | null> => {
    const indexRef = ref(storage, getIndexPath(uid));
    try {
      const url = await getDownloadURL(indexRef);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch index');
      const rawText = await response.text();

      // Attempt to parse JSON - handle corruption gracefully
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        // Index is corrupted - log for debugging and return empty index
        console.error('[use-storage] Index file is corrupted, returning empty index:', parseError);
        return createEmptyIndex();
      }

      // Validate basic index structure
      if (!data || typeof data !== 'object') {
        console.error('[use-storage] Index data is not an object, returning empty index');
        return createEmptyIndex();
      }

      // If sessions array is corrupted, return empty index but preserve what we can
      if (data.sessions && !Array.isArray(data.sessions)) {
        console.error('[use-storage] Index sessions is not an array, returning empty index');
        return createEmptyIndex();
      }

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
    if (points.length === 0) {
      console.error('[use-storage] Attempted to save session with no points');
      throw new Error('Cannot save session with no points');
    }

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

  const updateSession = useCallback(async (
    sessionId: string,
    points: TrackedPoint[],
    area: number
  ): Promise<SessionMeta> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();
    if (points.length === 0) {
      console.error('[use-storage] Attempted to update session with no points');
      throw new Error('Cannot save session with no points');
    }

    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();

      // Load existing session to preserve createdAt and name
      const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
      const url = await getDownloadURL(sessionRef);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch session');
      const existingData = await response.json();
      const migratedData = migrateSessionData(existingData);

      // Build updated session data (preserve createdAt and name)
      const sessionData: SessionData = {
        id: sessionId,
        name: migratedData.name,
        createdAt: migratedData.createdAt,
        updatedAt: now,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        points,
        area,
        notes: migratedData.notes
      };

      // Build updated metadata for index
      const sessionMeta: SessionMeta = {
        id: sessionId,
        name: migratedData.name,
        createdAt: migratedData.createdAt,
        updatedAt: now,
        area,
        pointCount: points.length
      };

      // Upload updated session file
      await uploadString(sessionRef, JSON.stringify(sessionData), 'raw', {
        contentType: 'application/json'
      });

      // Update index
      const index = await fetchIndexInternal(user.uid) || createEmptyIndex();
      const sessionIndex = index.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex >= 0) {
        index.sessions[sessionIndex] = sessionMeta;
      } else {
        // Session not in index (shouldn't happen, but handle it)
        index.sessions.push(sessionMeta);
      }
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

  const loadSession = useCallback(async (sessionId: string): Promise<SessionData> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();

    setLoading(true);
    setError(null);
    try {
      const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
      const url = await getDownloadURL(sessionRef);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      return migrateSessionData(data);
    } catch (err) {
      // Check if session file is missing
      if (isStorageError(err) && err.code === 'storage/object-not-found') {
        console.error('[use-storage] Session file not found:', sessionId);
        const error = sessionNotFoundError();
        setError(error);
        throw error;
      }
      const storageError = mapFirebaseError(err);
      setError(storageError);
      throw storageError;
    } finally {
      setLoading(false);
    }
  }, []);

  const renameSession = useCallback(async (sessionId: string, newName: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();

    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const trimmedName = newName.trim();

      // Load existing session
      const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
      const url = await getDownloadURL(sessionRef);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch session');
      const existingData = await response.json();
      const migratedData = migrateSessionData(existingData);

      // Update session with new name
      const sessionData: SessionData = {
        ...migratedData,
        name: trimmedName,
        updatedAt: now
      };

      // Upload updated session file
      await uploadString(sessionRef, JSON.stringify(sessionData), 'raw', {
        contentType: 'application/json'
      });

      // Update index
      const index = await fetchIndexInternal(user.uid);
      if (index) {
        const sessionIndex = index.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex >= 0) {
          index.sessions[sessionIndex].name = trimmedName;
          index.sessions[sessionIndex].updatedAt = now;
        }
        index.lastModified = now;

        const indexRef = ref(storage, getIndexPath(user.uid));
        await uploadString(indexRef, JSON.stringify(index), 'raw', {
          contentType: 'application/json'
        });
      }
    } catch (err) {
      const storageError = mapFirebaseError(err);
      setError(storageError);
      throw storageError;
    } finally {
      setLoading(false);
    }
  }, [fetchIndexInternal]);

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();

    setLoading(true);
    setError(null);
    try {
      // Delete session file
      const sessionRef = ref(storage, getSessionPath(user.uid, sessionId));
      await deleteObject(sessionRef);

      // Update index - remove the session entry
      const index = await fetchIndexInternal(user.uid);
      if (index) {
        index.sessions = index.sessions.filter(s => s.id !== sessionId);
        index.lastModified = new Date().toISOString();

        const indexRef = ref(storage, getIndexPath(user.uid));
        await uploadString(indexRef, JSON.stringify(index), 'raw', {
          contentType: 'application/json'
        });
      }
    } catch (err) {
      const storageError = mapFirebaseError(err);
      setError(storageError);
      throw storageError;
    } finally {
      setLoading(false);
    }
  }, [fetchIndexInternal]);

  // Remove a session entry from the index (without deleting the session file)
  // Used when a session file is found to be missing
  const removeFromIndex = useCallback(async (sessionId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();

    setLoading(true);
    setError(null);
    try {
      const index = await fetchIndexInternal(user.uid);
      if (index) {
        const originalLength = index.sessions.length;
        index.sessions = index.sessions.filter(s => s.id !== sessionId);

        // Only update if we actually removed something
        if (index.sessions.length < originalLength) {
          index.lastModified = new Date().toISOString();
          const indexRef = ref(storage, getIndexPath(user.uid));
          await uploadString(indexRef, JSON.stringify(index), 'raw', {
            contentType: 'application/json'
          });
          console.log('[use-storage] Removed missing session from index:', sessionId);
        }
      }
    } catch (err) {
      const storageError = mapFirebaseError(err);
      setError(storageError);
      throw storageError;
    } finally {
      setLoading(false);
    }
  }, [fetchIndexInternal]);

  const deleteAllSessions = useCallback(async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw notAuthenticatedError();

    setLoading(true);
    setError(null);
    try {
      // List all files in user's sessions directory
      const sessionsRef = ref(storage, `${getUserBasePath(user.uid)}/sessions`);
      const sessionsList = await listAll(sessionsRef);

      // Delete each session file
      await Promise.all(
        sessionsList.items.map(item => deleteObject(item))
      );

      // Delete the index file
      const indexRef = ref(storage, getIndexPath(user.uid));
      try {
        await deleteObject(indexRef);
      } catch (err) {
        // Index might not exist, that's okay
        if (!isStorageError(err) || err.code !== 'storage/object-not-found') {
          throw err;
        }
      }
    } catch (err) {
      const storageError = mapFirebaseError(err);
      setError(storageError);
      throw storageError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchIndex,
    removeFromIndex,
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
