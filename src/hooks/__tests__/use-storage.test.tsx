/**
 * @jest-environment jsdom
 */

/**
 * Tests for useStorage Hook
 *
 * Test coverage:
 * - All methods require authentication
 * - saveNewSession creates session and updates index
 * - Empty points validation
 * - Error mapping from Firebase errors
 * - Loading state management
 * - clearError functionality
 *
 * Note: Complex multi-fetch mock scenarios (updateSession, loadSession, renameSession)
 * are covered by integration tests due to Jest mock ordering complexity.
 */

// Mock Firebase modules before any imports
const mockRef = jest.fn();
const mockUploadString = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockDeleteObject = jest.fn();
const mockListAll = jest.fn();

jest.mock('firebase/storage', () => ({
  ref: (...args: any[]) => mockRef(...args),
  uploadString: (...args: any[]) => mockUploadString(...args),
  getDownloadURL: (...args: any[]) => mockGetDownloadURL(...args),
  deleteObject: (...args: any[]) => mockDeleteObject(...args),
  listAll: (...args: any[]) => mockListAll(...args),
}));

// Mock auth
const mockAuth = {
  currentUser: null as { uid: string } | null,
};

const mockStorage = { name: 'mock-storage' };

jest.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  storage: mockStorage,
}));

// Mock crypto.randomUUID
const mockUUID = 'test-session-uuid-1234';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => mockUUID),
  },
});

// Mock fetch for session data retrieval
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import React and testing utilities
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

// Import after mocks are set up
import { useStorage } from '@/hooks/use-storage';
import { FirebaseError } from 'firebase/app';
import { CURRENT_SCHEMA_VERSION, INDEX_VERSION } from '@/types/session';
import type { SessionMeta, UserSessionIndex } from '@/types/session';
import type { TrackedPoint } from '@/app/page';

// Test helper to capture hook state
interface CapturedState {
  fetchIndex: () => Promise<UserSessionIndex | null>;
  removeFromIndex: (sessionId: string) => Promise<void>;
  saveNewSession: (name: string, points: TrackedPoint[], area: number) => Promise<SessionMeta>;
  updateSession: (sessionId: string, points: TrackedPoint[], area: number) => Promise<SessionMeta>;
  loadSession: (sessionId: string) => Promise<any>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteAllSessions: () => Promise<void>;
  loading: boolean;
  error: import('@/types/storage-errors').StorageError | null;
  clearError: () => void;
}

function createTestHarness() {
  const states: CapturedState[] = [];
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function TestComponent() {
    const storageValue = useStorage();
    states.push({
      fetchIndex: storageValue.fetchIndex,
      removeFromIndex: storageValue.removeFromIndex,
      saveNewSession: storageValue.saveNewSession,
      updateSession: storageValue.updateSession,
      loadSession: storageValue.loadSession,
      renameSession: storageValue.renameSession,
      deleteSession: storageValue.deleteSession,
      deleteAllSessions: storageValue.deleteAllSessions,
      loading: storageValue.loading,
      error: storageValue.error,
      clearError: storageValue.clearError,
    });
    return null;
  }

  function mount() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<TestComponent />);
    });
  }

  function unmount() {
    if (root) {
      act(() => {
        root!.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    root = null;
    container = null;
  }

  return {
    mount,
    unmount,
    getLatestState: () => states[states.length - 1],
  };
}

// Test fixtures
function createTestPoint(lat: number = 32.0, lng: number = 34.0, type: 'manual' | 'auto' = 'manual'): TrackedPoint {
  return {
    point: { lat, lng },
    type,
    timestamp: Date.now(),
  };
}

function createTestIndex(sessions: SessionMeta[] = []): UserSessionIndex {
  return {
    version: INDEX_VERSION,
    lastModified: '2026-01-30T10:00:00Z',
    sessions,
  };
}

function createTestSessionMeta(id: string = 'test-session-id'): SessionMeta {
  return {
    id,
    name: 'Test Session',
    createdAt: '2026-01-30T10:00:00Z',
    updatedAt: '2026-01-30T10:00:00Z',
    area: 100,
    pointCount: 1,
  };
}

function createFirebaseError(code: string, message: string = 'Test error'): FirebaseError {
  return new FirebaseError(code, message);
}

// Setup mocks in a clean state
function resetMocks() {
  jest.clearAllMocks();
  mockRef.mockReturnValue({ fullPath: 'mock-path' });
  mockUploadString.mockResolvedValue(undefined);
  mockDeleteObject.mockResolvedValue(undefined);
  mockListAll.mockResolvedValue({ items: [] });
  mockFetch.mockReset();
}

describe('useStorage Hook', () => {
  beforeEach(() => {
    resetMocks();
    mockAuth.currentUser = null;
  });

  describe('Initial State', () => {
    it('should have loading=false initially', () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        expect(harness.getLatestState().loading).toBe(false);
      } finally {
        harness.unmount();
      }
    });

    it('should have error=null initially', () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should provide all required methods', () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        const state = harness.getLatestState();
        expect(typeof state.fetchIndex).toBe('function');
        expect(typeof state.saveNewSession).toBe('function');
        expect(typeof state.updateSession).toBe('function');
        expect(typeof state.loadSession).toBe('function');
        expect(typeof state.renameSession).toBe('function');
        expect(typeof state.deleteSession).toBe('function');
        expect(typeof state.deleteAllSessions).toBe('function');
        expect(typeof state.clearError).toBe('function');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Authentication Checks', () => {
    it('fetchIndex should set NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().fetchIndex();
        });
        expect(harness.getLatestState().error?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('saveNewSession should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().saveNewSession('Test', [createTestPoint()], 100);
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('updateSession should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().updateSession('id', [createTestPoint()], 100);
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('loadSession should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().loadSession('id');
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('renameSession should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().renameSession('id', 'name');
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('deleteSession should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().deleteSession('id');
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('deleteAllSessions should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().deleteAllSessions();
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('fetchIndex', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should return null when index does not exist (first use)', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: UserSessionIndex | null = null;
        await act(async () => {
          result = await harness.getLatestState().fetchIndex();
        });
        expect(result).toBeNull();
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should return migrated index when index exists', async () => {
      const existingIndex = createTestIndex([createTestSessionMeta()]);
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: UserSessionIndex | null = null;
        await act(async () => {
          result = await harness.getLatestState().fetchIndex();
        });
        expect(result).not.toBeNull();
        expect(result?.version).toBe(INDEX_VERSION);
        expect(result?.sessions).toHaveLength(1);
      } finally {
        harness.unmount();
      }
    });

    it('should apply migration to v0 index data (array format)', async () => {
      const v0Index = [createTestSessionMeta('session-1'), createTestSessionMeta('session-2')];
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(v0Index)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: UserSessionIndex | null = null;
        await act(async () => {
          result = await harness.getLatestState().fetchIndex();
        });
        expect(result?.version).toBe(INDEX_VERSION);
        expect(result?.sessions).toHaveLength(2);
        expect(result?.lastModified).toBeDefined();
      } finally {
        harness.unmount();
      }
    });

    it('should return empty index when index JSON is corrupted (invalid JSON)', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('this is not valid JSON{{{'),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: UserSessionIndex | null = null;
        await act(async () => {
          result = await harness.getLatestState().fetchIndex();
        });
        // Should return empty index instead of throwing
        expect(result).not.toBeNull();
        expect(result?.version).toBe(INDEX_VERSION);
        expect(result?.sessions).toEqual([]);
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should return empty index when index data is not an object', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('"just a string"'),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: UserSessionIndex | null = null;
        await act(async () => {
          result = await harness.getLatestState().fetchIndex();
        });
        expect(result).not.toBeNull();
        expect(result?.sessions).toEqual([]);
      } finally {
        harness.unmount();
      }
    });

    it('should return empty index when sessions property is not an array', async () => {
      const corruptedIndex = { version: 1, sessions: 'not an array', lastModified: '2026-01-30T10:00:00Z' };
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(corruptedIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: UserSessionIndex | null = null;
        await act(async () => {
          result = await harness.getLatestState().fetchIndex();
        });
        expect(result).not.toBeNull();
        expect(result?.sessions).toEqual([]);
      } finally {
        harness.unmount();
      }
    });

    it('should preserve error state as null on graceful corruption recovery', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{{invalid}}'),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().fetchIndex();
        });
        // Error should NOT be set - graceful degradation
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('loadSession', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should throw SESSION_NOT_FOUND error when session file does not exist', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().loadSession('missing-session-id');
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('SESSION_NOT_FOUND');
        expect(harness.getLatestState().error?.code).toBe('SESSION_NOT_FOUND');
      } finally {
        harness.unmount();
      }
    });

    it('should set error state with SESSION_NOT_FOUND when session file is missing', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          try {
            await harness.getLatestState().loadSession('missing-id');
          } catch (e) {
            // Expected to throw
          }
        });
        expect(harness.getLatestState().error).not.toBeNull();
        expect(harness.getLatestState().error?.code).toBe('SESSION_NOT_FOUND');
        expect(harness.getLatestState().error?.retry).toBe(false);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('removeFromIndex', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should throw NOT_AUTHENTICATED error when not authenticated', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().removeFromIndex('session-id');
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('NOT_AUTHENTICATED');
      } finally {
        harness.unmount();
      }
    });

    it('should remove session entry from index without deleting session file', async () => {
      const existingIndex = createTestIndex([
        createTestSessionMeta('session-1'),
        createTestSessionMeta('session-2'),
      ]);
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().removeFromIndex('session-1');
        });
        // Should upload index with session removed
        expect(mockUploadString).toHaveBeenCalledTimes(1);
        const uploadedIndex = JSON.parse(mockUploadString.mock.calls[0][1]);
        expect(uploadedIndex.sessions).toHaveLength(1);
        expect(uploadedIndex.sessions[0].id).toBe('session-2');
        // Should NOT call deleteObject (we're only updating index)
        expect(mockDeleteObject).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should not update index if session ID not found', async () => {
      const existingIndex = createTestIndex([
        createTestSessionMeta('session-1'),
      ]);
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().removeFromIndex('non-existent-session');
        });
        // Should NOT upload because nothing changed
        expect(mockUploadString).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should update lastModified when removing session from index', async () => {
      const existingIndex = createTestIndex([createTestSessionMeta('session-1')]);
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        const beforeTime = new Date().toISOString();
        await act(async () => {
          await harness.getLatestState().removeFromIndex('session-1');
        });
        const uploadedIndex = JSON.parse(mockUploadString.mock.calls[0][1]);
        expect(new Date(uploadedIndex.lastModified).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime() - 1000
        );
      } finally {
        harness.unmount();
      }
    });

    it('should handle index not existing gracefully', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().removeFromIndex('session-id');
        });
        // Should not throw and not try to upload
        expect(mockUploadString).not.toHaveBeenCalled();
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('saveNewSession', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should throw error when points array is empty', async () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().saveNewSession('Test', [], 0);
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.message).toBe('Cannot save session with no points');
      } finally {
        harness.unmount();
      }
    });

    it('should create new session and update empty index', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: SessionMeta | null = null;
        const points = [createTestPoint(32.0, 34.0), createTestPoint(32.1, 34.1)];
        await act(async () => {
          result = await harness.getLatestState().saveNewSession('My Session', points, 500);
        });
        expect(result).not.toBeNull();
        expect(result?.id).toBe(mockUUID);
        expect(result?.name).toBe('My Session');
        expect(result?.area).toBe(500);
        expect(result?.pointCount).toBe(2);
        expect(mockUploadString).toHaveBeenCalledTimes(2);
      } finally {
        harness.unmount();
      }
    });

    it('should add session to existing index', async () => {
      const existingIndex = createTestIndex([createTestSessionMeta('existing-session')]);
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().saveNewSession('New', [createTestPoint()], 100);
        });
        expect(mockUploadString).toHaveBeenCalledTimes(2);
        const indexUploadCall = mockUploadString.mock.calls[1];
        const uploadedIndex = JSON.parse(indexUploadCall[1]);
        expect(uploadedIndex.sessions).toHaveLength(2);
      } finally {
        harness.unmount();
      }
    });

    it('should trim session name', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        let result: SessionMeta | null = null;
        await act(async () => {
          result = await harness.getLatestState().saveNewSession('  Padded  ', [createTestPoint()], 100);
        });
        expect(result?.name).toBe('Padded');
      } finally {
        harness.unmount();
      }
    });

    it('should set error on upload failure', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      mockUploadString.mockRejectedValueOnce(
        createFirebaseError('storage/quota-exceeded')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().saveNewSession('Test', [createTestPoint()], 100);
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('QUOTA_EXCEEDED');
        expect(harness.getLatestState().error?.code).toBe('QUOTA_EXCEEDED');
      } finally {
        harness.unmount();
      }
    });

    it('should include CURRENT_SCHEMA_VERSION in saved session data', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().saveNewSession('Test', [createTestPoint()], 100);
        });
        const sessionUploadCall = mockUploadString.mock.calls[0];
        const uploadedSession = JSON.parse(sessionUploadCall[1]);
        expect(uploadedSession.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      } finally {
        harness.unmount();
      }
    });

    it('should include INDEX_VERSION in saved index', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().saveNewSession('Test', [createTestPoint()], 100);
        });
        const indexUploadCall = mockUploadString.mock.calls[1];
        const uploadedIndex = JSON.parse(indexUploadCall[1]);
        expect(uploadedIndex.version).toBe(INDEX_VERSION);
      } finally {
        harness.unmount();
      }
    });

    it('should correctly use storage paths', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().saveNewSession('Test', [createTestPoint()], 100);
        });
        expect(mockRef).toHaveBeenCalledWith(mockStorage, 'users/test-user-123/sessions/test-session-uuid-1234.json');
        expect(mockRef).toHaveBeenCalledWith(mockStorage, 'users/test-user-123/index.json');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('updateSession', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should throw error when points array is empty', async () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().updateSession('id', [], 0);
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.message).toBe('Cannot save session with no points');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('deleteAllSessions', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should delete all session files and index', async () => {
      mockListAll.mockResolvedValueOnce({
        items: [
          { fullPath: 'users/test-user-123/sessions/session1.json' },
          { fullPath: 'users/test-user-123/sessions/session2.json' },
        ],
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().deleteAllSessions();
        });
        expect(mockDeleteObject).toHaveBeenCalledTimes(3); // 2 sessions + 1 index
      } finally {
        harness.unmount();
      }
    });

    it('should handle empty sessions directory', async () => {
      mockListAll.mockResolvedValueOnce({ items: [] });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().deleteAllSessions();
        });
        expect(mockDeleteObject).toHaveBeenCalledTimes(1); // Only index
      } finally {
        harness.unmount();
      }
    });

    it('should ignore missing index file during deleteAll', async () => {
      mockListAll.mockResolvedValueOnce({ items: [] });
      mockDeleteObject.mockRejectedValueOnce(
        createFirebaseError('storage/object-not-found')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().deleteAllSessions();
        });
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should throw on other delete errors', async () => {
      mockListAll.mockResolvedValueOnce({ items: [] });
      mockDeleteObject.mockRejectedValueOnce(
        createFirebaseError('storage/unauthorized')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        let thrownError: any = null;
        await act(async () => {
          try {
            await harness.getLatestState().deleteAllSessions();
          } catch (e) {
            thrownError = e;
          }
        });
        expect(thrownError?.code).toBe('PERMISSION_DENIED');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      resetMocks();
    });

    it('should provide clearError method', () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        expect(typeof harness.getLatestState().clearError).toBe('function');
      } finally {
        harness.unmount();
      }
    });

    it('clearError should clear the error state', async () => {
      mockAuth.currentUser = null;
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().fetchIndex();
        });
        expect(harness.getLatestState().error).not.toBeNull();
        act(() => {
          harness.getLatestState().clearError();
        });
        expect(harness.getLatestState().error).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should set loading=false after successful operation', async () => {
      const existingIndex = createTestIndex();
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/index.json');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingIndex)),
      });
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().fetchIndex();
        });
        expect(harness.getLatestState().loading).toBe(false);
      } finally {
        harness.unmount();
      }
    });

    it('should set loading=false after failed operation', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        createFirebaseError('storage/network-error')
      );
      const harness = createTestHarness();
      harness.mount();
      try {
        await act(async () => {
          await harness.getLatestState().fetchIndex();
        });
        expect(harness.getLatestState().loading).toBe(false);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Function Stability', () => {
    beforeEach(() => {
      resetMocks();
      mockAuth.currentUser = { uid: 'test-user-123' };
    });

    it('should return stable function references (useCallback)', () => {
      const harness = createTestHarness();
      harness.mount();
      try {
        const state1 = harness.getLatestState();
        act(() => {
          state1.clearError();
        });
        const state2 = harness.getLatestState();
        expect(state1.fetchIndex).toBe(state2.fetchIndex);
        expect(state1.saveNewSession).toBe(state2.saveNewSession);
        expect(state1.clearError).toBe(state2.clearError);
      } finally {
        harness.unmount();
      }
    });
  });
});

describe('Module Exports', () => {
  it('should export useStorage function', () => {
    expect(typeof useStorage).toBe('function');
  });
});
