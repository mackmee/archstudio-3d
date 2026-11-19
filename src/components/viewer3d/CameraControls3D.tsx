'use client';

import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Wall, Room } from '@/types/floorplan';
import { useFloorplanStore } from '@/store/useFloorplanStore';

interface CameraControls3DProps {
  mode: 'orbit' | 'walkthrough';
  walls: Wall[];
  rooms: Room[];
  ceilingHeight: number;
  resetSignal?: number;
}

export const CameraControls3D: React.FC<CameraControls3DProps> = ({
  mode,
  walls,
  rooms,
  resetSignal = 0,
}) => {
  const { gl } = useThree();
  const { isTransformDragging } = useFloorplanStore();
  const orbitRef = useRef<OrbitControlsImpl | null>(null);

  // Walkthrough internal state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isDragging = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const needsPositionInit = useRef(true);

  // Calculate center of walls
  const center = useRef<THREE.Vector3>(new THREE.Vector3(4, 1.4, 3));

  useEffect(() => {
    if (walls.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    walls.forEach((w) => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });
    center.current.set((minX + maxX) / 2, 1.4, (minZ + maxZ) / 2);
  }, [walls]);

  // Request camera repositioning when mode changes or reset clicked
  useEffect(() => {
    needsPositionInit.current = true;
  }, [mode, resetSignal]);

  // Event listeners for Walkthrough Mode (Keyboard + Mouse Drag Look)
  useEffect(() => {
    if (mode !== 'walkthrough') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysPressed.current[e.code] = true;
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true;
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      // Sensitivity
      euler.current.y -= movementX * 0.0025;
      euler.current.x -= movementY * 0.0025;

      // Clamp vertical pitch to prevent flipping
      euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [mode, gl]);

  // Frame Loop: Handles camera init & Walkthrough translation
  useFrame((state, delta) => {
    const activeCamera = state.camera;

    // Handle initial placement on mode change or reset
    if (needsPositionInit.current) {
      needsPositionInit.current = false;
      const c = center.current;

      if (mode === 'orbit') {
        activeCamera.position.set(c.x + 8, 9, c.z + 9);
        activeCamera.lookAt(c.x, 1.0, c.z);
        if (orbitRef.current) {
          orbitRef.current.target.set(c.x, 1.0, c.z);
          orbitRef.current.update();
        }
      } else {
        const startX = rooms.length > 0 ? rooms[0].x : c.x;
        const startZ = rooms.length > 0 ? rooms[0].y : c.z;
        activeCamera.position.set(startX, 1.65, startZ);
        euler.current.set(0, -Math.PI / 4, 0, 'YXZ');
        activeCamera.quaternion.setFromEuler(euler.current);
      }
      return;
    }

    if (mode !== 'walkthrough') return;

    // Apply rotation
    activeCamera.quaternion.setFromEuler(euler.current);

    const keys = keysPressed.current;
    const isSprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = (isSprint ? 5.5 : 3.0) * delta;

    // Movement direction in horizontal XZ plane
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(activeCamera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(activeCamera.quaternion);
    right.y = 0;
    right.normalize();

    const moveVector = new THREE.Vector3();

    if (keys['KeyW'] || keys['ArrowUp'] || keys['w']) moveVector.add(forward);
    if (keys['KeyS'] || keys['ArrowDown'] || keys['s']) moveVector.sub(forward);
    if (keys['KeyD'] || keys['ArrowRight'] || keys['d']) moveVector.add(right);
    if (keys['KeyA'] || keys['ArrowLeft'] || keys['a']) moveVector.sub(right);

    if (moveVector.lengthSq() > 0.001) {
      moveVector.normalize().multiplyScalar(speed);
      activeCamera.position.add(moveVector);
    }

    // Lock camera height to human eye-level (1.65m)
    activeCamera.position.y = 1.65;
  });

  if (mode === 'orbit') {
    return (
      <DreiOrbitControls
        ref={orbitRef}
        enabled={!isTransformDragging}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={2.0}
        maxDistance={45.0}
      />
    );
  }

  return null;
};
