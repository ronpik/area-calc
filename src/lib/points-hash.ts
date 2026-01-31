// src/lib/points-hash.ts

import type { TrackedPoint } from '@/app/page';

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
