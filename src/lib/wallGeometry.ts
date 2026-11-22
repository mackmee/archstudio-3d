import { Wall, Opening, Point2D, Room } from '@/types/floorplan';
import { distance, projectPointOntoSegment } from '@/lib/geometry';

export interface SplitResult {
  walls: Wall[];
  openings: Opening[];
  splitCount: number;
  snappedCount: number;
}

/**
 * Line-line intersection helper
 */
function getLineIntersection(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): { point: Point2D; t: number; u: number } | null {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(d) < 1e-7) return null;

  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d;
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d;

  return {
    point: {
      x: Number((a1.x + t * (a2.x - a1.x)).toFixed(3)),
      y: Number((a1.y + t * (a2.y - a1.y)).toFixed(3)),
    },
    t,
    u,
  };
}

/**
 * Automatically splits long walls touched by partition walls at T-junctions
 * and X-junctions, remapping doors and windows to the correct sub-segments.
 */
export function splitWallsAtIntersections(
  initialWalls: Wall[],
  initialOpenings: Opening[],
  tolerance = 0.15
): SplitResult {
  const walls: Wall[] = initialWalls.map((w) => ({
    ...w,
    start: { ...w.start },
    end: { ...w.end },
  }));
  let openings: Opening[] = initialOpenings.map((o) => ({ ...o }));

  let splitCount = 0;
  let snappedCount = 0;
  const maxIterations = 80;
  let iteration = 0;

  // 1. Iterative T-Junction detection and splitting
  let changed = true;
  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    for (let i = 0; i < walls.length; i++) {
      const targetWall = walls[i];
      const targetLen = distance(targetWall.start, targetWall.end);
      if (targetLen < 0.25) continue;

      let bestSplit: {
        splitPoint: Point2D;
        ratio: number;
        snappingWallIndex: number;
        snappingIsStart: boolean;
      } | null = null;
      let minDistance = tolerance;

      for (let j = 0; j < walls.length; j++) {
        if (i === j) continue;
        const otherWall = walls[j];

        // Test otherWall.start
        const startProj = projectPointOntoSegment(otherWall.start, targetWall.start, targetWall.end);
        // Only interior split if ratio is well inside the segment (not near existing endpoints)
        const minEdgeMargin = Math.min(0.15 / targetLen, 0.08);
        if (
          startProj.ratio > minEdgeMargin &&
          startProj.ratio < 1 - minEdgeMargin &&
          startProj.distance < minDistance
        ) {
          minDistance = startProj.distance;
          bestSplit = {
            splitPoint: {
              x: Number(startProj.point.x.toFixed(3)),
              y: Number(startProj.point.y.toFixed(3)),
            },
            ratio: startProj.ratio,
            snappingWallIndex: j,
            snappingIsStart: true,
          };
        }

        // Test otherWall.end
        const endProj = projectPointOntoSegment(otherWall.end, targetWall.start, targetWall.end);
        if (
          endProj.ratio > minEdgeMargin &&
          endProj.ratio < 1 - minEdgeMargin &&
          endProj.distance < minDistance
        ) {
          minDistance = endProj.distance;
          bestSplit = {
            splitPoint: {
              x: Number(endProj.point.x.toFixed(3)),
              y: Number(endProj.point.y.toFixed(3)),
            },
            ratio: endProj.ratio,
            snappingWallIndex: j,
            snappingIsStart: false,
          };
        }
      }

      if (bestSplit) {
        const { splitPoint, ratio, snappingWallIndex, snappingIsStart } = bestSplit;
        const wallToSplit = walls[i];
        const newWallId1 = `${wallToSplit.id}_a${iteration}`;
        const newWallId2 = `${wallToSplit.id}_b${iteration}`;

        const subWall1: Wall = {
          ...wallToSplit,
          id: newWallId1,
          start: { ...wallToSplit.start },
          end: { ...splitPoint },
        };

        const subWall2: Wall = {
          ...wallToSplit,
          id: newWallId2,
          start: { ...splitPoint },
          end: { ...wallToSplit.end },
        };

        // Snap the touching wall endpoint exactly to the split point
        const snappingWall = walls[snappingWallIndex];
        if (snappingIsStart) {
          snappingWall.start = { ...splitPoint };
        } else {
          snappingWall.end = { ...splitPoint };
        }
        snappedCount++;

        // Remap openings belonging to wallToSplit
        openings = openings.map((op) => {
          if (op.wallId !== wallToSplit.id) return op;

          if (op.positionRatio < ratio) {
            // Falls in subWall1
            const newRatio = Math.max(0.05, Math.min(0.95, op.positionRatio / ratio));
            return {
              ...op,
              wallId: newWallId1,
              positionRatio: Number(newRatio.toFixed(3)),
            };
          } else {
            // Falls in subWall2
            const newRatio = Math.max(0.05, Math.min(0.95, (op.positionRatio - ratio) / (1 - ratio)));
            return {
              ...op,
              wallId: newWallId2,
              positionRatio: Number(newRatio.toFixed(3)),
            };
          }
        });

        // Replace wallToSplit with subWall1 and subWall2
        walls.splice(i, 1, subWall1, subWall2);
        splitCount++;
        changed = true;
        break; // Restart loop to handle updated wall array
      }
    }
  }

  // 2. Cross X-Intersection Splitting
  iteration = 0;
  changed = true;
  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const w1 = walls[i];
        const w2 = walls[j];

        const inter = getLineIntersection(w1.start, w1.end, w2.start, w2.end);
        if (!inter) continue;

        const margin = 0.05;
        if (
          inter.t > margin &&
          inter.t < 1 - margin &&
          inter.u > margin &&
          inter.u < 1 - margin
        ) {
          // X-junction: split w1 first
          const splitPt = inter.point;
          const w1aId = `${w1.id}_x1_${iteration}`;
          const w1bId = `${w1.id}_x2_${iteration}`;

          const w1a: Wall = { ...w1, id: w1aId, end: { ...splitPt } };
          const w1b: Wall = { ...w1, id: w1bId, start: { ...splitPt } };

          openings = openings.map((op) => {
            if (op.wallId !== w1.id) return op;
            if (op.positionRatio < inter.t) {
              return {
                ...op,
                wallId: w1aId,
                positionRatio: Number((op.positionRatio / inter.t).toFixed(3)),
              };
            }
            return {
              ...op,
              wallId: w1bId,
              positionRatio: Number(((op.positionRatio - inter.t) / (1 - inter.t)).toFixed(3)),
            };
          });

          walls.splice(i, 1, w1a, w1b);
          splitCount++;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  // 3. Endpoint-to-Endpoint Snapping (Clean corner closure)
  const endpointTolerance = 0.12;
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const w1 = walls[i];
      const w2 = walls[j];

      // start to start
      if (distance(w1.start, w2.start) <= endpointTolerance && distance(w1.start, w2.start) > 0.001) {
        const avgX = Number(((w1.start.x + w2.start.x) / 2).toFixed(3));
        const avgY = Number(((w1.start.y + w2.start.y) / 2).toFixed(3));
        w1.start.x = avgX;
        w1.start.y = avgY;
        w2.start.x = avgX;
        w2.start.y = avgY;
        snappedCount++;
      }
      // start to end
      if (distance(w1.start, w2.end) <= endpointTolerance && distance(w1.start, w2.end) > 0.001) {
        const avgX = Number(((w1.start.x + w2.end.x) / 2).toFixed(3));
        const avgY = Number(((w1.start.y + w2.end.y) / 2).toFixed(3));
        w1.start.x = avgX;
        w1.start.y = avgY;
        w2.end.x = avgX;
        w2.end.y = avgY;
        snappedCount++;
      }
      // end to start
      if (distance(w1.end, w2.start) <= endpointTolerance && distance(w1.end, w2.start) > 0.001) {
        const avgX = Number(((w1.end.x + w2.start.x) / 2).toFixed(3));
        const avgY = Number(((w1.end.y + w2.start.y) / 2).toFixed(3));
        w1.end.x = avgX;
        w1.end.y = avgY;
        w2.start.x = avgX;
        w2.start.y = avgY;
        snappedCount++;
      }
      // end to end
      if (distance(w1.end, w2.end) <= endpointTolerance && distance(w1.end, w2.end) > 0.001) {
        const avgX = Number(((w1.end.x + w2.end.x) / 2).toFixed(3));
        const avgY = Number(((w1.end.y + w2.end.y) / 2).toFixed(3));
        w1.end.x = avgX;
        w1.end.y = avgY;
        w2.end.x = avgX;
        w2.end.y = avgY;
        snappedCount++;
      }
    }
  }

  return {
    walls,
    openings,
    splitCount,
    snappedCount,
  };
}

/**
 * Calculates polygon area using the Shoelace formula (in square meters)
 */
export function calculatePolygonArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Estimates the area of a room bounded by surrounding walls using radial ray-casting.
 * Returns square meters (e.g. 18.5 m²).
 */
export function estimateRoomArea(room: Room, walls: Wall[]): number {
  if (walls.length < 3) return 16.0;

  const numRays = 32;
  const rayVertices: Point2D[] = [];
  const maxRayDist = 12.0; // 12 meters search radius

  for (let k = 0; k < numRays; k++) {
    const angle = (2 * Math.PI * k) / numRays;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    let closestDist = maxRayDist;

    for (const wall of walls) {
      // Ray from (room.x, room.y) with dir (dirX, dirY)
      // Segment: wall.start to wall.end
      const v1x = room.x - wall.start.x;
      const v1y = room.y - wall.start.y;
      const v2x = wall.end.x - wall.start.x;
      const v2y = wall.end.y - wall.start.y;
      const v3x = -dirY;
      const v3y = dirX;

      const dot = v2x * v3x + v2y * v3y;
      if (Math.abs(dot) < 1e-6) continue;

      const t1 = (v2x * v1y - v2y * v1x) / dot;
      const t2 = (v1x * v3x + v1y * v3y) / dot;

      if (t1 > 0.05 && t2 >= 0 && t2 <= 1) {
        if (t1 < closestDist) {
          closestDist = t1;
        }
      }
    }

    rayVertices.push({
      x: room.x + dirX * closestDist,
      y: room.y + dirY * closestDist,
    });
  }

  const calculatedArea = calculatePolygonArea(rayVertices);

  // Sanity check: a residential room is typically between 3 m² and 65 m²
  if (calculatedArea >= 3.0 && calculatedArea <= 80.0) {
    return Number(calculatedArea.toFixed(1));
  }

  // Fallback: estimate using bounding box of nearest walls
  let minDx = maxRayDist,
    maxDx = maxRayDist,
    minDy = maxRayDist,
    maxDy = maxRayDist;
  for (const wall of walls) {
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    if (midX > room.x) maxDx = Math.min(maxDx, midX - room.x);
    if (midX < room.x) minDx = Math.min(minDx, room.x - midX);
    if (midY > room.y) maxDy = Math.min(maxDy, midY - room.y);
    if (midY < room.y) minDy = Math.min(minDy, room.y - midY);
  }

  const approxW = Math.min(8, minDx + maxDx);
  const approxH = Math.min(8, minDy + maxDy);
  const fallbackArea = approxW * approxH * 0.85;

  return Number(Math.max(4.0, Math.min(50.0, fallbackArea)).toFixed(1));
}
