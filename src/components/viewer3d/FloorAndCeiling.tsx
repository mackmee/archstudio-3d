'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Wall, Room } from '@/types/floorplan';
import { Tag } from 'lucide-react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { getMaterialById } from '@/data/materials';
import { getScaledTexture } from '@/lib/textures';

interface FloorAndCeilingProps {
  walls: Wall[];
  rooms: Room[];
  ceilingHeight: number;
  showCeiling: boolean;
  showRoomLabels: boolean;
}

export const FloorAndCeiling: React.FC<FloorAndCeilingProps> = ({
  walls,
  rooms,
  ceilingHeight,
  showCeiling,
  showRoomLabels,
}) => {
  const {
    floorMaterialId,
    ceilingMaterialId,
    selected3DTarget,
    setSelected3DTarget,
  } = useFloorplanStore();

  const isFloorSelected = selected3DTarget?.type === 'floor';
  const isCeilingSelected = selected3DTarget?.type === 'ceiling';

  // Compute bounding footprint of all walls
  const bounds = useMemo(() => {
    if (walls.length === 0) {
      return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, centerX: 0, centerZ: 0, width: 10, depth: 10 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    walls.forEach((w) => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });

    const padding = 0.8;
    minX -= padding;
    maxX += padding;
    minZ -= padding;
    maxZ += padding;

    const width = Math.max(4, maxX - minX);
    const depth = Math.max(4, maxZ - minZ);
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    return { minX, maxX, minZ, maxZ, centerX, centerZ, width, depth };
  }, [walls]);

  // Floor Material with world-space tiling
  const floorMat = useMemo(() => getMaterialById(floorMaterialId), [floorMaterialId]);
  const floorTexture = useMemo(
    () => getScaledTexture(floorMat.id, bounds.width, bounds.depth),
    [floorMat.id, bounds.width, bounds.depth]
  );

  // Ceiling Material with world-space tiling
  const ceilMat = useMemo(() => getMaterialById(ceilingMaterialId), [ceilingMaterialId]);
  const ceilTexture = useMemo(
    () => getScaledTexture(ceilMat.id, bounds.width, bounds.depth),
    [ceilMat.id, bounds.width, bounds.depth]
  );

  return (
    <group>
      {/* 1. Floor Slab */}
      <mesh
        position={[bounds.centerX, -0.075, bounds.centerZ]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelected3DTarget({ type: 'floor' });
        }}
      >
        <boxGeometry args={[bounds.width, 0.15, bounds.depth]} />
        <meshStandardMaterial
          map={floorMat.type === 'procedural' ? floorTexture : null}
          color={floorMat.color}
          roughness={floorMat.roughness}
          metalness={floorMat.metalness}
          emissive={isFloorSelected ? new THREE.Color('#0284c7') : new THREE.Color(0)}
          emissiveIntensity={isFloorSelected ? 0.3 : 0}
        />
      </mesh>

      {/* 2. Toggleable Ceiling Slab */}
      {showCeiling && (
        <mesh
          position={[bounds.centerX, ceilingHeight + 0.05, bounds.centerZ]}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            setSelected3DTarget({ type: 'ceiling' });
          }}
        >
          <boxGeometry args={[bounds.width, 0.1, bounds.depth]} />
          <meshStandardMaterial
            map={ceilMat.type === 'procedural' ? ceilTexture : null}
            color={ceilMat.color}
            roughness={ceilMat.roughness}
            metalness={ceilMat.metalness}
            emissive={isCeilingSelected ? new THREE.Color('#0284c7') : new THREE.Color(0)}
            emissiveIntensity={isCeilingSelected ? 0.3 : 0}
          />
        </mesh>
      )}

      {/* 3. Studio Ground Plane (Shadow Receiver & Backdrop) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[bounds.centerX, -0.16, bounds.centerZ]}
        receiveShadow
        onClick={() => setSelected3DTarget(null)}
      >
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color="#060911"
          roughness={0.95}
          metalness={0.1}
        />
      </mesh>

      {/* 4. Floating 3D Room Label Markers */}
      {showRoomLabels &&
        rooms.map((room) => (
          <group key={room.id} position={[room.x, 0.35, room.y]}>
            <Html center distanceFactor={14} style={{ pointerEvents: 'none' }}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white shadow-xl backdrop-blur-md select-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold tracking-wide">
                  {room.name}
                </span>
              </div>
            </Html>
          </group>
        ))}
    </group>
  );
};
