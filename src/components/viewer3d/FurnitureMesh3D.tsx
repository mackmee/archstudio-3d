'use client';

import React, { Suspense, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls, useGLTF } from '@react-three/drei';
import { PlacedFurniture } from '@/types/floorplan';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { getFurnitureCatalogItem } from '@/data/furniture';
import { ProceduralFurnitureModel } from './ProceduralFurnitureModels';

interface FurnitureMesh3DProps {
  item: PlacedFurniture;
}

export const FurnitureMesh3D: React.FC<FurnitureMesh3DProps> = ({ item }) => {
  const {
    selected3DTarget,
    setSelected3DTarget,
    updateFurniture,
    removeFurniture,
    setIsTransformDragging,
    walls,
  } = useFloorplanStore();

  const isSelected =
    selected3DTarget?.type === 'furniture' && selected3DTarget.id === item.id;

  const catalogItem = useMemo(
    () => getFurnitureCatalogItem(item.catalogId),
    [item.catalogId]
  );

  // Compute outer bounding box from walls to prevent placing furniture far out into void
  const outerBounds = useMemo(() => {
    if (!walls || walls.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const w of walls) {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    }
    // Safe margin of 0.8 meters around exterior walls
    return {
      minX: minX - 0.8,
      maxX: maxX + 0.8,
      minZ: minZ - 0.8,
      maxZ: maxZ + 0.8,
    };
  }, [walls]);

  // Compute selection ring radius based on item footprint
  const ringRadius = useMemo(() => {
    const w = catalogItem.dimensions.width;
    const d = catalogItem.dimensions.depth;
    return Math.max(0.6, Math.sqrt(w * w + d * d) / 2 + 0.15);
  }, [catalogItem.dimensions]);

  // Handle keyboard shortcuts when this furniture item is selected
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        // Snap rotation angle to nearest 45 degrees (PI / 4)
        const step = Math.PI / 4;
        let nextRot = Math.round((item.rotationY + step) / step) * step;
        nextRot = ((nextRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        updateFurniture(item.id, {
          rotationY: nextRot,
        });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeFurniture(item.id);
      } else if (e.key === 'Escape') {
        setSelected3DTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, item.id, item.rotationY, updateFurniture, removeFurniture, setSelected3DTarget]);

  const furnitureContent = (
    <group
      position={item.position}
      rotation={[0, item.rotationY, 0]}
      scale={[item.scale, item.scale, item.scale]}
      onClick={(e) => {
        e.stopPropagation();
        setSelected3DTarget({ type: 'furniture', id: item.id });
      }}
    >
      {/* Render Model: Custom GLB or Procedural Geometry */}
      {item.customGlbUrl ? (
        <Suspense fallback={<DefaultFallbackBox dimensions={catalogItem.dimensions} />}>
          <CustomGlbModel url={item.customGlbUrl} />
        </Suspense>
      ) : (
        <ProceduralFurnitureModel
          modelType={catalogItem.modelType}
          color={item.color || catalogItem.defaultColor}
        />
      )}

      {/* Selection Glowing Neon Footprint Halo on Floor */}
      {isSelected && (
        <group position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <circleGeometry args={[ringRadius * 0.9, 32]} />
            <meshBasicMaterial
              color="#0284c7"
              side={THREE.DoubleSide}
              transparent
              opacity={0.2}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[ringRadius * 0.92, ringRadius, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      )}
    </group>
  );

  if (isSelected) {
    return (
      <TransformControls
        mode="translate"
        showY={catalogItem.category === 'curtains'}
        onMouseDown={() => setIsTransformDragging(true)}
        onMouseUp={() => setIsTransformDragging(false)}
        onObjectChange={(e?: THREE.Event) => {
          const targetObj = (e?.target as unknown as { object?: THREE.Object3D })?.object;
          if (targetObj) {
            const p = targetObj.position;
            let clampedX = p.x;
            let clampedZ = p.z;
            if (outerBounds) {
              clampedX = Math.max(outerBounds.minX, Math.min(outerBounds.maxX, clampedX));
              clampedZ = Math.max(outerBounds.minZ, Math.min(outerBounds.maxZ, clampedZ));
            }
            const newY = catalogItem.category === 'curtains' ? Math.max(0, p.y) : 0;
            targetObj.position.set(clampedX, newY, clampedZ);
            updateFurniture(item.id, {
              position: [clampedX, newY, clampedZ],
            });
          }
        }}
      >
        {furnitureContent}
      </TransformControls>
    );
  }

  return furnitureContent;
};

// -------------------------------------------------------------
// Custom User-Uploaded .GLB / .GLTF 3D Model Loader
// -------------------------------------------------------------
interface CustomGlbProps {
  url: string;
}

const CustomGlbModel: React.FC<CustomGlbProps> = ({ url }) => {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    const bbox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 3.0) {
      const scale = 2.0 / maxDim;
      clone.scale.set(scale, scale, scale);
    }
    const updatedBbox = new THREE.Box3().setFromObject(clone);
    clone.position.y -= updatedBbox.min.y;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [scene]);

  return <primitive object={clonedScene} />;
};

// Fallback Box while GLB loads
const DefaultFallbackBox: React.FC<{ dimensions: { width: number; height: number; depth: number } }> = ({
  dimensions,
}) => (
  <mesh position={[0, dimensions.height / 2, 0]}>
    <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
    <meshStandardMaterial color="#64748b" wireframe />
  </mesh>
);
