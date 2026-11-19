import { Point2D, ViewportTransform, Wall } from '@/types/floorplan';

/**
 * Euclidean distance between two points (in meters)
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Angle in radians from p1 to p2 (-PI to PI)
 */
export function angleBetween(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Snap point to nearest angle increment (e.g. 45 degrees or 90 degrees) relative to an origin
 */
export function snapToAngle(
  origin: Point2D,
  target: Point2D,
  stepDegrees: number = 45
): Point2D {
  const d = distance(origin, target);
  if (d < 0.0001) return target;

  const currentAngle = angleBetween(origin, target);
  const stepRad = (stepDegrees * Math.PI) / 180;
  const snappedAngle = Math.round(currentAngle / stepRad) * stepRad;

  return {
    x: origin.x + Math.cos(snappedAngle) * d,
    y: origin.y + Math.sin(snappedAngle) * d,
  };
}

/**
 * Convert screen coordinates (px) to world coordinates (meters)
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportTransform,
  pixelsPerMeter: number
): Point2D {
  return {
    x: (screenX - viewport.x) / (viewport.zoom * pixelsPerMeter),
    y: (screenY - viewport.y) / (viewport.zoom * pixelsPerMeter),
  };
}

/**
 * Convert world coordinates (meters) to screen coordinates (px)
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportTransform,
  pixelsPerMeter: number
): { x: number; y: number } {
  return {
    x: worldX * viewport.zoom * pixelsPerMeter + viewport.x,
    y: worldY * viewport.zoom * pixelsPerMeter + viewport.y,
  };
}

/**
 * Project point P onto segment AB.
 * Returns the projected point, the ratio (0 to 1), and perpendicular distance.
 */
export function projectPointOntoSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; ratio: number; distance: number } {
  const abLength = distance(a, b);
  if (abLength < 0.0001) {
    return { point: a, ratio: 0, distance: distance(p, a) };
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // Dot product
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (abLength * abLength);
  t = Math.max(0, Math.min(1, t));

  const projected: Point2D = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };

  return {
    point: projected,
    ratio: t,
    distance: distance(p, projected),
  };
}

/**
 * Find the closest wall endpoint within a snap threshold (in meters)
 */
export function findNearbyEndpoint(
  p: Point2D,
  walls: Wall[],
  snapRadiusMeters: number,
  excludeWallId?: string
): { point: Point2D; wallId: string; isStart: boolean } | null {
  let closest: { point: Point2D; wallId: string; isStart: boolean } | null = null;
  let minDistance = snapRadiusMeters;

  for (const wall of walls) {
    if (excludeWallId && wall.id === excludeWallId) continue;

    const dStart = distance(p, wall.start);
    if (dStart < minDistance) {
      minDistance = dStart;
      closest = { point: wall.start, wallId: wall.id, isStart: true };
    }

    const dEnd = distance(p, wall.end);
    if (dEnd < minDistance) {
      minDistance = dEnd;
      closest = { point: wall.end, wallId: wall.id, isStart: false };
    }
  }

  return closest;
}

/**
 * Format meters nicely (e.g., 4.50 m or 0.85 m)
 */
export function formatMeters(meters: number): string {
  if (meters >= 1) {
    return `${meters.toFixed(2)} m`;
  }
  return `${(meters * 100).toFixed(0)} cm`;
}

/**
 * Calculate the 4 oriented corners of a wall box with thickness
 */
export function getWallPolygon(wall: Wall): [Point2D, Point2D, Point2D, Point2D] {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.0001) {
    return [wall.start, wall.start, wall.start, wall.start];
  }

  // Normal vector perpendicular to wall
  const halfT = wall.thickness / 2;
  const nx = (-dy / len) * halfT;
  const ny = (dx / len) * halfT;

  return [
    { x: wall.start.x + nx, y: wall.start.y + ny },
    { x: wall.end.x + nx, y: wall.end.y + ny },
    { x: wall.end.x - nx, y: wall.end.y - ny },
    { x: wall.start.x - nx, y: wall.start.y - ny },
  ];
}
