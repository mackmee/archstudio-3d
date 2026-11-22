'use client';

import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { WallMesh3D } from './WallMesh3D';
import { CornerPillars3D } from './CornerPillars3D';
import { FloorAndCeiling } from './FloorAndCeiling';
import { FurnitureMesh3D } from './FurnitureMesh3D';
import { CameraControls3D } from './CameraControls3D';
import { Viewer3DHUD } from './Viewer3DHUD';
import { DesignSidebar } from './DesignSidebar';
import { Sparkles, Layers } from 'lucide-react';

export const Scene3D: React.FC = () => {
  const {
    walls,
    openings,
    rooms,
    furniture,
    ceilingHeight,
    view3dSettings,
    loadSamplePlan,
    setCurrentMode,
    setSelected3DTarget,
  } = useFloorplanStore();

  const [resetSignal, setResetSignal] = useState(0);

  const handleResetCamera = () => {
    setResetSignal((prev) => prev + 1);
  };

  const preset = view3dSettings.lightingPreset || 'day';

  // Architectural Lighting & Environment Settings per Preset
  const lightingConfig = useMemo(() => {
    switch (preset) {
      case 'sunset':
        return {
          ambientColor: '#fed7aa',
          ambientIntensity: 0.45,
          hemiSky: '#fb923c',
          hemiGround: '#1e1b4b',
          hemiIntensity: 0.55,
          sunPos: [18, 5.5, 14] as [number, number, number],
          sunColor: '#ea580c',
          sunIntensity: 1.75,
          fillPos: [-10, 10, -8] as [number, number, number],
          fillColor: '#fdba74',
          fillIntensity: 0.35,
          bgColor: '#0d1117',
          contactShadowOpacity: 0.55,
        };
      case 'night':
        return {
          ambientColor: '#1e1b4b',
          ambientIntensity: 0.15,
          hemiSky: '#312e81',
          hemiGround: '#020617',
          hemiIntensity: 0.2,
          sunPos: [10, 18, -10] as [number, number, number],
          sunColor: '#93c5fd',
          sunIntensity: 0.25,
          fillPos: [-8, 12, 10] as [number, number, number],
          fillColor: '#60a5fa',
          fillIntensity: 0.1,
          bgColor: '#030712',
          contactShadowOpacity: 0.3,
        };
      case 'day':
      default:
        return {
          ambientColor: '#f8fafc',
          ambientIntensity: 0.6,
          hemiSky: '#e0f2fe',
          hemiGround: '#334155',
          hemiIntensity: 0.5,
          sunPos: [14, 22, 12] as [number, number, number],
          sunColor: '#fffbeb',
          sunIntensity: 1.45,
          fillPos: [-12, 14, -10] as [number, number, number],
          fillColor: '#cbd5e1',
          fillIntensity: 0.4,
          bgColor: '#080c15',
          contactShadowOpacity: 0.65,
        };
    }
  }, [preset]);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-500"
      style={{ backgroundColor: lightingConfig.bgColor }}
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [10, 9, 10], fov: 55, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onPointerMissed={() => setSelected3DTarget(null)}
        className="block w-full h-full outline-none"
      >
        {/* Architectural Studio Ambient & Hemisphere Lighting */}
        <ambientLight
          color={lightingConfig.ambientColor}
          intensity={lightingConfig.ambientIntensity}
        />
        <hemisphereLight
          args={[lightingConfig.hemiSky, lightingConfig.hemiGround, lightingConfig.hemiIntensity]}
          position={[0, 50, 0]}
        />

        {/* Primary Sunlight with Soft PCF Shadows & Acne Prevention */}
        <directionalLight
          position={lightingConfig.sunPos}
          color={lightingConfig.sunColor}
          intensity={lightingConfig.sunIntensity}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={70}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
        />

        {/* Secondary Soft Fill Light */}
        <directionalLight
          position={lightingConfig.fillPos}
          color={lightingConfig.fillColor}
          intensity={lightingConfig.fillIntensity}
        />

        {/* Cozy Warm Interior Lights in Night Mode */}
        {preset === 'night' && (
          <>
            {rooms.map((room) => (
              <pointLight
                key={`room_light_${room.id}`}
                position={[room.x, Math.max(1.8, ceilingHeight - 0.35), room.y]}
                color="#fef08a"
                intensity={1.8}
                distance={9.0}
                decay={2.0}
              />
            ))}
            {furniture
              .filter((f) => f.catalogId === 'furn_floor_lamp')
              .map((lamp) => (
                <pointLight
                  key={`lamp_light_${lamp.id}`}
                  position={[lamp.position[0], 1.65, lamp.position[2]]}
                  color="#fef3c7"
                  intensity={2.2}
                  distance={6.5}
                  decay={2.0}
                />
              ))}
          </>
        )}

        {/* Floor, Ceiling, Ground Plane & Room Labels */}
        <FloorAndCeiling
          walls={walls}
          rooms={rooms}
          ceilingHeight={ceilingHeight}
          showCeiling={view3dSettings.showCeiling}
          showRoomLabels={view3dSettings.showRoomLabels}
        />

        {/* Parametric Wall Meshes with Cutouts, Doors & Windows */}
        {walls.map((wall) => (
          <WallMesh3D
            key={wall.id}
            wall={wall}
            openings={openings}
            ceilingHeight={ceilingHeight}
          />
        ))}

        {/* Seamless 3D Wall Corner Pillars & Baseboard Corner Wraps */}
        <CornerPillars3D walls={walls} ceilingHeight={ceilingHeight} />

        {/* Placed 3D Furniture & Curtains */}
        {furniture.map((item) => (
          <FurnitureMesh3D key={item.id} item={item} />
        ))}

        {/* Soft Ambient Contact Shadows at Floor Level */}
        <ContactShadows
          position={[0, -0.015, 0]}
          opacity={lightingConfig.contactShadowOpacity}
          scale={50}
          blur={1.5}
          far={10}
        />

        {/* Camera Controls (Orbit Dollhouse / Interior Walkthrough) */}
        <CameraControls3D
          mode={view3dSettings.cameraMode}
          walls={walls}
          rooms={rooms}
          ceilingHeight={ceilingHeight}
          resetSignal={resetSignal}
        />
      </Canvas>

      {/* Floating HUD Controls at Bottom-Center */}
      <Viewer3DHUD onResetCamera={handleResetCamera} />

      {/* Unified 3D Design Studio Sidebar (Materials & Furniture Tabs) */}
      <DesignSidebar />

      {/* Empty State Overlay if no walls exist */}
      {walls.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs z-20 p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No 3D Walls to Render</h3>
              <p className="text-xs text-slate-400 mt-1">
                You haven&apos;t drawn any walls yet. Load our sample plan or draw your custom floorplan in the 2D editor.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={loadSamplePlan}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Demo Plan</span>
              </button>
              <button
                onClick={() => setCurrentMode('2d')}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Go to 2D Editor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
