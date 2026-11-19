'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Wall, Opening } from '@/types/floorplan';
import { distance } from '@/lib/geometry';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { getMaterialById, DEFAULT_WALL_MATERIAL_ID } from '@/data/materials';
import { getScaledTexture } from '@/lib/textures';

interface WallMesh3DProps {
  wall: Wall;
  openings: Opening[];
  ceilingHeight: number;
}

interface WallSegmentBox {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export const WallMesh3D: React.FC<WallMesh3DProps> = ({
  wall,
  openings,
  ceilingHeight,
}) => {
  const { selected3DTarget, setSelected3DTarget, setSelectedId } = useFloorplanStore();
  const isSelected = selected3DTarget?.type === 'wall' && selected3DTarget.id === wall.id;

  const wallLen = useMemo(() => distance(wall.start, wall.end), [wall.start, wall.end]);

  const wallAngle = useMemo(() => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    return Math.atan2(dy, dx);
  }, [wall.start, wall.end]);

  // Materials definition for Side A (+Z) and Side B (-Z)
  const matA = useMemo(
    () => getMaterialById(wall.materialLeftId || DEFAULT_WALL_MATERIAL_ID),
    [wall.materialLeftId]
  );
  const matB = useMemo(
    () => getMaterialById(wall.materialRightId || DEFAULT_WALL_MATERIAL_ID),
    [wall.materialRightId]
  );

  // Partition wall around openings
  const { wallBoxes, wallOpenings } = useMemo(() => {
    if (wallLen < 0.05) return { wallBoxes: [], wallOpenings: [] };

    const T = wall.thickness;
    const H = ceilingHeight;

    const rawOps = openings
      .filter((o) => o.wallId === wall.id)
      .map((o) => {
        const uCenter = Math.max(0, Math.min(1, o.positionRatio)) * wallLen;
        const halfW = o.width / 2;
        const u1 = Math.max(0, uCenter - halfW);
        const u2 = Math.min(wallLen, uCenter + halfW);
        return {
          ...o,
          u1,
          u2,
          uCenter: (u1 + u2) / 2,
          effWidth: Math.max(0.2, u2 - u1),
        };
      })
      .filter((o) => o.u2 > o.u1)
      .sort((a, b) => a.u1 - b.u1);

    const boxes: WallSegmentBox[] = [];
    let curU = 0;

    rawOps.forEach((op) => {
      // 1. Solid segment before opening
      if (op.u1 > curU + 0.005) {
        const segLen = op.u1 - curU;
        boxes.push({
          x: curU + segLen / 2,
          y: H / 2,
          z: 0,
          width: segLen,
          height: H,
          depth: T,
        });
      }

      const opLen = op.u2 - op.u1;
      const sh = op.sillHeight;
      const oh = op.height;

      // 2. Sill segment below opening
      if (sh > 0.01) {
        boxes.push({
          x: op.u1 + opLen / 2,
          y: sh / 2,
          z: 0,
          width: opLen,
          height: sh,
          depth: T,
        });
      }

      // 3. Header/lintel segment above opening
      const headerBottom = sh + oh;
      const headerH = H - headerBottom;
      if (headerH > 0.01) {
        boxes.push({
          x: op.u1 + opLen / 2,
          y: headerBottom + headerH / 2,
          z: 0,
          width: opLen,
          height: headerH,
          depth: T,
        });
      }

      curU = Math.max(curU, op.u2);
    });

    // 4. Trailing solid segment
    if (curU < wallLen - 0.005) {
      const segLen = wallLen - curU;
      boxes.push({
        x: curU + segLen / 2,
        y: H / 2,
        z: 0,
        width: segLen,
        height: H,
        depth: T,
      });
    }

    return { wallBoxes: boxes, wallOpenings: rawOps };
  }, [wall, wallLen, openings, ceilingHeight]);

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelected3DTarget({
      type: 'wall',
      id: wall.id,
      side: 'both',
    });
    setSelectedId(wall.id);
  };

  if (wallLen < 0.05) return null;

  return (
    <group
      position={[wall.start.x, 0, wall.start.y]}
      rotation={[0, -wallAngle, 0]}
      onClick={handleClick}
    >
      {/* Wall Segment Meshes */}
      {wallBoxes.map((box, idx) => (
        <WallSegmentMesh
          key={`box-${idx}`}
          box={box}
          matA={matA}
          matB={matB}
          isSelected={isSelected}
        />
      ))}

      {/* Parametric 3D Doors & Windows */}
      {wallOpenings.map((op) => (
        <React.Fragment key={op.id}>
          {op.type === 'door' ? (
            <Door3D
              x={op.uCenter}
              width={op.effWidth}
              height={op.height}
              wallThickness={wall.thickness}
              flip={Boolean(op.flip)}
            />
          ) : (
            <Window3D
              x={op.uCenter}
              sillHeight={op.sillHeight}
              width={op.effWidth}
              height={op.height}
              wallThickness={wall.thickness}
            />
          )}
        </React.Fragment>
      ))}
    </group>
  );
};

// -------------------------------------------------------------
// Wall Segment Mesh with 6-Face Dual-Sided Materials
// -------------------------------------------------------------
interface WallSegmentMeshProps {
  box: WallSegmentBox;
  matA: ReturnType<typeof getMaterialById>;
  matB: ReturnType<typeof getMaterialById>;
  isSelected: boolean;
}

const WallSegmentMesh: React.FC<WallSegmentMeshProps> = ({
  box,
  matA,
  matB,
  isSelected,
}) => {
  // Construct 6-material array:
  // 0: +X, 1: -X, 2: +Y (top), 3: -Y (bottom), 4: +Z (Side A), 5: -Z (Side B)
  const materials = useMemo(() => {
    const emissiveCol = isSelected ? new THREE.Color('#0284c7') : new THREE.Color(0);
    const emissiveInt = isSelected ? 0.35 : 0;

    // Edge/Trim material
    const edgeMat = new THREE.MeshStandardMaterial({
      color: matA.color,
      roughness: 0.8,
      metalness: 0.0,
      emissive: emissiveCol,
      emissiveIntensity: emissiveInt,
    });

    // Face A (+Z)
    const texA = getScaledTexture(matA.id, box.width, box.height);
    const sideAMat = new THREE.MeshStandardMaterial({
      map: matA.type === 'procedural' ? texA : null,
      color: matA.color,
      roughness: matA.roughness,
      metalness: matA.metalness,
      emissive: emissiveCol,
      emissiveIntensity: emissiveInt,
    });

    // Face B (-Z)
    const texB = getScaledTexture(matB.id, box.width, box.height);
    const sideBMat = new THREE.MeshStandardMaterial({
      map: matB.type === 'procedural' ? texB : null,
      color: matB.color,
      roughness: matB.roughness,
      metalness: matB.metalness,
      emissive: emissiveCol,
      emissiveIntensity: emissiveInt,
    });

    return [edgeMat, edgeMat, edgeMat, edgeMat, sideAMat, sideBMat];
  }, [box.width, box.height, matA, matB, isSelected]);

  return (
    <mesh
      position={[box.x, box.y, box.z]}
      material={materials}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[box.width, box.height, box.depth]} />
    </mesh>
  );
};

// -------------------------------------------------------------
// 3D Architectural Door Component
// -------------------------------------------------------------
interface Door3DProps {
  x: number;
  width: number;
  height: number;
  wallThickness: number;
  flip: boolean;
}

const Door3D: React.FC<Door3DProps> = ({
  x,
  width,
  height,
  wallThickness,
  flip,
}) => {
  const frameThickness = 0.04;
  const frameDepth = wallThickness + 0.02;
  const doorWidth = width - frameThickness * 2;
  const doorHeight = height - frameThickness;
  const doorThick = 0.04;

  const swingAngle = flip ? -Math.PI / 4.5 : Math.PI / 4.5;
  const hingeX = flip ? width / 2 - frameThickness : -width / 2 + frameThickness;

  return (
    <group position={[x, 0, 0]}>
      {/* 1. Door Frame Jambs & Header */}
      <mesh
        position={[-width / 2 + frameThickness / 2, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      <mesh
        position={[width / 2 - frameThickness / 2, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      <mesh
        position={[0, height - frameThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, frameThickness, frameDepth]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      {/* 2. Ajar Door Leaf with Pivot Hinge */}
      <group position={[hingeX, 0, 0]} rotation={[0, swingAngle, 0]}>
        <mesh
          position={[flip ? -doorWidth / 2 : doorWidth / 2, doorHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[doorWidth, doorHeight, doorThick]} />
          <meshStandardMaterial
            color="#451a03"
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        <mesh
          position={[
            flip ? -doorWidth + 0.07 : doorWidth - 0.07,
            0.95,
            doorThick / 2 + 0.02,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.012, 0.012, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// 3D Architectural Window Component
// -------------------------------------------------------------
interface Window3DProps {
  x: number;
  sillHeight: number;
  width: number;
  height: number;
  wallThickness: number;
}

const Window3D: React.FC<Window3DProps> = ({
  x,
  sillHeight,
  width,
  height,
  wallThickness,
}) => {
  const frameThickness = 0.04;
  const frameDepth = wallThickness + 0.01;
  const glassW = width - frameThickness * 2;
  const glassH = height - frameThickness * 2;
  const centerY = sillHeight + height / 2;

  return (
    <group position={[x, centerY, 0]}>
      <mesh
        position={[-width / 2 + frameThickness / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      <mesh
        position={[width / 2 - frameThickness / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      <mesh
        position={[0, height / 2 - frameThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, frameThickness, frameDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      <mesh
        position={[0, -height / 2 + frameThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, frameThickness, frameDepth + 0.03]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      {width > 1.0 && (
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.03, glassH, frameDepth * 0.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
      )}

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[glassW, glassH, 0.015]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
};
