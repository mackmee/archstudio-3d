'use client';

import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Wall } from '@/types/floorplan';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { getMaterialById, DEFAULT_WALL_MATERIAL_ID } from '@/data/materials';

interface CornerPillars3DProps {
  walls: Wall[];
  ceilingHeight: number;
}

interface CornerJunction {
  id: string;
  x: number;
  z: number;
  maxThickness: number;
  materialId: string;
}

export const CornerPillars3D: React.FC<CornerPillars3DProps> = ({ walls, ceilingHeight }) => {
  const { view3dSettings, rooms } = useFloorplanStore();
  const cutawayMode = view3dSettings.cutawayMode;
  const autoHideEnabled = view3dSettings.autoHideBlockingWalls && view3dSettings.cameraMode === 'orbit';
  const focusedRoomId = view3dSettings.focusedRoomId;

  // Identify all corner junctions where 2 or more walls meet within 8cm tolerance
  const junctions = useMemo(() => {
    if (!walls || walls.length < 2) return [];

    const TOLERANCE = 0.08; // 8cm junction snap tolerance
    const clusters: {
      x: number;
      z: number;
      points: { x: number; y: number }[];
      maxThickness: number;
      materialId: string;
    }[] = [];

    walls.forEach((w) => {
      const thick = w.thickness && w.thickness >= 0.1 ? w.thickness : 0.18;
      const mat = w.materialLeftId || w.materialRightId || DEFAULT_WALL_MATERIAL_ID;

      [w.start, w.end].forEach((pt) => {
        let matched = false;
        for (const cluster of clusters) {
          const d = Math.hypot(pt.x - cluster.x, pt.y - cluster.z);
          if (d <= TOLERANCE) {
            cluster.points.push(pt);
            cluster.x = cluster.points.reduce((sum, p) => sum + p.x, 0) / cluster.points.length;
            cluster.z = cluster.points.reduce((sum, p) => sum + p.y, 0) / cluster.points.length;
            cluster.maxThickness = Math.max(cluster.maxThickness, thick);
            matched = true;
            break;
          }
        }
        if (!matched) {
          clusters.push({
            x: pt.x,
            z: pt.y,
            points: [pt],
            maxThickness: thick,
            materialId: mat,
          });
        }
      });
    });

    // Only clusters with 2 or more meeting wall endpoints form corner junctions
    return clusters
      .filter((c) => c.points.length >= 2)
      .map((c, idx) => ({
        id: `corner_cap_${idx}_${c.x.toFixed(2)}_${c.z.toFixed(2)}`,
        x: c.x,
        z: c.z,
        maxThickness: c.maxThickness,
        materialId: c.materialId,
      }));
  }, [walls]);

  if (junctions.length === 0) return null;

  return (
    <group name="CornerPillars">
      {junctions.map((j) => (
        <SingleCornerPillar
          key={j.id}
          junction={j}
          ceilingHeight={ceilingHeight}
          cutawayMode={cutawayMode}
          autoHideEnabled={autoHideEnabled}
          focusedRoomId={focusedRoomId}
          rooms={rooms}
        />
      ))}
    </group>
  );
};

interface SingleCornerPillarProps {
  junction: CornerJunction;
  ceilingHeight: number;
  cutawayMode: boolean;
  autoHideEnabled: boolean;
  focusedRoomId: string | null;
  rooms: { id: string; x: number; y: number }[];
}

const SingleCornerPillar: React.FC<SingleCornerPillarProps> = ({
  junction,
  ceilingHeight,
  cutawayMode,
  autoHideEnabled,
  focusedRoomId,
  rooms,
}) => {
  const [opacity, setOpacity] = useState(1.0);
  const opacityRef = useRef(1.0);

  const H = cutawayMode ? 1.1 : ceilingHeight;
  const T = junction.maxThickness;

  const matData = useMemo(
    () => getMaterialById(junction.materialId || DEFAULT_WALL_MATERIAL_ID),
    [junction.materialId]
  );

  // Auto-hide ghosting when blocking camera view to focused room
  useFrame((state) => {
    let targetOpacity = cutawayMode ? 0.35 : 1.0;

    if (autoHideEnabled && focusedRoomId) {
      const room = rooms.find((r) => r.id === focusedRoomId);
      if (room) {
        const cam = state.camera.position;
        const dx = room.x - cam.x;
        const dz = room.y - cam.z;
        const camTargetDist = Math.hypot(dx, dz);

        if (camTargetDist > 0.6) {
          const ux = dx / camTargetDist;
          const uz = dz / camTargetDist;
          const wx = junction.x - cam.x;
          const wz = junction.z - cam.z;
          const t = wx * ux + wz * uz;
          const perpDist = Math.abs(wx * -uz + wz * ux);

          if (t > 0.8 && t < camTargetDist - 0.3 && perpDist < T / 2 + 1.2) {
            targetOpacity = 0.15;
          }
        }
      }
    }

    if (Math.abs(opacityRef.current - targetOpacity) > 0.015) {
      opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, 0.12);
      setOpacity(opacityRef.current);
    }
  });

  // Baseboard trim dimensions matching WallMesh3D
  const baseboardH = 0.08; // 8cm
  const baseboardT = 0.015; // 1.5cm
  const zOffset = 0.0025; // 2.5mm anti-z-fighting offset
  const baseboardCapSize = T + (baseboardT + zOffset) * 2;
  const isFullHeight = H >= 2.0;

  return (
    <group position={[junction.x, 0, junction.z]}>
      {/* Monolithic Corner Column Cap Mesh */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[T, H, T]} />
        <meshStandardMaterial
          color={matData.color}
          roughness={matData.roughness}
          metalness={matData.metalness}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          transparent={opacity < 0.98}
          opacity={opacity}
          depthWrite={opacity > 0.85}
        />
      </mesh>

      {/* Seamless Baseboard Corner Wrap at Floor Level */}
      {isFullHeight && (
        <mesh position={[0, baseboardH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[baseboardCapSize, baseboardH, baseboardCapSize]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.6}
            metalness={0.05}
            transparent={opacity < 0.98}
            opacity={opacity}
            depthWrite={opacity > 0.85}
          />
        </mesh>
      )}
    </group>
  );
};
