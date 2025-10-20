export type Point = {
  lat: number;
  lng: number;
};

const METERS_PER_DEGREE_LAT = 111320;

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
