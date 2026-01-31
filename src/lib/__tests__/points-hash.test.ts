/**
 * Tests for Points Hash Module
 *
 * Test requirements from spec:
 * - Same points array -> same hash
 * - Different points -> different hash
 * - Empty array returns valid hash
 * - Order matters (reversed array -> different hash)
 * - Hash is a valid string (base36)
 *
 * Edge Cases:
 * - Empty array: []
 * - Single point
 * - Points with same coordinates but different timestamps
 */

import { generatePointsHash } from '@/lib/points-hash';
import type { TrackedPoint } from '@/app/page';

describe('Points Hash Module', () => {
  // Helper function to create test points
  const createPoint = (
    lat: number,
    lng: number,
    type: 'manual' | 'auto',
    timestamp: number
  ): TrackedPoint => ({
    point: { lat, lng },
    type,
    timestamp,
  });

  describe('generatePointsHash function', () => {
    it('should be a function', () => {
      expect(typeof generatePointsHash).toBe('function');
    });

    it('should return a string', () => {
      const points: TrackedPoint[] = [];
      const result = generatePointsHash(points);
      expect(typeof result).toBe('string');
    });

    it('should export generatePointsHash', () => {
      expect(generatePointsHash).toBeDefined();
    });
  });

  describe('Deterministic Behavior', () => {
    it('should return same hash for same points array', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
        createPoint(32.0854, 34.7819, 'auto', 1706698900000),
      ];

      const hash1 = generatePointsHash(points);
      const hash2 = generatePointsHash(points);

      expect(hash1).toBe(hash2);
    });

    it('should return same hash for identical points created separately', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
        createPoint(32.0854, 34.7819, 'auto', 1706698900000),
      ];

      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
        createPoint(32.0854, 34.7819, 'auto', 1706698900000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).toBe(hash2);
    });

    it('should be deterministic across multiple calls', () => {
      const points: TrackedPoint[] = [
        createPoint(1.0, 2.0, 'manual', 1000000000000),
        createPoint(3.0, 4.0, 'auto', 1000000001000),
        createPoint(5.0, 6.0, 'manual', 1000000002000),
      ];

      const hashes = [];
      for (let i = 0; i < 10; i++) {
        hashes.push(generatePointsHash(points));
      }

      // All hashes should be identical
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });
  });

  describe('Different Points Produce Different Hashes', () => {
    it('should return different hash for different lat values', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0854, 34.7818, 'manual', 1706698800000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for different lng values', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7819, 'manual', 1706698800000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for different point types', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'auto', 1706698800000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for different timestamps', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800001),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for different number of points', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
        createPoint(32.0854, 34.7819, 'auto', 1706698900000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Order Matters', () => {
    it('should return different hash for reversed array', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
        createPoint(32.0854, 34.7819, 'auto', 1706698900000),
      ];
      const reversedPoints: TrackedPoint[] = [...points].reverse();

      const hash1 = generatePointsHash(points);
      const hash2 = generatePointsHash(reversedPoints);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for reordered points', () => {
      const points1: TrackedPoint[] = [
        createPoint(1.0, 1.0, 'manual', 1000000000000),
        createPoint(2.0, 2.0, 'auto', 1000000001000),
        createPoint(3.0, 3.0, 'manual', 1000000002000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(2.0, 2.0, 'auto', 1000000001000),
        createPoint(1.0, 1.0, 'manual', 1000000000000),
        createPoint(3.0, 3.0, 'manual', 1000000002000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Empty Array Handling', () => {
    it('should return valid hash for empty array', () => {
      const points: TrackedPoint[] = [];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should return consistent hash for empty array', () => {
      const hash1 = generatePointsHash([]);
      const hash2 = generatePointsHash([]);

      expect(hash1).toBe(hash2);
    });

    it('should return non-empty string for empty array', () => {
      const hash = generatePointsHash([]);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('Single Point Handling', () => {
    it('should return valid hash for single point', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should return consistent hash for single point', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];

      const hash1 = generatePointsHash(points);
      const hash2 = generatePointsHash(points);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Base36 String Output', () => {
    it('should return a valid base36 string', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const hash = generatePointsHash(points);

      // Base36 contains only characters 0-9 and a-z (and potentially minus sign)
      const base36Regex = /^-?[0-9a-z]+$/;
      expect(hash).toMatch(base36Regex);
    });

    it('should return base36 string for empty array', () => {
      const hash = generatePointsHash([]);
      const base36Regex = /^-?[0-9a-z]+$/;
      expect(hash).toMatch(base36Regex);
    });

    it('should return base36 string for complex points array', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
        createPoint(32.0854, 34.7819, 'auto', 1706698900000),
        createPoint(32.0855, 34.7820, 'manual', 1706699000000),
        createPoint(32.0856, 34.7821, 'auto', 1706699100000),
      ];
      const hash = generatePointsHash(points);

      const base36Regex = /^-?[0-9a-z]+$/;
      expect(hash).toMatch(base36Regex);
    });
  });

  describe('Same Coordinates Different Timestamps', () => {
    it('should return different hash for same coords but different timestamps', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698900000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for multiple points with same coords different timestamps', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1000000000000),
        createPoint(32.0853, 34.7818, 'manual', 1000000001000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1000000002000),
        createPoint(32.0853, 34.7818, 'manual', 1000000003000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Performance', () => {
    it('should handle 1000+ points efficiently', () => {
      const points: TrackedPoint[] = [];
      for (let i = 0; i < 1000; i++) {
        points.push(createPoint(32.0 + i * 0.0001, 34.0 + i * 0.0001, i % 2 === 0 ? 'manual' : 'auto', 1706698800000 + i * 1000));
      }

      const startTime = performance.now();
      const hash = generatePointsHash(points);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 100ms for 1000 points)
      expect(endTime - startTime).toBeLessThan(100);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle 5000 points without issue', () => {
      const points: TrackedPoint[] = [];
      for (let i = 0; i < 5000; i++) {
        points.push(createPoint(32.0 + i * 0.00001, 34.0 + i * 0.00001, i % 2 === 0 ? 'manual' : 'auto', 1706698800000 + i * 100));
      }

      const startTime = performance.now();
      const hash = generatePointsHash(points);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 500ms for 5000 points)
      expect(endTime - startTime).toBeLessThan(500);
      expect(hash).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle points with negative coordinates', () => {
      const points: TrackedPoint[] = [
        createPoint(-32.0853, -34.7818, 'manual', 1706698800000),
      ];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle points with zero coordinates', () => {
      const points: TrackedPoint[] = [
        createPoint(0, 0, 'manual', 1706698800000),
      ];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle points at coordinate extremes', () => {
      const points: TrackedPoint[] = [
        createPoint(90, 180, 'manual', 1706698800000),  // North pole, date line
        createPoint(-90, -180, 'auto', 1706698900000), // South pole, date line
      ];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle points with very small coordinate differences', () => {
      const points1: TrackedPoint[] = [
        createPoint(32.0853000001, 34.7818000001, 'manual', 1706698800000),
      ];
      const points2: TrackedPoint[] = [
        createPoint(32.0853000002, 34.7818000002, 'manual', 1706698800000),
      ];

      const hash1 = generatePointsHash(points1);
      const hash2 = generatePointsHash(points2);

      // These should produce different hashes due to precision in JSON serialization
      expect(hash1).not.toBe(hash2);
    });

    it('should handle timestamp of 0', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 0),
      ];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle very large timestamps', () => {
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', Number.MAX_SAFE_INTEGER),
      ];
      const hash = generatePointsHash(points);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('Hash Uniqueness', () => {
    it('should produce different hashes for many different point configurations', () => {
      const hashes = new Set<string>();

      // Generate 100 different point configurations
      for (let i = 0; i < 100; i++) {
        const points: TrackedPoint[] = [
          createPoint(32.0 + i * 0.01, 34.0 + i * 0.01, i % 2 === 0 ? 'manual' : 'auto', 1706698800000 + i * 1000),
        ];
        hashes.add(generatePointsHash(points));
      }

      // All hashes should be unique (extremely unlikely to have collisions with this input)
      expect(hashes.size).toBe(100);
    });
  });

  describe('Serialization Consistency', () => {
    it('should only consider lat, lng, type, and timestamp in hash', () => {
      // The implementation should serialize only these fields
      const points: TrackedPoint[] = [
        createPoint(32.0853, 34.7818, 'manual', 1706698800000),
      ];

      const hash = generatePointsHash(points);

      // Create same points again (simulating how they'd be stored/loaded)
      const samePoints: TrackedPoint[] = [
        {
          point: { lat: 32.0853, lng: 34.7818 },
          type: 'manual',
          timestamp: 1706698800000,
        },
      ];

      const sameHash = generatePointsHash(samePoints);

      expect(hash).toBe(sameHash);
    });
  });
});
