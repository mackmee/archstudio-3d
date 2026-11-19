'use client';

import React from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
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

  const { language } = usePreferencesStore();
  const isOrbit = view3dSettings.cameraMode === 'orbit';

  return (
    <div className="absolute inset-x-0 bottom-6 pointer-events-none z-30 flex flex-col items-center gap-3 px-4 select-none">
      {/* Walkthrough Instructions Banner */}
      {!isOrbit && (
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 text-cyan-800 dark:text-cyan-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Footprints className="w-4 h-4 text-cyan-500 shrink-0 animate-pulse" />
          <span>{getTranslation(language, 'walkthroughHint')}</span>
          <button
            onClick={() => setCameraMode3D('orbit')}
            className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition"
          >
            {getTranslation(language, 'exitWalkthrough')}
          </button>
        </div>
      )}

      {/* Main Floating 3D Control Pill */}
      <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex items-center gap-2">
        {/* Camera Mode Toggle: Orbit vs Walkthrough */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCameraMode3D('orbit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isOrbit
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
            }`}
            title={getTranslation(language, 'orbitView')}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'orbitView')}</span>
          </button>

          <button
            onClick={() => setCameraMode3D('walkthrough')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !isOrbit
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
            }`}
            title={getTranslation(language, 'walkthroughView')}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'walkthroughView')}</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Ceiling Slab Toggle */}
        <button
          onClick={toggleCeiling3D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
            view3dSettings.showCeiling
              ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title="Toggle Ceiling"
        >
          {view3dSettings.showCeiling ? (
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          )}
          <span>{getTranslation(language, 'ceilingToggle')}</span>
        </button>

        {/* Room Labels Toggle */}
        <button
          onClick={toggleRoomLabels3D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
            view3dSettings.showRoomLabels
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title="Toggle Room Labels"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{getTranslation(language, 'roomLabelsToggle')}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Reset Camera View */}
        <button
          onClick={onResetCamera}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-950/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition"
          title={getTranslation(language, 'resetCamera')}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">{getTranslation(language, 'resetCamera')}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Switch back to 2D Editor */}
        <button
          onClick={() => setCurrentMode('2d')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 transition"
          title="Return to Step 2"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{getTranslation(language, 'backTo2D')}</span>
        </button>

        {/* Proceed to Step 4: Estimator */}
        <button
          onClick={() => setCurrentMode('estimator')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-700/20 transition"
          title="Proceed to Step 4"
        >
          <Calculator className="w-3.5 h-3.5 text-white" />
          <span>{getTranslation(language, 'proceedToEstimate')}</span>
        </button>
      </div>
    </div>
  );
};
