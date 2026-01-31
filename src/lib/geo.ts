export type Point = {
  lat: number;
  lng: number;
};

export interface BoundsMetrics {
  widthMeters: number;
  heightMeters: number;
  aspectRatio: number;  // width / height
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface LatLngBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const METERS_PER_DEGREE_LAT = 111320;
const MIN_BOUND_SIZE_METERS = 10;  // Minimum dimension to prevent division by zero

/**
 * Calculates the area of a polygon defined by a series of coordinates.
 * Uses the Shoelace formula on a projected plane, which is a good
 * approximation for small areas.
 * @param {Point[]} points - An array of {lat, lng} objects.
 * @returns {number} The area of the polygon in square meters.
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  const referencePoint = points[0];
  const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos(referencePoint.lat * (Math.PI / 180));

  const projectedPoints = points.map(point => ({
    x: (point.lng - referencePoint.lng) * metersPerDegreeLon,
    y: (point.lat - referencePoint.lat) * METERS_PER_DEGREE_LAT,
  }));

  let area = 0;
  for (let i = 0; i < projectedPoints.length; i++) {
    const p1 = projectedPoints[i];
    const p2 = projectedPoints[(i + 1) % projectedPoints.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculates the bounding box dimensions of a set of points in meters.
 * Returns metrics including width, height, and aspect ratio.
 * @param {Point[]} points - An array of {lat, lng} objects.
 * @returns {BoundsMetrics | null} The bounds metrics, or null if fewer than 3 points.
 */
export function calculateBoundsInMeters(points: Point[]): BoundsMetrics | null {
  if (points.length < 3) {
    return null;
  }

  // Find min/max lat/lng
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  // Calculate center latitude for accurate longitude projection
  const centerLat = (minLat + maxLat) / 2;
  const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos(centerLat * (Math.PI / 180));

  // Calculate dimensions in meters
  let widthMeters = (maxLng - minLng) * metersPerDegreeLon;
  let heightMeters = (maxLat - minLat) * METERS_PER_DEGREE_LAT;

  // Enforce minimum dimensions to prevent division by zero
  widthMeters = Math.max(widthMeters, MIN_BOUND_SIZE_METERS);
  heightMeters = Math.max(heightMeters, MIN_BOUND_SIZE_METERS);

  return {
    widthMeters,
    heightMeters,
    aspectRatio: widthMeters / heightMeters,
    minLat,
    maxLat,
    minLng,
    maxLng,
  };
}

/**
 * Expands lat/lng bounds by a given percentage on each side.
 * @param {BoundsMetrics} metrics - The original bounds metrics.
 * @param {number} percentage - The percentage to expand (e.g., 0.15 for 15%).
 * @returns {LatLngBounds} The expanded bounds.
 */
export function expandBoundsByPercentage(metrics: BoundsMetrics, percentage: number): LatLngBounds {
  const latRange = metrics.maxLat - metrics.minLat;
  const lngRange = metrics.maxLng - metrics.minLng;

  const latExpansion = latRange * percentage;
  const lngExpansion = lngRange * percentage;

  return {
    minLat: metrics.minLat - latExpansion,
    maxLat: metrics.maxLat + latExpansion,
    minLng: metrics.minLng - lngExpansion,
    maxLng: metrics.maxLng + lngExpansion,
  };
}
