/**
 * Tests for Session TypeScript Types
 *
 * Test requirements from spec:
 * - Types compile without errors
 * - Constants export correctly
 * - Types can be imported and used in other files
 */

import type {
  SessionMeta,
  SessionData,
  UserSessionIndex,
  CurrentSessionState,
} from '@/types/session';

import {
  CURRENT_SCHEMA_VERSION,
  INDEX_VERSION,
  SESSION_NAME_MAX_LENGTH,
} from '@/types/session';

describe('Session TypeScript Types', () => {
  describe('SessionMeta interface', () => {
    it('should allow creating an object with all required fields', () => {
      const meta: SessionMeta = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T11:00:00Z',
        area: 1234.56,
        pointCount: 10,
      };

      expect(meta.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(meta.name).toBe('Test Session');
      expect(meta.createdAt).toBe('2026-01-31T10:00:00Z');
      expect(meta.updatedAt).toBe('2026-01-31T11:00:00Z');
      expect(meta.area).toBe(1234.56);
      expect(meta.pointCount).toBe(10);
    });

    it('should allow zero values for area and pointCount', () => {
      const meta: SessionMeta = {
        id: 'test-id',
        name: 'Empty Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        area: 0,
        pointCount: 0,
      };

      expect(meta.area).toBe(0);
      expect(meta.pointCount).toBe(0);
    });

    it('should have the expected structure with six properties', () => {
      const meta: SessionMeta = {
        id: 'id',
        name: 'name',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        area: 0,
        pointCount: 0,
      };

      const keys = Object.keys(meta);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('createdAt');
      expect(keys).toContain('updatedAt');
      expect(keys).toContain('area');
      expect(keys).toContain('pointCount');
      expect(keys).toHaveLength(6);
    });
  });

  describe('SessionData interface', () => {
    it('should allow creating an object with all required fields', () => {
      const session: SessionData = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Full Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T12:00:00Z',
        schemaVersion: 1,
        points: [
          { point: { lat: 32.0853, lng: 34.7818 }, type: 'manual', timestamp: 1706698800000 },
          { point: { lat: 32.0854, lng: 34.7819 }, type: 'auto', timestamp: 1706698900000 },
        ],
        area: 567.89,
      };

      expect(session.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(session.name).toBe('Full Session');
      expect(session.createdAt).toBe('2026-01-31T10:00:00Z');
      expect(session.updatedAt).toBe('2026-01-31T12:00:00Z');
      expect(session.schemaVersion).toBe(1);
      expect(session.points).toHaveLength(2);
      expect(session.area).toBe(567.89);
    });

    it('should allow creating a session with empty points array', () => {
      const session: SessionData = {
        id: 'empty-session-id',
        name: 'No Points Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        schemaVersion: 1,
        points: [],
        area: 0,
      };

      expect(session.points).toHaveLength(0);
      expect(session.area).toBe(0);
    });

    it('should allow optional notes field', () => {
      const sessionWithNotes: SessionData = {
        id: 'notes-session',
        name: 'Session With Notes',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        schemaVersion: 1,
        points: [],
        area: 0,
        notes: 'This is a test note',
      };

      expect(sessionWithNotes.notes).toBe('This is a test note');
    });

    it('should allow notes to be undefined', () => {
      const sessionNoNotes: SessionData = {
        id: 'no-notes-session',
        name: 'Session Without Notes',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        schemaVersion: 1,
        points: [],
        area: 0,
      };

      expect(sessionNoNotes.notes).toBeUndefined();
    });

    it('should have correct point structure matching TrackedPoint', () => {
      const session: SessionData = {
        id: 'point-test',
        name: 'Point Structure Test',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        schemaVersion: 1,
        points: [
          { point: { lat: 32.0853, lng: 34.7818 }, type: 'manual', timestamp: 1706698800000 },
        ],
        area: 100,
      };

      const trackedPoint = session.points[0];
      expect(trackedPoint.point.lat).toBe(32.0853);
      expect(trackedPoint.point.lng).toBe(34.7818);
      expect(trackedPoint.timestamp).toBe(1706698800000);
      expect(trackedPoint.type).toBe('manual');
    });

    it('should allow both manual and auto point types', () => {
      const session: SessionData = {
        id: 'mixed-points',
        name: 'Mixed Points Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        schemaVersion: 1,
        points: [
          { point: { lat: 1, lng: 1 }, type: 'manual', timestamp: 1000000000000 },
          { point: { lat: 2, lng: 2 }, type: 'auto', timestamp: 1000000001000 },
        ],
        area: 50,
      };

      expect(session.points[0].type).toBe('manual');
      expect(session.points[1].type).toBe('auto');
    });

    it('should have the expected structure with seven or eight properties', () => {
      const session: SessionData = {
        id: 'id',
        name: 'name',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        schemaVersion: 1,
        points: [],
        area: 0,
      };

      const keys = Object.keys(session);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('createdAt');
      expect(keys).toContain('updatedAt');
      expect(keys).toContain('schemaVersion');
      expect(keys).toContain('points');
      expect(keys).toContain('area');
      // notes is optional so may have 7 or 8 properties
      expect(keys.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('UserSessionIndex interface', () => {
    it('should allow creating an index with sessions', () => {
      const index: UserSessionIndex = {
        version: 1,
        sessions: [
          {
            id: 'session-1',
            name: 'First Session',
            createdAt: '2026-01-30T10:00:00Z',
            updatedAt: '2026-01-30T10:00:00Z',
            area: 100,
            pointCount: 5,
          },
          {
            id: 'session-2',
            name: 'Second Session',
            createdAt: '2026-01-31T10:00:00Z',
            updatedAt: '2026-01-31T10:00:00Z',
            area: 200,
            pointCount: 8,
          },
        ],
        lastModified: '2026-01-31T10:00:00Z',
      };

      expect(index.version).toBe(1);
      expect(index.sessions).toHaveLength(2);
      expect(index.lastModified).toBe('2026-01-31T10:00:00Z');
    });

    it('should allow creating an empty index', () => {
      const emptyIndex: UserSessionIndex = {
        version: 1,
        sessions: [],
        lastModified: '2026-01-31T10:00:00Z',
      };

      expect(emptyIndex.version).toBe(1);
      expect(emptyIndex.sessions).toHaveLength(0);
    });

    it('should have the expected structure with three properties', () => {
      const index: UserSessionIndex = {
        version: 1,
        sessions: [],
        lastModified: '2026-01-01T00:00:00Z',
      };

      const keys = Object.keys(index);
      expect(keys).toContain('version');
      expect(keys).toContain('sessions');
      expect(keys).toContain('lastModified');
      expect(keys).toHaveLength(3);
    });

    it('should nest SessionMeta correctly within sessions array', () => {
      const sessionMeta: SessionMeta = {
        id: 'nested-id',
        name: 'Nested Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        area: 500,
        pointCount: 10,
      };

      const index: UserSessionIndex = {
        version: 1,
        sessions: [sessionMeta],
        lastModified: '2026-01-31T10:00:00Z',
      };

      expect(index.sessions[0]).toBe(sessionMeta);
      expect(index.sessions[0].id).toBe('nested-id');
    });
  });

  describe('CurrentSessionState interface', () => {
    it('should allow creating an active session state', () => {
      const state: CurrentSessionState = {
        id: 'current-session-id',
        name: 'Active Session',
        lastSavedAt: '2026-01-31T15:00:00Z',
        pointsHashAtSave: 'abc123def456',
      };

      expect(state.id).toBe('current-session-id');
      expect(state.name).toBe('Active Session');
      expect(state.lastSavedAt).toBe('2026-01-31T15:00:00Z');
      expect(state.pointsHashAtSave).toBe('abc123def456');
    });

    it('should have the expected structure with four properties', () => {
      const state: CurrentSessionState = {
        id: 'id',
        name: 'name',
        lastSavedAt: '2026-01-01T00:00:00Z',
        pointsHashAtSave: 'hash',
      };

      const keys = Object.keys(state);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('lastSavedAt');
      expect(keys).toContain('pointsHashAtSave');
      expect(keys).toHaveLength(4);
    });

    it('should allow different hash values for change detection', () => {
      const state1: CurrentSessionState = {
        id: 'session-1',
        name: 'Session',
        lastSavedAt: '2026-01-31T10:00:00Z',
        pointsHashAtSave: 'original-hash',
      };

      const state2: CurrentSessionState = {
        id: 'session-1',
        name: 'Session',
        lastSavedAt: '2026-01-31T11:00:00Z',
        pointsHashAtSave: 'modified-hash',
      };

      expect(state1.pointsHashAtSave).not.toBe(state2.pointsHashAtSave);
    });
  });

  describe('Constants', () => {
    it('should export CURRENT_SCHEMA_VERSION as 1', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(1);
    });

    it('should export INDEX_VERSION as 1', () => {
      expect(INDEX_VERSION).toBe(1);
    });

    it('should export SESSION_NAME_MAX_LENGTH as 100', () => {
      expect(SESSION_NAME_MAX_LENGTH).toBe(100);
    });

    it('should have correct types for all constants', () => {
      expect(typeof CURRENT_SCHEMA_VERSION).toBe('number');
      expect(typeof INDEX_VERSION).toBe('number');
      expect(typeof SESSION_NAME_MAX_LENGTH).toBe('number');
    });
  });

  describe('Type Import and Export', () => {
    it('should successfully import SessionMeta type', () => {
      const createMeta = (): SessionMeta => ({
        id: 'test',
        name: 'test',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        area: 0,
        pointCount: 0,
      });

      const meta = createMeta();
      expect(meta).toBeDefined();
    });

    it('should successfully import SessionData type', () => {
      const createData = (): SessionData => ({
        id: 'test',
        name: 'test',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        schemaVersion: 1,
        points: [],
        area: 0,
      });

      const data = createData();
      expect(data).toBeDefined();
    });

    it('should successfully import UserSessionIndex type', () => {
      const createIndex = (): UserSessionIndex => ({
        version: 1,
        sessions: [],
        lastModified: '2026-01-01T00:00:00Z',
      });

      const index = createIndex();
      expect(index).toBeDefined();
    });

    it('should successfully import CurrentSessionState type', () => {
      const createState = (): CurrentSessionState => ({
        id: 'test',
        name: 'test',
        lastSavedAt: '2026-01-01T00:00:00Z',
        pointsHashAtSave: 'hash',
      });

      const state = createState();
      expect(state).toBeDefined();
    });

    it('should allow using SessionMeta within UserSessionIndex', () => {
      const meta: SessionMeta = {
        id: 'nested-test',
        name: 'Nested Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        area: 100,
        pointCount: 5,
      };

      const index: UserSessionIndex = {
        version: 1,
        sessions: [meta],
        lastModified: '2026-01-31T10:00:00Z',
      };

      expect(index.sessions[0]).toBe(meta);
    });
  });

  describe('JSON Serialization Compatibility', () => {
    it('should serialize SessionMeta to valid JSON', () => {
      const meta: SessionMeta = {
        id: 'json-test',
        name: 'JSON Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        area: 123.45,
        pointCount: 5,
      };

      const json = JSON.stringify(meta);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(meta.id);
      expect(parsed.name).toBe(meta.name);
      expect(parsed.createdAt).toBe(meta.createdAt);
      expect(parsed.updatedAt).toBe(meta.updatedAt);
      expect(parsed.area).toBe(meta.area);
      expect(parsed.pointCount).toBe(meta.pointCount);
    });

    it('should serialize SessionData to valid JSON', () => {
      const session: SessionData = {
        id: 'json-session',
        name: 'JSON Full Session',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
        schemaVersion: 1,
        points: [
          { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: 1706698800000 },
        ],
        area: 100,
        notes: 'Test note',
      };

      const json = JSON.stringify(session);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(session.id);
      expect(parsed.schemaVersion).toBe(session.schemaVersion);
      expect(parsed.points).toHaveLength(1);
      expect(parsed.points[0].point.lat).toBe(32.0);
      expect(parsed.notes).toBe('Test note');
    });

    it('should serialize UserSessionIndex to valid JSON', () => {
      const index: UserSessionIndex = {
        version: 1,
        sessions: [
          {
            id: 's1',
            name: 'Session 1',
            createdAt: '2026-01-31T10:00:00Z',
            updatedAt: '2026-01-31T10:00:00Z',
            area: 50,
            pointCount: 3,
          },
        ],
        lastModified: '2026-01-31T10:00:00Z',
      };

      const json = JSON.stringify(index);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(1);
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0].id).toBe('s1');
    });

    it('should serialize CurrentSessionState to valid JSON', () => {
      const state: CurrentSessionState = {
        id: 'state-id',
        name: 'State Name',
        lastSavedAt: '2026-01-31T10:00:00Z',
        pointsHashAtSave: 'abc123',
      };

      const json = JSON.stringify(state);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(state.id);
      expect(parsed.name).toBe(state.name);
      expect(parsed.lastSavedAt).toBe(state.lastSavedAt);
      expect(parsed.pointsHashAtSave).toBe(state.pointsHashAtSave);
    });

    it('should handle ISO 8601 date strings correctly through serialization', () => {
      const timestamp = '2026-01-31T15:30:45.123Z';
      const meta: SessionMeta = {
        id: 'date-test',
        name: 'Date Test',
        createdAt: timestamp,
        updatedAt: timestamp,
        area: 0,
        pointCount: 0,
      };

      const json = JSON.stringify(meta);
      const parsed = JSON.parse(json);

      expect(parsed.createdAt).toBe(timestamp);
      expect(parsed.updatedAt).toBe(timestamp);
      // Verify it can be parsed as a valid date
      expect(new Date(parsed.createdAt).toISOString()).toBe(timestamp);
    });
  });
});
