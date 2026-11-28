'use client';

import React from 'react';
import * as THREE from 'three';
import { Room, PlacedFurniture } from '@/types/floorplan';

interface CeilingFixtures3DProps {
  rooms: Room[];
  ceilingHeight: number;
  interiorLightIntensity: number;
  furniture: PlacedFurniture[];
}

export const CeilingFixtures3D: React.FC<CeilingFixtures3DProps> = ({
  rooms,
  ceilingHeight,
  interiorLightIntensity,
  furniture,
}) => {
  const isGlowing = interiorLightIntensity > 0.05;
  const fixtureY = Math.max(1.8, ceilingHeight - 0.24);

  return (
    <group>
      {/* 1. Room Ceiling Chandeliers / Pendant Halos */}
      {rooms.map((room) => (
        <group key={`ch_${room.id}`} position={[room.x, fixtureY, room.y]}>
          {/* Suspension wire / thin black brass rod */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.24, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Ceiling canopy mount plate */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Modern Architectural Halo Ring Fixture */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.32, 0.022, 16, 32]} />
            <meshStandardMaterial
              color={isGlowing ? '#fef08a' : '#cbd5e1'}
              emissive={isGlowing ? new THREE.Color('#fde047') : new THREE.Color('#334155')}
              emissiveIntensity={Math.max(0.15, interiorLightIntensity * 0.9)}
              roughness={0.25}
              metalness={0.7}
            />
          </mesh>

          {/* Central Inner Warm Light Capsule */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive={isGlowing ? new THREE.Color('#facc15') : new THREE.Color('#1e293b')}
              emissiveIntensity={Math.max(0.1, interiorLightIntensity * 1.2)}
              roughness={0.1}
            />
          </mesh>

          {/* Cozy 3000K Point Light (smooth non-shadow-casting for 60fps) */}
          {isGlowing && (
            <pointLight
              position={[0, -0.1, 0]}
              color="#fef08a"
              intensity={interiorLightIntensity * 1.85}
              distance={9.5}
              decay={2.0}
            />
          )}
        </group>
      ))}

      {/* 2. Placed Floor Lamp Illumination */}
      {isGlowing &&
        furniture
          .filter((f) => f.catalogId === 'furn_floor_lamp')
          .map((lamp) => (
            <group key={`lamp_light_${lamp.id}`} position={[lamp.position[0], 1.65, lamp.position[2]]}>
              <pointLight
                color="#fef3c7"
                intensity={interiorLightIntensity * 2.2}
                distance={6.5}
                decay={2.0}
              />
            </group>
          ))}
    </group>
  );
};
