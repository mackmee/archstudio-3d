'use client';

import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Sky, ContactShadows } from '@react-three/drei';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { calculateLighting } from '@/lib/lightingEngine';
import { WallMesh3D } from './WallMesh3D';
import { CornerPillars3D } from './CornerPillars3D';
import { FloorAndCeiling } from './FloorAndCeiling';
import { FurnitureMesh3D } from './FurnitureMesh3D';
import { CeilingFixtures3D } from './CeilingFixtures3D';
import { CameraControls3D } from './CameraControls3D';
import { Viewer3DHUD } from './Viewer3DHUD';
import { SunTimeSlider } from './SunTimeSlider';
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

  // Footprint bounding box for centered ContactShadows and light target
  const bounds = useMemo(() => {
    if (walls.length === 0) {
      return { centerX: 0, centerZ: 0, width: 14, depth: 14 };
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
    return {
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
      width: Math.max(10, maxX - minX + 3),
      depth: Math.max(10, maxZ - minZ + 3),
    };
  }, [walls]);

  // Continuous Architectural Lighting Engine
  const currentTime = view3dSettings.timeOfDay ?? 13.0;
  const lighting = useMemo(() => calculateLighting(currentTime), [currentTime]);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-500"
      style={{ backgroundColor: lighting.bgColor }}
    >
      {/* 3D WebGL Canvas with ACESFilmic ToneMapping & Soft Shadows */}
      <Canvas
        shadows
        camera={{ position: [10, 9, 10], fov: 55, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onPointerMissed={() => setSelected3DTarget(null)}
        className="block w-full h-full outline-none"
      >
        {/* Physical Atmospheric Sky with Rayleigh-Mie Scattering */}
        <Sky
          sunPosition={lighting.skySunPosition}
          turbidity={lighting.skyTurbidity}
          rayleigh={lighting.skyRayleigh}
          mieCoefficient={lighting.skyMieCoefficient}
          mieDirectionalG={lighting.skyMieDirectionalG}
        />

        {/* Dynamic Studio Ambient & Hemisphere Fill Lighting */}
        <ambientLight
          color={lighting.ambientColor}
          intensity={lighting.ambientIntensity}
        />
        <hemisphereLight
          args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]}
          position={[0, 50, 0]}
        />

        {/* Moving Sun Directional Light with Soft PCF Shadows & Acne Prevention */}
        <directionalLight
          position={lighting.sunPos}
          color={lighting.sunColor}
          intensity={lighting.sunIntensity}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />

        {/* Modern Warm Architectural Ceiling Chandeliers in Every Room */}
        <CeilingFixtures3D
          rooms={rooms}
          ceilingHeight={ceilingHeight}
          interiorLightIntensity={lighting.interiorLightIntensity}
          furniture={furniture}
        />

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

        {/* Soft Ambient Contact Shadows at Floor Level (Slightly above floor y=0.005) */}
        <ContactShadows
          position={[bounds.centerX, 0.005, bounds.centerZ]}
          opacity={lighting.contactShadowOpacity}
          scale={Math.max(bounds.width, bounds.depth) * 1.3}
          blur={2.0}
          far={8}
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

      {/* Floating Interactive Sunrise-to-Night Time Slider at Top-Center */}
      <SunTimeSlider />

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
