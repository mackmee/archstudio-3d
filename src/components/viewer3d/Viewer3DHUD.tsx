'use client';

import React from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import {
  RotateCcw,
  Eye,
  EyeOff,
  Tag,
  Footprints,
  Box,
  Layers,
  Calculator,
} from 'lucide-react';

interface Viewer3DHUDProps {
  onResetCamera: () => void;
}

export const Viewer3DHUD: React.FC<Viewer3DHUDProps> = ({ onResetCamera }) => {
  const {
    view3dSettings,
    setCameraMode3D,
    toggleCeiling3D,
    toggleRoomLabels3D,
    setCurrentMode,
  } = useFloorplanStore();

  const isOrbit = view3dSettings.cameraMode === 'orbit';

  return (
    <div className="absolute inset-x-0 bottom-6 pointer-events-none z-30 flex flex-col items-center gap-3 px-4 select-none">
      {/* Walkthrough Instructions Banner */}
      {!isOrbit && (
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 text-cyan-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Footprints className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span>
            <strong className="text-white font-semibold">WASD / Arrow Keys</strong> to walk ·{' '}
            <strong className="text-white font-semibold">Click & Drag</strong> to look around ·{' '}
            <strong className="text-white font-semibold">Shift</strong> to sprint
          </span>
          <button
            onClick={() => setCameraMode3D('orbit')}
            className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition"
          >
            Exit Walkthrough
          </button>
        </div>
      )}

      {/* Main Floating 3D Control Pill */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex items-center gap-2">
        {/* Camera Mode Toggle: Orbit vs Walkthrough */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCameraMode3D('orbit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isOrbit
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
            title="Dollhouse Orbit View"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Orbit View</span>
          </button>

          <button
            onClick={() => setCameraMode3D('walkthrough')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !isOrbit
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
            title="First-Person Interior Walkthrough"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walkthrough</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Ceiling Slab Toggle */}
        <button
          onClick={toggleCeiling3D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
            view3dSettings.showCeiling
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
          title="Toggle 3D Ceiling Slab"
        >
          {view3dSettings.showCeiling ? (
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>Ceiling</span>
        </button>

        {/* Room Labels Toggle */}
        <button
          onClick={toggleRoomLabels3D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
            view3dSettings.showRoomLabels
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
          title="Toggle 3D Room Name Markers"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Labels</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Reset Camera View */}
        <button
          onClick={onResetCamera}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          title="Reset Camera Position"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Reset View</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Switch back to 2D Editor */}
        <button
          onClick={() => setCurrentMode('2d')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
          title="Return to Step 2: 2D Floorplan Drafting"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>← 2D Trace</span>
        </button>

        {/* Proceed to Step 4: Estimator */}
        <button
          onClick={() => setCurrentMode('estimator')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-700/20 transition"
          title="Proceed to Step 4: Smart Construction Cost & Materials Estimate"
        >
          <Calculator className="w-3.5 h-3.5 text-white" />
          <span>Estimate (BOM) →</span>
        </button>
      </div>
    </div>
  );
};
