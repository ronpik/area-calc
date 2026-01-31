// src/lib/session-migration.ts

import type { SessionData, SessionMeta, UserSessionIndex } from '@/types/session';
import type { TrackedPoint } from '@/app/page';
import { CURRENT_SCHEMA_VERSION, INDEX_VERSION } from '@/types/session';

/**
 * Migrate session data to current schema version
 * Called when loading a session from storage
 */
export function migrateSessionData(data: unknown): SessionData {
  // Handle missing version (pre-versioning data)
  const version = (data as any)?.schemaVersion ?? 0;

  let migrated = data as SessionData;

  // Apply migrations sequentially
  if (version < 1) {
    migrated = migrateSessionV0ToV1(migrated);
  }

  // Future migrations:
  // if (version < 2) {
  //   migrated = migrateSessionV1ToV2(migrated);
  // }

  // Ensure current version is set and always return a new object to avoid mutation
  return {
    ...migrated,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
}

/**
 * Migrate from v0 (no version) to v1
 */
function migrateSessionV0ToV1(data: any): SessionData {
  return {
    id: data?.id ?? '',
    name: data?.name || 'Unnamed Session',
    createdAt: data?.createdAt || new Date().toISOString(),
    updatedAt: data?.updatedAt || new Date().toISOString(),
    schemaVersion: 1,
    points: migratePointsV0ToV1(data?.points || []),
    area: data?.area || 0,
    notes: data?.notes
  };
}

/**
 * Migrate points array if structure changed
 */
function migratePointsV0ToV1(points: any[]): TrackedPoint[] {
  if (!Array.isArray(points)) {
    return [];
  }

  return points.map(p => {
    if (!p) {
      return {
        point: { lat: 0, lng: 0 },
        type: 'manual' as const,
        timestamp: Date.now()
      };
    }

    // Handle old format: { lat, lng, type, timestamp }
    if ('lat' in p && 'lng' in p) {
      return {
        point: { lat: p.lat, lng: p.lng },
        type: p.type || 'manual',
        timestamp: p.timestamp || Date.now()
      };
    }
    // Already in new format or partially new format
    // Handle case where point object exists but lat/lng are missing
    return {
      point: {
        lat: p.point?.lat ?? 0,
        lng: p.point?.lng ?? 0
      },
      type: p.type || 'manual',
      timestamp: p.timestamp || Date.now()
    } as TrackedPoint;
  });
}

/**
 * Migrate index to current version
 */
export function migrateIndex(data: unknown): UserSessionIndex {
  if (!data) {
    return {
      version: INDEX_VERSION,
      lastModified: new Date().toISOString(),
      sessions: []
    };
  }

  const version = (data as any).version ?? 0;

  if (version < 1) {
    // v0 had sessions directly as array
    // Handle non-array sessions value defensively
    const sessions = Array.isArray(data)
      ? data as SessionMeta[]
      : (Array.isArray((data as any).sessions) ? (data as any).sessions : []);

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
  if (!meta) {
    return {
      id: '',
      name: 'Unnamed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      area: 0,
      pointCount: 0
    };
  }

  return {
    id: meta.id ?? '',
    name: meta.name || 'Unnamed',
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || meta.createdAt || new Date().toISOString(),
    area: meta.area || 0,
    pointCount: meta.pointCount || 0
  };
}
