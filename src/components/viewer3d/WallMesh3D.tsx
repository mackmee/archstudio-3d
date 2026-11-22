'use client';

import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
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
  const {
    selected3DTarget,
    setSelected3DTarget,
    setSelectedId,
    view3dSettings,
    rooms,
  } = useFloorplanStore();

  const isWallSelected = selected3DTarget?.type === 'wall' && selected3DTarget.id === wall.id;
  const selectedSide = isWallSelected ? selected3DTarget?.side || 'both' : null;
  const cutawayMode = view3dSettings.cutawayMode;
  const autoHideEnabled = view3dSettings.autoHideBlockingWalls && view3dSettings.cameraMode === 'orbit';

  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);
  const [wallOpacity, setWallOpacity] = useState(1.0);
  const opacityRef = useRef(1.0);

  const wallLen = useMemo(() => distance(wall.start, wall.end), [wall.start, wall.end]);

  const wallAngle = useMemo(() => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    return Math.atan2(dy, dx);
  }, [wall.start, wall.end]);

  const wallMidX = (wall.start.x + wall.end.x) / 2;
  const wallMidZ = (wall.start.y + wall.end.y) / 2;
  const wallHalfLen = wallLen / 2;

  // Auto-Hide Blocking Front Walls Logic
  useFrame((state) => {
    let targetOpacity = cutawayMode ? 0.35 : 1.0;

    if (autoHideEnabled) {
      const cam = state.camera.position;

      // Determine look target (either focused room center or apartment center)
      let targetX = wallMidX;
      let targetZ = wallMidZ;

      if (view3dSettings.focusedRoomId) {
        const room = rooms.find((r) => r.id === view3dSettings.focusedRoomId);
        if (room) {
          targetX = room.x;
          targetZ = room.y;
        }
      }

      if (view3dSettings.focusedRoomId) {
        // Checking against focused target room
        const dx = targetX - cam.x;
        const dz = targetZ - cam.z;
        const camTargetDist = Math.hypot(dx, dz);

        if (camTargetDist > 0.6) {
          const ux = dx / camTargetDist;
          const uz = dz / camTargetDist;

          // Vector from camera to wall center
          const wx = wallMidX - cam.x;
          const wz = wallMidZ - cam.z;

          // Projection along camera-target ray
          const t = wx * ux + wz * uz;
          // Perpendicular distance to ray
          const perpDist = Math.abs(wx * -uz + wz * ux);

          // If wall sits directly in line of sight between camera and target room
          if (t > 0.8 && t < camTargetDist - 0.3 && perpDist < wallHalfLen + 1.2) {
            targetOpacity = 0.2; // Smooth ghosting so interior is completely visible
          }
        }
      } else {
        // Orbit overview: fade front wall closest to camera if camera is at low/medium architectural angle
        const toCamX = cam.x - wallMidX;
        const toCamZ = cam.z - wallMidZ;
        const distToCam = Math.hypot(toCamX, toCamZ);

        if (cam.y > 1.0 && distToCam < 14.0) {
          const camElevation = cam.y / distToCam;
          if (camElevation < 0.65) {
            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const normDot = (toCamX * -dy + toCamZ * dx) / (distToCam * wallLen);
            if (Math.abs(normDot) > 0.6 && distToCam < 8.5) {
              targetOpacity = 0.25;
            }
          }
        }
      }
    }

    if (Math.abs(opacityRef.current - targetOpacity) > 0.015) {
      opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, 0.12);
      setWallOpacity(opacityRef.current);
    }
  });

  // Materials definition for Side A (+Z / materialLeftId) and Side B (-Z / materialRightId)
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

  if (wallLen < 0.05) return null;

  return (
    <group
      position={[wall.start.x, 0, wall.start.y]}
      rotation={[0, -wallAngle, 0]}
    >
      {/* Wall Segment Meshes & Baseboards */}
      {wallBoxes.map((box, idx) => (
        <WallSegmentMesh
          key={`box-${idx}`}
          box={box}
          matA={matA}
          matB={matB}
          isSelected={isWallSelected}
          selectedSide={selectedSide}
          hoveredSide={hoveredSide}
          opacity={wallOpacity}
          onFacePointerMove={(side) => setHoveredSide(side)}
          onFacePointerOut={() => setHoveredSide(null)}
          onFaceClick={(side) => {
            setSelected3DTarget({
              type: 'wall',
              id: wall.id,
              side: side || 'both',
            });
            setSelectedId(wall.id);
          }}
        />
      ))}

      {/* Parametric 3D Doors & Windows with Casings & Reflective Glass */}
      {wallOpenings.map((op) => (
        <React.Fragment key={op.id}>
          {op.type === 'door' ? (
            <Door3D
              x={op.uCenter}
              width={op.effWidth}
              height={op.height}
              wallThickness={wall.thickness}
              flip={Boolean(op.flip)}
              opacity={wallOpacity}
            />
          ) : (
            <Window3D
              x={op.uCenter}
              sillHeight={op.sillHeight}
              width={op.effWidth}
              height={op.height}
              wallThickness={wall.thickness}
              opacity={wallOpacity}
            />
          )}
        </React.Fragment>
      ))}
    </group>
  );
};

// -------------------------------------------------------------
// Wall Segment Mesh with 6-Face Dual-Sided Materials & Baseboards
// -------------------------------------------------------------
interface WallSegmentMeshProps {
  box: WallSegmentBox;
  matA: ReturnType<typeof getMaterialById>;
  matB: ReturnType<typeof getMaterialById>;
  isSelected: boolean;
  selectedSide: 'left' | 'right' | 'both' | null;
  hoveredSide: 'left' | 'right' | null;
  opacity: number;
  onFacePointerMove: (side: 'left' | 'right') => void;
  onFacePointerOut: () => void;
  onFaceClick: (side: 'left' | 'right') => void;
}

const WallSegmentMesh: React.FC<WallSegmentMeshProps> = ({
  box,
  matA,
  matB,
  isSelected,
  selectedSide,
  hoveredSide,
  opacity,
  onFacePointerMove,
  onFacePointerOut,
  onFaceClick,
}) => {
  // Construct 6-material array:
  // 0: +X, 1: -X, 2: +Y (top), 3: -Y (bottom), 4: +Z (Side A / Left), 5: -Z (Side B / Right)
  const materials = useMemo(() => {
    const isSideASelected = isSelected && (selectedSide === 'both' || selectedSide === 'left');
    const isSideBSelected = isSelected && (selectedSide === 'both' || selectedSide === 'right');
    const isSideAHovered = hoveredSide === 'left';
    const isSideBHovered = hoveredSide === 'right';

    const emissiveA = isSideASelected
      ? new THREE.Color('#0284c7')
      : isSideAHovered
      ? new THREE.Color('#38bdf8')
      : new THREE.Color(0);
    const emissiveIntA = isSideASelected ? 0.4 : isSideAHovered ? 0.25 : 0;

    const emissiveB = isSideBSelected
      ? new THREE.Color('#0284c7')
      : isSideBHovered
      ? new THREE.Color('#38bdf8')
      : new THREE.Color(0);
    const emissiveIntB = isSideBSelected ? 0.4 : isSideBHovered ? 0.25 : 0;

    // Edge/Trim material
    const edgeMat = new THREE.MeshStandardMaterial({
      color: matA.color,
      roughness: 0.8,
      metalness: 0.0,
      transparent: opacity < 0.98,
      opacity,
      depthWrite: opacity > 0.85,
    });

    // Face A (+Z / Left)
    const texA = getScaledTexture(matA.id, box.width, box.height);
    const sideAMat = new THREE.MeshStandardMaterial({
      map: matA.type === 'procedural' ? texA : null,
      color: matA.color,
      roughness: matA.roughness,
      metalness: matA.metalness,
      emissive: emissiveA,
      emissiveIntensity: emissiveIntA,
      transparent: opacity < 0.98,
      opacity,
      depthWrite: opacity > 0.85,
    });

    // Face B (-Z / Right)
    const texB = getScaledTexture(matB.id, box.width, box.height);
    const sideBMat = new THREE.MeshStandardMaterial({
      map: matB.type === 'procedural' ? texB : null,
      color: matB.color,
      roughness: matB.roughness,
      metalness: matB.metalness,
      emissive: emissiveB,
      emissiveIntensity: emissiveIntB,
      transparent: opacity < 0.98,
      opacity,
      depthWrite: opacity > 0.85,
    });

    return [edgeMat, edgeMat, edgeMat, edgeMat, sideAMat, sideBMat];
  }, [
    box.width,
    box.height,
    matA,
    matB,
    isSelected,
    selectedSide,
    hoveredSide,
    opacity,
  ]);

  // Baseboard trim dimensions & anti-z-fighting offset
  // Tiny 2.5mm offset away from wall surfaces to guarantee zero WebGL z-fighting
  const baseboardHeight = 0.08; // 8cm
  const baseboardThickness = 0.015; // 1.5cm
  const zOffsetAntiZFighting = 0.0025; // 2.5mm offset
  const baseboardZA = box.depth / 2 + baseboardThickness / 2 + zOffsetAntiZFighting;
  const baseboardZB = -box.depth / 2 - baseboardThickness / 2 - zOffsetAntiZFighting;

  const isFullHeightWall = box.height >= 2.0;

  return (
    <group>
      {/* Main Wall Segment Box */}
      <mesh
        position={[box.x, box.y, box.z]}
        material={materials}
        castShadow
        receiveShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.faceIndex !== undefined) {
            // BoxGeometry faces: 8, 9 are +Z (Side A / Left); 10, 11 are -Z (Side B / Right)
            if (e.faceIndex === 8 || e.faceIndex === 9) {
              onFacePointerMove('left');
            } else if (e.faceIndex === 10 || e.faceIndex === 11) {
              onFacePointerMove('right');
            }
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onFacePointerOut();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.faceIndex !== undefined) {
            if (e.faceIndex === 8 || e.faceIndex === 9) {
              onFaceClick('left');
            } else if (e.faceIndex === 10 || e.faceIndex === 11) {
              onFaceClick('right');
            } else {
              onFaceClick('left');
            }
          } else {
            onFaceClick('left');
          }
        }}
      >
        <boxGeometry args={[box.width, box.height, box.depth]} />
      </mesh>

      {/* Architectural Baseboards (Plintus) at floor level on solid walls */}
      {isFullHeightWall && (
        <>
          {/* Side A Baseboard (+Z) */}
          <mesh
            position={[box.x, baseboardHeight / 2, baseboardZA]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[box.width, baseboardHeight, baseboardThickness]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.45}
              metalness={0.05}
              transparent={opacity < 0.98}
              opacity={opacity}
              depthWrite={opacity > 0.85}
            />
          </mesh>

          {/* Side B Baseboard (-Z) */}
          <mesh
            position={[box.x, baseboardHeight / 2, baseboardZB]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[box.width, baseboardHeight, baseboardThickness]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.45}
              metalness={0.05}
              transparent={opacity < 0.98}
              opacity={opacity}
              depthWrite={opacity > 0.85}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

// -------------------------------------------------------------
// 3D Architectural Door Component with Casings (Nalichnik)
// -------------------------------------------------------------
interface Door3DProps {
  x: number;
  width: number;
  height: number;
  wallThickness: number;
  flip: boolean;
  opacity?: number;
}

const Door3D: React.FC<Door3DProps> = ({
  x,
  width,
  height,
  wallThickness,
  flip,
  opacity = 1.0,
}) => {
  const frameThickness = 0.04;
  const frameDepth = wallThickness + 0.02;
  const doorWidth = width - frameThickness * 2;
  const doorHeight = height - frameThickness;
  const doorThick = 0.04;

  const swingAngle = flip ? -Math.PI / 4.5 : Math.PI / 4.5;
  const hingeX = flip ? width / 2 - frameThickness : -width / 2 + frameThickness;

  // Casing trim profile (Nalichnik) with 2.5mm offset to prevent z-fighting
  const casingWidth = 0.06; // 6cm
  const casingThickness = 0.012; // 1.2cm
  const casingZOffset = wallThickness / 2 + 0.0025; // 2.5mm offset away from wall

  return (
    <group position={[x, 0, 0]}>
      {/* 1. Door Frame Jambs & Header */}
      <mesh
        position={[-width / 2 + frameThickness / 2, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.5}
          transparent={opacity < 0.98}
          opacity={opacity}
        />
      </mesh>

      <mesh
        position={[width / 2 - frameThickness / 2, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.5}
          transparent={opacity < 0.98}
          opacity={opacity}
        />
      </mesh>

      <mesh
        position={[0, height - frameThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, frameThickness, frameDepth]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.5}
          transparent={opacity < 0.98}
          opacity={opacity}
        />
      </mesh>

      {/* 2. Side A Casing (Nalichnik +Z) */}
      <group position={[0, 0, casingZOffset]}>
        <mesh position={[-width / 2 - casingWidth / 2 + 0.005, height / 2, casingThickness / 2]}>
          <boxGeometry args={[casingWidth, height, casingThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[width / 2 + casingWidth / 2 - 0.005, height / 2, casingThickness / 2]}>
          <boxGeometry args={[casingWidth, height, casingThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[0, height + casingWidth / 2 - 0.005, casingThickness / 2]}>
          <boxGeometry args={[width + casingWidth * 2 - 0.01, casingWidth, casingThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
      </group>

      {/* 3. Side B Casing (Nalichnik -Z) */}
      <group position={[0, 0, -casingZOffset]}>
        <mesh position={[-width / 2 - casingWidth / 2 + 0.005, height / 2, -casingThickness / 2]}>
          <boxGeometry args={[casingWidth, height, casingThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[width / 2 + casingWidth / 2 - 0.005, height / 2, -casingThickness / 2]}>
          <boxGeometry args={[casingWidth, height, casingThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[0, height + casingWidth / 2 - 0.005, -casingThickness / 2]}>
          <boxGeometry args={[width + casingWidth * 2 - 0.01, casingWidth, casingThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
      </group>

      {/* 4. Ajar Door Leaf with Pivot Hinge */}
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
            transparent={opacity < 0.98}
            opacity={opacity}
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
// 3D Architectural Window Component with Casings & Reflective Glass
// -------------------------------------------------------------
interface Window3DProps {
  x: number;
  sillHeight: number;
  width: number;
  height: number;
  wallThickness: number;
  opacity?: number;
}

const Window3D: React.FC<Window3DProps> = ({
  x,
  sillHeight,
  width,
  height,
  wallThickness,
  opacity = 1.0,
}) => {
  const frameThickness = 0.04;
  const frameDepth = wallThickness + 0.01;
  const glassW = width - frameThickness * 2;
  const glassH = height - frameThickness * 2;
  const centerY = sillHeight + height / 2;

  // Window casing with anti-z-fighting offset
  const casingW = 0.05;
  const casingThick = 0.012;
  const casingZ = wallThickness / 2 + 0.0025;

  return (
    <group position={[x, centerY, 0]}>
      {/* Outer Window Frame */}
      <mesh position={[-width / 2 + frameThickness / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
      </mesh>

      <mesh position={[width / 2 - frameThickness / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
      </mesh>

      <mesh position={[0, height / 2 - frameThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameThickness, frameDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
      </mesh>

      {/* Extended Window Sill */}
      <mesh position={[0, -height / 2 + frameThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.06, frameThickness, frameDepth + 0.04]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
      </mesh>

      {/* Side A Window Casing (Nalichnik +Z) */}
      <group position={[0, 0, casingZ]}>
        <mesh position={[-width / 2 - casingW / 2 + 0.005, 0, casingThick / 2]}>
          <boxGeometry args={[casingW, height, casingThick]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[width / 2 + casingW / 2 - 0.005, 0, casingThick / 2]}>
          <boxGeometry args={[casingW, height, casingThick]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[0, height / 2 + casingW / 2 - 0.005, casingThick / 2]}>
          <boxGeometry args={[width + casingW * 2 - 0.01, casingW, casingThick]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
      </group>

      {/* Side B Window Casing (Nalichnik -Z) */}
      <group position={[0, 0, -casingZ]}>
        <mesh position={[-width / 2 - casingW / 2 + 0.005, 0, -casingThick / 2]}>
          <boxGeometry args={[casingW, height, casingThick]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[width / 2 + casingW / 2 - 0.005, 0, -casingThick / 2]}>
          <boxGeometry args={[casingW, height, casingThick]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
        <mesh position={[0, height / 2 + casingW / 2 - 0.005, -casingThick / 2]}>
          <boxGeometry args={[width + casingW * 2 - 0.01, casingW, casingThick]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
      </group>

      {/* Center Mullion if wide */}
      {width > 1.0 && (
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.03, glassH, frameDepth * 0.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} transparent={opacity < 0.98} opacity={opacity} />
        </mesh>
      )}

      {/* Architectural Reflective Tinted Glass */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[glassW, glassH, 0.012]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.38}
          roughness={0.08}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
};
