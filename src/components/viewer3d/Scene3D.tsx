'use client';

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { WallMesh3D } from './WallMesh3D';
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

  return (
    <div className="relative w-full h-full bg-[#080c15] overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [10, 9, 10], fov: 50, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        onPointerMissed={() => setSelected3DTarget(null)}
        className="block w-full h-full outline-none"
      >
        {/* Architectural Studio Lighting */}
        <ambientLight intensity={0.65} />
        <hemisphereLight
          args={['#f8fafc', '#334155', 0.45]}
          position={[0, 50, 0]}
        />

        {/* Primary Sunlight with Soft Shadows */}
        <directionalLight
          position={[14, 20, 12]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={70}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.00015}
        />

        {/* Soft Secondary Fill Light */}
        <directionalLight
          position={[-12, 14, -10]}
          intensity={0.45}
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

        {/* Placed 3D Furniture & Curtains */}
        {furniture.map((item) => (
          <FurnitureMesh3D key={item.id} item={item} />
        ))}

        {/* Soft Ambient Contact Shadows at Floor Level */}
        <ContactShadows
          position={[0, -0.155, 0]}
          opacity={0.65}
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
