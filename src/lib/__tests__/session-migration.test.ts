/**
 * Tests for Session Migration Module
 *
 * Test requirements from spec:
 * - Data with no schemaVersion gets migrated to v1
 * - Data with schemaVersion=1 passes through unchanged
 * - Missing fields get default values
 * - Old point format (flat lat/lng) converts to nested format
 * - Index array format converts to object format
 *
 * Edge cases:
 * - Completely empty data object
 * - Null/undefined fields
 * - Extra unexpected fields (should be preserved)
 */

import { migrateSessionData, migrateIndex } from '@/lib/session-migration';
import { CURRENT_SCHEMA_VERSION, INDEX_VERSION } from '@/types/session';
import type { SessionData, UserSessionIndex } from '@/types/session';

describe('Session Migration Module', () => {
  describe('migrateSessionData', () => {
    describe('Version Detection', () => {
      it('should migrate data with no schemaVersion (v0) to v1', () => {
        const v0Data = {
          id: 'test-id',
          name: 'Test Session',
          createdAt: '2026-01-31T10:00:00Z',
          updatedAt: '2026-01-31T10:00:00Z',
          points: [],
          area: 100,
        };

        const result = migrateSessionData(v0Data);

        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.id).toBe('test-id');
        expect(result.name).toBe('Test Session');
      });

      it('should pass through data with schemaVersion=1 with version set', () => {
        const v1Data: SessionData = {
          id: 'v1-session',
          name: 'V1 Session',
          createdAt: '2026-01-31T10:00:00Z',
          updatedAt: '2026-01-31T10:00:00Z',
          schemaVersion: 1,
          points: [
            { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: 1706698800000 },
          ],
          area: 50,
        };

        const result = migrateSessionData(v1Data);

        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.id).toBe('v1-session');
        expect(result.points).toHaveLength(1);
        expect(result.points[0].point.lat).toBe(32.0);
      });

      it('should treat schemaVersion: 0 as v0 and migrate', () => {
        const v0Explicit = {
          id: 'explicit-v0',
          name: 'Explicit V0',
          createdAt: '2026-01-31T10:00:00Z',
          updatedAt: '2026-01-31T10:00:00Z',
          schemaVersion: 0,
          points: [],
          area: 0,
        };

        const result = migrateSessionData(v0Explicit);

        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      });

      it('should treat undefined schemaVersion as v0', () => {
        const data = {
          id: 'undefined-version',
          name: 'Undefined Version',
        };

        const result = migrateSessionData(data);

        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      });
    });

    describe('Default Values for Missing Fields', () => {
      it('should provide default name when missing', () => {
        const data = { id: 'no-name' };

        const result = migrateSessionData(data);

        expect(result.name).toBe('Unnamed Session');
      });

      it('should provide default name when name is empty string', () => {
        const data = { id: 'empty-name', name: '' };

        const result = migrateSessionData(data);

        expect(result.name).toBe('Unnamed Session');
      });

      it('should provide default id when missing (empty string)', () => {
        const data = { name: 'No ID Session' };

        const result = migrateSessionData(data);

        expect(result.id).toBe('');
      });

      it('should provide default createdAt when missing', () => {
        const before = new Date().toISOString();
        const data = { id: 'no-created' };

        const result = migrateSessionData(data);
        const after = new Date().toISOString();

        expect(result.createdAt).toBeDefined();
        expect(result.createdAt >= before).toBe(true);
        expect(result.createdAt <= after).toBe(true);
      });

      it('should provide default updatedAt when missing', () => {
        const before = new Date().toISOString();
        const data = { id: 'no-updated' };

        const result = migrateSessionData(data);
        const after = new Date().toISOString();

        expect(result.updatedAt).toBeDefined();
        expect(result.updatedAt >= before).toBe(true);
        expect(result.updatedAt <= after).toBe(true);
      });

      it('should provide empty points array when missing', () => {
        const data = { id: 'no-points' };

        const result = migrateSessionData(data);

        expect(result.points).toEqual([]);
      });

      it('should provide default area of 0 when missing', () => {
        const data = { id: 'no-area' };

        const result = migrateSessionData(data);

        expect(result.area).toBe(0);
      });

      it('should preserve notes when present', () => {
        const data = { id: 'with-notes', notes: 'Some notes here' };

        const result = migrateSessionData(data);

        expect(result.notes).toBe('Some notes here');
      });

      it('should leave notes undefined when not present', () => {
        const data = { id: 'no-notes' };

        const result = migrateSessionData(data);

        expect(result.notes).toBeUndefined();
      });
    });

    describe('Points Migration (v0 to v1)', () => {
      it('should convert old flat format (lat, lng in root) to nested format', () => {
        const data = {
          id: 'old-points',
          points: [
            { lat: 32.0853, lng: 34.7818, type: 'manual', timestamp: 1706698800000 },
            { lat: 32.0854, lng: 34.7819, type: 'auto', timestamp: 1706698900000 },
          ],
        };

        const result = migrateSessionData(data);

        expect(result.points).toHaveLength(2);
        expect(result.points[0].point.lat).toBe(32.0853);
        expect(result.points[0].point.lng).toBe(34.7818);
        expect(result.points[0].type).toBe('manual');
        expect(result.points[0].timestamp).toBe(1706698800000);

        expect(result.points[1].point.lat).toBe(32.0854);
        expect(result.points[1].point.lng).toBe(34.7819);
        expect(result.points[1].type).toBe('auto');
      });

      it('should pass through new format (nested point) unchanged', () => {
        const data = {
          id: 'new-points',
          points: [
            { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: 1000 },
          ],
        };

        const result = migrateSessionData(data);

        expect(result.points[0].point.lat).toBe(32.0);
        expect(result.points[0].point.lng).toBe(34.0);
        expect(result.points[0].type).toBe('manual');
        expect(result.points[0].timestamp).toBe(1000);
      });

      it('should provide default type "manual" for points without type', () => {
        const data = {
          id: 'no-type-points',
          points: [
            { lat: 32.0, lng: 34.0, timestamp: 1000 },
          ],
        };

        const result = migrateSessionData(data);

        expect(result.points[0].type).toBe('manual');
      });

      it('should provide default timestamp for points without timestamp', () => {
        const before = Date.now();
        const data = {
          id: 'no-timestamp',
          points: [
            { lat: 32.0, lng: 34.0 },
          ],
        };

        const result = migrateSessionData(data);
        const after = Date.now();

        expect(result.points[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(result.points[0].timestamp).toBeLessThanOrEqual(after);
      });

      it('should handle mixed format points (some old, some new)', () => {
        const data = {
          id: 'mixed-points',
          points: [
            { lat: 32.0, lng: 34.0, type: 'manual', timestamp: 1000 },
            { point: { lat: 33.0, lng: 35.0 }, type: 'auto', timestamp: 2000 },
          ],
        };

        const result = migrateSessionData(data);

        expect(result.points).toHaveLength(2);
        expect(result.points[0].point.lat).toBe(32.0);
        expect(result.points[1].point.lat).toBe(33.0);
      });

      it('should handle null entries in points array', () => {
        const data = {
          id: 'null-point',
          points: [null, { lat: 32.0, lng: 34.0 }],
        };

        const result = migrateSessionData(data);

        expect(result.points).toHaveLength(2);
        expect(result.points[0].point.lat).toBe(0);
        expect(result.points[0].point.lng).toBe(0);
        expect(result.points[0].type).toBe('manual');
        expect(result.points[1].point.lat).toBe(32.0);
      });

      it('should handle undefined entries in points array', () => {
        const data = {
          id: 'undefined-point',
          points: [undefined, { lat: 32.0, lng: 34.0 }],
        };

        const result = migrateSessionData(data);

        expect(result.points).toHaveLength(2);
        expect(result.points[0].point.lat).toBe(0);
        expect(result.points[0].point.lng).toBe(0);
      });

      it('should handle points with missing point.lat or point.lng in new format', () => {
        const data = {
          id: 'partial-point',
          points: [
            { point: {}, type: 'manual', timestamp: 1000 },
          ],
        };

        const result = migrateSessionData(data);

        expect(result.points[0].point.lat).toBe(0);
        expect(result.points[0].point.lng).toBe(0);
      });

      it('should handle points with null point object in new format', () => {
        const data = {
          id: 'null-point-object',
          points: [
            { point: null, type: 'manual', timestamp: 1000 },
          ],
        };

        const result = migrateSessionData(data);

        expect(result.points[0].point.lat).toBe(0);
        expect(result.points[0].point.lng).toBe(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle completely empty data object', () => {
        const result = migrateSessionData({});

        expect(result.id).toBe('');
        expect(result.name).toBe('Unnamed Session');
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.points).toEqual([]);
        expect(result.area).toBe(0);
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it('should handle null input gracefully', () => {
        const result = migrateSessionData(null);

        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.name).toBe('Unnamed Session');
        expect(result.points).toEqual([]);
      });

      it('should handle undefined input gracefully', () => {
        const result = migrateSessionData(undefined);

        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.name).toBe('Unnamed Session');
        expect(result.points).toEqual([]);
      });

      it('should handle non-array points value', () => {
        const data = {
          id: 'non-array-points',
          points: 'not an array',
        };

        const result = migrateSessionData(data);

        expect(result.points).toEqual([]);
      });

      it('should handle points as null', () => {
        const data = {
          id: 'null-points',
          points: null,
        };

        const result = migrateSessionData(data);

        expect(result.points).toEqual([]);
      });

      it('should handle numeric values that should be strings', () => {
        const data = {
          id: 123, // numeric id
          name: 456, // numeric name
        };

        // Should not throw
        const result = migrateSessionData(data);
        expect(result).toBeDefined();
      });
    });

    describe('Data Immutability', () => {
      it('should not mutate the input data object', () => {
        const original = {
          id: 'original-id',
          name: 'Original Name',
          points: [{ lat: 32.0, lng: 34.0, type: 'manual', timestamp: 1000 }],
        };
        const originalCopy = JSON.parse(JSON.stringify(original));

        migrateSessionData(original);

        expect(original).toEqual(originalCopy);
      });

      it('should return a new object, not the same reference', () => {
        const original = {
          id: 'test',
          schemaVersion: 1,
          points: [],
        };

        const result = migrateSessionData(original);

        expect(result).not.toBe(original);
      });
    });
  });

  describe('migrateIndex', () => {
    describe('Version Detection', () => {
      it('should convert array format (v0) to object format (v1)', () => {
        const v0Index = [
          { id: 's1', name: 'Session 1', createdAt: '2026-01-31T10:00:00Z', area: 100, pointCount: 5 },
          { id: 's2', name: 'Session 2', createdAt: '2026-01-31T11:00:00Z', area: 200, pointCount: 10 },
        ];

        const result = migrateIndex(v0Index);

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toHaveLength(2);
        expect(result.sessions[0].id).toBe('s1');
        expect(result.sessions[1].id).toBe('s2');
        expect(result.lastModified).toBeDefined();
      });

      it('should pass through v1 format unchanged', () => {
        const v1Index: UserSessionIndex = {
          version: 1,
          sessions: [
            { id: 's1', name: 'Session 1', createdAt: '2026-01-31T10:00:00Z', updatedAt: '2026-01-31T10:00:00Z', area: 100, pointCount: 5 },
          ],
          lastModified: '2026-01-31T12:00:00Z',
        };

        const result = migrateIndex(v1Index);

        expect(result.version).toBe(1);
        expect(result.sessions).toHaveLength(1);
        expect(result.lastModified).toBe('2026-01-31T12:00:00Z');
      });

      it('should treat object without version as v0', () => {
        const noVersionIndex = {
          sessions: [
            { id: 's1', name: 'Session', createdAt: '2026-01-31T10:00:00Z', area: 50, pointCount: 3 },
          ],
        };

        const result = migrateIndex(noVersionIndex);

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toHaveLength(1);
      });

      it('should treat version: 0 as v0 and migrate', () => {
        const v0ExplicitIndex = {
          version: 0,
          sessions: [
            { id: 's1', name: 'Session', createdAt: '2026-01-31T10:00:00Z' },
          ],
        };

        const result = migrateIndex(v0ExplicitIndex);

        expect(result.version).toBe(INDEX_VERSION);
      });
    });

    describe('Session Meta Migration', () => {
      it('should provide default name when missing', () => {
        const data = {
          sessions: [{ id: 'no-name' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions[0].name).toBe('Unnamed');
      });

      it('should provide default id when missing (empty string)', () => {
        const data = {
          sessions: [{ name: 'No ID' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions[0].id).toBe('');
      });

      it('should provide default createdAt when missing', () => {
        const before = new Date().toISOString();
        const data = {
          sessions: [{ id: 's1' }],
        };

        const result = migrateIndex(data);
        const after = new Date().toISOString();

        expect(result.sessions[0].createdAt).toBeDefined();
        expect(result.sessions[0].createdAt >= before).toBe(true);
        expect(result.sessions[0].createdAt <= after).toBe(true);
      });

      it('should provide updatedAt from createdAt when updatedAt is missing', () => {
        const data = {
          sessions: [{ id: 's1', createdAt: '2026-01-31T10:00:00Z' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions[0].updatedAt).toBe('2026-01-31T10:00:00Z');
      });

      it('should provide default updatedAt when both updatedAt and createdAt are missing', () => {
        const before = new Date().toISOString();
        const data = {
          sessions: [{ id: 's1' }],
        };

        const result = migrateIndex(data);
        const after = new Date().toISOString();

        expect(result.sessions[0].updatedAt >= before).toBe(true);
        expect(result.sessions[0].updatedAt <= after).toBe(true);
      });

      it('should provide default area of 0 when missing', () => {
        const data = {
          sessions: [{ id: 's1' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions[0].area).toBe(0);
      });

      it('should provide default pointCount of 0 when missing', () => {
        const data = {
          sessions: [{ id: 's1' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions[0].pointCount).toBe(0);
      });

      it('should handle null entries in sessions array', () => {
        const data = {
          sessions: [null, { id: 's2', name: 'Session 2' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions).toHaveLength(2);
        expect(result.sessions[0].id).toBe('');
        expect(result.sessions[0].name).toBe('Unnamed');
        expect(result.sessions[1].id).toBe('s2');
      });

      it('should handle undefined entries in sessions array', () => {
        const data = {
          sessions: [undefined, { id: 's2' }],
        };

        const result = migrateIndex(data);

        expect(result.sessions).toHaveLength(2);
        expect(result.sessions[0].id).toBe('');
        expect(result.sessions[1].id).toBe('s2');
      });
    });

    describe('Edge Cases', () => {
      it('should handle null input gracefully', () => {
        const result = migrateIndex(null);

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toEqual([]);
        expect(result.lastModified).toBeDefined();
      });

      it('should handle undefined input gracefully', () => {
        const result = migrateIndex(undefined);

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toEqual([]);
        expect(result.lastModified).toBeDefined();
      });

      it('should handle empty array input', () => {
        const result = migrateIndex([]);

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toEqual([]);
      });

      it('should handle empty object input', () => {
        const result = migrateIndex({});

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toEqual([]);
      });

      it('should handle object with empty sessions array', () => {
        const data = {
          sessions: [],
        };

        const result = migrateIndex(data);

        expect(result.version).toBe(INDEX_VERSION);
        expect(result.sessions).toEqual([]);
      });

      it('should handle non-array sessions value', () => {
        const data = {
          sessions: 'not an array',
        };

        const result = migrateIndex(data);

        expect(result.sessions).toEqual([]);
      });

      it('should handle sessions as null', () => {
        const data = {
          sessions: null,
        };

        const result = migrateIndex(data);

        expect(result.sessions).toEqual([]);
      });
    });

    describe('lastModified Field', () => {
      it('should set lastModified when migrating from v0', () => {
        const before = new Date().toISOString();
        const v0Index = [{ id: 's1', name: 'Session' }];

        const result = migrateIndex(v0Index);
        const after = new Date().toISOString();

        expect(result.lastModified >= before).toBe(true);
        expect(result.lastModified <= after).toBe(true);
      });

      it('should preserve lastModified in v1 data', () => {
        const v1Index: UserSessionIndex = {
          version: 1,
          sessions: [],
          lastModified: '2025-12-25T12:00:00Z',
        };

        const result = migrateIndex(v1Index);

        expect(result.lastModified).toBe('2025-12-25T12:00:00Z');
      });
    });
  });

  describe('Integration', () => {
    it('should handle a full v0 dataset migration', () => {
      // Simulating old localStorage data structure
      const oldData = {
        id: 'legacy-session',
        name: 'My Old Session',
        createdAt: '2025-06-15T10:30:00Z',
        updatedAt: '2025-06-15T11:00:00Z',
        points: [
          { lat: 32.0853, lng: 34.7818, type: 'manual', timestamp: 1718443800000 },
          { lat: 32.0854, lng: 34.7819, type: 'auto', timestamp: 1718443900000 },
          { lat: 32.0855, lng: 34.7820, type: 'manual', timestamp: 1718444000000 },
        ],
        area: 1234.56,
      };

      const result = migrateSessionData(oldData);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.id).toBe('legacy-session');
      expect(result.name).toBe('My Old Session');
      expect(result.createdAt).toBe('2025-06-15T10:30:00Z');
      expect(result.updatedAt).toBe('2025-06-15T11:00:00Z');
      expect(result.area).toBe(1234.56);
      expect(result.points).toHaveLength(3);
      expect(result.points[0].point.lat).toBe(32.0853);
      expect(result.points[0].point.lng).toBe(34.7818);
      expect(result.points[0].type).toBe('manual');
      expect(result.points[0].timestamp).toBe(1718443800000);
    });

    it('should handle a full v0 index migration', () => {
      const oldIndex = [
        { id: 's1', name: 'Session 1', createdAt: '2025-06-15T10:00:00Z', area: 100, pointCount: 5 },
        { id: 's2', name: 'Session 2', createdAt: '2025-06-16T11:00:00Z', area: 200, pointCount: 10 },
      ];

      const result = migrateIndex(oldIndex);

      expect(result.version).toBe(INDEX_VERSION);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].id).toBe('s1');
      expect(result.sessions[0].name).toBe('Session 1');
      expect(result.sessions[0].createdAt).toBe('2025-06-15T10:00:00Z');
      expect(result.sessions[0].updatedAt).toBe('2025-06-15T10:00:00Z');
      expect(result.sessions[0].area).toBe(100);
      expect(result.sessions[0].pointCount).toBe(5);
      expect(result.sessions[1].id).toBe('s2');
    });

    it('should be idempotent - migrating already migrated data should be safe', () => {
      const v0Data = {
        id: 'test',
        points: [{ lat: 32.0, lng: 34.0 }],
      };

      const firstMigration = migrateSessionData(v0Data);
      const secondMigration = migrateSessionData(firstMigration);

      expect(secondMigration.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(secondMigration.points).toHaveLength(1);
      expect(secondMigration.points[0].point.lat).toBe(32.0);
    });

    it('should handle complex nested null values', () => {
      const messyData = {
        id: null,
        name: null,
        createdAt: null,
        updatedAt: null,
        points: [null, { lat: null, lng: null }, { point: null }],
        area: null,
      };

      const result = migrateSessionData(messyData);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.id).toBe('');
      expect(result.name).toBe('Unnamed Session');
      expect(result.points).toHaveLength(3);
      expect(result.area).toBe(0);
    });
  });

  describe('Module Exports', () => {
    it('should export migrateSessionData function', () => {
      expect(typeof migrateSessionData).toBe('function');
    });

    it('should export migrateIndex function', () => {
      expect(typeof migrateIndex).toBe('function');
    });

    it('should have correct function signatures', () => {
      // Both functions should accept unknown and return typed objects
      expect(() => migrateSessionData({})).not.toThrow();
      expect(() => migrateIndex({})).not.toThrow();
    });
  });
});
